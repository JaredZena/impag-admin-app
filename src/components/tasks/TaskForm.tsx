import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createTask } from '@/utils/tasksApi';
import type { Task, TaskUser, TaskCategory, TaskPriority, CreateTaskPayload } from '@/types/tasks';

const PRIORITIES: { key: TaskPriority; label: string }[] = [
  { key: 'low', label: 'Baja' },
  { key: 'medium', label: 'Media' },
  { key: 'high', label: 'Alta' },
  { key: 'urgent', label: 'Urgente' },
];

interface TaskFormProps {
  users: TaskUser[];
  categories: TaskCategory[];
  currentUser: TaskUser | null;
  onClose: () => void;
  onCreated: (task: Task) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ users, categories, currentUser, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [assignedTo, setAssignedTo] = useState<number | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');

  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setTitleError('El título es obligatorio');
      titleInputRef.current?.focus();
      return;
    }
    setTitleError('');
    setError('');
    setSubmitting(true);

    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        priority,
      };
      if (description.trim()) payload.description = description.trim();
      if (dueDate) payload.due_date = dueDate;
      if (categoryId) payload.category_id = categoryId;
      if (assignedTo) payload.assigned_to = assignedTo;

      const res = await createTask(payload);
      onCreated(res.data);
    } catch (err: any) {
      setError(err.message || 'Error al crear la tarea');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet / Panel */}
      <div
        ref={sheetRef}
        className="relative w-full md:w-[480px] md:h-full max-h-[92vh] md:max-h-none bg-white md:bg-white rounded-t-3xl md:rounded-t-none md:rounded-l-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] md:shadow-[0_0_40px_rgba(0,0,0,0.12)] overflow-y-auto animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        <div className="px-5 pb-6 md:px-6 md:py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-800">Nueva Tarea</h2>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 md:flex hidden">
              <X size={20} />
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Título *</label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setTitleError(''); }}
                maxLength={300}
                placeholder="¿Qué necesitas hacer?"
                className={`w-full bg-white/80 backdrop-blur-sm border rounded-xl px-4 py-3.5 text-[15px] text-slate-800 placeholder-slate-400 outline-none transition-all duration-200
                  ${titleError
                    ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200/60 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
                  }`}
              />
              {titleError && (
                <p className="text-xs text-red-500 mt-1">{titleError}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Detalles adicionales..."
                className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-4 py-3.5 text-[15px] text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 resize-none"
                style={{ minHeight: '60px', maxHeight: '150px' }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
                }}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Prioridad</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPriority(p.key)}
                    className={`flex-1 px-4 py-2 rounded-full text-sm font-medium text-center transition-colors duration-200 ${
                      priority === p.key
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-4 py-3 text-[15px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Categoría</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setCategoryId(undefined)}
                  className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                    !categoryId ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Sin categoría
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(categoryId === cat.id ? undefined : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                      categoryId === cat.id ? 'text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                    style={categoryId === cat.id ? { backgroundColor: cat.color } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Asignar a</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAssignedTo(undefined)}
                  className={`flex flex-col items-center gap-1 ${!assignedTo ? 'opacity-100' : 'opacity-50'}`}
                >
                  <div className={`w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center ${
                    !assignedTo ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                  }`}>
                    <span className="text-xs text-slate-500">—</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Nadie</span>
                </button>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setAssignedTo(assignedTo === u.id ? undefined : u.id)}
                    className={`flex flex-col items-center gap-1 ${assignedTo === u.id ? 'opacity-100' : 'opacity-50'}`}
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.display_name}
                        className={`w-10 h-10 rounded-full ${assignedTo === u.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center ${
                        assignedTo === u.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                      }`}>
                        <span className="text-sm font-semibold text-indigo-600">{u.display_name.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-[11px] text-slate-500">{u.display_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-6 h-12 bg-indigo-500 text-white rounded-xl font-semibold text-sm hover:bg-indigo-600 disabled:bg-indigo-400 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Tarea'
            )}
          </button>
        </div>

        {/* Safe area padding */}
        <div className="md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
};

export default TaskForm;
