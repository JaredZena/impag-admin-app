import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CampaignsPage from '../CampaignsPage';
import { apiRequest } from '@/utils/api';
import type { Campaign } from '@/types/campaigns';

vi.mock('@/utils/api', () => ({
  apiRequest: vi.fn(),
  setSessionExpirationHandler: vi.fn(),
}));

vi.mock('@/components/ui/notification', () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const mockCampaign: Campaign = {
  id: 1,
  topic: 'kits de bombeo solar',
  title: 'Temporada de Riego: Bombeo Solar',
  objective: 'Impulsar ventas de kits de bombeo solar',
  audience: 'Agricultores de Durango',
  size: 'mediana',
  status: 'draft',
  start_date: '2026-08-03',
  end_date: '2026-08-30',
  goals: [],
  key_messages: [],
  channel_plan: {
    channels: [{ channel: 'fb-post', frequency_per_week: 3, rationale: 'Alcance base' }],
    whatsapp_notify: true,
    whatsapp_rationale: 'Temporada urgente',
  },
  research: null,
  notes: null,
  generation_model: 'claude-opus-5',
  created_by: 'test@impag.mx',
  created_at: '2026-07-31T00:00:00Z',
  updated_at: '2026-07-31T00:00:00Z',
  items_total: 10,
  items_done: 3,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/campaigns']}>
      <CampaignsPage />
    </MemoryRouter>
  );

describe('CampaignsPage', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  test('renders header, form and empty state when there are no campaigns', async () => {
    mockedApiRequest.mockResolvedValue([]);
    renderPage();

    expect(screen.getByText('Campañas')).toBeInTheDocument();
    expect(screen.getByText('Nueva campaña')).toBeInTheDocument();
    expect(screen.getByText('Generar campaña')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Aún no hay campañas')).toBeInTheDocument();
    });
    expect(mockedApiRequest).toHaveBeenCalledWith('/campaigns');
  });

  test('renders campaign cards with status, size and WhatsApp chips', async () => {
    mockedApiRequest.mockResolvedValue([mockCampaign]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Temporada de Riego: Bombeo Solar')).toBeInTheDocument();
    });
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('Mediana')).toBeInTheDocument();
    expect(screen.getByText('📣 Incluye WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });
});
