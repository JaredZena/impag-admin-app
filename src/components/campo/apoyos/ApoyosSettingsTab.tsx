import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { AlertTriangle } from 'lucide-react';
import { getApoyosSettings, updateApoyosSettings } from '@/utils/apoyosApi';
import type { ApoyosSettings, ApoyosSettingsOptions } from '@/types/apoyos';
import { useNotifications } from '@/components/ui/notification';
import LoadError from '@/components/ui/LoadError';
import { STATE_OPTIONS, SECTOR_OPTIONS } from '@/utils/campoTaxonomy';
import { ChipsMultiSelect, ListEditor } from './FormControls';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diaria',
  every_2_days: 'Cada 2 días',
  every_3_days: 'Cada 3 días',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  paused: 'Pausado',
};

const EFFORT_LABELS: Record<string, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateApoyosSettings(s: ApoyosSettings): string | null {
  if (s.extra_queries.length > 20) return 'Máximo 20 búsquedas adicionales.';
  if (s.extra_queries.some((q) => q.length > 200)) return 'Cada búsqueda adicional debe tener 200 caracteres o menos.';
  if (s.max_searches_per_topic < 1 || s.max_searches_per_topic > 10) return 'Búsquedas por tema: entre 1 y 10.';
  if (s.max_fetches_per_topic < 0 || s.max_fetches_per_topic > 10) return 'Páginas por tema: entre 0 y 10.';
  if (s.max_programs_per_topic < 1 || s.max_programs_per_topic > 15) return 'Programas por tema: entre 1 y 15.';
  if (s.monthly_budget_usd < 0 || s.monthly_budget_usd > 1000) return 'Presupuesto mensual: entre 0 y 1000 USD.';
  if (s.recheck_days < 1 || s.recheck_days > 90) return 'Días para reverificar: entre 1 y 90.';
  if (s.keep_closed_days < 0 || s.keep_closed_days > 365) return 'Días que se conservan cerrados: entre 0 y 365.';
  if (s.notify_emails.some((e) => !EMAIL_RE.test(e))) return 'Hay un correo de notificación que no es válido.';
  return null;
}

function NumberField({
  label,
  help,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-xs text-gray-500">{help}</span>
    </label>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function ApoyosSettingsTab() {
  const { addNotification } = useNotifications();
  const [form, setForm] = useState<ApoyosSettings | null>(null);
  const [defaults, setDefaults] = useState<ApoyosSettings | null>(null);
  const [options, setOptions] = useState<ApoyosSettingsOptions | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    getApoyosSettings()
      .then((res) => {
        setForm(res.settings);
        setDefaults(res.defaults);
        setOptions(res.options);
        setUpdatedAt(res.updated_at);
        setUpdatedBy(res.updated_by);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Intenta de nuevo.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    if (!form) return;
    const error = validateApoyosSettings(form);
    if (error) {
      setSaveError(error);
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const res = await updateApoyosSettings(form);
      setForm(res.settings);
      setUpdatedAt(res.updated_at);
      setUpdatedBy(res.updated_by);
      addNotification({ type: 'success', title: 'Configuración guardada' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!defaults) return;
    setForm(defaults);
    setSaveError(null);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;
  if (loadError) return <LoadError message={loadError} onRetry={load} />;
  if (!form || !options) return null;

  const frequencyOptions = options.frequencies.length
    ? options.frequencies
    : Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }));
  const stateOptions = options.states.length ? options.states : STATE_OPTIONS;
  const sectorOptions = options.sectors.length ? options.sectors : SECTOR_OPTIONS;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Discovery on/off */}
      <section className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Búsqueda automática</p>
            <p className="text-xs text-gray-500 mt-0.5">Enciende o apaga la búsqueda de apoyos con IA.</p>
          </div>
          <Switch checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Búsqueda automática" />
        </div>

        <label className="block mt-4">
          <span className="text-sm font-medium text-gray-800">Frecuencia</span>
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value as ApoyosSettings['frequency'] })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {frequencyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {FREQUENCY_LABELS[o.value] || o.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">Qué tan seguido se buscan apoyos nuevos. «Pausado» no busca nada.</span>
        </label>
      </section>

      {/* Scope */}
      <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <p className="font-medium text-gray-900">Dónde buscar</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-800">Incluir programas nacionales/federales</p>
          </div>
          <Switch
            checked={form.include_national}
            onChange={(v) => setForm({ ...form, include_national: v })}
            label="Incluir programas nacionales"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800 mb-1">Estados</p>
          <p className="text-xs text-gray-500 mb-2">En qué estados se buscan apoyos estatales.</p>
          <ChipsMultiSelect
            options={stateOptions.filter((o) => o.value !== 'nacional')}
            value={form.states}
            onChange={(states) => setForm({ ...form, states })}
            showSelectAll
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800 mb-1">Sectores</p>
          <p className="text-xs text-gray-500 mb-2">Qué sectores productivos se cubren.</p>
          <ChipsMultiSelect options={sectorOptions} value={form.sectors} onChange={(sectors) => setForm({ ...form, sectors })} showSelectAll />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800 mb-1">Búsquedas adicionales</p>
          <p className="text-xs text-gray-500 mb-2">Temas extra que la IA busca cada corrida (máx. 20, 200 caracteres cada uno).</p>
          <ListEditor
            value={form.extra_queries}
            onChange={(extra_queries) => setForm({ ...form, extra_queries })}
            placeholder="p. ej. Sembrando Vida 2026"
            maxItems={20}
            maxLength={200}
          />
        </div>
      </section>

      {/* Publishing */}
      <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Publicación automática</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-md">
              Publica sin revisión los hallazgos con confianza alta y fuente oficial (.gob.mx).
            </p>
          </div>
          <Switch checked={form.auto_publish} onChange={(v) => setForm({ ...form, auto_publish: v })} label="Publicación automática" />
        </div>
        {form.auto_publish && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>Con esto activado, algunos apoyos aparecerán en la tienda sin que nadie los revise primero.</span>
          </div>
        )}
      </section>

      {/* AI model + limits */}
      <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <p className="font-medium text-gray-900">Modelo y límites de IA</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">Modelo</span>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value as ApoyosSettings['model'] })}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(options.models).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-800">Esfuerzo de razonamiento</span>
            <select
              value={form.effort}
              onChange={(e) => setForm({ ...form, effort: e.target.value as ApoyosSettings['effort'] })}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(EFFORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            label="Búsquedas web por tema"
            help="Máx. 10"
            value={form.max_searches_per_topic}
            min={1}
            max={10}
            onChange={(n) => setForm({ ...form, max_searches_per_topic: n })}
          />
          <NumberField
            label="Páginas a abrir por tema"
            help="Máx. 10"
            value={form.max_fetches_per_topic}
            min={0}
            max={10}
            onChange={(n) => setForm({ ...form, max_fetches_per_topic: n })}
          />
          <NumberField
            label="Programas por tema"
            help="Máx. 15"
            value={form.max_programs_per_topic}
            min={1}
            max={15}
            onChange={(n) => setForm({ ...form, max_programs_per_topic: n })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            label="Presupuesto mensual (USD)"
            help="0 = sin límite"
            value={form.monthly_budget_usd}
            min={0}
            max={1000}
            onChange={(n) => setForm({ ...form, monthly_budget_usd: n })}
          />
          <NumberField
            label="Reverificar cada (días)"
            help="Vuelve a confirmar los apoyos publicados"
            value={form.recheck_days}
            min={1}
            max={90}
            onChange={(n) => setForm({ ...form, recheck_days: n })}
          />
          <NumberField
            label="Conservar cerrados (días)"
            help="Cuánto tiempo siguen visibles ya cerrados"
            value={form.keep_closed_days}
            min={0}
            max={365}
            onChange={(n) => setForm({ ...form, keep_closed_days: n })}
          />
        </div>
      </section>

      {/* Notifications + blocklist */}
      <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-800 mb-1">Avisar por correo a</p>
          <p className="text-xs text-gray-500 mb-2">Quién se entera cuando hay apoyos nuevos por revisar.</p>
          <ListEditor
            value={form.notify_emails}
            onChange={(notify_emails) => setForm({ ...form, notify_emails })}
            placeholder="correo@impag.mx"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800 mb-1">Dominios bloqueados</p>
          <p className="text-xs text-gray-500 mb-2">La IA nunca usará estos sitios como fuente.</p>
          <ListEditor
            value={form.blocked_domains}
            onChange={(blocked_domains) => setForm({ ...form, blocked_domains })}
            placeholder="ejemplo.com"
          />
        </div>
      </section>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          {updatedAt ? (
            <>Última actualización: {dayjs(updatedAt).format('DD MMM YYYY HH:mm')}{updatedBy && ` por ${updatedBy}`}</>
          ) : (
            'Sin cambios guardados todavía'
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Restablecer valores por defecto
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
