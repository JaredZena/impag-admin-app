import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { apiRequest } from '@/utils/api';
import CustomerTypesCard, { type CustomerTypesResponse } from '../CustomerTypesCard';

vi.mock('@/utils/api', () => ({ apiRequest: vi.fn() }));

const RESPONSE: CustomerTypesResponse = {
  year: null,
  total_customers: 3,
  total_amount: 21000,
  sembrando_vida: 1,
  types: [
    {
      slug: 'protegida',
      label: 'Invernadero / casa sombra',
      producer: true,
      customers: 2,
      amount: 20500,
      sembrando_vida: 1,
      items: [
        { name: 'Berenice Ruiz', amount: 20000, sales: 3, last_sale: '2026-06-01', sembrando_vida: true, types: ['riego'] },
        { name: 'Toño Meraz', amount: 500, sales: 1, last_sale: '2025-02-10', sembrando_vida: false, types: [] },
      ],
    },
    {
      slug: 'riego',
      label: 'Riego',
      producer: true,
      customers: 0,
      amount: 0,
      sembrando_vida: 0,
      items: [],
    },
    {
      slug: 'hogar_solar',
      label: 'Hogar / energía solar',
      producer: false,
      customers: 1,
      amount: 500,
      sembrando_vida: 0,
      items: [{ name: 'Jose Rodriguez', amount: 500, sales: 1, last_sale: null, sembrando_vida: false, types: [] }],
    },
  ],
};

beforeEach(() => vi.mocked(apiRequest).mockReset());

const renderCard = () =>
  render(
    <MemoryRouter>
      <CustomerTypesCard years={[2024, 2026, 2025]} />
    </MemoryRouter>,
  );

test('shows buyers per type and opens the customers of a type', async () => {
  const user = userEvent.setup();
  vi.mocked(apiRequest).mockResolvedValue(RESPONSE);
  renderCard();

  const summary = (await screen.findByText('3 clientes')).closest('p')!;
  expect(summary).toHaveTextContent('3 clientes · $21,000 · 1 de Sembrando Vida');
  expect(screen.getByText('no es productor')).toBeInTheDocument();

  const row = screen.getByRole('button', { name: /Invernadero \/ casa sombra/ });
  expect(row).toHaveAttribute('aria-expanded', 'false');
  await user.click(row);
  expect(row).toHaveAttribute('aria-expanded', 'true');

  const table = screen.getByRole('table');
  expect(within(table).getByRole('link', { name: 'Berenice Ruiz' })).toHaveAttribute(
    'href',
    '/customers?q=Berenice%20Ruiz',
  );
  expect(within(table).getByText('También: Riego')).toBeInTheDocument();
  expect(within(table).getByText('Sembrando Vida')).toBeInTheDocument();
});

test('year buttons are newest first and refetch with the year', async () => {
  const user = userEvent.setup();
  vi.mocked(apiRequest).mockResolvedValue(RESPONSE);
  renderCard();
  await screen.findByText('3 clientes');
  expect(vi.mocked(apiRequest).mock.calls[0][0]).toBe('/sales/customer-types');

  const group = screen.getByRole('group', { name: 'Año' });
  expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Todos', '2026', '2025', '2024']);

  await user.click(within(group).getByRole('button', { name: '2025' }));
  expect(vi.mocked(apiRequest).mock.calls.at(-1)![0]).toBe('/sales/customer-types?year=2025');
  expect(within(group).getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true');
});

test('shows a retry when the request fails', async () => {
  vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Sin conexión'));
  renderCard();
  expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
});
