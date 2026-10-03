import { expect, test } from 'vitest';
import { buildHoyText } from '@/utils/hoyText';

test('builds the HOY message in the group format', () => {
  const text = buildHoyText(
    {
      day: '2026-10-02',
      sales: [{ id: 1, reference: 'Venta 01_10_2026', customer_name: 'Alejandro Echeverría', description: 'Kit de motobomba', amount: 4595, pending: 0, source: 'WHATSAPP' }],
      quotes_sent: [{ id: 2, quote_number: 'COT-IMPAG-031026TAB', customer_name: 'VICOR', material: 'Malla ciclónica', total: 0 }],
      requests: [],
      followups: [{ quote_id: 3, quote_number: 'COT-IMPAG-090926DGO', customer_name: 'Vladimir', material: 'Cerco Solar', detail: 'Por ajustar — Busca algo más económico' }],
      closed_tasks: [{ id: 4, title: 'Envio de paquete Bolsa 17x17' }],
      receivable: { total: 0, rows: [] },
      open_by_section: {},
      priority: [],
    },
    '3',
    '',
    'Visto Bueno Bombeos solares\n2. Cotizacion Pendientes.'
  );
  expect(text).toBe(
    [
      'HOY 02/10/2026',
      '✅ Logrado Hoy:',
      '1. Venta Alejandro Echeverría Kit de motobomba',
      '2. Cotización VICOR Malla ciclónica',
      '3. Envio de paquete Bolsa 17x17',
      '',
      '💰 Ventas:',
      '• Ventas logradas hoy [1]',
      '• Cotizaciones enviadas hoy: [1]',
      '• Atención al cliente hoy: [3]',
      '• Seguimientos realizados hoy: [1]',
      'Vladimir_Cerco Solar_Por ajustar — Busca algo más económico',
      '',
      '⚠️ Bloqueantes:',
      '',
      '📅 Prioritario Mañana:',
      '1. Visto Bueno Bombeos solares',
      '2. Cotizacion Pendientes.',
    ].join('\n')
  );
});
