import React from 'react';
import { OUT_STATUSES, TOOL_LOCATIONS, TOOL_STATUS_LABELS, TOOL_UNITS, type ToolKind, type ToolStatus } from '@/utils/toolsApi';
import { CREATE_STATUSES, type ToolFormValues } from './toolFormModel';
import { inputClass } from './toolHelpers';

const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, className = '', children }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
  </label>
);

interface ToolFormProps {
  values: ToolFormValues;
  onChange: (values: ToolFormValues) => void;
  mode: 'create' | 'edit';
  currentStatus?: ToolStatus; // edit mode: the tool's status (not editable here)
}

const ToolForm: React.FC<ToolFormProps> = ({ values, onChange, mode, currentStatus }) => {
  const set = <K extends keyof ToolFormValues>(key: K, value: ToolFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const status = mode === 'create' ? values.status : currentStatus;
  const holderMode = status && OUT_STATUSES.includes(status)
    ? 'required'
    : status === 'pendiente_entrega'
      ? 'optional'
      : 'none';
  const showLocation = mode === 'edit' || values.status === 'en_local';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nombre" required className="sm:col-span-2">
        <input
          className={inputClass}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Llave stilson 48 pulgadas"
          maxLength={255}
          autoFocus={mode === 'create'}
        />
      </Field>

      <div className="sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-gray-700">Tipo</span>
        <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-0.5">
          {(['herramienta', 'consumible'] as ToolKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => set('kind', k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                values.kind === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {k === 'herramienta' ? 'Herramienta' : 'Consumible'}
            </button>
          ))}
        </div>
      </div>

      <Field label="Cantidad" required>
        <div className="flex gap-2">
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={values.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
          <select
            className={`${inputClass} max-w-[8rem]`}
            value={values.unit}
            onChange={(e) => set('unit', e.target.value)}
            aria-label="Unidad"
          >
            {(TOOL_UNITS.includes(values.unit) ? TOOL_UNITS : [values.unit, ...TOOL_UNITS]).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Field label="Costo unitario (MXN)">
        <input
          className={inputClass}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={values.unit_cost}
          onChange={(e) => set('unit_cost', e.target.value)}
          placeholder="0.00"
        />
      </Field>

      <Field label="Fecha de compra">
        <input
          className={inputClass}
          type="date"
          value={values.purchase_date}
          onChange={(e) => set('purchase_date', e.target.value)}
        />
      </Field>

      <Field label="Proveedor">
        <input
          className={inputClass}
          value={values.supplier_name}
          onChange={(e) => set('supplier_name', e.target.value)}
          placeholder="TORNILLO, Ferretería…"
          maxLength={200}
        />
      </Field>

      <Field label="Factura o nota" className="sm:col-span-2">
        <input
          className={inputClass}
          value={values.invoice_ref}
          onChange={(e) => set('invoice_ref', e.target.value)}
          placeholder="Folio de la factura o nota de compra"
          maxLength={120}
        />
      </Field>

      {mode === 'create' && (
        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">¿Dónde está ahora?</span>
          <div className="flex flex-wrap gap-2">
            {CREATE_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('status', s)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  values.status === s
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {TOOL_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {holderMode !== 'none' && (
        <Field
          label={status === 'con_cliente' ? 'Cliente' : status === 'en_obra' ? 'Obra o persona' : '¿Quién la tiene?'}
          required={holderMode === 'required'}
          hint={holderMode === 'optional' ? 'Opcional. Por ejemplo quién la compró o quién la debe entregar.' : undefined}
          className="sm:col-span-2"
        >
          <input
            className={inputClass}
            value={values.holder}
            onChange={(e) => set('holder', e.target.value)}
            placeholder={status === 'con_cliente' ? 'Nombre del cliente' : 'Obra bombeo Rodeo, Chubeto…'}
            maxLength={200}
          />
        </Field>
      )}

      {showLocation && (
        <Field label="Ubicación">
          <select className={inputClass} value={values.location} onChange={(e) => set('location', e.target.value)}>
            <option value="">Sin especificar</option>
            {(values.location && !TOOL_LOCATIONS.includes(values.location)
              ? [values.location, ...TOOL_LOCATIONS]
              : TOOL_LOCATIONS
            ).map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Comentario" className="sm:col-span-2">
        <textarea
          className={inputClass}
          rows={3}
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Falta el estuche, es de renta…"
          maxLength={4000}
        />
      </Field>
    </div>
  );
};

export default ToolForm;
