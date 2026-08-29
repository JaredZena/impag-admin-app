import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { searchCustomers, createCustomer } from '@/utils/posApi';
import type { CustomerBrief } from '@/utils/posApi';
import { ApiError } from '@/utils/api';
import { useNotifications } from '@/components/ui/notification';
import Modal from './Modal';

interface CustomerPickerProps {
  value: CustomerBrief | null;
  onChange: (customer: CustomerBrief | null) => void;
}

// Optional customer attach: debounced search over GET /customers?q=, selected
// chip with ✕, and a "Nuevo cliente" quick-create modal (POST /customers).
// On a duplicate-phone 409 it offers to attach the existing customer instead.
export default function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const { addNotification } = useNotifications();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerBrief[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(0);

  // Quick-create modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [saving, setSaving] = useState(false);
  // Set after a 409 (duplicate phone). `duplicate` carries the existing
  // customer when the recovery search finds it, offered as a one-click attach.
  const [dupNotice, setDupNotice] = useState(false);
  const [duplicate, setDuplicate] = useState<CustomerBrief | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const epoch = ++epochRef.current;
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchCustomers(q.trim());
      if (epoch !== epochRef.current) return;
      setResults(data);
      setIsOpen(true);
    } catch {
      if (epoch === epochRef.current) setResults([]);
    } finally {
      if (epoch === epochRef.current) setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (customer: CustomerBrief) => {
    onChange(customer);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Clear any pending debounce on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const openModal = () => {
    setNewName(query.trim());
    setNewPhone('');
    setNewLocation('');
    setDupNotice(false);
    setDuplicate(null);
    setModalOpen(true);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (newName.trim().length < 2) {
      addNotification({ type: 'warning', title: 'Nombre requerido', message: 'El nombre debe tener al menos 2 caracteres.' });
      return;
    }
    setSaving(true);
    setDupNotice(false);
    setDuplicate(null);
    try {
      const created = await createCustomer({
        display_name: newName.trim(),
        phone: newPhone.trim() || undefined,
        location: newLocation.trim() || undefined,
      });
      onChange(created);
      setModalOpen(false);
      addNotification({ type: 'success', title: 'Cliente creado', message: created.display_name ?? undefined });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Duplicate phone — recover the existing customer to offer the attach.
        setDupNotice(true);
        try {
          // phone_e164 is stored as +52XXXXXXXXXX — search with the last 10
          // digits so formatted input ('618 123 4567') still matches.
          const digits = newPhone.replace(/\D/g, '').slice(-10);
          const matches = await searchCustomers(digits || newPhone.trim());
          setDuplicate(matches[0] ?? null);
        } catch {
          setDuplicate(null);
        }
      } else {
        addNotification({
          type: 'error',
          title: 'Error al crear cliente',
          message: err instanceof Error ? err.message : 'Intenta de nuevo.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {value ? (
        <div className="flex items-center justify-between gap-2 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{value.display_name ?? 'Cliente'}</p>
            {value.phone_e164 && <p className="text-xs text-gray-500">{value.phone_e164}</p>}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Quitar cliente"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Buscar cliente..."
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {isOpen && results.length > 0 && (
            <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm text-gray-900 truncate">{c.display_name ?? '—'}</p>
                  <p className="text-xs text-gray-500">
                    {c.phone_e164 ?? 'Sin teléfono'}
                    {c.location && <span className="ml-2">{c.location}</span>}
                  </p>
                </button>
              ))}
            </div>
          )}

          {isOpen && query.length >= 2 && results.length === 0 && !loading && (
            <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-sm text-gray-500">
              Sin resultados
            </div>
          )}

          <button
            type="button"
            onClick={openModal}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <UserPlus size={14} />
            Nuevo cliente
          </button>
        </div>
      )}

      {modalOpen && (
        <Modal title="Nuevo cliente" onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="677 123 4567"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nuevo Ideal, Durango"
              />
            </div>

            {dupNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 mb-2">
                  Ya existe un cliente con ese teléfono.
                </p>
                {duplicate !== null ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(duplicate);
                      setModalOpen(false);
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Usar cliente existente: {duplicate.display_name ?? duplicate.phone_e164 ?? `#${duplicate.id}`}
                  </button>
                ) : (
                  <p className="text-xs text-amber-700">Búscalo por teléfono en la lista de clientes.</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
