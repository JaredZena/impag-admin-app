// "Especificaciones en la página" (Product.storefront_description): the
// description rows of the product's page on todoparaelcampo.com.mx, typed as
// plain text, one row per line. The rules mirror the store's renderer
// (todoparaelcampo-storefront src/components/ProductDescription.tsx) and its
// sync (scripts/backend_sync.py admin_description_rows), so the preview here
// is what the page shows.

export type StoreRow =
  | { type: 'header'; text: string }
  | { type: 'spec'; label: string; value: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'text'; text: string };

// Machine-translation leftovers the store never shows ("Sustantivo:").
const JUNK_HEADER = /^(sustantivo|no un|verbo|adjetivo|adverbio)\s*:?\s*$/i;

/** The page rows for this text: one per non-empty line, spaces collapsed.
 * The page strips anything tag-shaped, so angle brackets become look-alikes. */
export const storeLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim().replace(/</g, '‹').replace(/>/g, '›'))
    .filter((line) => line && !JUNK_HEADER.test(line));

export const storeRows = (text: string): StoreRow[] => {
  const rows: StoreRow[] = [];
  for (const line of storeLines(text)) {
    const spec = !line.startsWith('-') && /^([^:\n]+):\s+(.+)$/.exec(line);
    if (/^[^:\-\d]+:\s*$/.test(line)) {
      rows.push({ type: 'header', text: line.replace(/:$/, '').trim() });
    } else if (spec) {
      rows.push({ type: 'spec', label: spec[1].trim(), value: spec[2].trim() });
    } else if (line.startsWith('-')) {
      const item = line.replace(/^-\s*/, '');
      const last = rows[rows.length - 1];
      if (last && last.type === 'bullets') last.items.push(item);
      else rows.push({ type: 'bullets', items: [item] });
    } else {
      rows.push({ type: 'text', text: line });
    }
  }
  return rows;
};

/** True when both texts show the same rows on the page. */
export const sameStoreRows = (a: string, b: string): boolean =>
  storeLines(a).join('\n') === storeLines(b).join('\n');
