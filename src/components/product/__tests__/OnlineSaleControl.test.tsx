import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OnlineSaleControl from '../OnlineSaleControl';

vi.mock('@/components/ui/notification', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/hooks/useSaleStatus', () => ({
  useSaleStatus: () => [{ handle: 'malacate', buyable: false, reasons: ['not_verified', 'disabled'] }],
}));

const onlineSale = {
  enabled: true,
  unit_label: 'pieza',
  delivery: ['recoger' as const],
  min_qty: 1,
  max_qty: 50,
  stock_status: 'in_stock' as const,
  updated_by: 'hernan@impag.mx',
  updated_at: '2026-11-25T12:00:00Z',
};

test('the blocked badge names the minimum price from the row (#962 on 11-26)', () => {
  render(
    <OnlineSaleControl
      productId={962}
      price={2500}
      floor={2924.27}
      margin={0.25}
      iva
      onlineSale={onlineSale}
      storeHandle="malacate"
      storeTitle="Malacate"
      onSaved={() => {}}
    />,
  );
  expect(
    screen.getByText(
      'No se puede vender: el precio $2,500.00 está abajo del mínimo $2,924.27 (costo + 25% de margen); sube el precio o baja el Margen por defecto',
    ),
  ).toBeInTheDocument();
});
