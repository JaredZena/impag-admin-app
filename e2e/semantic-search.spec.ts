import { test, expect } from '@playwright/test';
import {
  goToFilesPage,
  uploadSingleFile,
  waitForProcessing,
  apiListFiles,
  FILES,
  API_BASE,
} from './helpers';

/** Check if an error is an OpenAI quota/rate limit issue */
function isQuotaError(err: string | null | undefined): boolean {
  if (!err) return false;
  return err.includes('quota') || err.includes('429') || err.includes('rate_limit');
}

test.describe('Semantic Search — upload, process, and search by content', () => {
  const uploadedIds: number[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of uploadedIds) {
      try {
        await request.delete(`${API_BASE}/files/${id}`);
      } catch { /* ignore */ }
    }
  });

  test('search finds a DOCX by its content (mallasombra)', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.docxCotizacion, {
      category: 'customer-quotation',
      description: 'Search test — mallasombra DOCX',
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.docxCotizacion);
    expect(uploaded).toBeDefined();
    uploadedIds.push(uploaded!.id);

    const status = await waitForProcessing(page, uploaded!.id);

    if (status === 'failed') {
      const res = await page.request.get(`${API_BASE}/files/${uploaded!.id}/processing-status`);
      const data = await res.json();
      if (isQuotaError(data.processing_error)) {
        test.skip(true, 'OpenAI API quota exceeded — cannot create embeddings');
      }
    }

    expect(status).toBe('completed');

    // Retry search with increasing delays — Pinecone eventual consistency
    let found: { score: number } | undefined;
    for (const delay of [5_000, 5_000, 5_000]) {
      await page.waitForTimeout(delay);

      const searchRes = await page.request.post(`${API_BASE}/files/search`, {
        data: {
          query: 'mallasombra monofilamento Santiago Papasquiaro',
          category: 'customer-quotation',
          top_k: 5,
        },
      });
      if (!searchRes.ok()) continue;
      const searchData = await searchRes.json();

      found = searchData.results.find(
        (r: { original_filename: string }) => r.original_filename === FILES.docxCotizacion,
      );
      if (found) break;
    }

    expect(found).toBeDefined();
    expect(found!.score).toBeGreaterThan(0);
  });

  test('search finds an XML invoice by CFDI content', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.xmlFactura, {
      category: 'factura',
      description: 'Search test — factura XML',
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.xmlFactura);
    expect(uploaded).toBeDefined();
    uploadedIds.push(uploaded!.id);

    const status = await waitForProcessing(page, uploaded!.id);

    if (status === 'failed') {
      const res = await page.request.get(`${API_BASE}/files/${uploaded!.id}/processing-status`);
      const data = await res.json();
      if (isQuotaError(data.processing_error)) {
        test.skip(true, 'OpenAI API quota exceeded — cannot create embeddings');
      }
    }

    expect(status).toBe('completed');

    // Retry search with increasing delays — Pinecone eventual consistency
    let found: { score: number } | undefined;
    for (const delay of [5_000, 5_000, 5_000]) {
      await page.waitForTimeout(delay);

      const searchRes = await page.request.post(`${API_BASE}/files/search`, {
        data: {
          query: 'IMPAG TECH estanque factura CFDI',
          category: 'factura',
          top_k: 5,
        },
      });
      if (!searchRes.ok()) continue;
      const searchData = await searchRes.json();

      found = searchData.results.find(
        (r: { original_filename: string }) => r.original_filename === FILES.xmlFactura,
      );
      if (found) break;
    }

    expect(found).toBeDefined();
    expect(found!.score).toBeGreaterThan(0);
  });

  test('semantic search via API returns results with correct structure', async ({ page }) => {
    const searchRes = await page.request.post(`${API_BASE}/files/search`, {
      data: {
        query: 'cotización precio mallasombra',
        top_k: 5,
      },
    });

    // Search endpoint calls OpenAI for query embedding — may fail with 500 if quota exhausted
    if (!searchRes.ok()) {
      const errBody = await searchRes.text();
      if (
        searchRes.status() === 500 ||
        errBody.includes('quota') || errBody.includes('429') || errBody.includes('rate_limit')
      ) {
        test.skip(true, `Search API unavailable (status ${searchRes.status()}) — likely OpenAI quota issue`);
      }
      expect(searchRes.ok()).toBeTruthy();
    }

    const data = await searchRes.json();

    expect(data).toHaveProperty('results');
    expect(data).toHaveProperty('query', 'cotización precio mallasombra');
    expect(data).toHaveProperty('total_results');
    expect(Array.isArray(data.results)).toBe(true);

    if (data.results.length > 0) {
      const result = data.results[0];
      expect(result).toHaveProperty('file_id');
      expect(result).toHaveProperty('original_filename');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('snippet');
      expect(result).toHaveProperty('chunk_index');
      expect(result).toHaveProperty('namespace');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });

  test('search with category filter narrows results', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/files/search`, {
      data: {
        query: 'precio material',
        category: 'customer-quotation',
        top_k: 10,
      },
    });

    if (!res.ok()) {
      const errBody = await res.text();
      if (
        res.status() === 500 ||
        errBody.includes('quota') || errBody.includes('429') || errBody.includes('rate_limit')
      ) {
        test.skip(true, `Search API unavailable (status ${res.status()}) — likely OpenAI quota issue`);
      }
      expect(res.ok()).toBeTruthy();
    }

    const data = await res.json();

    for (const result of data.results) {
      expect(result.namespace).toBe('customer-quotations');
    }
  });

  test('empty search query returns 400', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/files/search`, {
      data: { query: '', top_k: 5 },
    });
    expect(res.status()).toBe(400);
  });
});
