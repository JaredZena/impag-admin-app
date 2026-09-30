// mirror of PUT/DELETE /products/{id}/online-sale in impag-quot routes/products.py
// Goes through apiRequest so auth + 401 handling stay centralized.

import { apiRequest, ApiError } from '@/utils/api';
import type { OnlineSale, OnlineSaleInput } from '@/types/api';

export interface OnlineSaleResponse {
  id: number;
  online_sale: OnlineSale | null;
}

// FastAPI 422 "detail" is an array, which apiRequest stringifies into
// "[object Object]" — replace it with something Hernán can act on.
const friendlyError = (err: unknown): Error => {
  if (err instanceof ApiError && err.status === 422) {
    return new Error('Los datos de venta no son válidos. Revisa unidad, entregas y cantidades.');
  }
  if (err instanceof ApiError && err.status === 404) {
    return new Error('No se encontró el producto (¿lo archivaron?).');
  }
  return err instanceof Error ? err : new Error('No se pudo guardar la venta en línea');
};

export const saveOnlineSale = async (
  productId: string | number,
  input: OnlineSaleInput,
): Promise<OnlineSaleResponse> => {
  try {
    return await apiRequest(`/products/${productId}/online-sale`, {
      method: 'PUT',
      body: JSON.stringify({ ...input, unit_label: input.unit_label.trim() }),
    });
  } catch (err) {
    throw friendlyError(err);
  }
};

// Back to "never configured" (NULL): the storefront falls back to its own config.
export const clearOnlineSale = async (productId: string | number): Promise<OnlineSaleResponse> => {
  try {
    return await apiRequest(`/products/${productId}/online-sale`, { method: 'DELETE' });
  } catch (err) {
    throw friendlyError(err);
  }
};
