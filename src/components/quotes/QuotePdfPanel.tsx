import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText, Upload } from 'lucide-react';
import { listQuoteFiles, uploadQuoteFile } from '@/utils/quotesApi';
import type { Quote, QuoteFile } from '@/types/quotes';

interface QuotePdfPanelProps {
  quote: Quote;
  onQuoteChanged: (quote: Quote) => void;
}

const MAX_PDF_BYTES = 15 * 1024 * 1024;

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

// El PDF que se le mandó al cliente (COT-IMPAG-…pdf), guardado en R2 y
// encontrado por folio. Vista previa en la página + subir otra versión; si la
// cotización sigue en $0 y sin productos, el total se lee del PDF.
export default function QuotePdfPanel({ quote, onQuoteChanged }: QuotePdfPanelProps) {
  const [files, setFiles] = useState<QuoteFile[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    listQuoteFiles(quote.id)
      .then((rows) => alive && setFiles(rows))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'No se pudo cargar el PDF'));
    return () => {
      alive = false;
    };
  }, [quote.id]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) {
      setError('El PDF pesa más de 15 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    setNotice([]);
    try {
      const result = await uploadQuoteFile(quote.id, file);
      setFiles(result.files);
      setSelected(0);
      const lines = [...result.warnings];
      if (result.total_set != null) {
        lines.unshift(
          `Total $${result.total_set.toLocaleString('es-MX', { minimumFractionDigits: 2 })} leído del PDF.`
        );
        onQuoteChanged(result.quote);
      }
      setNotice(lines);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el PDF');
    } finally {
      setUploading(false);
    }
  };

  const current = files?.[selected];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">PDF de la cotización</h2>
        <div className="flex items-center gap-2">
          {current && (
            <a
              href={current.view_url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <ExternalLink size={14} />
              Abrir
            </a>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading ? 'Subiendo...' : files?.length ? 'Subir otra versión' : 'Subir PDF'}
          </button>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Subir PDF de la cotización"
            className="sr-only"
            onChange={(e) => {
              handleUpload(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {files && files.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {files.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(i)}
              title={f.filename}
              className={`px-2.5 py-1 rounded-full text-xs border ${
                i === selected
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {i === 0 ? 'Última' : `Versión ${files.length - i}`} · {shortDate(f.created_at)}
            </button>
          ))}
        </div>
      )}

      {notice.length > 0 && (
        <ul className="mb-3 space-y-1">
          {notice.map((n) => (
            <li key={n} className="text-xs text-gray-700 flex gap-1.5">
              <AlertTriangle size={14} className="shrink-0 mt-px text-amber-500" />
              {n}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {files === null && !error ? (
        <div className="h-24 animate-pulse rounded-lg bg-gray-50" />
      ) : current ? (
        <>
          <p className="text-xs text-gray-500 mb-2 truncate flex items-center gap-1.5">
            <FileText size={14} className="text-red-600 shrink-0" />
            {current.filename}
          </p>
          <iframe
            key={current.id}
            src={current.view_url}
            title={`PDF ${quote.quote_number}`}
            className="w-full h-[70vh] min-h-[420px] rounded-lg border border-gray-200 bg-gray-50"
          />
        </>
      ) : (
        files && (
          <p className="text-sm text-gray-500">
            Sin PDF guardado. Súbelo para tenerlo aquí{quote.items.length === 0 ? ' y leer el total' : ''}.
          </p>
        )
      )}
    </div>
  );
}
