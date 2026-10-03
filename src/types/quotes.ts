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
  // Pedidos web (tienda en línea / Mercado Pago). Opcionales: el backend los
  // devuelve sólo cuando serialize_quote los incluye; en cotizaciones normales
  // vienen null o no vienen.
  payment_status?: QuotePaymentStatus | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  customer_id?: number | null;
}

// Valores que escribe POST /storefront/orders. Se deja abierto a otros strings
// para tolerar estados nuevos de Mercado Pago sin romper el render.
export type QuotePaymentStatus =
  | 'checkout'
  | 'pending'
  | 'in_process'
  | 'authorized'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'charged_back'
  | 'in_mediation'
  | 'mismatch'
  | 'amount_mismatch'
  | (string & {});

// requested = "Por cotizar" (el cliente pidió cotización y aún no sale; número
// SOL-ddmmyy-N hasta que se registra su «Cotización Enviada» o se sube el PDF).
// needs_work = "Por ajustar" (le debemos una cotización corregida). rejected se
// muestra como "Perdida".
export type QuoteStatus =
  | 'requested'
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'needs_work'
  | 'accepted'
  | 'rejected'
  | 'expired';

// Estados que se cambian a mano (POST /quotes/{id}/status).
export type ManualQuoteStatus = 'sent' | 'needs_work' | 'accepted' | 'rejected' | 'expired';

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
  // Sólo cotizaciones sin productos (registradas desde el PDF / WhatsApp).
  total?: number;
}

export interface QuoteStats {
  total_this_month: number;
  accepted_value: number;
  pending_sent: number;
  pending_viewed: number;
  needs_work?: number;
  requested?: number;
}

// POST /quotes/capture — registrar desde el mensaje *Cotización Enviada*.
export interface CaptureQuotePayload {
  text: string;
  total?: string;
  customer_phone?: string;
  sent_date?: string; // YYYY-MM-DD
  dry_run?: boolean;
}

export interface CaptureQuotePreview {
  // converted: la «Cotización Enviada» de una solicitud Por cotizar.
  action: 'created' | 'updated' | 'converted';
  kind?: 'quote' | 'request'; // request = «Solicitud de Cotización»
  request_number?: string | null;
  phone?: string | null;
  datos?: string | null;
  quote_number: string;
  folio: string;
  tag: string | null;
  customer_name: string | null;
  customer_location: string | null;
  delivery: string | null;
  material: string | null;
  existing: { id: number; status: QuoteStatus; total: number; customer_name: string } | null;
  // Sólo al registrar desde PDF (POST /quotes/capture-pdf).
  total?: number | null;
  pdf_date?: string | null; // YYYY-MM-DD, la «Fecha:» del PDF
  contexto?: string | null;
}

export interface CaptureQuotePdfPayload {
  file: File;
  text?: string; // mensaje *Cotización Enviada* opcional; sus datos ganan
  customer_phone?: string;
  sent_date?: string; // YYYY-MM-DD; sin ella, la fecha del PDF
  dry_run?: boolean;
}

// PDF de la cotización guardado en R2 (GET /quotes/{id}/files).
export interface QuoteFile {
  id: number;
  filename: string;
  size: number;
  created_at: string | null;
  view_url: string; // URL firmada, vence en 1 hora
}

export interface QuoteFileUploadResult {
  files: QuoteFile[];
  total_set: number | null;
  converted_from?: string; // la solicitud SOL-… que este PDF envió
  warnings: string[];
  quote: Quote;
}

export interface CaptureQuoteResult {
  preview: CaptureQuotePreview;
  warnings: string[];
  quote: Quote | null;
}

// Resumen del pipeline de cotizaciones abiertas (GET /quotes/pipeline-summary).
// El contrato final se revisa contra el backend — los consumidores pasan por
// getPipelineSummary() en utils/quotesApi.ts, que normaliza campos faltantes.
export interface QuotePipelineTopQuote {
  id: number;
  quote_number: string;
  customer_name: string;
  total: number;
  days_open: number;
}

export interface QuotePipelineSummary {
  open_count: number;
  open_total: number;
  stale_count: number;
  oldest_days: number | null;
  top_open: QuotePipelineTopQuote[];
}

export interface ProductSearchResult {
  supplier_product_id: number;
  product_id: number | null;
  name: string;
  sku: string | null;
  unit: string;
  display_price: number;
  // precio_de_venta = Product.price set by the team; calculado = cost + margin
  price_source?: 'precio_de_venta' | 'calculado';
  iva: boolean;
}

export interface QuoteNotification {
  id: number;
  quote_id: number;
  event_type:
    | 'quote_viewed'
    | 'quote_accepted'
    | 'web_order_paid'
    | 'web_order_pending'
    | 'web_order_problem';
  message: string;
  is_read: boolean;
  created_at: string;
}
