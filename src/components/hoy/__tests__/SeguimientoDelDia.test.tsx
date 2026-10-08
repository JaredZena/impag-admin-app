import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SeguimientoDelDia from '../SeguimientoDelDia';
import { apiRequest } from '@/utils/api';
import { openWhatsApp, waDigits, waUrl, type SeguimientoDia } from '@/utils/seguimientoApi';

vi.mock('@/utils/api', () => ({
  apiRequest: vi.fn(),
  setSessionExpirationHandler: vi.fn(),
}));

vi.mock('@/utils/seguimientoApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/seguimientoApi')>()),
  openWhatsApp: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const day: SeguimientoDia = {
  day: '2026-10-03',
  target: 20,
  available: { cotizacion: 1, temporada: 1, inactivo: 0 },
  done: [],
  todo: [
    {
      key: 'morales|526771059056',
      kind: 'cotizacion',
      customer_name: 'Morales',
      phone: '+526771059056',
      wa: '526771059056',
      reason: '270926DGO · Kit de riego · enviada 22/09 · seguimiento #1',
      message: 'Hola Morales, buen día. ¿Pudo revisar la cotización?',
      amount: 0,
      quote_ids: [7],
    },
    {
      key: 'maria fernandez',
      kind: 'temporada',
      customer_name: 'Maria Fernandez',
      phone: null,
      wa: null,
      reason: 'Compró en dic 2025: bolsa 17x17',
      message: 'Hola Maria, buen día. En diciembre del año pasado nos compró bolsa 17x17.',
      amount: 10750,
      quote_ids: [],
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(openWhatsApp).mockReset();
  mockedApiRequest.mockReset();
  mockedApiRequest.mockImplementation(async (endpoint: string) =>
    endpoint.startsWith('/hoy/seguimiento?') ? { data: day } : { data: { id: 1 } }
  );
});

test('waDigits adds the Mexican country code', () => {
  expect(waDigits('677 105 9056')).toBe('526771059056');
  expect(waDigits('5216771059056')).toBe('526771059056');
  expect(waDigits('123')).toBeNull();
});

test('waUrl opens the desktop app, WhatsApp Web or wa.me on a phone', () => {
  expect(waUrl('526771059056', 'Hola')).toBe('whatsapp://send?phone=526771059056&text=Hola');
  expect(waUrl('526771059056', undefined, 'web')).toBe('https://web.whatsapp.com/send?phone=526771059056');
  const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 14)');
  expect(waUrl('526771059056', 'Hola', 'web')).toBe('https://wa.me/526771059056?text=Hola');
  ua.mockRestore();
});

test('WhatsApp opens the chat with the message and records it', async () => {
  const onChange = vi.fn();
  render(<SeguimientoDelDia onChange={onChange} />);
  await screen.findByText('Morales');

  fireEvent.click(screen.getAllByRole('button', { name: 'WhatsApp' })[0]);
  expect(openWhatsApp).toHaveBeenCalledWith(
    `whatsapp://send?phone=526771059056&text=${encodeURIComponent(day.todo[0].message)}`
  );
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  const post = mockedApiRequest.mock.calls.find(([, opts]) => opts?.method === 'POST');
  expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
    key: 'morales|526771059056',
    kind: 'cotizacion',
    quote_ids: [7],
    outcome: 'enviado',
  });
});

test('WhatsApp Web is remembered and used instead of the app', async () => {
  render(<SeguimientoDelDia onChange={vi.fn()} />);
  await screen.findByText('Morales');
  fireEvent.click(screen.getByRole('button', { name: 'WhatsApp Web' }));
  expect(localStorage.getItem('seguimiento.waTarget')).toBe('web');

  fireEvent.click(screen.getAllByRole('button', { name: 'WhatsApp' })[0]);
  expect(openWhatsApp).toHaveBeenCalledWith(
    expect.stringMatching(/^https:\/\/web\.whatsapp\.com\/send\?phone=526771059056&text=/)
  );
  await waitFor(() => expect(mockedApiRequest.mock.calls.some(([, opts]) => opts?.method === 'POST')).toBe(true));
});

test('Ya compró closes it without writing to them', async () => {
  const onChange = vi.fn();
  render(<SeguimientoDelDia onChange={onChange} />);
  await screen.findByText('Morales');

  fireEvent.click(screen.getAllByRole('button', { name: 'Ya compró' })[0]);
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(openWhatsApp).not.toHaveBeenCalled();
  const post = mockedApiRequest.mock.calls.find(([, opts]) => opts?.method === 'POST');
  expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ quote_ids: [7], outcome: 'venta' });
});

test('without a number: type it to enable WhatsApp, or copy the message', async () => {
  render(<SeguimientoDelDia onChange={vi.fn()} />);
  await screen.findByText('Maria Fernandez');
  const buttons = screen.getAllByRole('button', { name: 'WhatsApp' });
  expect(buttons[1]).toBeDisabled();
  expect(screen.getByRole('button', { name: /Copiar/ })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Teléfono de Maria Fernandez'), {
    target: { value: '618 123 4567' },
  });
  expect(screen.getAllByRole('button', { name: 'WhatsApp' })[1]).toBeEnabled();
});
