import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgroLeadsTab from '../agro/AgroLeadsTab';
import AgroConfigTab from '../agro/AgroConfigTab';
import AgroDetailPage from '../AgroDetailPage';
import { apiRequest } from '@/utils/api';
import type { AgroAdmin, AgroListResponse, AgroSettingsResponse } from '@/types/agro';
import type { AiUsageSummary } from '@/types/aiUsage';

vi.mock('@/utils/api', () => ({
  apiRequest: vi.fn(),
  setSessionExpirationHandler: vi.fn(),
}));

const addNotification = vi.fn();
vi.mock('@/components/ui/notification', () => ({
  useNotifications: () => ({ addNotification }),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const LIST_RESPONSE: AgroListResponse = {
  items: [
    {
      id: 1,
      ref: 'AGR-261022-0001',
      token: 't1',
      created_at: '2026-10-20T10:00:00Z',
      status: 'plan_ready',
      lead_status: 'nuevo',
      producer_type: 'nuevo',
      title: 'Engorda de borregos',
      idea: 'Quiero empezar con borregos de engorda',
      project_kind: 'ovinos-engorda',
      sector: 'ganaderia',
      state: 'durango',
      municipio: 'Nuevo Ideal',
      contact_name: 'Juan Pérez',
      contact_phone: '+528181234567',
      contact_email: null,
      budget_mxn: 80000,
      budget_unknown: false,
      investment_min_mxn: 60000,
      investment_max_mxn: 100000,
      verdict: 'viable',
      quote: null,
      contact_requested_at: null,
      questions_count: 0,
      cost_usd: 0.42,
    },
  ],
  total: 1,
  lead_counts: {
    nuevo: 1,
    contactado: 0,
    en_seguimiento: 0,
    cotizado: 0,
    ganado: 0,
    perdido: 0,
    descartado: 0,
  },
};

describe('AgroLeadsTab', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  test('lists leads with lead-status badges and pill counts', async () => {
    mockedApiRequest.mockResolvedValue({ success: true, data: LIST_RESPONSE });
    render(
      <MemoryRouter>
        <AgroLeadsTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Engorda de borregos').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0);
    expect(screen.getByText('Nuevo (1)')).toBeInTheDocument();
    expect(mockedApiRequest).toHaveBeenCalledWith(expect.stringContaining('/agroproyectos/projects?'));
  });

  test('empty state when no project matches the filters', async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      data: { items: [], total: 0, lead_counts: LIST_RESPONSE.lead_counts },
    });
    render(
      <MemoryRouter>
        <AgroLeadsTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ningún proyecto coincide con estos filtros.')).toBeInTheDocument();
    });
  });
});

const AGRO_ADMIN: AgroAdmin = {
  ...LIST_RESPONSE.items[0],
  inputs: {
    producer_type: 'nuevo',
    idea: 'Quiero empezar con borregos de engorda',
    current_operation: null,
    state: 'durango',
    municipio: 'Nuevo Ideal',
    land: { has_land: true, area: 2, unit: 'ha' },
    water: 'pozo',
    electricity: 'cfe',
    experience: 'ninguna',
    goal: 'negocio',
    timeline: 'ya',
    budget_mxn: 80000,
    budget_unknown: false,
    wants_financing: false,
  },
  plan: null,
  products: null,
  irrigation: null,
  messages: [],
  events: {},
  contact_request: null,
  utm: null,
  staff_notes: null,
  assigned_to: null,
  error: null,
  model: 'claude-opus-5',
  generation_ms: 12000,
  generating: null,
  generating_since: null,
  public_url: 'https://www.todoparaelcampo.com.mx/agroproyectos?p=t1',
  whatsapp_url: 'https://wa.me/528181234567',
  usage: [
    {
      id: 10,
      created_at: '2026-10-20T10:00:05Z',
      feature: 'agroproyectos.plan',
      model: 'claude-opus-5',
      requested_model: 'claude-opus-5',
      input_tokens: 2000,
      output_tokens: 800,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      web_search_requests: 0,
      web_fetch_requests: 0,
      cost_usd: 0.42,
      duration_ms: 9000,
      status: 'ok',
      error_code: null,
    },
  ],
  apoyos: [],
};

describe('AgroDetailPage', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    addNotification.mockReset();
  });

  const renderDetail = () =>
    render(
      <MemoryRouter initialEntries={['/agroproyectos/1']}>
        <Routes>
          <Route path="/agroproyectos/:id" element={<AgroDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  test('renders the project and sends a PATCH when the lead status changes', async () => {
    mockedApiRequest.mockResolvedValueOnce({ success: true, data: AGRO_ADMIN });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Engorda de borregos')).toBeInTheDocument();
    });
    // The AI usage table renders the feature label derived client-side.
    expect(screen.getByText('Agroproyectos · plan')).toBeInTheDocument();

    const updated: AgroAdmin = { ...AGRO_ADMIN, lead_status: 'contactado' };
    mockedApiRequest.mockResolvedValueOnce({ success: true, data: updated });

    const combo = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(combo, { target: { value: 'contactado' } });

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/agroproyectos/projects/1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ lead_status: 'contactado' }) })
      );
    });
  });

  test('shows a "Generando…" badge while a step is in flight', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      success: true,
      data: { ...AGRO_ADMIN, generating: 'productos', generating_since: '2026-10-22T10:00:00Z' },
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Generando productos…')).toBeInTheDocument();
    });
  });
});

const SETTINGS_RESPONSE: AgroSettingsResponse = {
  settings: {
    enabled: true,
    model: 'claude-opus-5',
    effort: 'medium',
    chat_model: 'claude-opus-5',
    chat_effort: 'low',
    contact_required: true,
    max_per_hour: 30,
    max_per_phone_per_day: 5,
    max_questions: 10,
    daily_budget_usd: 25,
    monthly_budget_usd: 300,
    web_search: false,
    max_searches: 3,
    quote_mode: 'review',
    include_knowledge: true,
    extra_instructions: '',
    excluded_handles: [],
    notify_new_projects: true,
    notify_emails: [],
    assignee_email: null,
  },
  defaults: {
    enabled: true,
    model: 'claude-opus-5',
    effort: 'medium',
    chat_model: 'claude-opus-5',
    chat_effort: 'low',
    contact_required: true,
    max_per_hour: 30,
    max_per_phone_per_day: 5,
    max_questions: 10,
    daily_budget_usd: 25,
    monthly_budget_usd: 300,
    web_search: false,
    max_searches: 3,
    quote_mode: 'review',
    include_knowledge: true,
    extra_instructions: '',
    excluded_handles: [],
    notify_new_projects: true,
    notify_emails: [],
    assignee_email: null,
  },
  updated_at: null,
  updated_by: null,
  options: { models: { 'claude-opus-5': 'Claude Opus 5 (recomendado)' } },
};

const EMPTY_USAGE_SUMMARY: AiUsageSummary = {
  since: '2026-10-21T00:00:00Z',
  days: 1,
  total: {
    calls: 0,
    errors: 0,
    cost_usd: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    web_searches: 0,
    avg_duration_ms: 0,
    avg_cost_usd: 0,
  },
  by_feature: [],
  by_model: [],
  by_day: [],
  usd_mxn: 18.5,
  model_labels: {},
};

describe('AgroConfigTab', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    addNotification.mockReset();
  });

  test('loads settings and saves an edited field via PUT', async () => {
    mockedApiRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/agroproyectos/settings')) return { success: true, data: SETTINGS_RESPONSE };
      if (endpoint.startsWith('/ai-usage/summary')) return { success: true, data: EMPTY_USAGE_SUMMARY };
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    render(<AgroConfigTab />);

    await waitFor(() => {
      expect(screen.getByText('Diseñador de proyectos')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Prioriza siempre bombeo solar/i);
    fireEvent.change(textarea, { target: { value: 'Prioriza equipo nacional.' } });

    const updatedResponse: AgroSettingsResponse = {
      ...SETTINGS_RESPONSE,
      settings: { ...SETTINGS_RESPONSE.settings, extra_instructions: 'Prioriza equipo nacional.' },
      updated_at: '2026-10-22T12:00:00Z',
      updated_by: 'jared.zena@resilia.com',
    };
    mockedApiRequest.mockResolvedValueOnce({ success: true, data: updatedResponse });

    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });
    const putCall = mockedApiRequest.mock.calls.find(([, opts]) => (opts as RequestInit | undefined)?.method === 'PUT');
    expect(putCall).toBeTruthy();
    const body = JSON.parse((putCall![1] as RequestInit).body as string);
    expect(body.extra_instructions).toBe('Prioriza equipo nacional.');
  });
});
