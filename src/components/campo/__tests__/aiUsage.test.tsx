import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AIUsagePage from '../AIUsagePage';
import { apiRequest } from '@/utils/api';
import type { AiUsageEvent, AiUsageSummary } from '@/types/aiUsage';

vi.mock('@/utils/api', () => ({
  apiRequest: vi.fn(),
  setSessionExpirationHandler: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const SUMMARY: AiUsageSummary = {
  since: '2026-09-22T00:00:00Z',
  days: 30,
  total: {
    calls: 42,
    errors: 2,
    cost_usd: 12.345,
    input_tokens: 100000,
    output_tokens: 40000,
    cache_read_input_tokens: 5000,
    cache_creation_input_tokens: 1000,
    web_searches: 6,
    avg_duration_ms: 8200,
    avg_cost_usd: 0.294,
  },
  by_feature: [
    {
      feature: 'agroproyectos.plan',
      label: 'Agroproyectos · plan',
      calls: 20,
      errors: 1,
      cost_usd: 9.5,
      input_tokens: 60000,
      output_tokens: 25000,
      cache_read_input_tokens: 3000,
      cache_creation_input_tokens: 500,
      web_searches: 4,
      avg_duration_ms: 9000,
      avg_cost_usd: 0.475,
    },
  ],
  by_model: [
    {
      model: 'claude-opus-5',
      calls: 42,
      errors: 2,
      cost_usd: 12.345,
      input_tokens: 100000,
      output_tokens: 40000,
      cache_read_input_tokens: 5000,
      cache_creation_input_tokens: 1000,
      web_searches: 6,
      avg_duration_ms: 8200,
      avg_cost_usd: 0.294,
    },
  ],
  by_day: [{ day: '2026-10-21', calls: 1, errors: 0, cost_usd: 0.42, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, web_searches: 0, avg_duration_ms: 0, avg_cost_usd: 0 }],
  usd_mxn: 18.5,
  model_labels: { 'claude-opus-5': 'Claude Opus 5 (recomendado)' },
};

const EVENTS: AiUsageEvent[] = [
  {
    id: 1,
    created_at: '2026-10-21T10:00:00Z',
    feature: 'agroproyectos.plan',
    label: 'Agroproyectos · plan',
    model: 'claude-opus-5',
    requested_model: 'claude-opus-5',
    input_tokens: 3000,
    output_tokens: 1200,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    web_search_requests: 1,
    web_fetch_requests: 0,
    cost_usd: 0.42,
    duration_ms: 9100,
    status: 'ok',
    error_code: null,
    ref_type: 'agro_project',
    ref_id: 1,
  },
];

describe('AIUsagePage', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  test('renders KPIs in USD+MXN, feature/model tables and recent calls with a status chip', async () => {
    mockedApiRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/ai-usage/summary')) return { success: true, data: SUMMARY };
      if (endpoint.startsWith('/ai-usage/events')) return { success: true, data: EVENTS };
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    render(<AIUsagePage />);

    await waitFor(() => {
      // Appears twice: the "Costo total" KPI and the by-model table row (same model).
      expect(screen.getAllByText(/USD\s*12\.35/).length).toBeGreaterThan(0);
    });
    // usd_mxn conversion shown as a sub-label under the USD figure.
    expect(screen.getByText(/\$228\.38/)).toBeInTheDocument(); // 12.345 * 18.5 ≈ 228.38 MXN

    // by_feature table
    expect(screen.getAllByText('Agroproyectos · plan').length).toBeGreaterThan(0);
    // by_model table uses model_labels
    expect(screen.getByText('Claude Opus 5 (recomendado)')).toBeInTheDocument();

    // Recent calls table + status chip
    expect(screen.getByText('OK')).toBeInTheDocument();

    expect(screen.getByText(/Costos estimados a precio de lista de Anthropic/)).toBeInTheDocument();
  });

  test('clicking a feature in the table filters the recent calls request', async () => {
    mockedApiRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/ai-usage/summary')) return { success: true, data: SUMMARY };
      if (endpoint.startsWith('/ai-usage/events')) return { success: true, data: EVENTS };
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    render(<AIUsagePage />);
    await waitFor(() => expect(screen.getAllByText('Agroproyectos · plan').length).toBeGreaterThan(0));

    mockedApiRequest.mockClear();
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.click(screen.getAllByText('Agroproyectos · plan')[0]);

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('feature=agroproyectos.plan')
      );
    });
  });
});
