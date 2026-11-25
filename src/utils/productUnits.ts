// Units a product can have: the backend ProductUnit enum. `value` is what the
// API stores, `label` is what the team reads in the admin.
export const PRODUCT_UNITS: { value: string; label: string }[] = [
  { value: 'PIEZA', label: 'Pieza' },
  { value: 'KG', label: 'Kilogramo' },
  { value: 'METRO', label: 'Metro' },
  { value: 'ROLLO', label: 'Rollo' },
  { value: 'PAQUETE', label: 'Paquete' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'KIT', label: 'Kit' },
];

export const productUnitLabel = (unit?: string | null): string => {
  const key = (unit || '').trim().toUpperCase();
  return PRODUCT_UNITS.find((u) => u.value === key)?.label ?? (unit || '—');
};
