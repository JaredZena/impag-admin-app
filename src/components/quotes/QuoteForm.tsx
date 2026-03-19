import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { createQuote, addQuoteItem } from '@/utils/quotesApi';
import type { CreateQuoteItemPayload, ProductSearchResult } from '@/types/quotes';
import ProductSearchInput from './ProductSearchInput';
import QuoteItemRow from './QuoteItemRow';
import MainLayout from '@/components/layout/MainLayout';

interface LocalItem extends CreateQuoteItemPayload {
  _id: string; // temp client-side ID
  line_total: number;
}

const IVA_RATE = 0.16;

export default function QuoteForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [validityDays, setValidityDays] = useState(15);

  // Items
  const [items, setItems] = useState<LocalItem[]>([]);

  const addProductItem = (product: ProductSearchResult) => {
    const newItem: LocalItem = {
      _id: crypto.randomUUID(),
      supplier_product_id: product.supplier_product_id,
      product_id: product.product_id || undefined,
      description: product.name,
      sku: product.sku || undefined,
      quantity: 1,
      unit: product.unit,
      unit_price: product.display_price,
      iva_applicable: product.iva,
      sort_order: items.length,
      line_total: product.display_price,
    };
    setItems([...items, newItem]);
  };

  const addFreeformItem = () => {
    const newItem: LocalItem = {
      _id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit: 'PIEZA',
      unit_price: 0,
      iva_applicable: true,
      sort_order: items.length,
      line_total: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: string, value: string | number | boolean) => {
    setItems(items.map((item) => {
      if (item._id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.line_total = (updated.quantity || 0) * (updated.unit_price || 0);
      return updated;
    }));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item._id !== id));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const ivaAmount = items.reduce((sum, item) => sum + (item.iva_applicable ? item.line_total * IVA_RATE : 0), 0);
  const total = subtotal + ivaAmount;

  const handleSave = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Nombre y teléfono del cliente son requeridos');
      return;
    }
    if (items.length === 0) {
      alert('Agrega al menos un producto a la cotización');
      return;
    }

    setSaving(true);
    try {
      const quote = await createQuote({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_location: customerLocation.trim() || undefined,
        notes: notes.trim() || undefined,
        validity_days: validityDays,
        items: items.map((item, idx) => ({
          product_id: item.product_id,
          supplier_product_id: item.supplier_product_id,
          description: item.description,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          iva_applicable: item.iva_applicable ?? true,
          notes: item.notes,
          sort_order: idx,
        })),
      });
      navigate(`/quotes/${quote.id}`);
    } catch (err) {
      console.error('Failed to create quote:', err);
      alert('Error al crear la cotización');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/quotes')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Nueva cotización</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
        </div>

        {/* Customer Info */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Datos del cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono (WhatsApp) *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+52 677 123 4567"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
              <input
                type="text"
                value={customerLocation}
                onChange={(e) => setCustomerLocation(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rancho Las Palmas, Nuevo Ideal, Durango"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Productos</h2>

          {/* Product Search */}
          <div className="mb-4">
            <ProductSearchInput onSelect={addProductItem} />
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <table className="w-full mb-4">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Descripción</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase py-2 w-24">Cant.</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 w-32">Precio</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 w-32">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <QuoteItemRow
                    key={item._id}
                    item={{
                      ...item,
                      id: 0,
                      quote_id: 0,
                      product_id: item.product_id || null,
                      supplier_product_id: item.supplier_product_id || null,
                      sku: item.sku || null,
                      unit: item.unit || null,
                      iva_applicable: item.iva_applicable ?? true,
                      discount_percent: null,
                      discount_amount: null,
                      notes: item.notes || null,
                      sort_order: item.sort_order || 0,
                      line_total: item.line_total,
                    } as any}
                    onUpdate={(field, value) => updateItem(item._id, field, value)}
                    onDelete={() => deleteItem(item._id)}
                    editable
                  />
                ))}
              </tbody>
            </table>
          )}

          {/* Add freeform item */}
          <button
            onClick={addFreeformItem}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={14} />
            Agregar item manual
          </button>

          {/* Totals */}
          {items.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IVA (16%):</span>
                    <span>${ivaAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total MXN:</span>
                    <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes & Settings */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Notas y configuración</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas para el cliente</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Incluye instalación, garantía 2 años, entrega en 5 días hábiles..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Validez (días)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 15)}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
