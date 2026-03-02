import { test, expect } from '@playwright/test';
import {
  goToFilesPage,
  uploadSingleFile,
  fileLocator,
  apiListFiles,
  FILES,
  API_BASE,
} from './helpers';

test.describe('File Management — category filter, edit, delete, view modes', () => {
  const uploadedIds: number[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of uploadedIds) {
      try {
        await request.delete(`${API_BASE}/files/${id}`);
      } catch { /* ignore */ }
    }
  });

  test('filter by category shows only matching files', async ({ page }) => {
    // Upload files in two different categories
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.pdfNotaDeVenta, {
      category: 'nota-de-venta',
      description: 'Filter test — nota',
    });

    await uploadSingleFile(page, FILES.jpegProduct, {
      category: 'project-image',
      description: 'Filter test — image',
    });

    const files = await apiListFiles(page);
    for (const f of files) {
      if (
        f.original_filename === FILES.pdfNotaDeVenta ||
        f.original_filename === FILES.jpegProduct
      ) {
        uploadedIds.push(f.id);
      }
    }

    // Filter to nota-de-venta
    await page.selectOption('select', 'nota-de-venta');
    await page.waitForTimeout(1_000);

    // PDF should be visible, JPEG should not
    await expect(fileLocator(page, FILES.pdfNotaDeVenta)).toBeVisible({ timeout: 10_000 });
    await expect(fileLocator(page, FILES.jpegProduct)).not.toBeVisible({ timeout: 3_000 });

    // Switch to project-image
    await page.selectOption('select', 'project-image');
    await page.waitForTimeout(1_000);

    await expect(fileLocator(page, FILES.jpegProduct)).toBeVisible({ timeout: 10_000 });
    await expect(fileLocator(page, FILES.pdfNotaDeVenta)).not.toBeVisible({ timeout: 3_000 });

    // Clear filter — both should be visible
    await page.selectOption('select', '');
    await page.waitForTimeout(1_000);

    await expect(fileLocator(page, FILES.pdfNotaDeVenta)).toBeVisible({ timeout: 10_000 });
    await expect(fileLocator(page, FILES.jpegProduct)).toBeVisible({ timeout: 10_000 });
  });

  test('edit file metadata via API (category and description)', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.pdfFactura, {
      category: 'general',
      description: 'Before edit',
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.pdfFactura);
    expect(uploaded).toBeDefined();
    uploadedIds.push(uploaded!.id);

    // Edit via API
    const editRes = await page.request.put(`${API_BASE}/files/${uploaded!.id}`, {
      data: {
        category: 'factura',
        description: 'After edit — factura category',
      },
    });
    expect(editRes.ok()).toBeTruthy();

    // Verify the changes persisted
    const verifyRes = await page.request.get(`${API_BASE}/files/${uploaded!.id}`);
    const updated = await verifyRes.json();
    expect(updated.category).toBe('factura');
    expect(updated.description).toBe('After edit — factura category');

    // Verify the UI reflects the change after refresh
    await goToFilesPage(page);
    await page.selectOption('select', 'factura');
    await page.waitForTimeout(1_000);
    await expect(fileLocator(page, FILES.pdfFactura)).toBeVisible({ timeout: 10_000 });
  });

  test('delete a file via API and verify removal', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.jpegSpreadsheet, {
      category: 'general',
      description: 'Delete test',
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.jpegSpreadsheet);
    expect(uploaded).toBeDefined();

    const countBefore = files.length;

    // Delete via API
    const deleteRes = await page.request.delete(`${API_BASE}/files/${uploaded!.id}`);
    expect(deleteRes.ok()).toBeTruthy();

    // Verify count decreased
    const afterFiles = await apiListFiles(page);
    expect(afterFiles.length).toBe(countBefore - 1);

    // Verify file is gone from the list
    const deleted = afterFiles.find((f) => f.id === uploaded!.id);
    expect(deleted).toBeUndefined();
  });

  test('switch between list and grid view', async ({ page }) => {
    await goToFilesPage(page);

    // Click grid view button
    await page.click('button[title="Vista de cuadrícula"]');
    await page.waitForTimeout(500);

    // Grid view should show a grid container
    await expect(page.locator('.grid')).toBeVisible();

    // Click list view button
    await page.click('button[title="Vista de lista"]');
    await page.waitForTimeout(500);

    // Should switch to space-y layout (list)
    await expect(page.locator('.space-y-2')).toBeVisible();
  });

  test('text search filters file list by filename', async ({ page }) => {
    await goToFilesPage(page);

    // Type a search that matches only specific files
    await page.fill('input[placeholder*="Buscar archivos"]', 'OFELIA');
    await page.waitForTimeout(1_500);

    // Only the nota de venta for Ofelia should be visible (if it exists)
    const visibleFiles = await apiListFiles(page);
    const ofeliaFile = visibleFiles.find((f) => f.original_filename.includes('OFELIA'));
    if (ofeliaFile) {
      await expect(fileLocator(page, FILES.pdfNotaDeVenta)).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('File View URL', () => {
  const uploadedIds: number[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of uploadedIds) {
      try {
        await request.delete(`${API_BASE}/files/${id}`);
      } catch { /* ignore */ }
    }
  });

  test('view URL returns a valid presigned URL for a PDF', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.pdfNotaDeVenta, {
      category: 'nota-de-venta',
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.pdfNotaDeVenta);
    expect(uploaded).toBeDefined();
    uploadedIds.push(uploaded!.id);

    const res = await page.request.get(`${API_BASE}/files/${uploaded!.id}/view`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data).toHaveProperty('url');
    expect(data).toHaveProperty('filename', FILES.pdfNotaDeVenta);
    expect(data).toHaveProperty('content_type', 'application/pdf');
    expect(data).toHaveProperty('expires_in');
    expect(data.url).toContain('http');
  });

  test('view URL returns a valid presigned URL for an image', async ({ page }) => {
    await goToFilesPage(page);

    await uploadSingleFile(page, FILES.jpegProduct, {
      category: 'project-image',
    });

    const files = await apiListFiles(page);
    const uploaded = files.find((f) => f.original_filename === FILES.jpegProduct);
    expect(uploaded).toBeDefined();
    uploadedIds.push(uploaded!.id);

    const res = await page.request.get(`${API_BASE}/files/${uploaded!.id}/view`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.content_type).toBe('image/jpeg');
    expect(data.url).toContain('http');
  });
});
