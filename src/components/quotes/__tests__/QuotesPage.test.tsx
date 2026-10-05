import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Quote } from '@/types/quotes';
import { getQuoteStats, listQuotes } from '@/utils/quotesApi';
import { apiRequest } from '@/utils/api';
import QuotesPage from '../QuotesPage';

vi.mock('@/utils/quotesApi', () => ({ listQuotes: vi.fn(), getQuoteStats: vi.fn() }));
vi.mock('@/utils/api', () => ({ apiRequest: vi.fn() }));
// La cuenta de la tienda = Hernán (para «Solo míos»).
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'impagtodoparaelcampo@gmail.com', name: 'IMPAG' } }),
}));

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

// Llamadas de la lista (no la de «Qué sigue»).
const listCalls = () => vi.mocked(listQuotes).mock.calls.filter(([p]) => !p?.next_action_due_to);

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  localStorage.clear();
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
  vi.mocked(listQuotes).mockImplementation(async ({ status, search, next_action_due_to } = {}) => {
    if (next_action_due_to) return { data: [], total: 0 };
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
  const statuses = listCalls().map(([p]) => p?.status).sort();
  expect(statuses).toEqual(['draft', 'needs_work', 'requested', 'sent', 'viewed']);
  expect(screen.getByRole('button', { name: 'Abiertas' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByText('Bomba solar 1HP').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Sin total').length).toBeGreaterThan(0);
  expect(screen.getByText('2 · $18,500.00')).toBeInTheDocument();

  vi.mocked(listQuotes).mockClear();
  await user.type(screen.getByLabelText('Buscar cotizaciones'), 'zzz');
  expect(listQuotes).not.toHaveBeenCalled();
  await waitFor(() => expect(listQuotes).toHaveBeenCalledTimes(5));
  expect(listCalls().every(([p]) => p?.search === 'zzz')).toBe(true);
  expect(await screen.findByText('Ninguna cotización abierta coincide con «zzz».')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Buscar en todas' })).toBeInTheDocument();
});

test('«Qué sigue» groups this week\'s next steps and filters to mine', async () => {
  // Lunes 5 de octubre de 2026; la semana cierra el domingo 11.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 9, 0));
  const step = (id: number, due: string, owner: string, total = 0) => ({
    ...quote(id, 'sent', total),
    customer_name: `Cliente paso ${id}`,
    next_action: `Paso ${id}`,
    next_action_owner: owner,
    next_action_due: due,
  });
  const base = vi.mocked(listQuotes).getMockImplementation()!;
  vi.mocked(listQuotes).mockImplementation(async (params = {}) => {
    if (!params.next_action_due_to) return base(params);
    return {
      data: [
        step(3, '2026-10-02', 'JD', 89500),
        step(4, '2026-10-05', 'Hernán'),
        step(5, '2026-10-08', 'hernan', 12000),
        // Fuera de la semana: el backend no debería mandarla, y si la manda no se muestra.
        step(6, '2026-10-20', 'Hernán'),
      ],
      total: 4,
    };
  });

  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <QuotesPage />
    </MemoryRouter>,
  );

  const section = await screen.findByRole('region', { name: 'Qué sigue' });
  expect(await within(section).findByText('Atrasadas · 1')).toBeInTheDocument();
  expect(vi.mocked(listQuotes)).toHaveBeenCalledWith({ next_action_due_to: '2026-10-11', order: 'next_action', limit: 50 });
  expect(within(section).getByText('hasta el dom 11')).toBeInTheDocument();
  expect(within(section).getByText('Hoy · 1')).toBeInTheDocument();
  expect(within(section).getByText('Esta semana · 1')).toBeInTheDocument();
  expect(within(section).getByText('atrasado 3 días')).toBeInTheDocument();
  expect(within(section).getByText('$89,500.00')).toBeInTheDocument();
  expect(within(section).getByRole('link', { name: /Cliente paso 5/ })).toHaveAttribute('href', '/quotes/5');
  expect(within(section).queryByText('Cliente paso 6')).not.toBeInTheDocument();

  const mine = within(section).getByRole('button', { name: 'Solo míos · 2' });
  await user.click(mine);
  expect(mine).toHaveAttribute('aria-pressed', 'true');
  expect(within(section).queryByText('Cliente paso 3')).not.toBeInTheDocument();
  expect(within(section).getByText('Cliente paso 4')).toBeInTheDocument();
  expect(within(section).getByText('Cliente paso 5')).toBeInTheDocument();
});

test('«Qué sigue» empty state', async () => {
  render(
    <MemoryRouter>
      <QuotesPage />
    </MemoryRouter>,
  );
  const section = await screen.findByRole('region', { name: 'Qué sigue' });
  expect(await within(section).findByText('Nada pendiente esta semana.')).toBeInTheDocument();
});
