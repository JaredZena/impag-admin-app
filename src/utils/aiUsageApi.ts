import { apiRequest } from './api';
import type { AiUsageEvent, AiUsageSummary } from '@/types/aiUsage';

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** GET /ai-usage/summary?days= — totals, per feature, per model, per day. */
export async function getAiUsageSummary(days = 30): Promise<AiUsageSummary> {
  const res = (await apiRequest(`/ai-usage/summary?days=${days}`)) as Envelope<AiUsageSummary>;
  return res.data;
}

/** GET /ai-usage/events?limit=&feature= — latest requests, newest first. */
export async function getAiUsageEvents(params: { limit?: number; feature?: string } = {}): Promise<AiUsageEvent[]> {
  const sp = new URLSearchParams();
  sp.set('limit', String(params.limit ?? 100));
  if (params.feature) sp.set('feature', params.feature);
  const res = (await apiRequest(`/ai-usage/events?${sp.toString()}`)) as Envelope<AiUsageEvent[]>;
  return res.data;
}
