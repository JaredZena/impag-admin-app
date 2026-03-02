import { test, expect } from '@playwright/test';
import {
  goToFilesPage,
  uploadSingleFile,
  fileLocator,
  apiListFiles,
  FILES,
  API_BASE,
} from './helpers';

test.describe('File Upload — single files of each supported type', () => {
  // Track uploaded file IDs for cleanup
  const uploadedIds: number[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of uploadedIds) {
      try {
        await request.delete(`${API_BASE}/files/${id}`);
      } catch { /* ignore */ }
    }
  });

  test('upload a PDF (nota de venta)', async ({ page }) => {
    await goToFilesPage(page);
    const beforeCount = await apiListFiles(page).then((f) => f.length);

    await uploadSingleFile(page, FILES.pdfNotaDeVenta, {
      category: 'nota-de-venta',
      description: 'E2E test — nota de venta PDF',
    });

    // File should appear in the list
    await expect(fileLocator(page, FILES.pdfNotaDeVenta)).toBeVisible({ timeout: 10_000 });

    const afterCount = await apiListFiles(page).then((f) => f.length);
    expect(afterCount).toBe(beforeCount + 1);

    // Track for cleanup
    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.pdfNotaDeVenta);
    if (uploaded) uploadedIds.push(uploaded.id);
  });

  test('upload a DOCX (customer quotation)', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.docxCotizacion, {
      category: 'customer-quotation',
      description: 'E2E test — cotización DOCX',
    });

    await expect(fileLocator(page, FILES.docxCotizacion)).toBeVisible({ timeout: 10_000 });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.docxCotizacion);
    expect(uploaded).toBeDefined();
    if (uploaded) uploadedIds.push(uploaded.id);
  });

  test('upload an XML invoice (factura CFDI)', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.xmlFactura, {
      category: 'factura',
      description: 'E2E test — factura XML CFDI',
    });

    await expect(fileLocator(page, FILES.xmlFactura)).toBeVisible({ timeout: 10_000 });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.xmlFactura);
    expect(uploaded).toBeDefined();
    if (uploaded) uploadedIds.push(uploaded.id);
  });

  test('upload a JPEG image (product photo)', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.jpegProduct, {
      category: 'project-image',
      description: 'E2E test — product image',
    });

    await expect(fileLocator(page, FILES.jpegProduct)).toBeVisible({ timeout: 10_000 });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.jpegProduct);
    expect(uploaded).toBeDefined();
    if (uploaded) uploadedIds.push(uploaded.id);
  });

  test('upload a JPEG image (handwritten receipt with OCR)', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.jpegReceipt, {
      category: 'general',
      description: 'E2E test — handwritten receipt for OCR',
    });

    await expect(fileLocator(page, FILES.jpegReceipt)).toBeVisible({ timeout: 10_000 });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.jpegReceipt);
    expect(uploaded).toBeDefined();
    if (uploaded) uploadedIds.push(uploaded.id);
  });
});
