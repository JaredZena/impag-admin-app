// Mirror of GET /hoy (impag-quot routes/hoy.py).
export interface HoyData {
  day: string;
  sales: { id: number; reference: string | null; customer_name: string | null; description: string | null; amount: number; pending: number; source: string }[];
  quotes_sent: { id: number; quote_number: string; customer_name: string; material: string | null; total: number }[];
  requests: { id: number; quote_number: string; customer_name: string; material: string | null }[];
  followups: {
    quote_id: number | null;
    quote_number: string | null;
    customer_name: string;
    material: string | null;
    detail: string;
  }[];
  closed_tasks: { id: number; title: string }[];
  receivable: { total: number; rows: { customer_name: string | null; pending: number; reference: string | null }[] };
  open_by_section: Record<string, number>;
  priority: string[];
}

export const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
export const ddmmyyyy = (iso: string) => iso.split('-').reverse().join('/');
export const short = (text: string | null, n = 40) => (text && text.length > n ? `${text.slice(0, n - 1)}…` : text || '');

// Arma el *HOY dd/mm/aaaa* con el mismo formato que Hernán manda al grupo.
export function buildHoyText(d: HoyData, atencion: string, bloqueantes: string, manana: string): string {
  const logrado = [
    ...d.sales.map((s) => `Venta ${s.customer_name ?? ''} ${short(s.description)}`.trim()),
    ...d.quotes_sent.map((q) => `Cotización ${q.customer_name}${q.material ? ` ${short(q.material)}` : ''}`),
    ...d.closed_tasks.map((t) => t.title),
  ];
  const lines = [
    `HOY ${ddmmyyyy(d.day)}`,
    '✅ Logrado Hoy:',
    ...logrado.map((l, i) => `${i + 1}. ${l}`),
    '',
    '💰 Ventas:',
    `• Ventas logradas hoy [${d.sales.length}]`,
    `• Cotizaciones enviadas hoy: [${d.quotes_sent.length}]`,
    `• Atención al cliente hoy: [${atencion.trim()}]`,
    `• Seguimientos realizados hoy: [${d.followups.length}]`,
    ...d.followups.map((f) => [f.customer_name, f.material, f.detail].filter(Boolean).join('_')),
    '',
    '⚠️ Bloqueantes:',
    ...bloqueantes.split('\n').map((l) => l.trim()).filter(Boolean),
    '',
    '📅 Prioritario Mañana:',
    ...manana
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l, i) => `${i + 1}. ${l.replace(/^\d+[.)]\s*/, '')}`),
  ];
  return lines.join('\n');
}

