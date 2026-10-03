const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const isoShortDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Motivos que escribe el sync de la hoja VENTAS (services/sales_sync.py) en
// inglés, como los debe leer el equipo. Los que ya vienen en español pasan igual.
const REASON_RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^missing\/unparseable date(?:\s*\((.+)\))?$/i, (m) => (m[1] ? `falta la fecha o no se entiende («${m[1]}»)` : 'falta la fecha o no se entiende')],
  [/^future date(?:\s*\((\d{4}-\d{2}-\d{2})\))?$/i, (m) => (m[1] ? `fecha en el futuro (${isoShortDate(m[1])})` : 'fecha en el futuro')],
  [/^missing\/zero amount$/i, () => 'falta el monto'],
  [/^missing customer and description$/i, () => 'falta el cliente y la descripción'],
];

export function saleReasonLabel(raw: string | null | undefined): string {
  const text = (raw ?? '').trim();
  if (!text) return '—';
  // The exception text after "parser error:" is for developers only.
  if (/^parser error\b/i.test(text)) return 'no se pudo leer la fila';
  return text
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      for (const [re, label] of REASON_RULES) {
        const m = part.match(re);
        if (m) return label(m);
      }
      return part;
    })
    .join(' · ');
}

// "Venta 11_09_2026" = la venta #11 de septiembre 2026 (no el 11/09).
export function ventaNumberLabel(text: string | null | undefined): string | null {
  const m = (text ?? '').match(/venta\s+(\d{1,3})\s*_\s*(\d{1,2})\s*_\s*(\d{4})/i);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `#${Number(m[1])} · ${MONTHS_SHORT[month - 1]} ${m[3]}`;
}

export function daysAgoLabel(iso: string | null | undefined, today: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - d.getTime()) / 86_400_000);
  if (days < 0) return isoShortDate(iso.slice(0, 10));
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days.toLocaleString('es-MX')} días`;
}
