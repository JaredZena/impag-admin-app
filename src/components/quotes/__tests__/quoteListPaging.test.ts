import { expect, test, vi } from 'vitest';
import type { Quote } from '@/types/quotes';
import { nextQuotePage, startCursors, type QuotePageFetcher } from '../quoteListPaging';

const q = (id: number, status: Quote['status'], sentDay: number): Quote =>
  ({ id, status, sent_at: `2026-09-${String(sentDay).padStart(2, '0')}T12:00:00Z`, created_at: '2026-09-01T00:00:00Z' }) as Quote;

const DB: Record<string, Quote[]> = {
  sent: [q(1, 'sent', 30), q(2, 'sent', 20), q(3, 'sent', 10), q(4, 'sent', 5)],
  requested: [q(5, 'requested', 25), q(6, 'requested', 2)],
};

const fetcher: QuotePageFetcher = async (status, offset, limit) => ({
  data: DB[status].slice(offset, offset + limit),
  total: DB[status].length,
});

test('merges several statuses newest first and pages with offsets', async () => {
  const spy = vi.fn(fetcher);
  const first = await nextQuotePage(startCursors(['sent', 'requested']), 2, spy);
  expect(first.items.map((x) => x.id)).toEqual([1, 5]);
  expect(first.total).toBe(6);
  expect(first.hasMore).toBe(true);

  const second = await nextQuotePage(first.cursors, 2, spy);
  expect(second.items.map((x) => x.id)).toEqual([2, 3]);
  const third = await nextQuotePage(second.cursors, 2, spy);
  expect(third.items.map((x) => x.id)).toEqual([4, 6]);
  expect(third.hasMore).toBe(false);
  expect(spy.mock.calls.map(([status, offset]) => `${status}@${offset}`)).toEqual([
    'sent@0',
    'requested@0',
    'sent@2',
  ]);
});
