import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiRequest } from '@/utils/api';
import CaptureSaleDialog from '../CaptureSaleDialog';

vi.mock('@/utils/api', () => ({ apiRequest: vi.fn() }));

const PREVIEW = {
  data: {
    preview: {
      action: 'created',
      label: '01_10_2026',
      folio: '011026DGO',
      tag: null,
      customer_name: 'Alejandro Echeverría',
      location: 'Nuevo Ideal, Durango',
      sale_date: '2026-10-01',
      items: [{ description: '2 Reducciones Galv Rosc 3" a 2"', quantity: 2, unit: null, unit_price: 350 }],
      total: 700,
      payments: [{ label: 'Anticipo 1', amount: 40, date: '2026-10-01', method: 'efectivo' }],
      paid: 40,
      pending: 660,
      notes: [],
      sheet_duplicates: 0,
      quote: { id: 67, quote_number: 'COT-IMPAG-370926DGO', status: 'sent', customer_name: 'Alejandro Echeverria', total: 0 },
    },
    warnings: [],
    sale: null,
  },
};

beforeEach(() => vi.mocked(apiRequest).mockReset());

test('previews payments, pending and the quote it closes, then saves', async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  vi.mocked(apiRequest).mockResolvedValueOnce(PREVIEW).mockResolvedValueOnce({ data: { ...PREVIEW.data, sale: { id: 1 } } });

  render(<CaptureSaleDialog onClose={() => {}} onSaved={onSaved} />);
  await user.type(screen.getByLabelText(/Venta NN_MM_AAAA/), 'Venta 01_10_2026 Total: $700');
  await user.click(screen.getByRole('button', { name: 'Revisar' }));

  expect(JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string)).toMatchObject({ dry_run: true, link_quote: true });
  expect(screen.getByText('$660.00')).toBeInTheDocument();
  expect(screen.getByText(/Anticipo 1: \$40.00/)).toBeInTheDocument();
  expect(screen.getByText('COT-IMPAG-370926DGO')).toBeInTheDocument();

  await user.click(screen.getByRole('checkbox')); // no cerrar la cotización
  await user.click(screen.getByRole('button', { name: 'Registrar venta' }));
  expect(JSON.parse(vi.mocked(apiRequest).mock.calls[1][1]!.body as string)).toMatchObject({ dry_run: false, link_quote: false });
  expect(onSaved).toHaveBeenCalled();
});
