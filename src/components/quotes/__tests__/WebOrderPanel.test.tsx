import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Quote } from '@/types/quotes';
import { parseWebOrderNotes } from '@/utils/webOrder';
import WebOrderPanel from '../WebOrderPanel';
import PaymentStatusChip from '../PaymentStatusChip';

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 1,
    quote_number: 'TEC-2026-0001',
    status: 'draft',
    customer_name: 'Juan Pérez',
    customer_phone: '6181234567',
    customer_email: null,
    customer_location: null,
    notes: null,
    validity_days: 15,
    subtotal: 100,
    iva_amount: 16,
    total: 116,
    sent_at: null,
    viewed_at: null,
    accepted_at: null,
    expired_at: null,
    created_by: 'test',
    assigned_to: null,
    access_token: null,
    created_at: '2026-09-10T12:00:00Z',
    updated_at: '2026-09-10T12:00:00Z',
    items: [],
    ...overrides,
  };
}

const WEB_NOTES = JSON.stringify({
  delivery: { method: 'paqueteria', address: { street: 'Av. Hidalgo', number: '120', cp: '34410', municipio: 'Nuevo Ideal', estado: 'Durango' }, cost_total: 180 },
  invoice: { requires_invoice: true, type: 'a_nombre', rfc: 'PEPJ800101AB1', razon_social: 'JUAN PEREZ PEREZ', regimen_fiscal: '612', uso_cfdi: 'G03', cp_fiscal: '34410', email: 'facturas@example.com' },
});

describe('PaymentStatusChip', () => {
  test('renders nothing for quotes without payment_status', () => {
    const { container } = render(<PaymentStatusChip status={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders the Spanish label', () => {
    render(<PaymentStatusChip status="approved" />);
    expect(screen.getByText('Pagado en línea')).toBeInTheDocument();
  });
});

describe('WebOrderPanel', () => {
  test('renders nothing for a regular quote, even with JSON-looking notes', () => {
    const quote = makeQuote({ notes: WEB_NOTES });
    const { container } = render(<WebOrderPanel quote={quote} details={parseWebOrderNotes(quote.notes)} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing for a web order without data', () => {
    const quote = makeQuote({ quote_number: 'WEB-260910-7K3QX9', notes: 'nota libre' });
    const { container } = render(<WebOrderPanel quote={quote} details={parseWebOrderNotes(quote.notes)} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows payment, delivery and invoice data', () => {
    const quote = makeQuote({
      quote_number: 'WEB-260910-7K3QX9',
      notes: WEB_NOTES,
      payment_status: 'approved',
      payment_method: 'mercadopago:ticket:oxxo',
      payment_reference: '1234567890',
    });
    render(<WebOrderPanel quote={quote} details={parseWebOrderNotes(quote.notes)} />);
    expect(screen.getByText('Pedido web')).toBeInTheDocument();
    expect(screen.getByText('Mercado Pago · Efectivo (ticket) · OXXO')).toBeInTheDocument();
    expect(screen.getByText('#1234567890')).toBeInTheDocument();
    expect(screen.getByText('Envío por paquetería')).toBeInTheDocument();
    expect(screen.getByText('Av. Hidalgo 120, CP 34410, Nuevo Ideal, Durango')).toBeInTheDocument();
    expect(screen.getByText('$180.00')).toBeInTheDocument();
    expect(screen.getByText('PEPJ800101AB1')).toBeInTheDocument();
    expect(screen.getByText('A nombre del cliente')).toBeInTheDocument();
  });

  test('says "No solicitada" when the order has no invoice', () => {
    const quote = makeQuote({
      quote_number: 'WEB-260910-7K3QX9',
      notes: JSON.stringify({ delivery: { method: 'recoger', address: null, cost_total: 0 }, invoice: null }),
    });
    render(<WebOrderPanel quote={quote} details={parseWebOrderNotes(quote.notes)} />);
    expect(screen.getByText('Recoger en tienda')).toBeInTheDocument();
    expect(screen.getByText('Sin costo')).toBeInTheDocument();
    expect(screen.getByText('No solicitada')).toBeInTheDocument();
  });
});
