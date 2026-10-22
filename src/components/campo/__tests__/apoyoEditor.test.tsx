import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NotificationProvider } from '@/components/ui/notification';
import { createApoyo, deleteApoyo, getApoyo, setApoyoStatus, updateApoyo } from '@/utils/apoyosApi';
import type { ApoyoAdmin } from '@/types/apoyos';
import ApoyoEditorPage from '../ApoyoEditorPage';

vi.mock('@/utils/apoyosApi', () => ({
  getApoyo: vi.fn(),
  createApoyo: vi.fn(),
  updateApoyo: vi.fn(),
  setApoyoStatus: vi.fn(),
  deleteApoyo: vi.fn(),
  getApoyosSiteStatus: vi.fn().mockResolvedValue({ configured: false }),
  publishApoyosSite: vi.fn(),
}));

const baseApoyo = (overrides: Partial<ApoyoAdmin> = {}): ApoyoAdmin =>
  ({
    id: 5,
    slug: 'programa-ejemplo',
    title: 'Programa de ejemplo',
    program: '',
    organism: '',
    level: '',
    states: [],
    sectors: [],
    support_types: [],
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
    year: null,
    source_url: '',
    sources: [],
    category_slugs: [],
    featured: false,
    status: 'draft',
    confidence: 'alta',
    ai_notes: null,
    discovered_run_id: 3,
    first_seen_at: null,
    last_seen_at: null,
    verified_at: null,
    verified_by: null,
    published_at: null,
    updated_at: '2026-10-20T00:00:00Z',
    updated_by: null,
    created_at: '2026-10-20T00:00:00Z',
    window: 'sin-fecha',
    window_label: 'Fecha por confirmar',
    days_left: null,
    ...overrides,
  }) as ApoyoAdmin;

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NotificationProvider>
        <Routes>
          <Route path="/apoyos" element={<div>Lista de apoyos</div>} />
          <Route path="/apoyos/nuevo" element={<ApoyoEditorPage />} />
          <Route path="/apoyos/:id" element={<ApoyoEditorPage />} />
        </Routes>
      </NotificationProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(getApoyo).mockReset();
  vi.mocked(createApoyo).mockReset();
  vi.mocked(updateApoyo).mockReset();
  vi.mocked(setApoyoStatus).mockReset();
  vi.mocked(deleteApoyo).mockReset();
});

test('a draft apoyo can be published via the action bar', async () => {
  const user = userEvent.setup();
  const draft = baseApoyo({ status: 'draft' });
  vi.mocked(getApoyo).mockResolvedValue(draft);
  vi.mocked(setApoyoStatus).mockResolvedValue({ ...draft, status: 'published', published_at: '2026-10-22T00:00:00Z' });

  renderAt('/apoyos/5');
  expect(await screen.findByText('Programa de ejemplo')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Publicar' }));
  await waitFor(() => expect(setApoyoStatus).toHaveBeenCalledWith(5, 'published'));
  expect(await screen.findByText('Ver en la tienda')).toBeInTheDocument();
});

test('a published apoyo shows Despublicar instead of Publicar, and the publish-to-store hint', async () => {
  vi.mocked(getApoyo).mockResolvedValue(baseApoyo({ status: 'published', published_at: '2026-10-21T00:00:00Z' }));
  renderAt('/apoyos/5');

  expect(await screen.findByRole('button', { name: 'Despublicar' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
  expect(screen.getByText(/aparezca en todoparaelcampo.com.mx/)).toBeInTheDocument();
  // Publicado apoyos cannot be deleted from the admin.
  expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
});

test('Eliminar is only offered for draft/rejected apoyos, and calls deleteApoyo', async () => {
  const user = userEvent.setup();
  vi.mocked(getApoyo).mockResolvedValue(baseApoyo({ status: 'rejected' }));
  vi.mocked(deleteApoyo).mockResolvedValue(undefined);
  renderAt('/apoyos/5');

  const deleteBtn = await screen.findByRole('button', { name: /Eliminar/ });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(deleteBtn);
  await waitFor(() => expect(deleteApoyo).toHaveBeenCalledWith(5));
});

test('creating a new apoyo requires a title and calls createApoyo on save', async () => {
  const user = userEvent.setup();
  renderAt('/apoyos/nuevo');

  await user.click(screen.getByRole('button', { name: /Guardar/ }));
  expect(await screen.findByText('El título es obligatorio.')).toBeInTheDocument();
  expect(createApoyo).not.toHaveBeenCalled();

  await user.type(screen.getByLabelText('Título'), 'Nuevo apoyo de prueba');
  vi.mocked(createApoyo).mockResolvedValue(baseApoyo({ id: 42, title: 'Nuevo apoyo de prueba' }));
  await user.click(screen.getByRole('button', { name: /Guardar/ }));
  await waitFor(() =>
    expect(createApoyo).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nuevo apoyo de prueba' })),
  );
});

test('editing a field and saving calls updateApoyo with the full input', async () => {
  const user = userEvent.setup();
  const draft = baseApoyo({ status: 'draft' });
  vi.mocked(getApoyo).mockResolvedValue(draft);
  vi.mocked(updateApoyo).mockResolvedValue({ ...draft, organism: 'FIRA' });
  renderAt('/apoyos/5');

  await screen.findByText('Programa de ejemplo');
  await user.type(screen.getByLabelText('Organismo'), 'FIRA');
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(updateApoyo).toHaveBeenCalledWith(5, expect.objectContaining({ organism: 'FIRA' })));
});
