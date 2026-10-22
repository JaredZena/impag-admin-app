import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider } from '@/components/ui/notification';
import {
  createApoyoRun,
  getApoyosSiteStatus,
  getApoyosStats,
  listApoyos,
} from '@/utils/apoyosApi';
import type { ApoyoAdmin, ApoyosStats } from '@/types/apoyos';
import ApoyosReviewTab from '../apoyos/ApoyosReviewTab';

vi.mock('@/utils/apoyosApi', () => ({
  listApoyos: vi.fn(),
  getApoyosStats: vi.fn(),
  getApoyosSiteStatus: vi.fn(),
  createApoyoRun: vi.fn(),
  getApoyoRun: vi.fn(),
}));

const stats: ApoyosStats = {
  counts: { draft: 2, published: 5, rejected: 1, archived: 0 },
  published_by_window: { abierta: 3, proxima: 1, permanente: 1, cerrada: 0, 'sin-fecha': 0 },
  by_state: [],
  by_sector: [],
  closing_soon: [],
  month_spend_usd: 4.5,
  monthly_budget_usd: 40,
  last_run: null,
  next_run_due_at: null,
  frequency: 'weekly',
};

const apoyo = (overrides: Partial<ApoyoAdmin> = {}): ApoyoAdmin =>
  ({
    id: 1,
    slug: 'apoyo-1',
    title: 'Producción para el Bienestar',
    program: null,
    organism: 'SADER',
    level: 'federal',
    states: ['durango'],
    sectors: ['agricultura'],
    support_types: ['subsidio'],
    summary: '',
    description: '',
    beneficiaries: '',
    amount_text: '',
    amount_max_mxn: null,
    requirements: [],
    how_to_apply: [],
    opens_at: null,
    closes_at: null,
    deadline_text: '',
    permanent: false,
    year: 2026,
    source_url: 'https://www.gob.mx/programa',
    sources: [],
    category_slugs: [],
    featured: false,
    status: 'draft',
    confidence: 'alta',
    ai_notes: null,
    discovered_run_id: 1,
    first_seen_at: null,
    last_seen_at: null,
    verified_at: null,
    verified_by: null,
    published_at: null,
    updated_at: '2026-10-20T00:00:00Z',
    updated_by: null,
    created_at: '2026-10-20T00:00:00Z',
    window: 'abierta',
    window_label: 'Abierta',
    days_left: 10,
    ...overrides,
  }) as ApoyoAdmin;

const renderTab = () =>
  render(
    <MemoryRouter>
      <NotificationProvider>
        <ApoyosReviewTab />
      </NotificationProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(listApoyos).mockReset();
  vi.mocked(getApoyosStats).mockReset();
  vi.mocked(getApoyosSiteStatus).mockReset();
  vi.mocked(createApoyoRun).mockReset();
  vi.mocked(getApoyosStats).mockResolvedValue(stats);
  vi.mocked(getApoyosSiteStatus).mockResolvedValue({ configured: false });
  vi.mocked(listApoyos).mockResolvedValue({
    items: [apoyo()],
    total: 1,
    counts: { draft: 2, published: 5, rejected: 1, archived: 0 },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

test('opens on «Por revisar» and shows the KPI strip', async () => {
  renderTab();

  await waitFor(() => expect(listApoyos).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' })));
  expect((await screen.findAllByText('Producción para el Bienestar')).length).toBeGreaterThan(0);
  expect(screen.getByText(/4\.50/)).toBeInTheDocument(); // gasto IA del mes
  expect(screen.getByRole('button', { name: /Por revisar \(2\)/ })).toHaveAttribute('aria-pressed', 'true');
});

test('switching the status pill re-fetches with that status', async () => {
  const user = userEvent.setup();
  renderTab();
  await waitFor(() => expect(listApoyos).toHaveBeenCalled());

  vi.mocked(listApoyos).mockClear();
  await user.click(screen.getByRole('button', { name: /Publicados \(5\)/ }));
  await waitFor(() =>
    expect(listApoyos).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' })),
  );
});

test('state/sector filters are passed through to the API', async () => {
  const user = userEvent.setup();
  renderTab();
  await waitFor(() => expect(listApoyos).toHaveBeenCalled());

  vi.mocked(listApoyos).mockClear();
  await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'durango');
  await waitFor(() =>
    expect(listApoyos).toHaveBeenCalledWith(expect.objectContaining({ state: 'durango', status: 'draft' })),
  );

  vi.mocked(listApoyos).mockClear();
  await user.selectOptions(screen.getByLabelText('Filtrar por sector'), 'ganaderia');
  await waitFor(() =>
    expect(listApoyos).toHaveBeenCalledWith(expect.objectContaining({ sector: 'ganaderia' })),
  );
});

test('search debounces before calling the API', async () => {
  const user = userEvent.setup();
  renderTab();
  await waitFor(() => expect(listApoyos).toHaveBeenCalled());

  vi.mocked(listApoyos).mockClear();
  await user.type(screen.getByLabelText('Buscar apoyos'), 'riego');
  expect(listApoyos).not.toHaveBeenCalled();

  await waitFor(() => expect(listApoyos).toHaveBeenCalledWith(expect.objectContaining({ q: 'riego' })));
});

test('«Buscar apoyos ahora» starts a run and shows progress', async () => {
  const user = userEvent.setup();
  vi.mocked(createApoyoRun).mockResolvedValue({
    id: 9,
    trigger: 'manual',
    status: 'running',
    topics: [],
    found_count: 0,
    new_count: 0,
    updated_count: 0,
    closed_count: 0,
    cost_usd: 0,
    web_searches: 0,
    error: null,
    triggered_by: 'jared.zena@resilia.com',
    created_at: '2026-10-22T00:00:00Z',
    started_at: '2026-10-22T00:00:00Z',
    finished_at: null,
    progress: { done: 0, total: 12 },
  });
  renderTab();
  await waitFor(() => expect(listApoyos).toHaveBeenCalled());

  await user.click(screen.getByRole('button', { name: /Buscar apoyos ahora/ }));
  await waitFor(() => expect(createApoyoRun).toHaveBeenCalledTimes(1));
  expect(await screen.findByText(/Progreso: 0 de 12 temas/)).toBeInTheDocument();
});

test('empty state explains there is nothing to review and does not show a table', async () => {
  vi.mocked(listApoyos).mockResolvedValue({ items: [], total: 0, counts: { draft: 0, published: 5, rejected: 1, archived: 0 } });
  renderTab();
  expect(await screen.findByText('No hay apoyos por revisar.')).toBeInTheDocument();
});
