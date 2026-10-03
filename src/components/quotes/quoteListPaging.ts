import { apiRequest } from '@/utils/api';
import type { Quote } from '@/types/quotes';

// «Abiertas»: lo que todavía puede convertirse en venta o que le debemos al
// cliente. GET /quotes filtra por un solo estado, así que se pide uno por uno.
export const OPEN_QUOTE_STATUSES = ['requested', 'draft', 'sent', 'viewed', 'needs_work'] as const;

export interface StatusCursor {
  status: string; // '' = todos los estados
  offset: number;
  total: number;
  done: boolean;
  buffer: Quote[]; // ya pedidas pero todavía no mostradas
}

export type QuotePageFetcher = (
  status: string,
  offset: number,
  limit: number,
) => Promise<{ data: Quote[]; total: number }>;

export interface QuotePage {
  cursors: StatusCursor[];
  items: Quote[];
  total: number;
  hasMore: boolean;
}

export const startCursors = (statuses: readonly string[]): StatusCursor[] =>
  statuses.map((status) => ({ status, offset: 0, total: 0, done: false, buffer: [] }));

// Same order as GET /quotes: newest send first, then newest id.
const sortTime = (q: Quote): number => Date.parse(q.sent_at ?? q.created_at) || 0;
export const newestFirst = (a: Quote, b: Quote): number => sortTime(b) - sortTime(a) || b.id - a.id;

// Next `pageSize` quotes across one or more statuses, merged in backend order.
// Each cursor keeps at least `pageSize` quotes buffered (or is exhausted), so an
// older quote is never shown before a newer one from another status.
export async function nextQuotePage(
  cursors: StatusCursor[],
  pageSize: number,
  fetchPage: QuotePageFetcher,
): Promise<QuotePage> {
  const filled = await Promise.all(
    cursors.map(async (c) => {
      if (c.done || c.buffer.length >= pageSize) return c;
      const res = await fetchPage(c.status, c.offset, pageSize);
      const offset = c.offset + res.data.length;
      return {
        ...c,
        offset,
        total: res.total,
        done: res.data.length < pageSize || offset >= res.total,
        buffer: [...c.buffer, ...res.data],
      };
    }),
  );

  const buffers = filled.map((c) => [...c.buffer]);
  const items: Quote[] = [];
  while (items.length < pageSize) {
    let pick = -1;
    buffers.forEach((b, i) => {
      if (b.length > 0 && (pick < 0 || newestFirst(b[0], buffers[pick][0]) < 0)) pick = i;
    });
    if (pick < 0) break;
    items.push(buffers[pick].shift()!);
  }

  return {
    cursors: filled.map((c, i) => ({ ...c, buffer: buffers[i] })),
    items,
    total: filled.reduce((sum, c) => sum + c.total, 0),
    hasMore: filled.some((c, i) => buffers[i].length > 0 || !c.done),
  };
}

export interface OpenQuotesSummary {
  count: number;
  total: number;
}

// Cuántas abiertas hay y cuánto suman, del desglose por estado de
// GET /quotes/pipeline-summary. null si el backend no trae by_status.
export async function getOpenQuotesSummary(): Promise<OpenQuotesSummary | null> {
  const res = (await apiRequest('/quotes/pipeline-summary')) as Record<string, unknown> | null;
  const raw = (res && typeof res.data === 'object' && res.data !== null ? res.data : res) as
    | Record<string, unknown>
    | null;
  const byStatus = raw?.by_status;
  if (!byStatus || typeof byStatus !== 'object') return null;
  let count = 0;
  let total = 0;
  for (const status of OPEN_QUOTE_STATUSES) {
    const bucket = (byStatus as Record<string, { count?: unknown; total?: unknown } | undefined>)[status];
    count += Number(bucket?.count) || 0;
    total += Number(bucket?.total) || 0;
  }
  return { count, total };
}
