// Mirrors impag-quot services/ai_usage.py summary()/recent() and
// routes/ai_usage.py (GET /ai-usage/summary, GET /ai-usage/events).
// Shared by the "Uso de IA" dashboard and the Agroproyectos tabs that show
// AI cost (Resumen KPIs, Configuración budgets, project detail usage table).

export interface AiUsageBucket {
  calls: number;
  errors: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  web_searches: number;
  avg_duration_ms: number;
  avg_cost_usd: number;
}

export interface AiUsageByFeature extends AiUsageBucket {
  feature: string;
  label: string;
}

export interface AiUsageByModel extends AiUsageBucket {
  model: string;
}

export interface AiUsageByDay extends AiUsageBucket {
  day: string; // YYYY-MM-DD
}

export interface AiUsageSummary {
  since: string;
  days: number;
  total: AiUsageBucket;
  by_feature: AiUsageByFeature[];
  by_model: AiUsageByModel[];
  by_day: AiUsageByDay[];
  usd_mxn: number | null;
  model_labels: Record<string, string>;
}

export interface AiUsageEvent {
  id: number;
  created_at: string | null;
  feature: string;
  label: string;
  model: string | null;
  requested_model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  web_search_requests: number;
  web_fetch_requests: number;
  cost_usd: number;
  duration_ms: number | null;
  status: string; // "ok" | "error" | "timeout" | "refusal" | "max_tokens" | ...
  error_code: string | null;
  ref_type: string | null;
  ref_id: number | null;
}
