import { useEffect, useState } from 'react';

export const STORE_BASE_URL = 'https://www.todoparaelcampo.com.mx';

export interface StoreLink {
  handle: string;
  title: string;
}

// Backend product id -> storefront pages. Published by the storefront's daily
// price sync (public/backend-links.json); fetched once per page load and shared
// by every product row.
type StoreLinks = Record<string, StoreLink[]>;

let cache: Promise<StoreLinks> | null = null;

const loadStoreLinks = (): Promise<StoreLinks> => {
  if (!cache) {
    cache = fetch(`${STORE_BASE_URL}/backend-links.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return cache;
};

export const useStoreLinks = (productId: string | number): StoreLink[] | null => {
  const [links, setLinks] = useState<StoreLink[] | null>(null);

  useEffect(() => {
    let active = true;
    loadStoreLinks().then((all) => {
      if (active) setLinks(all[String(productId)] || []);
    });
    return () => {
      active = false;
    };
  }, [productId]);

  return links;
};
