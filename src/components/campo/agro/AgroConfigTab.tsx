import { useEffect, useState } from 'react';
import { getAgroSettings, updateAgroSettings } from '@/utils/agroApi';
import { getAiUsageSummary } from '@/utils/aiUsageApi';
import type { AgroSettings, AgroSettingsResponse, Effort, ModelChoice, QuoteMode } from '@/types/agro';
import { MODEL_LABELS_FALLBACK, EFFORT_LABELS } from '@/types/agro';
import { formatUsd } from '@/utils/campoTaxonomy';
import { formatDateTime } from '@/utils/dateUtils';
import { useNotifications } from '@/components/ui/notification';
import LoadError from '@/components/ui/LoadError';
import { Card, CardSkeleton, errorText } from '../shared/Primitives';
import { Toggle } from '../shared/Toggle';
import { ListEditor } from '../shared/ListEditor';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailError = (v: string) => (EMAIL_RE.test(v) ? null : 'Correo no válido.');

const FIELD = 'block text-sm font-medium text-gray-900 mb-1';
const HELP = 'text-xs text-gray-500 mt-1';
const INPUT =
  'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

export default function AgroConfigTab() {
  const { addNotification } = useNotifications();
  const [resp, setResp] = useState<AgroSettingsResponse | null>(null);
  const [form, setForm] = useState<AgroSettings | null>(null);
  const [todaySpend, setTodaySpend] = useState<number | null>(null);
  const [monthSpend, setMonthSpend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [s, today, month] = await Promise.all([
          getAgroSettings(),
          getAiUsageSummary(1),
          getAiUsageSummary(31),
        ]);
        if (cancelled) return;
        setResp(s);
        setForm(s.settings);
        const spendOf = (byFeature: typeof today.by_feature) =>
          byFeature.filter((f) => f.feature.startsWith('agroproyectos')).reduce((acc, f) => acc + f.cost_usd, 0);
        setTodaySpend(spendOf(today.by_feature));
        setMonthSpend(spendOf(month.by_feature));
      } catch (err) {
        if (!cancelled) setLoadError(errorText(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retry]);

  const set = <K extends keyof AgroSettings>(key: K, value: AgroSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await updateAgroSettings(form);
      setResp(updated);
      setForm(updated.settings);
      addNotification({ type: 'success', title: 'Configuración guardada' });
    } catch (err) {
      addNotification({ type: 'error', title: 'No se pudo guardar', message: errorText(err) });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (resp) setForm(resp.defaults);
  };

  if (loading) {
    return (
      <Card>
        <CardSkeleton rows={10} />
      </Card>
    );
  }
  if (loadError) return <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />;
  if (!form || !resp) return null;

  const modelLabels = { ...MODEL_LABELS_FALLBACK, ...resp.options.models };
  const modelOptions = Object.entries(modelLabels) as [ModelChoice, string][];

  return (
    <div className="space-y-4">
      <Card title="Diseñador de proyectos">
        <Toggle
          checked={form.enabled}
          onChange={(v) => set('enabled', v)}
          label="Agroproyectos activo"
          help="Cuando está apagado, la página /agroproyectos no genera planes nuevos."
        />
      </Card>

      <Card title="Modelo de IA">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={FIELD}>Modelo para el plan</label>
            <select className={INPUT} value={form.model} onChange={(e) => set('model', e.target.value as ModelChoice)}>
              {modelOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className={HELP}>Genera el plan, los productos y el diseño de riego.</p>
          </div>
          <div>
            <label className={FIELD}>Esfuerzo del plan</label>
            <select className={INPUT} value={form.effort} onChange={(e) => set('effort', e.target.value as Effort)}>
              {(Object.keys(EFFORT_LABELS) as Effort[]).map((v) => (
                <option key={v} value={v}>
                  {EFFORT_LABELS[v]}
                </option>
              ))}
            </select>
            <p className={HELP}>Más alto = respuestas más cuidadas, pero más lentas y caras.</p>
          </div>
          <div>
            <label className={FIELD}>Modelo para preguntas de seguimiento</label>
            <select
              className={INPUT}
              value={form.chat_model}
              onChange={(e) => set('chat_model', e.target.value as ModelChoice)}
            >
              {modelOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={FIELD}>Esfuerzo de las preguntas</label>
            <select
              className={INPUT}
              value={form.chat_effort}
              onChange={(e) => set('chat_effort', e.target.value as Effort)}
            >
              {(Object.keys(EFFORT_LABELS) as Effort[]).map((v) => (
                <option key={v} value={v}>
                  {EFFORT_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <Toggle
            checked={form.web_search}
            onChange={(v) => set('web_search', v)}
            label="Buscar en internet al generar el plan"
            help="Deja que la IA consulte precios y datos actuales del mercado."
          />
          {form.web_search && (
            <div className="mt-2 max-w-[160px]">
              <label className={FIELD}>Máximo de búsquedas</label>
              <input
                type="number"
                min={0}
                max={10}
                className={INPUT}
                value={form.max_searches}
                onChange={(e) => set('max_searches', Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <Toggle
            checked={form.include_knowledge}
            onChange={(v) => set('include_knowledge', v)}
            label="Usar la base de conocimiento regional"
            help="Clima, suelos y razas/variedades recomendadas para Durango y la región."
          />
        </div>
      </Card>

      <Card title="Contacto y límites">
        <Toggle
          checked={form.contact_required}
          onChange={(v) => set('contact_required', v)}
          label="Pedir nombre y WhatsApp antes de generar el plan"
          help="Si se apaga, cualquiera puede generar un plan sin dejar sus datos (menos leads capturados)."
        />
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className={FIELD}>Proyectos nuevos por hora</label>
            <input
              type="number"
              min={1}
              max={1000}
              className={INPUT}
              value={form.max_per_hour}
              onChange={(e) => set('max_per_hour', Number(e.target.value))}
            />
            <p className={HELP}>Límite global, todos los visitantes.</p>
          </div>
          <div>
            <label className={FIELD}>Proyectos por teléfono al día</label>
            <input
              type="number"
              min={1}
              max={50}
              className={INPUT}
              value={form.max_per_phone_per_day}
              onChange={(e) => set('max_per_phone_per_day', Number(e.target.value))}
            />
          </div>
          <div>
            <label className={FIELD}>Preguntas de seguimiento por proyecto</label>
            <input
              type="number"
              min={0}
              max={50}
              className={INPUT}
              value={form.max_questions}
              onChange={(e) => set('max_questions', Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      <Card title="Presupuesto de IA">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={FIELD}>Presupuesto diario (USD)</label>
            <input
              type="number"
              min={0}
              max={1000}
              step="0.01"
              className={INPUT}
              value={form.daily_budget_usd}
              onChange={(e) => set('daily_budget_usd', Number(e.target.value))}
            />
            <p className={HELP}>
              0 = sin límite. Gasto reciente de Agroproyectos: {todaySpend !== null ? formatUsd(todaySpend) : '—'}.
            </p>
          </div>
          <div>
            <label className={FIELD}>Presupuesto mensual (USD)</label>
            <input
              type="number"
              min={0}
              max={10000}
              step="0.01"
              className={INPUT}
              value={form.monthly_budget_usd}
              onChange={(e) => set('monthly_budget_usd', Number(e.target.value))}
            />
            <p className={HELP}>
              0 = sin límite. Gasto del mes de Agroproyectos: {monthSpend !== null ? formatUsd(monthSpend) : '—'}.
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Al llegar al presupuesto, el diseñador deja de generar planes nuevos hasta el siguiente periodo.
        </p>
      </Card>

      <Card title="Cotización">
        <fieldset>
          <label className="flex items-start gap-2 py-1.5 cursor-pointer">
            <input
              type="radio"
              name="quote_mode"
              checked={form.quote_mode === 'review'}
              onChange={() => set('quote_mode', 'review' as QuoteMode)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Revisar antes de enviar</span>
              <span className="block text-xs text-gray-500">
                Un asesor confirma cantidades y precios antes de que la cotización llegue al cliente.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 py-1.5 cursor-pointer">
            <input
              type="radio"
              name="quote_mode"
              checked={form.quote_mode === 'instant'}
              onChange={() => set('quote_mode', 'instant' as QuoteMode)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Enviar al instante si todo tiene precio</span>
              <span className="block text-xs text-gray-500">
                La cotización se envía sola cuando todos los productos tienen precio en el catálogo.
              </span>
            </span>
          </label>
        </fieldset>
      </Card>

      <Card title="Indicaciones de negocio">
        <label className={FIELD}>Instrucciones adicionales para la IA</label>
        <textarea
          rows={5}
          maxLength={4000}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          value={form.extra_instructions}
          onChange={(e) => set('extra_instructions', e.target.value)}
          placeholder="Ej. Prioriza siempre bombeo solar sobre CFE cuando el presupuesto lo permita…"
        />
        <p className={HELP}>{form.extra_instructions.length} / 4000 caracteres. Se agrega a cada plan generado.</p>

        <label className={`${FIELD} mt-4`}>Productos que nunca se deben recomendar</label>
        <ListEditor
          items={form.excluded_handles}
          onChange={(items) => set('excluded_handles', items)}
          placeholder="handle-del-producto"
        />
        <p className={HELP}>El identificador (handle) del producto en el catálogo de la tienda.</p>
      </Card>

      <Card title="Avisos al equipo">
        <Toggle
          checked={form.notify_new_projects}
          onChange={(v) => set('notify_new_projects', v)}
          label="Avisar por correo cuando un plan esté listo"
        />
        <label className={`${FIELD} mt-4`}>Correos que reciben el aviso</label>
        <ListEditor
          items={form.notify_emails}
          onChange={(items) => set('notify_emails', items)}
          placeholder="correo@impag.mx"
          validate={emailError}
        />
        <p className={HELP}>Si está vacío, se usa la lista general de avisos de cotizaciones web.</p>

        <label className={`${FIELD} mt-4`}>Responsable de dar seguimiento</label>
        <input
          type="email"
          className={`${INPUT} max-w-sm`}
          value={form.assignee_email ?? ''}
          onChange={(e) => set('assignee_email', e.target.value || null)}
          placeholder="correo@impag.mx"
        />
        <p className={HELP}>A quién se le asignan los pendientes de "quiero que me contacten". Si está vacío, usa el responsable general.</p>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          {resp.updated_at
            ? `Última actualización ${formatDateTime(resp.updated_at)}${resp.updated_by ? ` por ${resp.updated_by}` : ''}.`
            : 'Sin cambios guardados todavía — se están usando los valores por defecto.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetToDefaults}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Restablecer valores por defecto
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
