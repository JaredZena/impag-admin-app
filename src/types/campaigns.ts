// =============================================================================
// Campaign Planner Type Definitions
// Mirrors the backend serializers in impag-quot routes/campaigns.py
// =============================================================================

// -----------------------------------------------------------------------------
// Literal unions
// -----------------------------------------------------------------------------

export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';

export type CampaignSize = 'chica' | 'mediana' | 'grande';

export type CampaignPhaseStatus = 'pending' | 'in_progress' | 'done';

export type CampaignItemKind = 'post' | 'whatsapp' | 'task' | 'research';

export type CampaignItemStatus = 'planned' | 'ready' | 'done' | 'skipped';

export type CampaignChannel =
  | 'fb-post'
  | 'fb-reel'
  | 'fb-story'
  | 'tiktok'
  | 'wa-status'
  | 'wa-broadcast'
  | 'wa-message';

// -----------------------------------------------------------------------------
// JSON sub-structures
// -----------------------------------------------------------------------------

export interface CampaignGoal {
  goal: string;
  metric: string;
  target: string;
}

export interface CampaignChannelPlanEntry {
  channel: CampaignChannel;
  frequency_per_week: number;
  rationale: string;
}

export interface CampaignChannelPlan {
  channels: CampaignChannelPlanEntry[];
  whatsapp_notify: boolean;
  whatsapp_rationale: string | null;
}

export interface CampaignImportantDate {
  date: string;
  name: string;
  relevance: string;
}

export interface CampaignResearch {
  seasonality_notes: string | null;
  market_context: string | null;
  important_dates: CampaignImportantDate[];
  product_focus: string[];
}

// -----------------------------------------------------------------------------
// Entities
// -----------------------------------------------------------------------------

export interface CampaignItem {
  id: number;
  campaign_id: number;
  phase_id: number | null;
  kind: CampaignItemKind;
  channel: CampaignChannel | null;
  scheduled_date: string | null;
  title: string;
  description: string | null;
  content: string | null;
  status: CampaignItemStatus;
  task_id: number | null;
  social_post_id: number | null;
  sort_order: number;
}

export interface CampaignPhase {
  id: number;
  campaign_id: number;
  name: string;
  description: string | null;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  status: CampaignPhaseStatus;
  items: CampaignItem[];
}

export interface Campaign {
  id: number;
  topic: string;
  title: string;
  objective: string | null;
  audience: string | null;
  size: CampaignSize;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  goals: CampaignGoal[] | null;
  key_messages: string[] | null;
  channel_plan: CampaignChannelPlan | null;
  research: CampaignResearch | null;
  notes: string | null;
  generation_model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  phases?: CampaignPhase[];
  /**
   * Items without a phase: materialized items (with task_id/social_post_id)
   * preserved through a plan regeneration, or items whose phase was deleted.
   * Note: items_total includes these; phases[].items does not.
   */
  orphan_items?: CampaignItem[];
  items_total?: number;
  items_done?: number;
}

// -----------------------------------------------------------------------------
// Request / response payloads
// -----------------------------------------------------------------------------

export interface CampaignGenerateRequest {
  topic: string;
  start_date?: string;
  duration_weeks?: number;
  notes?: string;
}

export interface CampaignUpdatePayload {
  title?: string;
  objective?: string;
  status?: CampaignStatus;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface CampaignItemUpdatePayload {
  status?: CampaignItemStatus;
  title?: string;
  description?: string;
  content?: string;
  scheduled_date?: string;
}

export interface ActivateCampaignResponse {
  campaign: Campaign;
  tasks_created: number;
}

export interface GeneratePostResponse {
  item: CampaignItem;
  social_post_id: number;
}

// -----------------------------------------------------------------------------
// Display metadata (labels + badge styles, shared by campaign pages)
// -----------------------------------------------------------------------------

export const CAMPAIGN_STATUS_META: Record<CampaignStatus, { label: string; cls: string }> = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  active:    { label: 'Activa',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completada', cls: 'bg-green-50 text-green-700 border-green-200' },
  archived:  { label: 'Archivada',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const CAMPAIGN_SIZE_LABELS: Record<CampaignSize, string> = {
  chica: 'Chica',
  mediana: 'Mediana',
  grande: 'Grande',
};

export const CAMPAIGN_ITEM_STATUS_META: Record<CampaignItemStatus, { label: string; cls: string }> = {
  planned: { label: 'Planeado', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  ready:   { label: 'Listo',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  done:    { label: 'Hecho',    cls: 'bg-green-50 text-green-700 border-green-200' },
  skipped: { label: 'Omitido',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const CAMPAIGN_CHANNEL_META: Record<CampaignChannel, { label: string; cls: string }> = {
  'fb-post':      { label: 'FB + IG',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'fb-reel':      { label: 'FB Reel',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'fb-story':     { label: 'FB Story',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'tiktok':       { label: 'TikTok',       cls: 'bg-slate-900 text-white border-slate-900' },
  'wa-status':    { label: 'WA Estado',    cls: 'bg-green-50 text-green-700 border-green-200' },
  'wa-broadcast': { label: 'WA Difusión',  cls: 'bg-green-50 text-green-700 border-green-200' },
  'wa-message':   { label: 'WA Mensaje',   cls: 'bg-green-50 text-green-700 border-green-200' },
};
