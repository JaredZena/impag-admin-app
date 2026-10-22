import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider } from '@/components/ui/notification';
import { getApoyosSettings, updateApoyosSettings } from '@/utils/apoyosApi';
import type { ApoyosSettings, ApoyosSettingsResponse } from '@/types/apoyos';
import ApoyosSettingsTab, { validateApoyosSettings } from '../apoyos/ApoyosSettingsTab';

vi.mock('@/utils/apoyosApi', () => ({
  getApoyosSettings: vi.fn(),
  updateApoyosSettings: vi.fn(),
}));

const defaultSettings: ApoyosSettings = {
  enabled: true,
  frequency: 'weekly',
  states: ['durango'],
  include_national: true,
  sectors: ['agricultura'],
  extra_queries: [],
  auto_publish: false,
  model: 'claude-opus-5',
  effort: 'medium',
  max_searches_per_topic: 5,
  max_fetches_per_topic: 4,
  max_programs_per_topic: 8,
  monthly_budget_usd: 40,
  recheck_days: 14,
  keep_closed_days: 60,
  notify_emails: [],
  blocked_domains: [],
};

const response: ApoyosSettingsResponse = {
  settings: defaultSettings,
  defaults: defaultSettings,
  updated_at: '2026-10-15T00:00:00Z',
  updated_by: 'jared.zena@resilia.com',
  options: {
    models: { 'claude-opus-5': 'Claude Opus 5', 'claude-sonnet-5': 'Claude Sonnet 5' },
    frequencies: [{ value: 'weekly', label: 'Semanal' }],
    states: [{ value: 'durango', label: 'Durango' }],
    sectors: [{ value: 'agricultura', label: 'Agricultura' }],
  },
};

const renderTab = () =>
  render(
    <NotificationProvider>
      <ApoyosSettingsTab />
    </NotificationProvider>,
  );

beforeEach(() => {
  vi.mocked(getApoyosSettings).mockReset();
  vi.mocked(updateApoyosSettings).mockReset();
  vi.mocked(getApoyosSettings).mockResolvedValue(response);
});

test('loads settings and shows who last updated them', async () => {
  renderTab();
  expect(await screen.findByText(/por jared.zena@resilia.com/)).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Búsqueda automática' })).toHaveAttribute('aria-checked', 'true');
});

test('saving sends the full settings object as a PUT', async () => {
  const user = userEvent.setup();
  vi.mocked(updateApoyosSettings).mockResolvedValue({ ...response, updated_by: 'otro@impag.mx' });
  renderTab();
  await screen.findByText(/por jared.zena@resilia.com/);

  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() =>
    expect(updateApoyosSettings).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'weekly', enabled: true })),
  );
});

test('toggling auto_publish on shows the warning banner', async () => {
  const user = userEvent.setup();
  renderTab();
  await screen.findByText(/por jared.zena@resilia.com/);

  expect(screen.queryByText(/sin que nadie los revise/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('switch', { name: 'Publicación automática' }));
  expect(screen.getByText(/sin que nadie los revise/)).toBeInTheDocument();
});

test('«Restablecer valores por defecto» discards unsaved edits', async () => {
  const user = userEvent.setup();
  renderTab();
  await screen.findByText(/por jared.zena@resilia.com/);

  await user.click(screen.getByRole('switch', { name: 'Búsqueda automática' }));
  expect(screen.getByRole('switch', { name: 'Búsqueda automática' })).toHaveAttribute('aria-checked', 'false');

  await user.click(screen.getByRole('button', { name: 'Restablecer valores por defecto' }));
  expect(screen.getByRole('switch', { name: 'Búsqueda automática' })).toHaveAttribute('aria-checked', 'true');
});

test('validateApoyosSettings rejects out-of-range limits', () => {
  expect(validateApoyosSettings(defaultSettings)).toBeNull();
  expect(validateApoyosSettings({ ...defaultSettings, max_searches_per_topic: 11 })).toMatch(/Búsquedas por tema/);
  expect(validateApoyosSettings({ ...defaultSettings, monthly_budget_usd: 2000 })).toMatch(/Presupuesto mensual/);
  expect(validateApoyosSettings({ ...defaultSettings, notify_emails: ['no-es-correo'] })).toMatch(/correo/);
  expect(validateApoyosSettings({ ...defaultSettings, extra_queries: Array(21).fill('x') })).toMatch(/Máximo 20/);
});
