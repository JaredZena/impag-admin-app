import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiRequest } from '@/utils/api';
import { useStoreLinks } from '@/hooks/useStoreLinks';
import StoreDescriptionSection from '../StoreDescriptionSection';

const addNotification = vi.fn();
vi.mock('@/utils/api', () => ({ apiRequest: vi.fn() }));
vi.mock('@/components/ui/notification', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/hooks/useStoreLinks', () => ({
  STORE_BASE_URL: 'https://www.todoparaelcampo.com.mx',
  useStoreLinks: vi.fn(),
}));
vi.mock('@/hooks/useStoreDescription', () => ({
  useStoreDescription: () => 'Trampa para mosca.\nMaterial: PET',
}));
vi.mock('../PublishStorefrontButton', () => ({ default: () => <button type="button">Publicar en tienda</button> }));

beforeEach(() => {
  vi.mocked(apiRequest).mockReset();
  vi.mocked(useStoreLinks).mockReturnValue([{ handle: 'trampa', title: 'Trampa' }]);
  addNotification.mockReset();
});

test('starts from the page text, previews edits and saves them', async () => {
  const onSaved = vi.fn();
  vi.mocked(apiRequest).mockResolvedValue({
    success: true,
    data: { storefront_description: 'Trampa para mosca.\nMaterial: PVC\n- Reutilizable' },
  });
  render(<StoreDescriptionSection productId="371" saved={null} onSaved={onSaved} />);

  const box = await screen.findByLabelText('Especificaciones en la página');
  expect(box).toHaveValue('Trampa para mosca.\nMaterial: PET');
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

  await userEvent.clear(box);
  await userEvent.type(box, 'Trampa para mosca.{enter}Material: PVC{enter}- Reutilizable');
  // Preview: spec row label/value and the bullet.
  expect(screen.getByText('PVC')).toBeInTheDocument();
  expect(screen.getByText('Reutilizable')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Trampa para mosca.\nMaterial: PVC\n- Reutilizable'));
  expect(apiRequest).toHaveBeenCalledWith('/products/371', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ storefront_description: 'Trampa para mosca.\nMaterial: PVC\n- Reutilizable' }),
  }));
  expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
});

test('a saved text the page does not show yet says it still has to be published', async () => {
  render(<StoreDescriptionSection productId="371" saved={'Material: PVC'} onSaved={vi.fn()} />);
  expect(await screen.findByLabelText('Especificaciones en la página')).toHaveValue('Material: PVC');
  expect(screen.getByText(/Falta publicar/)).toBeInTheDocument();
});

test('products not linked to the page show nothing', () => {
  vi.mocked(useStoreLinks).mockReturnValue([]);
  const { container } = render(<StoreDescriptionSection productId="5" saved={null} onSaved={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
