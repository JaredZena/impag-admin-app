import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaptureQuoteResult, Quote } from '@/types/quotes';
import { captureQuote, changeQuoteStatus } from '@/utils/quotesApi';
import CaptureQuoteDialog from '../CaptureQuoteDialog';
import QuoteStatusPanel from '../QuoteStatusPanel';
import QuoteStatusBadge from '../QuoteStatusBadge';

vi.mock('@/utils/quotesApi', () => ({
  captureQuote: vi.fn(),
  changeQuoteStatus: vi.fn(),
}));

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 7,
    quote_number: 'COT-IMPAG-400926DGO',
    status: 'sent',
    customer_name: 'Miguel Cordero',
    customer_phone: 'S/N',
    customer_email: null,
    customer_location: 'Nuevo Ideal, Dgo',
    notes: null,
    validity_days: 15,
    subtotal: 18500,
    iva_amount: 0,
    total: 18500,
    sent_at: '2026-10-02T18:00:00Z',
    viewed_at: null,
    accepted_at: null,
    expired_at: null,
    created_by: 'hernan@test',
    assigned_to: 'hernan@test',
    access_token: null,
    created_at: '2026-10-02T18:00:00Z',
    updated_at: '2026-10-02T18:00:00Z',
    items: [],
    ...overrides,
  };
}

const PREVIEW: CaptureQuoteResult = {
  preview: {
    action: 'created',
    quote_number: 'COT-IMPAG-400926DGO',
    folio: '400926DGO',
    tag: null,
    customer_name: 'Miguel Cordero',
    customer_location: 'Nuevo Ideal, Dgo',
    delivery: 'Nuevo Ideal, Dgo',
    material: 'Bolsa para vivero',
    existing: null,
  },
  warnings: ['Sin total: la cotización entra con $0 hasta que lo captures.'],
  quote: null,
};

beforeEach(() => {
  vi.mocked(captureQuote).mockReset();
  vi.mocked(changeQuoteStatus).mockReset();
});

describe('CaptureQuoteDialog', () => {
  test('previews with dry_run, then saves and hands back the quote', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const saved = makeQuote();
    vi.mocked(captureQuote)
      .mockResolvedValueOnce(PREVIEW)
      .mockResolvedValueOnce({ ...PREVIEW, quote: saved });

    render(<CaptureQuoteDialog onClose={() => {}} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/Pega el mensaje/), 'Cotización Enviada 400926DGO');
    await user.type(screen.getByLabelText('Teléfono del cliente'), '6181234567');
    await user.click(screen.getByRole('button', { name: 'Revisar' }));

    expect(captureQuote).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ dry_run: true, customer_phone: '6181234567' })
    );
    expect(await screen.findByText('COT-IMPAG-400926DGO')).toBeInTheDocument();
    expect(screen.getByText(/Sin total/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(vi.mocked(captureQuote).mock.calls[1][0]).not.toHaveProperty('dry_run');
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  test('shows the parser error from the backend', async () => {
    const user = userEvent.setup();
    vi.mocked(captureQuote).mockRejectedValueOnce(new Error('No encontré un mensaje de *Cotización Enviada*'));
    render(<CaptureQuoteDialog onClose={() => {}} onSaved={() => {}} />);
    await user.type(screen.getByLabelText(/Pega el mensaje/), 'hola');
    await user.click(screen.getByRole('button', { name: 'Revisar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontré');
  });
});

describe('QuoteStatusPanel', () => {
  test('Perdida needs a reason, then sends status + reason', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    const updated = makeQuote({ status: 'rejected' });
    vi.mocked(changeQuoteStatus).mockResolvedValueOnce(updated);

    render(<QuoteStatusPanel quote={makeQuote()} onChanged={onChanged} />);
    await user.click(screen.getByRole('button', { name: 'Perdida' }));
    const save = screen.getByRole('button', { name: 'Marcar como Perdida' });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Muy caro' }));
    expect(save).toBeEnabled();
    await user.click(save);
    expect(changeQuoteStatus).toHaveBeenCalledWith(7, 'rejected', 'Muy caro');
    expect(onChanged).toHaveBeenCalledWith(updated);
  });

  test('Aceptada needs no reason', async () => {
    const user = userEvent.setup();
    vi.mocked(changeQuoteStatus).mockResolvedValueOnce(makeQuote({ status: 'accepted' }));
    render(<QuoteStatusPanel quote={makeQuote()} onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Aceptada' }));
    await user.click(screen.getByRole('button', { name: 'Marcar como Aceptada' }));
    expect(changeQuoteStatus).toHaveBeenCalledWith(7, 'accepted', '');
  });
});

test('badge labels the new statuses', () => {
  render(
    <>
      <QuoteStatusBadge status="needs_work" />
      <QuoteStatusBadge status="rejected" />
    </>
  );
  expect(screen.getByText('Por ajustar')).toBeInTheDocument();
  expect(screen.getByText('Perdida')).toBeInTheDocument();
});
