// mirror of routes/panel.py in impag-quot
import { apiRequest } from '@/utils/api';

export type ProfileMetric = 'profile_views' | 'calls' | 'directions' | 'website_clicks' | 'chat_clicks';

export interface PanelData {
  today: string;
  is_owner: boolean;
  google: {
    updated_at: string | null;
    goals_due: string;
    reviews: {
      count: number;
      goal: number;
      avg_stars: number | null;
      latest: { author: string | null; stars: number; date: string }[];
    };
    profile: {
      month: string | null;
      values: Partial<Record<ProfileMetric | 'interactions', number>>;
      previous: Partial<Record<ProfileMetric | 'interactions', number>>;
      series: ({ month: string } & Record<ProfileMetric, number>)[];
    };
    search: {
      last_day: string | null;
      clicks_28d: number | null;
      clicks_prev_28d: number | null;
      impressions_28d: number | null;
      goal: number;
      series: { day: string; clicks: number }[];
    };
  };
  tienda: {
    last_day: string | null;
    first_day: string | null;
    visits_28d: number | null;
    visits_prev_28d: number | null;
    whatsapp_28d: number | null;
    whatsapp_prev_28d: number | null;
    series: { day: string; visits: number }[];
    web_quotes_28d: number;
    web_quotes_prev_28d: number;
    paid_orders_28d: number;
    paid_total_28d: number;
    paid_orders_all: number;
    paid_total_all: number;
  };
  ventas: {
    month: string;
    total: number;
    count: number;
    prev_same_days_total: number;
    prev_same_days_count: number;
  };
}

export async function getPanel(): Promise<PanelData> {
  const res = (await apiRequest('/panel')) as { data: PanelData };
  return res.data;
}
