import { test, expect } from '@playwright/test';
import {
  goToFilesPage,
  uploadSingleFile,
  waitForProcessing,
  apiListFiles,
  FILES,
  API_BASE,
} from './helpers';

test.describe('File Processing — verify documents are extracted and chunked', () => {
  const uploadedIds: number[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of uploadedIds) {
      try {
        await request.delete(`${API_BASE}/files/${id}`);
      } catch { /* ignore */ }
    }
  });

  /** Upload, wait for processing, and return the processing-status response */
  async function uploadAndProcess(
    page: import('@playwright/test').Page,
    filename: string,
    opts: { category: string; description: string; timeout?: number },
  ) {
    await goToFilesPage(page);

    await uploadSingleFile(page, filename, {
      category: opts.category,
      description: opts.description,
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === filename);
    expect(uploaded).toBeDefined();
    uploadedIds.push(uploaded!.id);

    const status = await waitForProcessing(page, uploaded!.id, { timeout: opts.timeout ?? 90_000 });

    const res = await page.request.get(`${API_BASE}/files/${uploaded!.id}/processing-status`);
    const data = await res.json();

    return { status, data, fileId: uploaded!.id };
  }

  test('PDF nota de venta is processed and chunked', async ({ page }) => {
    const { status, data } = await uploadAndProcess(page, FILES.pdfNotaDeVenta, {
      category: 'nota-de-venta',
      description: 'Processing test — PDF',
    });

    if (status === 'failed') {
      const err = data.processing_error ?? '';
      if (err.includes('quota') || err.includes('429') || err.includes('rate_limit')) {
        test.skip(true, `OpenAI API issue — ${err.slice(0, 100)}`);
      }
    }

    expect(status).toBe('completed');
    expect(data.chunk_count).toBeGreaterThan(0);
    expect(data.processing_error).toBeNull();
  });

  test('DOCX quotation is processed and chunked', async ({ page }) => {
    const { status, data } = await uploadAndProcess(page, FILES.docxCotizacion, {
      category: 'customer-quotation',
      description: 'Processing test — DOCX',
    });

    if (status === 'failed') {
      const err = data.processing_error ?? '';
      if (err.includes('quota') || err.includes('429') || err.includes('rate_limit')) {
        test.skip(true, `OpenAI API issue — ${err.slice(0, 100)}`);
      }
    }

    expect(status).toBe('completed');
    expect(data.chunk_count).toBeGreaterThan(0);
  });

  test('XML CFDI invoice is processed and chunked', async ({ page }) => {
    const { status, data } = await uploadAndProcess(page, FILES.xmlFactura, {
      category: 'factura',
      description: 'Processing test — XML CFDI',
    });

    if (status === 'failed') {
      const err = data.processing_error ?? '';
      if (err.includes('quota') || err.includes('429') || err.includes('rate_limit')) {
        test.skip(true, `OpenAI API issue — ${err.slice(0, 100)}`);
      }
    }

    expect(status).toBe('completed');
    expect(data.chunk_count).toBeGreaterThan(0);
  });

  test('JPEG image is processed via Vision OCR', async ({ page }) => {
    const { status, data } = await uploadAndProcess(page, FILES.jpegReceipt, {
      category: 'general',
      description: 'Processing test — JPEG OCR',
      timeout: 120_000,
    });

    if (status === 'failed') {
      const err = data.processing_error ?? '';
      if (err.includes('quota') || err.includes('429') || err.includes('rate_limit')) {
        test.skip(true, `OpenAI API issue — ${err.slice(0, 100)}`);
      }
    }

    expect(status).toBe('completed');
    expect(data.chunk_count).toBeGreaterThan(0);
  });

  test('failed file can be reprocessed', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.pdfSupplierQuote, {
      category: 'supplier-quotation',
      description: 'Reprocess test',
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.pdfSupplierQuote);
    expect(uploaded).toBeDefined();
    uploadedIds.push(uploaded!.id);

    // Wait for initial processing
    const firstStatus = await waitForProcessing(page, uploaded!.id);
    expect(['completed', 'failed']).toContain(firstStatus);

    // Trigger reprocess via API
    const reprocessRes = await page.request.post(`${API_BASE}/files/${uploaded!.id}/reprocess`);
    expect(reprocessRes.ok()).toBeTruthy();

    // Wait for reprocessing
    const secondStatus = await waitForProcessing(page, uploaded!.id);
    expect(['completed', 'failed']).toContain(secondStatus);
  });
});
