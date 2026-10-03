import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Quote } from '@/types/quotes';
import { getQuoteStats, listQuotes } from '@/utils/quotesApi';
import { apiRequest } from '@/utils/api';
import QuotesPage from '../QuotesPage';

vi.mock('@/utils/quotesApi', () => ({ listQuotes: vi.fn(), getQuoteStats: vi.fn() }));
vi.mock('@/utils/api', () => ({ apiRequest: vi.fn() }));

const quote = (id: number, status: Quote['status'], total: number, notes: string | null = null): Quote =>
  ({
    id,
    status,
    total,
    notes,
    quote_number: `COT-IMPAG-${id}`,
    customer_name: `Cliente ${id}`,
    customer_phone: '618',
    sent_at: `2026-10-0${id}T12:00:00Z`,
    created_at: '2026-10-01T00:00:00Z',
    items: [],
  }) as unknown as Quote;

beforeEach(() => {
  vi.mocked(listQuotes).mockReset();
  vi.mocked(getQuoteStats).mockResolvedValue({
    total_this_month: 9,
    accepted_value: 0,
    pending_sent: 1,
    pending_viewed: 0,
    needs_work: 0,
    requested: 1,
  });
  vi.mocked(apiRequest).mockResolvedValue({
    success: true,
    data: { by_status: { sent: { count: 1, total: 18500 }, requested: { count: 1, total: 0 }, accepted: { count: 4, total: 9 } } },
  });
  vi.mocked(listQuotes).mockImplementation(async ({ status, search } = {}) => {
    if (search) return { data: [], total: 0 };
    if (status === 'sent') return { data: [quote(2, 'sent', 18500, 'Material/Proyecto: Bomba solar 1HP')], total: 1 };
    if (status === 'requested') return { data: [quote(1, 'requested', 0)], total: 1 };
    return { data: [], total: 0 };
  });
});

test('opens on «Abiertas», merging the open statuses, and debounces the search', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <QuotesPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Mostrando 2 de 2')).toBeInTheDocument();
  const statuses = vi.mocked(listQuotes).mock.calls.map(([p]) => p?.status).sort();
  expect(statuses).toEqual(['draft', 'needs_work', 'requested', 'sent', 'viewed']);
  expect(screen.getByRole('button', { name: 'Abiertas' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByText('Bomba solar 1HP').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Sin total').length).toBeGreaterThan(0);
  expect(screen.getByText('2 · $18,500.00')).toBeInTheDocument();

  vi.mocked(listQuotes).mockClear();
  await user.type(screen.getByLabelText('Buscar cotizaciones'), 'zzz');
  expect(listQuotes).not.toHaveBeenCalled();
  await waitFor(() => expect(listQuotes).toHaveBeenCalledTimes(5));
  expect(vi.mocked(listQuotes).mock.calls.every(([p]) => p?.search === 'zzz')).toBe(true);
  expect(await screen.findByText('Ninguna cotización abierta coincide con «zzz».')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Buscar en todas' })).toBeInTheDocument();
});
