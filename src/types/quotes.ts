export interface QuoteItem {
  id: number;
  quote_id: number;
  product_id: number | null;
  supplier_product_id: number | null;
  description: string;
  sku: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  iva_applicable: boolean;
  discount_percent: number | null;
  discount_amount: number | null;
  notes: string | null;
  sort_order: number;
  line_total: number;
}

export interface Quote {
  id: number;
  quote_number: string;
  status: QuoteStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_location: string | null;
  notes: string | null;
  validity_days: number;
  subtotal: number;
  iva_amount: number;
  total: number;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  expired_at: string | null;
  created_by: string;
  assigned_to: string | null;
  access_token: string | null;
  created_at: string;
  updated_at: string;
  items: QuoteItem[];
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface CreateQuotePayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_location?: string;
  notes?: string;
  validity_days?: number;
  assigned_to?: string;
  items?: CreateQuoteItemPayload[];
}

export interface CreateQuoteItemPayload {
  product_id?: number;
  supplier_product_id?: number;
  description: string;
  sku?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  iva_applicable?: boolean;
  notes?: string;
  sort_order?: number;
}

export interface UpdateQuotePayload {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_location?: string;
  notes?: string;
  validity_days?: number;
  assigned_to?: string;
  status?: string;
}

export interface QuoteStats {
  total_this_month: number;
  accepted_value: number;
  pending_sent: number;
  pending_viewed: number;
}

export interface ProductSearchResult {
  supplier_product_id: number;
  product_id: number | null;
  name: string;
  sku: string | null;
  unit: string;
  display_price: number;
  iva: boolean;
}

export interface QuoteNotification {
  id: number;
  quote_id: number;
  event_type: 'quote_viewed' | 'quote_accepted';
  message: string;
  is_read: boolean;
  created_at: string;
}
