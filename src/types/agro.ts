// Mirrors impag-quot routes/agroproyectos.py admin router + services/agroproyectos.py
// / services/agroproyectos_ai.py (Plan/Products/Irrigation), per the Campo IA contract
// §C. Slugs (state, sector) come from campoTaxonomy.ts, the single source.

export type ProducerType = 'nuevo' | 'mejorar' | 'diversificar';
export type WaterSource = 'pozo' | 'rio-canal' | 'red' | 'presa-bordo' | 'temporal' | 'ninguna' | 'no-se';
export type ElectricitySource = 'cfe' | 'no' | 'no-se';
export type ExperienceLevel = 'ninguna' | 'algo' | 'mucha';
export type ProjectGoal = 'autoconsumo' | 'venta-local' | 'negocio' | 'no-se';
export type ProjectTimeline = 'ya' | '3-meses' | '6-meses' | 'explorando';
export type LandUnit = 'm2' | 'ha';

export type AgroStatus = 'pending' | 'plan_ready' | 'products_ready' | 'done' | 'error';
export type LeadStatus = 'nuevo' | 'contactado' | 'en_seguimiento' | 'cotizado' | 'ganado' | 'perdido' | 'descartado';
export type Verdict = 'viable' | 'viable-con-ajustes' | 'requiere-mas-presupuesto' | 'no-recomendado';
export type ProductPriority = 'esencial' | 'recomendado' | 'opcional';
export type IrrigationSystemType = 'goteo' | 'cintilla' | 'aspersion' | 'microaspersion' | 'nebulizacion' | 'otro';
export type PumpPowerSource = 'solar' | 'cfe' | 'gasolina' | 'existente' | 'gravedad';
export type ContactPreferred = 'whatsapp' | 'llamada' | 'correo';

export type ModelChoice = 'claude-opus-5' | 'claude-opus-5-5' | 'claude-sonnet-5' | 'claude-haiku-4-5' | 'claude-fable-5-1';
export type Effort = 'low' | 'medium' | 'high';
export type QuoteMode = 'review' | 'instant';

// ── form inputs (AgroCreate, minus nothing — admin sees everything) ────────

export interface AgroLand {
  has_land: boolean;
  area: number | null;
  unit: LandUnit;
}

export interface AgroUtm {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  apoyo?: string;
}

// The backend stores the WHOLE validated AgroCreate body as `inputs`
// (services/agroproyectos.py create_project: `inputs = body.model_dump(...)`),
// so contact/utm are present here too even though AgroAdmin also surfaces
// contact_name/phone/email and utm as their own top-level fields.
export interface AgroInputs {
  producer_type: ProducerType | null;
  idea: string;
  current_operation: string | null;
  state: string | null;
  municipio: string | null;
  land: AgroLand | null;
  water: WaterSource | null;
  electricity: ElectricitySource | null;
  experience: ExperienceLevel | null;
  goal: ProjectGoal | null;
  timeline: ProjectTimeline | null;
  budget_mxn: number | null;
  budget_unknown: boolean;
  wants_financing: boolean;
  contact?: { name: string; phone: string; email: string | null } | null;
  utm?: AgroUtm | null;
}

// ── plan / products / irrigation (structured AI outputs) ───────────────────

export interface AgroKeyNumber {
  label: string;
  value: string;
  note: string | null;
}

// options[].pros/cons were dropped by the backend (folded into `why` prose) —
// claude-opus-5 hard-400s ("compiled grammar too large") on the full nested
// Plan schema. See be-agro's note 2026-10-22; verified against
// /private/tmp/claude-501/agro-sample-{1,2}.json.
export interface AgroOption {
  name: string;
  kind: 'raza' | 'variedad' | 'especie' | 'sistema';
  recommended: boolean;
  why: string;
}

export interface AgroTimelinePhase {
  phase: string;
  duration: string;
  tasks_summary: string; // was tasks: string[] — flattened for the same reason
}

export interface AgroPlan {
  project_kind: string;
  sector: string;
  title: string;
  summary: string;
  viability: { verdict: Verdict; explanation: string };
  budget: {
    provided_mxn: number | null;
    investment_min_mxn: number;
    investment_max_mxn: number;
    working_capital_mxn: number;
    recommended_start_mxn: number;
    gap_mxn: number | null;
    breakdown: string[]; // was AgroBudgetBreakdownItem[] — see AgroOption comment above
  };
  key_numbers: AgroKeyNumber[];
  scale: { recommendation: string; rationale: string };
  options: AgroOption[];
  infrastructure: string[]; // was AgroInfrastructureItem[] — see AgroOption comment above
  economics: {
    monthly_operating_cost_mxn: number;
    monthly_income_min_mxn: number;
    monthly_income_max_mxn: number;
    months_to_first_income: number;
    payback_months_min: number | null;
    payback_months_max: number | null;
    assumptions: string[];
  };
  timeline: AgroTimelinePhase[];
  risks: string[]; // was AgroRisk[] — see AgroOption comment above
  next_steps: string[];
  needs_irrigation: boolean;
  irrigation_hint: string | null;
  product_needs: string[];
  apoyo_sectors: string[];
  questions_to_confirm: string[];
}

export interface AgroProductItem {
  handle: string;
  title: string;
  category_slug: string;
  quantity: number;
  unit_label: string | null;
  price_total: number | null;
  line_total: number | null;
  why: string;
  priority: ProductPriority;
}

export interface AgroNotInCatalogItem {
  item: string;
  why: string;
  estimated_cost_mxn: number | null;
}

export interface AgroProducts {
  items: AgroProductItem[];
  not_in_catalog: AgroNotInCatalogItem[];
  catalog_total_mxn: number;
  notes: string;
}

export interface AgroIrrigationPump {
  type: string;
  hp: number | null;
  head_m: number | null;
  flow_lpm: number | null;
  power_source: PumpPowerSource;
}

export interface AgroIrrigationCalculation {
  label: string;
  formula: string;
  result: string;
}

export interface AgroIrrigation {
  system_type: IrrigationSystemType;
  area_m2: number;
  crop_or_use: string;
  assumptions: string[];
  design: {
    water_need_m3_day: number;
    emitter: string;
    emitter_flow_lph: number;
    emitter_spacing_m: number;
    row_spacing_m: number;
    emitters_count: number;
    total_flow_lph: number;
    total_flow_lpm: number;
    sectors: number;
    irrigation_hours_per_day: number;
    mainline: string;
    submain: string;
    laterals_m: number;
    filtration: string;
    fertigation: string | null;
    pump: AgroIrrigationPump;
    storage: string | null;
  };
  calculations: AgroIrrigationCalculation[];
  items: AgroProductItem[];
  not_in_catalog: AgroNotInCatalogItem[];
  catalog_total_mxn: number;
  notes: string;
}

export interface AgroMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ── admin list / detail ─────────────────────────────────────────────────

export interface AgroQuoteRef {
  id: number;
  quote_number: string;
  status: string;
  total: number;
}

export interface AgroListItem {
  id: number;
  ref: string;
  token: string;
  created_at: string;
  status: AgroStatus;
  lead_status: LeadStatus;
  producer_type: ProducerType | null;
  title: string | null;
  idea: string; // truncated to ~200 chars by the backend
  project_kind: string | null;
  sector: string | null;
  state: string | null;
  municipio: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  budget_mxn: number | null;
  budget_unknown: boolean;
  investment_min_mxn: number | null;
  investment_max_mxn: number | null;
  verdict: Verdict | null;
  quote: AgroQuoteRef | null;
  contact_requested_at: string | null;
  questions_count: number;
  cost_usd: number;
}

export interface AgroApoyoRef {
  slug: string;
  title: string;
  organism: string | null;
  window: string;
  closes_at: string | null;
  amount_text: string | null;
}

export interface AgroContactRequest {
  preferred: ContactPreferred;
  best_time: string | null;
  message: string | null;
}

// Mirrors services/agroproyectos.py _usage_rows() — note this one has no
// `label` (unlike /ai-usage/events, which adds it server-side); the admin
// UI derives a label from `feature` with aiFeatureLabels.featureLabel().
export interface AgroUsageRow {
  id: number;
  created_at: string | null;
  feature: string;
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
  status: string;
  error_code: string | null;
}

// Which step is in flight right now (a storefront tab has an open generation
// request) — distinct from `status`, which only moves once a step finishes.
// The detail page shows a "Generando…" badge while this is set.
export type GeneratingStep = 'plan' | 'productos' | 'riego';

export interface AgroAdmin extends AgroListItem {
  inputs: AgroInputs;
  plan: AgroPlan | null;
  products: AgroProducts | null;
  irrigation: AgroIrrigation | null;
  messages: AgroMessage[];
  events: Record<string, string> | null;
  contact_request: AgroContactRequest | null;
  utm: AgroUtm | null;
  staff_notes: string | null;
  assigned_to: string | null;
  error: string | null;
  model: string | null;
  generation_ms: number | null;
  generating: GeneratingStep | null;
  generating_since: string | null;
  public_url: string;
  whatsapp_url: string | null;
  usage: AgroUsageRow[];
  apoyos: AgroApoyoRef[];
}

export interface AgroListResponse {
  items: AgroListItem[];
  total: number;
  lead_counts: Record<LeadStatus, number>;
}

// ── stats (Resumen tab) ─────────────────────────────────────────────────

export interface AgroStatsTotals {
  projects: number;
  with_contact: number;
  plans_ready: number;
  done: number;
  errors: number;
  quotes: number;
  quotes_total_mxn: number;
  contact_requests: number;
  won: number;
  lost: number;
  questions: number;
  whatsapp_clicks: number;
  cost_usd: number;
  avg_cost_usd: number;
  avg_generation_ms: number;
}

export interface AgroFunnelStage {
  key: string;
  label: string;
  count: number;
}

export interface AgroDayStat {
  day: string;
  projects: number;
  cost_usd: number;
}

export interface AgroKeyCount {
  key: string;
  label: string;
  count: number;
}

export interface AgroTopProduct {
  handle: string;
  title: string;
  count: number;
}

export interface AgroBudgetBucket {
  label: string;
  count: number;
}

export interface AgroStats {
  totals: AgroStatsTotals;
  funnel: AgroFunnelStage[];
  by_day: AgroDayStat[];
  by_kind: { key: string; count: number }[];
  by_sector: AgroKeyCount[];
  by_state: AgroKeyCount[];
  by_producer_type: AgroKeyCount[];
  budget_buckets: AgroBudgetBucket[];
  lead_status_counts: Partial<Record<LeadStatus, number>>;
  top_products: AgroTopProduct[];
  verdicts: { key: string; label: string; count: number }[];
}

// ── settings (Configuración tab) ────────────────────────────────────────

export interface AgroSettings {
  enabled: boolean;
  model: ModelChoice;
  effort: Effort;
  chat_model: ModelChoice;
  chat_effort: Effort;
  contact_required: boolean;
  max_per_hour: number;
  max_per_phone_per_day: number;
  max_questions: number;
  daily_budget_usd: number;
  monthly_budget_usd: number;
  web_search: boolean;
  max_searches: number;
  quote_mode: QuoteMode;
  include_knowledge: boolean;
  extra_instructions: string;
  excluded_handles: string[];
  notify_new_projects: boolean;
  notify_emails: string[];
  assignee_email: string | null;
}

export interface AgroSettingsResponse {
  settings: AgroSettings;
  defaults: AgroSettings;
  updated_at: string | null;
  updated_by: string | null;
  options: { models: Record<string, string> };
}

export const MODEL_LABELS_FALLBACK: Record<ModelChoice, string> = {
  'claude-opus-5': 'Claude Opus 5 (recomendado)',
  'claude-opus-5-5': 'Claude Opus 5.5',
  'claude-sonnet-5': 'Claude Sonnet 5 (más rápido y económico)',
  'claude-haiku-4-5': 'Claude Haiku 4.5 (el más económico, menos preciso)',
  'claude-fable-5-1': 'Claude Fable 5.1 (el más capaz, el más caro)',
};

export const EFFORT_LABELS: Record<Effort, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};
