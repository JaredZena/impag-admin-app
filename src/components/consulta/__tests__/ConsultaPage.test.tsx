import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConsultaPage from '../ConsultaPage';
import { apiRequest } from '@/utils/api';

vi.mock('@/utils/api', () => ({
  apiRequest: vi.fn(),
  setSessionExpirationHandler: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint.startsWith('/products/supplier-products')) {
      return {
        success: true,
        data: {
          supplier_products: [
            { id: 1, supplier_name: 'POPUSA', cost: 70, shipping_cost: 10, total_cost: 80, currency: 'MXN', stock: 5 },
            { id: 2, supplier_name: 'Doña Paula', cost: 90, shipping_cost: 0, total_cost: 90, currency: 'MXN', stock: 3 },
          ],
          total: 2,
        },
      };
    }
    if (endpoint.startsWith('/products?')) {
      return {
        success: true,
        data: [
          { id: 9, name: 'Malla sombra 50% 4.2x100', price: 100, iva: true, unit: 'ROLLO', is_calculated_price: false, currency: 'MXN', primary_image_url: null },
        ],
      };
    }
    if (endpoint.startsWith('/quotes?')) {
      return { success: true, data: [], total: 0 };
    }
    if (endpoint.startsWith('/customers?')) return [];
    if (endpoint.startsWith('/hoy')) {
      return { data: { receivable: { total: 1500, rows: [{ customer_name: 'Montañez', pending: 1500, reference: 'Venta 02_10_2026' }] } } };
    }
    if (endpoint.startsWith('/quotes/pipeline-summary')) {
      return { open_count: 0, open_total: 0, stale_count: 0, oldest_days: null, top_open: [] };
    }
    throw new Error(`unexpected ${endpoint}`);
  });
});

test('with no search it shows who owes us', async () => {
  render(
    <MemoryRouter initialEntries={['/consulta']}>
      <ConsultaPage />
    </MemoryRouter>
  );
  expect(await screen.findByText('Montañez')).toBeTruthy();
});

test('a product search shows the price with IVA, the stock and the cheapest cost', async () => {
  render(
    <MemoryRouter initialEntries={['/consulta']}>
      <ConsultaPage />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'malla' } });

  expect(await screen.findByText('Malla sombra 50% 4.2x100')).toBeTruthy();
  expect(screen.getByText('$116.00')).toBeTruthy();
  expect(await screen.findByText('8 rollos')).toBeTruthy();
  expect(screen.getByText('$80.00')).toBeTruthy();
  expect(screen.getByText('POPUSA · con flete')).toBeTruthy();
  expect(screen.getByText('Ganancia ≈ 25%')).toBeTruthy();
});
