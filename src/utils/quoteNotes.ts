// Las cotizaciones registradas desde WhatsApp o desde el PDF (y las solicitudes
// Por cotizar) guardan lo que se cotiza en notes, una línea por dato:
//   Material/Proyecto: Sistema de Riego e Invernadero 1 ha
//   Datos: Área: 1 Ha Cultivo: Jitomate
//   Contexto: … / Entrega: … / Posible venta: …
// y su historial en líneas con corchetes: [Registro] …, [Estado] …, [Versión] …
// (services/quote_capture.py y scripts de carga en impag-quot).

export interface QuoteNoteField {
  label: string;
  value: string;
}

export interface ParsedQuoteNotes {
  material: string | null;
  fields: QuoteNoteField[];
  history: string[];
  other: string[];
}

const FIELD_RE = /^(Material\/Proyecto|Datos|Contexto|Entrega|Posible venta):\s*(.+)$/;

export function parseQuoteNotes(notes: string | null | undefined): ParsedQuoteNotes {
  const parsed: ParsedQuoteNotes = { material: null, fields: [], history: [], other: [] };
  for (const raw of (notes || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const field = line.match(FIELD_RE);
    if (field) {
      const [, label, value] = field;
      if (label === 'Material/Proyecto') {
        if (parsed.material === null && value !== '—') parsed.material = value;
      } else {
        parsed.fields.push({ label, value });
      }
    } else if (line.startsWith('[')) {
      parsed.history.push(line);
    } else {
      parsed.other.push(line);
    }
  }
  return parsed;
}

// Liga a WhatsApp para un teléfono E.164 (+52…); null si es "S/N" o no hay.
export function whatsappLink(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}
