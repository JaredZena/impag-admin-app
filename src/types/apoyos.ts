// Mirrors impag-quot routes/apoyos.py + services/apoyos.py, services/apoyos_discovery.py.
// Slugs come from src/utils/campoTaxonomy.ts (shared with the backend's campo_taxonomy.py).

export type ApoyoStatus = 'draft' | 'published' | 'rejected' | 'archived';
export type ApoyoConfidence = 'alta' | 'media' | 'baja';
export type ApoyoWindow = 'abierta' | 'proxima' | 'permanente' | 'cerrada' | 'sin-fecha';

export interface ApoyoSource {
  url: string;
  title: string;
}

// Editable columns — POST /apoyos (create) and PUT /apoyos/{id} (partial update).
export interface ApoyoInput {
  title: string;
  program?: string | null;
  organism?: string | null;
  level?: string | null;
  states?: string[];
  sectors?: string[];
  support_types?: string[];
  summary?: string | null;
  description?: string | null;
  beneficiaries?: string | null;
  amount_text?: string | null;
  amount_max_mxn?: number | null;
  requirements?: string[];
  how_to_apply?: string[];
  opens_at?: string | null; // YYYY-MM-DD
  closes_at?: string | null; // YYYY-MM-DD
  deadline_text?: string | null;
  permanent?: boolean;
  year?: number | null;
  source_url?: string | null;
  sources?: ApoyoSource[];
  category_slugs?: string[];
  featured?: boolean;
  slug?: string;
}

// GET/response shape: every Apoyo column (dates ISO, numerics as float) + the
// computed window fields. AI-only fields (confidence, ai_notes, discovered_run_id,
// first/last_seen_at) are null for manually created apoyos.
export interface ApoyoAdmin extends Required<Omit<ApoyoInput, 'slug'>> {
  id: number;
  slug: string;
  status: ApoyoStatus;
  confidence: ApoyoConfidence | null;
  ai_notes: string | null;
  discovered_run_id: number | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  published_at: string | null;
  updated_at: string;
  updated_by: string | null;
  created_at: string;
  window: ApoyoWindow;
  window_label: string;
  days_left: number | null;
}

export interface ApoyoListResponse {
  items: ApoyoAdmin[];
  total: number;
  counts: {
    draft: number;
    published: number;
    rejected: number;
    archived: number;
  };
}

export interface ApoyoListParams {
  status?: ApoyoStatus | 'all';
  q?: string;
  state?: string;
  sector?: string;
  window?: ApoyoWindow;
  limit?: number;
  offset?: number;
}

export interface ApoyosStatsByKey {
  key: string;
  label: string;
  count: number;
}

export interface ApoyosStats {
  counts: {
    draft: number;
    published: number;
    rejected: number;
    archived: number;
  };
  published_by_window: Record<ApoyoWindow, number>;
  by_state: ApoyosStatsByKey[];
  by_sector: ApoyosStatsByKey[];
  closing_soon: ApoyoAdmin[];
  month_spend_usd: number;
  monthly_budget_usd: number;
  last_run: ApoyoRun | null;
  next_run_due_at: string | null;
  frequency: ApoyosFrequency;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export type ApoyoRunTrigger = 'manual' | 'schedule';
export type ApoyoRunStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export type ApoyoTopicStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';
export type ApoyoTopicKind = 'nacional' | 'estado' | 'query' | 'recheck';

export interface ApoyoRunTopic {
  key: string;
  label: string;
  query: string;
  kind: ApoyoTopicKind;
  status: ApoyoTopicStatus;
  found: number;
  new: number;
  updated: number;
  error: string | null;
  cost_usd: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface ApoyoRun {
  id: number;
  trigger: ApoyoRunTrigger;
  status: ApoyoRunStatus;
  topics: ApoyoRunTopic[];
  found_count: number;
  new_count: number;
  updated_count: number;
  closed_count: number;
  cost_usd: number;
  web_searches: number;
  error: string | null;
  triggered_by: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  progress: { done: number; total: number };
}

export interface ApoyoRunDispatchResult extends ApoyoRun {
  dispatch_error?: string;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type ApoyosFrequency =
  | 'daily'
  | 'every_2_days'
  | 'every_3_days'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'paused';

export type AiModel = 'claude-opus-5' | 'claude-opus-5-5' | 'claude-sonnet-5' | 'claude-haiku-4-5' | 'claude-fable-5-1';
export type AiEffort = 'low' | 'medium' | 'high';

export interface ApoyosSettings {
  enabled: boolean;
  frequency: ApoyosFrequency;
  states: string[];
  include_national: boolean;
  sectors: string[];
  extra_queries: string[];
  auto_publish: boolean;
  model: AiModel;
  effort: AiEffort;
  max_searches_per_topic: number;
  max_fetches_per_topic: number;
  max_programs_per_topic: number;
  monthly_budget_usd: number;
  recheck_days: number;
  keep_closed_days: number;
  notify_emails: string[];
  blocked_domains: string[];
}

export interface ApoyosSettingsOptions {
  models: Record<string, string>;
  frequencies: { value: ApoyosFrequency; label: string }[];
  states: { value: string; label: string }[];
  sectors: { value: string; label: string }[];
}

export interface ApoyosSettingsResponse {
  settings: ApoyosSettings;
  defaults: ApoyosSettings;
  updated_at: string | null;
  updated_by: string | null;
  options: ApoyosSettingsOptions;
}

// ---------------------------------------------------------------------------
// Site publish (storefront GitHub Actions workflow)
// ---------------------------------------------------------------------------

export interface ApoyosSiteStatus {
  configured: boolean;
  status?: 'queued' | 'in_progress' | 'completed' | null;
  conclusion?: 'success' | 'failure' | null;
  created_at?: string | null;
  html_url?: string | null;
}
