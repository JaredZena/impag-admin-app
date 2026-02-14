import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import { createCategory, updateCategory, deleteCategory } from '@/utils/tasksApi';
import type { TaskCategory, CreateCategoryPayload } from '@/types/tasks';

const COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#22c55e', '#14b8a6', '#f97316',
  '#64748b', '#0ea5e9',
];

interface CategoryManagerProps {
  categories: TaskCategory[];
  onClose: () => void;
  onCategoriesChanged: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onClose, onCategoriesChanged }) => {
  const { addNotification } = useNotifications();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || loading) return;
    setLoading(true);
    try {
      await createCategory({ name: newName.trim(), color: newColor });
      setShowCreate(false);
      setNewName('');
      setNewColor(COLOR_PRESETS[0]);
      onCategoriesChanged();
      addNotification({ type: 'success', title: 'Categoría creada', duration: 3000 });
    } catch {
      addNotification({ type: 'error', title: 'Error al crear categoría', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim() || loading) return;
    setLoading(true);
    try {
      await updateCategory(id, { name: editName.trim(), color: editColor });
      setEditingId(null);
      onCategoriesChanged();
      addNotification({ type: 'success', title: 'Categoría actualizada', duration: 3000 });
    } catch {
      addNotification({ type: 'error', title: 'Error al actualizar', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (loading) return;
    setLoading(true);
    try {
      await deleteCategory(id);
      setDeletingId(null);
      onCategoriesChanged();
      addNotification({ type: 'success', title: 'Categoría eliminada', duration: 3000 });
    } catch {
      addNotification({ type: 'error', title: 'Error al eliminar', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full md:max-w-lg max-h-[80vh] bg-white rounded-t-3xl md:rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        <div className="px-5 pb-6 md:px-6 md:py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-800">Categorías</h2>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          {/* Category list */}
          <div className="space-y-2 mb-4">
            {categories.map(cat => (
              <div key={cat.id}>
                {deletingId === cat.id ? (
                  <div className="bg-red-50/60 rounded-xl p-3 border border-red-200/50">
                    <p className="text-[13px] text-red-700 mb-2">¿Eliminar "{cat.name}"?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeletingId(null)} className="text-[12px] text-slate-500 px-3 py-1.5">Cancelar</button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={loading}
                        className="text-[12px] bg-red-500 text-white px-3 py-1.5 rounded-full"
                      >
                        {loading ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ) : editingId === cat.id ? (
                  <div className="bg-white/80 rounded-xl p-3 border border-indigo-200">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 mb-2"
                      autoFocus
                    />
                    <div className="flex gap-1.5 mb-3">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-300' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="text-[12px] text-slate-500 px-3 py-1.5">Cancelar</button>
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        disabled={loading}
                        className="text-[12px] bg-indigo-500 text-white px-3 py-1.5 rounded-full"
                      >
                        {loading ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm font-medium text-slate-700">{cat.name}</span>
                    <span className="text-[11px] text-slate-400">{cat.task_count ?? 0} tareas</span>
                    <button
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingId(cat.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create form */}
          {showCreate ? (
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre de la categoría"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 mb-3"
                autoFocus
              />
              <div className="flex gap-1.5 mb-3">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-300' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowCreate(false); setNewName(''); }} className="text-[12px] text-slate-500 px-3 py-1.5">
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !newName.trim()}
                  className="text-[12px] bg-indigo-500 text-white px-3 py-1.5 rounded-full disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 h-11 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
            >
              <Plus size={18} />
              Nueva categoría
            </button>
          )}
        </div>

        <div className="md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
};

export default CategoryManager;
