import { useEffect, useState } from 'react';
import { STORE_BASE_URL } from '@/hooks/useStoreLinks';
import type { SaleStatusEntry } from '@/utils/onlineSale';

// Backend product id -> what the store actually sells. Written by the
// storefront's publish run (public/sale-status.json); fetched once per page
// load and shared by every product row. Missing file / 404 -> empty map.
type SaleStatusMap = Record<string, SaleStatusEntry[]>;

let cache: Promise<SaleStatusMap> | null = null;

const loadSaleStatus = (): Promise<SaleStatusMap> => {
  if (!cache) {
    cache = fetch(`${STORE_BASE_URL}/sale-status.json`)
      .then((res): Promise<unknown> | null => (res.ok ? res.json() : null))
      .then((data): SaleStatusMap =>
        data && typeof data === 'object' && !Array.isArray(data) ? (data as SaleStatusMap) : {},
      )
      .catch((): SaleStatusMap => ({}));
  }
  return cache;
};

// null while loading, [] when the store has no status for this product yet.
export const useSaleStatus = (productId: string | number): SaleStatusEntry[] | null => {
  const [statuses, setStatuses] = useState<SaleStatusEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    loadSaleStatus().then((all) => {
      if (!active) return;
      const entries = all[String(productId)];
      setStatuses(Array.isArray(entries) ? entries : []);
    });
    return () => {
      active = false;
    };
  }, [productId]);

  return statuses;
};
