import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Quote } from '@/types/quotes';
import type { WebOrderDetails } from '@/utils/webOrder';
import QuoteItemsEditor from '../QuoteItemsEditor';

const api = vi.hoisted(() => ({
  addQuoteItem: vi.fn(),
  updateQuoteItem: vi.fn(),
  deleteQuoteItem: vi.fn(),
  getQuote: vi.fn(),
}));
vi.mock('@/utils/quotesApi', () => api);

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 29,
    quote_number: 'WEB-260930-7SHGX6',
    status: 'draft',
    customer_name: 'Instituto Tecnológico de Jiquilpan',
    customer_phone: '+523541133741',
    customer_email: null,
    customer_location: null,
    notes: null,
    validity_days: 7,
    subtotal: 12600,
    iva_amount: 2016,
    total: 14616,
    sent_at: null,
    viewed_at: null,
    accepted_at: null,
    expired_at: null,
    created_by: 'tienda-web',
    assigned_to: null,
    access_token: 'tok',
    created_at: '2026-09-30T19:46:43Z',
    updated_at: '2026-09-30T19:46:43Z',
    items: [
      {
        id: 7,
        quote_id: 29,
        product_id: null,
        supplier_product_id: null,
        description: 'Bolsa de Geomembrana PVC 1.25 mm',
        sku: null,
        quantity: 1,
        unit: null,
        unit_price: 12600,
        iva_applicable: true,
        discount_percent: null,
        discount_amount: null,
        notes: null,
        sort_order: 0,
        line_total: 12600,
      },
    ],
    ...overrides,
  } as Quote;
}

const FLETE_ORDER = {
  delivery: { method: 'flete', address: { municipio: 'Jiquilpan', estado: 'Michoacán' }, cost_total: 0 },
} as unknown as WebOrderDetails;

describe('QuoteItemsEditor', () => {
  beforeEach(() => vi.clearAllMocks());

  test('adds the flete line the buyer asked for and refreshes the quote', async () => {
    const refreshed = makeQuote({ total: 19836 });
    api.addQuoteItem.mockResolvedValue({ id: 8 });
    api.getQuote.mockResolvedValue(refreshed);
    const onChanged = vi.fn();
    render(<QuoteItemsEditor quote={makeQuote()} webOrder={FLETE_ORDER} onChanged={onChanged} />);

    expect(screen.getByText(/todavía no cobra el flete/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Agregar flete/ }));
    const descriptions = screen.getAllByLabelText('Descripción') as HTMLInputElement[];
    expect(descriptions[1].value).toBe('Flete a Jiquilpan, Michoacán');
    fireEvent.change(screen.getAllByLabelText('Precio unitario sin IVA')[1], { target: { value: '4500' } });
    expect(screen.getByText('$19,836.00')).toBeTruthy(); // (12,600 + 4,500) × 1.16
    fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(refreshed));
    expect(api.addQuoteItem).toHaveBeenCalledWith(29, {
      description: 'Flete a Jiquilpan, Michoacán',
      quantity: 1,
      unit_price: 4500,
      iva_applicable: true,
      sort_order: 1,
    });
    expect(api.updateQuoteItem).not.toHaveBeenCalled();
    expect(api.deleteQuoteItem).not.toHaveBeenCalled();
  });

  test('a new line needs a price before saving', () => {
    render(<QuoteItemsEditor quote={makeQuote()} webOrder={null} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Editar productos/ }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar línea/ }));
    fireEvent.change(screen.getAllByLabelText('Descripción')[1], { target: { value: 'Instalación' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
    expect(screen.getByText(/Precio no válido en «Instalación»/)).toBeTruthy();
    expect(api.addQuoteItem).not.toHaveBeenCalled();
  });

  test('a paid quote is read-only', () => {
    render(
      <QuoteItemsEditor
        quote={makeQuote({ status: 'accepted', payment_status: 'approved' } as Partial<Quote>)}
        webOrder={FLETE_ORDER}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Editar productos/ })).toBeNull();
    expect(screen.queryByText(/todavía no cobra el flete/)).toBeNull();
  });
});
