import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNotifications } from '@/components/ui/notification';
import { apiRequest } from '@/utils/api';
import { STORE_BASE_URL, useStoreLinks } from '@/hooks/useStoreLinks';
import { useStoreDescription } from '@/hooks/useStoreDescription';
import { sameStoreRows, storeRows } from '@/utils/storeDescription';
import PublishStorefrontButton from './PublishStorefrontButton';

interface StoreDescriptionSectionProps {
  productId: string;
  // Product.storefront_description; null = the page keeps its own text.
  saved: string | null;
  onSaved: (value: string | null) => void;
}

// "Especificaciones en la página": the description rows customers see under
// the price on todoparaelcampo.com.mx. Starts from what the page shows now;
// the storefront sync applies the saved text on the next price publish.
const StoreDescriptionSection: React.FC<StoreDescriptionSectionProps> = ({ productId, saved, onSaved }) => {
  const { addNotification } = useNotifications();
  const links = useStoreLinks(productId);
  const pageText = useStoreDescription(productId);
  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the box once the page text arrives (the saved text wins).
  useEffect(() => {
    if (text === null && pageText !== undefined) setText(saved ?? pageText);
  }, [pageText, saved, text]);

  if (!links || links.length === 0 || text === null || pageText === undefined) return null;

  const baseline = saved ?? pageText;
  const dirty = text !== baseline;
  const pending = saved !== null && !sameStoreRows(saved, pageText);
  const rows = storeRows(text);

  const save = async () => {
    try {
      setSaving(true);
      const response = await apiRequest(`/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefront_description: text }),
      });
      if (!response.success) throw new Error(response.error || 'No se pudo guardar');
      const value: string | null = response.data?.storefront_description ?? null;
      onSaved(value);
      setText(value ?? pageText);
      addNotification({
        type: 'success',
        title: 'Especificaciones guardadas',
        message: value
          ? 'Se verán en la página con la próxima publicación.'
          : 'Cuadro vacío: la página se queda con lo que ya tiene.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al guardar especificaciones',
        message: (error instanceof Error && error.message) || 'No se pudieron guardar las especificaciones',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Especificaciones en la página</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lo que ve el cliente abajo del precio en{' '}
            <a
              href={`${STORE_BASE_URL}/producto/${links[0].handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline"
            >
              la página
            </a>
            . Un renglón por línea.
          </p>
        </div>
        <PublishStorefrontButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            maxLength={10000}
            aria-label="Especificaciones en la página"
            placeholder={'Especificaciones:\nMaterial: PET\nCapacidad: 2 L\n- Reutilizable'}
            className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={saving}
          />
          <ul className="text-xs text-gray-500 space-y-0.5">
            <li>
              <code className="text-gray-700">Especificaciones:</code> solo, con dos puntos al final → título
            </li>
            <li>
              <code className="text-gray-700">Material: PET</code> → renglón de la tabla
            </li>
            <li>
              <code className="text-gray-700">- Reutilizable</code> → viñeta
            </li>
            <li>Cualquier otra línea → párrafo. Si dejas el cuadro vacío, la página se queda con lo que ya tiene.</li>
          </ul>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              onClick={save}
              disabled={!dirty || saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            {dirty && (
              <Button variant="outline" onClick={() => setText(baseline)} disabled={saving}>
                Deshacer cambios
              </Button>
            )}
            {!dirty && pending && (
              <span className="text-xs text-amber-700">
                Guardado. Falta publicar: dale «Publicar en tienda» o se publica solo cada mañana.
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Así se verá</p>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400">Sin especificaciones.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => {
                if (row.type === 'header') {
                  return (
                    <h3
                      key={i}
                      className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-1 mt-4 first:mt-0"
                    >
                      {row.text}
                    </h3>
                  );
                }
                if (row.type === 'spec') {
                  return (
                    <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-1 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-500">{row.label}</span>
                      <span className="text-sm text-gray-900">{row.value}</span>
                    </div>
                  );
                }
                if (row.type === 'bullets') {
                  return (
                    <ul key={i} className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                      {row.items.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={i} className="text-sm text-gray-700 leading-relaxed">
                    {row.text}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StoreDescriptionSection;
