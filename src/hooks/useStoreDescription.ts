import { useEffect, useState } from 'react';
import { STORE_BASE_URL } from '@/hooks/useStoreLinks';

// Backend product id -> the description rows each linked page shows now
// ({handle, text}, one row per line). Published by the storefront's price sync
// (public/backend-descriptions.json, ~130 KB) — fetched only by the product
// detail screen, once per page load.
type StoreDescriptions = Record<string, { handle: string; text: string }[]>;

let cache: Promise<StoreDescriptions> | null = null;

const loadStoreDescriptions = (): Promise<StoreDescriptions> => {
  if (!cache) {
    cache = fetch(`${STORE_BASE_URL}/backend-descriptions.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return cache;
};

/** The first linked page's description text; undefined while loading, '' when
 * the page has none (or the file isn't published yet). */
export const useStoreDescription = (productId: string | number): string | undefined => {
  const [text, setText] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadStoreDescriptions().then((all) => {
      if (active) setText(all[String(productId)]?.[0]?.text ?? '');
    });
    return () => {
      active = false;
    };
  }, [productId]);

  return text;
};
