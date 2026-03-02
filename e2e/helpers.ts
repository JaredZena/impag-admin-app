import { Page, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to the shared test fixtures directory */
export const TEST_FILES_DIR = path.resolve(__dirname, '../../docs/test_files');

/** Backend API base URL (matches .env.local VITE_API_BASE_URL) */
export const API_BASE = 'http://localhost:8000';

// ─── Test file references ──────────────────────────────────────
export const FILES = {
  // PDFs
  pdfNotaDeVenta: 'NOT-IMPAG-290226DGO-OFELIA FLORES.pdf',
  pdfCotizacion: 'COT-IMPAG-430325DGO-RODOLFO BARRIENTOS-ACOLCHADOS Y CINTILLA PARA UNA HECTAREA.pdf',
  pdfFactura: 'MOVF930406UAA-20251126-F1824.pdf',
  pdfSupplierQuote: 'Cotización 4725 IMPAG TECH (1).pdf',

  // DOCX
  docxCotizacion: 'COT-IMPAG-680226DGO-JOSEL HERRERA-MALLASOMBRA 70%.docx',

  // XML
  xmlFactura: 'FACTURA 429 impag tech.xml',

  // Images
  jpegProduct: 'WhatsApp Image 2026-02-28 at 10.31.01.jpeg',
  jpegReceipt: 'e0476002-fda7-462e-8267-84009b8dce6f.jpeg',
  jpegSpreadsheet: '9e8dcc84-45d5-401c-b65f-b851ef3b4a75.jpeg',

  // WhatsApp chats
  whatsappShort: 'Chat de WhatsApp con josuemanuelaguilarvelazqu.txt',
  whatsappMedium: 'Chat de WhatsApp con Berenice Ruiz.txt',
  whatsappBracketFormat: '_chat 2.txt',
} as const;

/** Full path to a test file */
export function testFilePath(filename: string): string {
  return path.join(TEST_FILES_DIR, filename);
}

// ─── Page helpers ──────────────────────────────────────────────

/** Navigate to the Files page and wait for it to load */
export async function goToFilesPage(page: Page) {
  await page.goto('/files');
  await page.waitForSelector('h1:has-text("Archivos")', { timeout: 10_000 });
}

/** Open the "Subir Archivos" modal */
export async function openUploadModal(page: Page) {
  await page.click('button:has-text("Subir Archivos")');
  await page.waitForSelector('h2:has-text("Subir Archivos")');
}

/** Upload a single file via the upload modal */
export async function uploadSingleFile(
  page: Page,
  filename: string,
  opts: { category?: string; description?: string; tags?: string } = {},
) {
  await openUploadModal(page);

  // Set file via the hidden input
  const fileInput = page.locator('#file-input');
  await fileInput.setInputFiles(testFilePath(filename));

  // Wait for file to appear as selected
  await expect(page.locator('text=1 archivo seleccionado')).toBeVisible();

  // Set category if specified
  if (opts.category) {
    await page.selectOption('select:below(:text("Categoria"))', opts.category);
  }

  // Set description if specified
  if (opts.description) {
    await page.fill('input[placeholder*="descripcion"]', opts.description);
  }

  // Set tags if specified
  if (opts.tags) {
    await page.fill('input[placeholder*="comas"]', opts.tags);
  }

  // Submit — click the blue button inside the modal (not the header "Subir Archivos")
  const modal = page.locator('.fixed.inset-0').first();
  await modal.locator('button.bg-blue-600:has-text("Subir")').click();

  // Wait for modal to close (upload completed)
  await page.waitForSelector('h2:has-text("Subir Archivos")', { state: 'hidden', timeout: 30_000 });
}

/** Upload multiple files via the upload modal */
export async function uploadMultipleFiles(
  page: Page,
  filenames: string[],
  opts: { category?: string; description?: string } = {},
) {
  await openUploadModal(page);

  const fileInput = page.locator('#file-input');
  await fileInput.setInputFiles(filenames.map(testFilePath));

  await expect(page.locator(`text=${filenames.length} archivos seleccionados`)).toBeVisible();

  if (opts.category) {
    await page.selectOption('select:below(:text("Categoria"))', opts.category);
  }

  if (opts.description) {
    await page.fill('input[placeholder*="descripcion"]', opts.description);
  }

  // Submit — click the blue button inside the modal (not the header "Subir Archivos")
  const modal = page.locator('.fixed.inset-0').first();
  await modal.locator(`button.bg-blue-600:has-text("Subir ${filenames.length} archivos")`).click();

  await page.waitForSelector('h2:has-text("Subir Archivos")', { state: 'hidden', timeout: 60_000 });
}

/** Wait for a file to finish processing by polling the API */
export async function waitForProcessing(
  page: Page,
  fileId: number,
  { timeout = 90_000 } = {},
): Promise<string> {
  const start = Date.now();
  let status = 'pending';

  while (Date.now() - start < timeout) {
    const res = await page.request.get(`${API_BASE}/files/${fileId}/processing-status`);
    const data = await res.json();
    status = data.processing_status;

    if (status === 'completed' || status === 'failed' || status === 'skipped') {
      return status;
    }

    await page.waitForTimeout(2_000);
  }

  throw new Error(`Processing timed out after ${timeout}ms — last status: ${status}`);
}

/** Get file count text from the page header */
export async function getFileCount(page: Page): Promise<number> {
  const text = await page.locator('p:has-text("archivo")').first().textContent();
  const match = text?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Find a file card/row by filename */
export function fileLocator(page: Page, filename: string) {
  return page.locator(`text="${filename}"`).first();
}

/** Delete a file via the API (cleanup helper) */
export async function apiDeleteFile(page: Page, fileId: number) {
  await page.request.delete(`${API_BASE}/files/${fileId}`);
}

/** List all files via the API */
export async function apiListFiles(page: Page): Promise<Array<{ id: number; original_filename: string; processing_status: string }>> {
  const res = await page.request.get(`${API_BASE}/files/`);
  return res.json();
}

/** Delete all files uploaded during tests (cleanup) */
export async function cleanupTestFiles(page: Page) {
  const files = await apiListFiles(page);
  for (const file of files) {
    try {
      await apiDeleteFile(page, file.id);
    } catch {
      // ignore cleanup failures
    }
  }
}
