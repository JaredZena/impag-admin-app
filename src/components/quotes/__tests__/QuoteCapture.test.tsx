import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaptureQuoteResult, Quote } from '@/types/quotes';
import {
  captureQuote,
  captureQuotePdf,
  changeQuoteStatus,
  listQuoteFiles,
  uploadQuoteFile,
} from '@/utils/quotesApi';
import CaptureQuoteDialog from '../CaptureQuoteDialog';
import QuotePdfPanel from '../QuotePdfPanel';
import QuoteStatusPanel from '../QuoteStatusPanel';
import QuoteStatusBadge from '../QuoteStatusBadge';

vi.mock('@/utils/quotesApi', () => ({
  captureQuote: vi.fn(),
  captureQuotePdf: vi.fn(),
  changeQuoteStatus: vi.fn(),
  listQuoteFiles: vi.fn(),
  uploadQuoteFile: vi.fn(),
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
  vi.mocked(captureQuotePdf).mockReset();
  vi.mocked(changeQuoteStatus).mockReset();
  vi.mocked(listQuoteFiles).mockReset();
  vi.mocked(uploadQuoteFile).mockReset();
});

const PDF = new File(['%PDF-1.4'], 'COT-IMPAG-400926DGO-MIGUEL CORDERO-BOLSA.pdf', {
  type: 'application/pdf',
});

describe('CaptureQuoteDialog with a PDF', () => {
  test('reads total and date from the PDF; message optional; no date sent unless edited', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const pdfPreview: CaptureQuoteResult = {
      ...PREVIEW,
      preview: { ...PREVIEW.preview, total: 18500, pdf_date: '2026-09-30', contexto: 'Vivero nuevo' },
      warnings: [],
    };
    vi.mocked(captureQuotePdf)
      .mockResolvedValueOnce(pdfPreview)
      .mockResolvedValueOnce({ ...pdfPreview, quote: makeQuote() });

    render(<CaptureQuoteDialog onClose={() => {}} onSaved={onSaved} />);
    expect(screen.getByRole('button', { name: 'Revisar' })).toBeDisabled();
    await user.upload(screen.getByLabelText(/Adjunta el PDF/), PDF);
    expect(screen.getByLabelText('Total del PDF')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Revisar' }));

    expect(captureQuotePdf).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ file: PDF, dry_run: true, sent_date: undefined })
    );
    expect(captureQuote).not.toHaveBeenCalled();
    expect(screen.getByText('$18,500.00')).toBeInTheDocument();
    expect(screen.getByText('30/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Vivero nuevo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(captureQuotePdf).toHaveBeenLastCalledWith(expect.objectContaining({ dry_run: false }));
    expect(onSaved).toHaveBeenCalled();
  });
});

describe('QuotePdfPanel', () => {
  const FILE = {
    id: 3,
    filename: 'COT-IMPAG-400926DGO-MIGUEL CORDERO-BOLSA.pdf',
    size: 1000,
    created_at: '2026-09-30T18:00:00Z',
    view_url: 'https://r2.test/cotizacion/3/x.pdf',
  };

  test('previews the stored PDF', async () => {
    vi.mocked(listQuoteFiles).mockResolvedValue([FILE]);
    render(<QuotePdfPanel quote={makeQuote()} onQuoteChanged={() => {}} />);
    const frame = await screen.findByTitle('PDF COT-IMPAG-400926DGO');
    expect(frame).toHaveAttribute('src', FILE.view_url);
    expect(screen.getByRole('link', { name: /Abrir/ })).toHaveAttribute('href', FILE.view_url);
  });

  test('upload fills a $0 total and reports it', async () => {
    const user = userEvent.setup();
    const onQuoteChanged = vi.fn();
    vi.mocked(listQuoteFiles).mockResolvedValue([]);
    const updated = makeQuote({ total: 18500 });
    vi.mocked(uploadQuoteFile).mockResolvedValue({
      files: [FILE],
      total_set: 18500,
      warnings: [],
      quote: updated,
    });
    render(<QuotePdfPanel quote={makeQuote({ total: 0 })} onQuoteChanged={onQuoteChanged} />);
    expect(await screen.findByText(/Sin PDF guardado/)).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Subir PDF de la cotización'), PDF);
    await waitFor(() => expect(onQuoteChanged).toHaveBeenCalledWith(updated));
    expect(screen.getByText(/Total \$18,500.00 leído del PDF/)).toBeInTheDocument();
    expect(screen.getByTitle('PDF COT-IMPAG-400926DGO')).toBeInTheDocument();
  });
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

describe('Solicitud de Cotización (Por cotizar)', () => {
  test('a pasted request previews as Por cotizar and saves', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const requestPreview: CaptureQuoteResult = {
      preview: {
        ...PREVIEW.preview,
        action: 'created',
        kind: 'request',
        quote_number: 'SOL-011026-1',
        folio: '',
        customer_name: 'Camila Ortiz Aviña',
        phone: '+52 393 131 2326',
        datos: 'Área: 1 Ha Cultivo: Jitomate',
      },
      warnings: [],
      quote: null,
    };
    vi.mocked(captureQuote)
      .mockResolvedValueOnce(requestPreview)
      .mockResolvedValueOnce({ ...requestPreview, quote: makeQuote({ status: 'requested' }) });

    render(<CaptureQuoteDialog onClose={() => {}} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/Solicitud de Cotización/), 'Solicitud de Cotización Cliente: Camila');
    await user.click(screen.getByRole('button', { name: 'Revisar' }));

    expect(screen.getByText('SOL-011026-1')).toBeInTheDocument();
    expect(screen.getByText('Por cotizar')).toBeInTheDocument();
    expect(screen.getByText('Área: 1 Ha Cultivo: Jitomate')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Registrar solicitud' }));
    expect(onSaved).toHaveBeenCalled();
  });

  test('a Cotización Enviada for a pending request says which request it closes', async () => {
    const user = userEvent.setup();
    vi.mocked(captureQuote).mockResolvedValueOnce({
      ...PREVIEW,
      preview: {
        ...PREVIEW.preview,
        action: 'converted',
        kind: 'quote',
        quote_number: 'COT-IMPAG-051026JAL',
        request_number: 'SOL-011026-1',
        existing: { id: 9, status: 'requested', total: 0, customer_name: 'Camila Ortiz Aviña' },
      },
    });
    render(<CaptureQuoteDialog onClose={() => {}} onSaved={() => {}} />);
    await user.type(screen.getByLabelText(/Solicitud de Cotización/), 'Cotización Enviada 051026JAL');
    await user.click(screen.getByRole('button', { name: 'Revisar' }));
    expect(screen.getByText('SOL-011026-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar cotización' })).toBeInTheDocument();
  });
});
