import { test, expect } from '@playwright/test';
import fs from 'fs';
import {
  goToFilesPage,
  uploadMultipleFiles,
  apiListFiles,
  testFilePath,
  FILES,
  API_BASE,
} from './helpers';

test.describe('Bulk Upload', () => {
  const uploadedIds: number[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of uploadedIds) {
      try {
        await request.delete(`${API_BASE}/files/${id}`);
      } catch { /* ignore */ }
    }
  });

  test('upload multiple files at once via the UI', async ({ page }) => {
    await goToFilesPage(page);
    const beforeCount = await apiListFiles(page).then((f) => f.length);

    await uploadMultipleFiles(
      page,
      [FILES.jpegProduct, FILES.jpegSpreadsheet],
      {
        category: 'project-image',
        description: 'Bulk upload test',
      },
    );

    // Both files should now be in the list
    await expect(page.locator(`text=${FILES.jpegProduct}`).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`text=${FILES.jpegSpreadsheet}`).first()).toBeVisible({ timeout: 10_000 });

    const afterFiles = await apiListFiles(page);
    expect(afterFiles.length).toBe(beforeCount + 2);

    // Track for cleanup
    for (const f of afterFiles) {
      if (
        f.original_filename === FILES.jpegProduct ||
        f.original_filename === FILES.jpegSpreadsheet
      ) {
        uploadedIds.push(f.id);
      }
    }
  });

  test('bulk upload via API returns success/failure counts', async ({ page }) => {
    // Playwright multipart expects each file as a separate field with the same name "files"
    const res = await page.request.post(`${API_BASE}/files/upload-bulk`, {
      multipart: {
        files: {
          name: FILES.pdfFactura,
          mimeType: 'application/pdf',
          buffer: fs.readFileSync(testFilePath(FILES.pdfFactura)),
        },
        category: 'general',
        description: 'Bulk API test',
      },
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    expect(data).toHaveProperty('total_files', 1);
    expect(data).toHaveProperty('successful', 1);
    expect(data).toHaveProperty('failed', 0);
    expect(data.files).toHaveLength(1);
    expect(data.errors).toHaveLength(0);

    uploadedIds.push(data.files[0].id);
  });
});

test.describe('WhatsApp Import', () => {
  const uploadedIds: number[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of uploadedIds) {
      try {
        await request.delete(`${API_BASE}/files/${id}`);
      } catch { /* ignore */ }
    }
  });

  test('import a short WhatsApp chat via the UI modal', async ({ page }) => {
    await goToFilesPage(page);

    // Open WhatsApp import modal
    await page.click('button:has-text("Importar WhatsApp")');
    await page.waitForSelector('h2:has-text("Importar Chat WhatsApp")');

    // Set file via the hidden input
    const fileInput = page.locator('#whatsapp-file-input');
    await fileInput.setInputFiles(testFilePath(FILES.whatsappShort));

    // File name should appear
    await expect(page.locator(`text=${FILES.whatsappShort}`)).toBeVisible();

    // Click import button inside the modal (button text is "Importar Chat")
    const modal = page.locator('.fixed.inset-0').first();
    await modal.locator('button.bg-emerald-600:has-text("Importar Chat")').click();

    // Wait for success result
    await expect(page.locator('text=Chat importado exitosamente')).toBeVisible({ timeout: 30_000 });

    // Verify message count is shown
    await expect(page.locator('text=mensajes').first()).toBeVisible();

    // Close the modal
    await modal.locator('button.bg-emerald-600:has-text("Cerrar")').click();

    // Verify file exists via API
    const files = await apiListFiles(page);
    const imported = files.find((f) => f.original_filename === FILES.whatsappShort);
    expect(imported).toBeDefined();
    if (imported) uploadedIds.push(imported.id);
  });

  test('WhatsApp import via API returns parsed metadata', async ({ page }) => {

    const fileBuffer = fs.readFileSync(testFilePath(FILES.whatsappMedium));

    const res = await page.request.post(`${API_BASE}/files/import-whatsapp`, {
      multipart: {
        file: {
          name: FILES.whatsappMedium,
          mimeType: 'text/plain',
          buffer: fileBuffer,
        },
        description: 'API test — WhatsApp import',
      },
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    // Verify response structure
    expect(data).toHaveProperty('file_id');
    expect(data).toHaveProperty('messages_parsed');
    expect(data).toHaveProperty('chunks_created');
    expect(data).toHaveProperty('participants');
    expect(data).toHaveProperty('date_range');

    // Berenice Ruiz chat should have at least 2 participants
    expect(data.messages_parsed).toBeGreaterThan(0);
    expect(data.chunks_created).toBeGreaterThan(0);
    expect(data.participants.length).toBeGreaterThanOrEqual(2);

    // Should contain "Impag Tech" and "Berenice Ruiz" as participants
    const participantNames = data.participants.join(', ').toLowerCase();
    expect(participantNames).toContain('impag');
    expect(participantNames).toContain('berenice');

    uploadedIds.push(data.file_id);
  });

  test('WhatsApp import with bracket format (_chat 2.txt) is parsed', async ({ page }) => {

    // _chat 2.txt is 2.4MB — use the API directly
    const fileBuffer = fs.readFileSync(testFilePath(FILES.whatsappBracketFormat));

    const res = await page.request.post(`${API_BASE}/files/import-whatsapp`, {
      multipart: {
        file: {
          name: FILES.whatsappBracketFormat,
          mimeType: 'text/plain',
          buffer: fileBuffer,
        },
        description: 'API test — bracket format WhatsApp',
      },
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    // This is a large group chat — should have many messages
    expect(data.messages_parsed).toBeGreaterThan(10);
    expect(data.chunks_created).toBeGreaterThan(0);
    expect(data.participants.length).toBeGreaterThanOrEqual(2);

    uploadedIds.push(data.file_id);
  });

  test('WhatsApp import rejects non-txt files', async ({ page }) => {

    const pdfBuffer = fs.readFileSync(testFilePath(FILES.pdfNotaDeVenta));

    const res = await page.request.post(`${API_BASE}/files/import-whatsapp`, {
      multipart: {
        file: {
          name: 'not-a-whatsapp-chat.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        },
      },
    });

    expect(res.status()).toBe(400);
  });
});
