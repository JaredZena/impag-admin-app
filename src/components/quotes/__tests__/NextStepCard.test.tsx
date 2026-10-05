import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Quote } from '@/types/quotes';
import QuoteDetailPage from '../QuoteDetailPage';

const api = vi.hoisted(() => ({
  getQuote: vi.fn(),
  setQuoteNextAction: vi.fn(),
}));
vi.mock('@/utils/quotesApi', () => api);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'juandanielbetancourt@gmail.com', name: 'Juan Daniel Betancourt' } }),
}));

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 41,
    quote_number: 'TEC-2026-0041',
    status: 'sent',
    customer_name: 'Rodrigo Herrera',
    customer_phone: '6181234567',
    customer_email: null,
    customer_location: null,
    notes: null,
    validity_days: 15,
    subtotal: 1000,
    iva_amount: 160,
    total: 1160,
    sent_at: '2026-10-01T12:00:00Z',
    viewed_at: null,
    accepted_at: null,
    expired_at: null,
    created_by: 'hernan',
    assigned_to: null,
    access_token: null,
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
    items: [],
    next_action: null,
    next_action_owner: null,
    next_action_due: null,
    ...overrides,
  };
}

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/quotes/41']}>
      <Routes>
        <Route path="/quotes/:id" element={<QuoteDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  // Lunes 5 de octubre de 2026. Sólo se congela la fecha; los timers son reales.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
  api.getQuote.mockReset();
  api.setQuoteNextAction.mockReset();
  api.setQuoteNextAction.mockImplementation(async (id: number, body: Record<string, string | null>) =>
    makeQuote({ id, next_action: body.next_action, next_action_owner: body.owner, next_action_due: body.due }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

test('adds a next step: text, owner and a quick due date in a few taps', async () => {
  const user = userEvent.setup();
  api.getQuote.mockResolvedValue(makeQuote());
  renderDetail();

  await user.click(await screen.findByRole('button', { name: /Sin siguiente paso/ }));
  // El responsable empieza en quien tiene la sesión (JD).
  expect(screen.getByRole('button', { name: 'JD' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

  await user.type(screen.getByLabelText('Qué hay que hacer'), 'Llamar a Don Pedro');
  expect(screen.getByText('18/200')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Hernán' }));
  await user.click(screen.getByRole('button', { name: 'Mañana' }));
  expect(screen.getByText('Para el mar 6 oct (mañana)')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(api.setQuoteNextAction).toHaveBeenCalledWith(41, {
    next_action: 'Llamar a Don Pedro',
    owner: 'Hernán',
    due: '2026-10-06',
  });
  expect(await screen.findByText('Llamar a Don Pedro')).toBeInTheDocument();
  expect(screen.getByText('Hernán')).toBeInTheDocument();
  expect(screen.getByText('mañana')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hecho' })).toBeInTheDocument();
});

test('«Hecho» clears the step, then asks «¿Qué sigue?» with the editor open', async () => {
  const user = userEvent.setup();
  api.getQuote.mockResolvedValue(
    makeQuote({ next_action: 'Mandar cotización corregida', next_action_owner: 'JD', next_action_due: '2026-10-03' }),
  );
  renderDetail();

  expect(await screen.findByText('Mandar cotización corregida')).toBeInTheDocument();
  expect(screen.getByText('atrasado 2 días')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Hecho' }));
  expect(api.setQuoteNextAction).toHaveBeenCalledWith(41, { next_action: null, owner: null, due: null });
  expect(await screen.findByRole('heading', { name: '¿Qué sigue?' })).toBeInTheDocument();

  // Sigue el mismo responsable; texto rápido y «Viernes».
  expect(screen.getByRole('button', { name: 'JD' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Llamar al cliente' }));
  await user.click(screen.getByRole('button', { name: /Viernes/ }));
  await user.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(api.setQuoteNextAction).toHaveBeenLastCalledWith(41, {
    next_action: 'Llamar al cliente',
    owner: 'JD',
    due: '2026-10-09',
  });
  expect(await screen.findByText('Llamar al cliente')).toBeInTheDocument();
  expect(screen.getByText('vence vie 9')).toBeInTheDocument();
});

test('«Cambiar» edits the current step; a failed save shows the plain-Spanish error and keeps the editor', async () => {
  const user = userEvent.setup();
  api.getQuote.mockResolvedValue(
    makeQuote({ next_action: 'Mandar fotos del equipo', next_action_owner: 'hernan', next_action_due: '2026-10-07' }),
  );
  api.setQuoteNextAction.mockRejectedValueOnce(new Error('El servidor tuvo un problema. Espera un minuto e intenta de nuevo.'));
  renderDetail();

  await user.click(await screen.findByRole('button', { name: 'Cambiar' }));
  expect(screen.getByLabelText('Qué hay que hacer')).toHaveValue('Mandar fotos del equipo');
  expect(screen.getByRole('button', { name: 'Hernán' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Otra fecha')).toHaveValue('2026-10-07');

  // Tocar el responsable elegido lo quita.
  await user.click(screen.getByRole('button', { name: 'Hernán' }));
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(api.setQuoteNextAction).toHaveBeenCalledWith(41, {
    next_action: 'Mandar fotos del equipo',
    owner: null,
    due: '2026-10-07',
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('El servidor tuvo un problema');
  expect(screen.getByLabelText('Qué hay que hacer')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByLabelText('Qué hay que hacer')).not.toBeInTheDocument());
  expect(screen.getByText('Mandar fotos del equipo')).toBeInTheDocument();
});

test('closed quote without a step shows no card; with one it still shows', async () => {
  api.getQuote.mockResolvedValue(makeQuote({ status: 'accepted' }));
  const { unmount } = renderDetail();
  expect(await screen.findByText('Rodrigo Herrera')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Sin siguiente paso/ })).not.toBeInTheDocument();
  unmount();

  api.getQuote.mockResolvedValue(
    makeQuote({ status: 'accepted', next_action: 'Agendar entrega', next_action_owner: 'Daniel', next_action_due: null }),
  );
  renderDetail();
  expect(await screen.findByText('Agendar entrega')).toBeInTheDocument();
  expect(screen.getByText('Sin fecha')).toBeInTheDocument();
});
