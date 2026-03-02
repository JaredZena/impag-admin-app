import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notification';
import { Package, Truck, MapPin, Save, Loader2 } from 'lucide-react';
import { fetchLogisticsByFile, updateLogistics } from '@/utils/filesApi';

interface LogisticsData {
  id: number;
  file_id: number;
  product_name: string | null;
  quantity: number | null;
  package_size: string | null;
  package_type: string | null;
  weight_kg: number | null;
  dimensions: string | null;
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  cost: number | null;
  currency: string;
  supplier_product_id: number | null;
  supplier_id: number | null;
  extraction_confidence: string;
  created_at: string;
}

interface LogisticsPanelProps {
  fileId: number;
  onClose: () => void;
}

const LogisticsPanel: React.FC<LogisticsPanelProps> = ({ fileId, onClose }) => {
  const { addNotification } = useNotifications();
  const [data, setData] = useState<LogisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: '',
    quantity: '',
    package_size: '',
    package_type: '',
    weight_kg: '',
    dimensions: '',
    origin: '',
    destination: '',
    carrier: '',
    tracking_number: '',
    estimated_delivery: '',
    cost: '',
    currency: 'MXN',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const result = await fetchLogisticsByFile(fileId);
        if (result) {
          setData(result);
          setForm({
            product_name: result.product_name || '',
            quantity: result.quantity?.toString() || '',
            package_size: result.package_size || '',
            package_type: result.package_type || '',
            weight_kg: result.weight_kg?.toString() || '',
            dimensions: result.dimensions || '',
            origin: result.origin || '',
            destination: result.destination || '',
            carrier: result.carrier || '',
            tracking_number: result.tracking_number || '',
            estimated_delivery: result.estimated_delivery || '',
            cost: result.cost?.toString() || '',
            currency: result.currency || 'MXN',
          });
        }
      } catch {
        // No logistics data yet
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fileId]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (form.product_name) updates.product_name = form.product_name;
      if (form.quantity) updates.quantity = parseInt(form.quantity);
      if (form.package_size) updates.package_size = form.package_size;
      if (form.package_type) updates.package_type = form.package_type;
      if (form.weight_kg) updates.weight_kg = parseFloat(form.weight_kg);
      if (form.dimensions) updates.dimensions = form.dimensions;
      if (form.origin) updates.origin = form.origin;
      if (form.destination) updates.destination = form.destination;
      if (form.carrier) updates.carrier = form.carrier;
      if (form.tracking_number) updates.tracking_number = form.tracking_number;
      if (form.estimated_delivery) updates.estimated_delivery = form.estimated_delivery;
      if (form.cost) updates.cost = parseFloat(form.cost);
      if (form.currency) updates.currency = form.currency;

      await updateLogistics(data.id, updates);
      addNotification({ type: 'success', title: 'Guardado', message: 'Datos de logistica actualizados' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron guardar los datos' });
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'text-green-600 bg-green-50';
    if (c === 'medium') return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center py-4">
          <Package size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 text-sm">No hay datos de logistica para este archivo</p>
          <p className="text-slate-400 text-xs mt-1">Los datos se extraen automaticamente al procesar documentos de empaque/logistica</p>
        </div>
      </Card>
    );
  }

  const Field = ({ label, value, field, type = 'text' }: { label: string; value: string; field: string; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-orange-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Datos de Logistica</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${confidenceColor(data.extraction_confidence)}`}>
            Confianza: {data.extraction_confidence}
          </span>
        </div>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cerrar</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Producto" value={form.product_name} field="product_name" />
        <Field label="Cantidad" value={form.quantity} field="quantity" type="number" />
        <Field label="Tamano paquete" value={form.package_size} field="package_size" />
        <Field label="Tipo paquete" value={form.package_type} field="package_type" />
        <Field label="Peso (kg)" value={form.weight_kg} field="weight_kg" type="number" />
        <Field label="Dimensiones" value={form.dimensions} field="dimensions" />
        <div className="col-span-2 border-t pt-3 mt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Ruta</span>
          </div>
        </div>
        <Field label="Origen" value={form.origin} field="origin" />
        <Field label="Destino" value={form.destination} field="destination" />
        <Field label="Transportista" value={form.carrier} field="carrier" />
        <Field label="No. Rastreo" value={form.tracking_number} field="tracking_number" />
        <Field label="Entrega estimada" value={form.estimated_delivery} field="estimated_delivery" type="date" />
        <div className="flex gap-2">
          <div className="flex-1">
            <Field label="Costo" value={form.cost} field="cost" type="number" />
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-slate-500 mb-1">Moneda</label>
            <select
              value={form.currency}
              onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm flex items-center gap-1.5"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </Card>
  );
};

export default LogisticsPanel;
