import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import { createTool } from '@/utils/toolsApi';
import ToolForm from './ToolForm';
import { buildCreatePayload, emptyToolForm, type ToolFormValues } from './toolFormModel';
import { buttonClass } from './toolHelpers';

// NOTE: ProtectedRoute already wraps every route in MainLayout — do NOT import it here.

export default function ToolFormPage() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [values, setValues] = useState<ToolFormValues>(emptyToolForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const built = buildCreatePayload(values);
    if ('error' in built) {
      setError(built.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tool = await createTool(built.payload);
      addNotification({ type: 'success', title: 'Herramienta registrada', message: 'Ahora agrega sus fotos.' });
      navigate(`/tools/${tool.id}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} />
        Herramientas
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Registrar herramienta</h1>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <ToolForm values={values} onChange={setValues} mode="create" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to="/tools" className={buttonClass.secondary}>
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className={buttonClass.primary}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
