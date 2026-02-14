import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, User, Clock, Loader2, Trash2 } from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import { fetchTask, updateTask, updateTaskStatus, deleteTask } from '@/utils/tasksApi';
import type { Task, TaskWithComments, TaskUser, TaskCategory, TaskStatus, UpdateTaskPayload, TaskPriority } from '@/types/tasks';
import TaskComments from './TaskComments';

const STATUS_PILLS: { key: TaskStatus; label: string }[] = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'in_progress', label: 'En Progreso' },
  { key: 'done', label: 'Completada' },
];

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-slate-100/80', text: 'text-slate-500', label: 'Baja' },
  medium: { bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'Media' },
  high: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Alta' },
  urgent: { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgente' },
};

const PRIORITIES: { key: TaskPriority; label: string }[] = [
  { key: 'low', label: 'Baja' },
  { key: 'medium', label: 'Media' },
  { key: 'high', label: 'Alta' },
  { key: 'urgent', label: 'Urgente' },
];

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return 'hace unos minutos';
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDueDate(dueDate: string | null): { text: string; color: string } {
  if (!dueDate) return { text: 'Sin fecha límite', color: 'text-slate-400' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < -1) return { text: `Vencida hace ${Math.abs(diffDays)} días`, color: 'text-red-500' };
  if (diffDays === -1) return { text: 'Vencida ayer', color: 'text-red-500' };
  if (diffDays === 0) return { text: 'Vence hoy', color: 'text-amber-500' };
  if (diffDays === 1) return { text: 'Vence mañana', color: 'text-amber-500' };
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return { text: `Vence el ${due.getDate()} ${months[due.getMonth()]}`, color: 'text-slate-500' };
}

interface TaskDetailModalProps {
  task: Task;
  users: TaskUser[];
  categories: TaskCategory[];
  currentUser: TaskUser | null;
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: number) => void;
  onStatusChanged: (task: Task, newStatus: TaskStatus) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task: initialTask,
  users,
  categories,
  currentUser,
  onClose,
  onUpdated,
  onDeleted,
  onStatusChanged,
}) => {
  const { addNotification } = useNotifications();
  const [taskDetail, setTaskDetail] = useState<TaskWithComments | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState(initialTask.title);
  const [editDescription, setEditDescription] = useState(initialTask.description || '');
  const [editPriority, setEditPriority] = useState<TaskPriority>(initialTask.priority);
  const [editDueDate, setEditDueDate] = useState(initialTask.due_date || '');
  const [editAssignedTo, setEditAssignedTo] = useState<number | undefined>(initialTask.assigned_to || undefined);
  const [editCategoryId, setEditCategoryId] = useState<number | undefined>(initialTask.category_id || undefined);

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetchTask(initialTask.id);
      setTaskDetail(res.data);
    } catch {
      addNotification({ type: 'error', title: 'Error al cargar detalles', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [initialTask.id, addNotification]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const task = taskDetail || initialTask;
  const dueDateInfo = formatDueDate(task.due_date);
  const prioStyle = PRIORITY_STYLES[task.priority];

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      const res = await updateTaskStatus(task.id, newStatus);
      setTaskDetail(prev => prev ? { ...prev, ...res.data } : null);
      onStatusChanged(res.data, newStatus);
      addNotification({
        type: 'success',
        title: newStatus === 'done' ? 'Tarea completada' : `Estado: ${STATUS_PILLS.find(s => s.key === newStatus)?.label}`,
        duration: 3000,
      });
    } catch {
      addNotification({ type: 'error', title: 'Error al cambiar estado', duration: 5000 });
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const payload: UpdateTaskPayload = {};
      if (editTitle.trim() !== task.title) payload.title = editTitle.trim();
      if (editDescription.trim() !== (task.description || '')) payload.description = editDescription.trim() || undefined;
      if (editPriority !== task.priority) payload.priority = editPriority;
      if (editDueDate !== (task.due_date || '')) payload.due_date = editDueDate || null;
      if (editAssignedTo !== (task.assigned_to || undefined)) payload.assigned_to = editAssignedTo || null;
      if (editCategoryId !== (task.category_id || undefined)) payload.category_id = editCategoryId || null;

      if (Object.keys(payload).length > 0) {
        const res = await updateTask(task.id, payload);
        setTaskDetail(prev => prev ? { ...prev, ...res.data } : null);
        onUpdated(res.data);
        addNotification({ type: 'success', title: 'Tarea actualizada', duration: 3000 });
      }
      setEditing(false);
    } catch {
      addNotification({ type: 'error', title: 'Error al guardar', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onDeleted(task.id);
    } catch {
      addNotification({ type: 'error', title: 'Error al archivar', duration: 5000 });
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditDueDate(task.due_date || '');
    setEditAssignedTo(task.assigned_to || undefined);
    setEditCategoryId(task.category_id || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div className="relative w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] bg-white rounded-t-3xl md:rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] md:shadow-[0_24px_80px_rgba(0,0,0,0.15)] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Desktop close button */}
        <button onClick={onClose} className="hidden md:flex absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-100 z-10">
          <X size={20} />
        </button>

        <div className="px-5 pb-6 md:px-8 md:py-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              {/* ── Header ──────────────────────────────── */}
              {editing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-lg font-semibold text-slate-800 bg-white/80 border border-slate-200/60 rounded-xl px-4 py-3 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all mb-3"
                />
              ) : (
                <h2 className="text-lg font-semibold text-slate-800 leading-snug mb-3 pr-8">{task.title}</h2>
              )}

              {/* Pills row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* Priority pill */}
                {!editing && (
                  <span className={`${prioStyle.bg} ${prioStyle.text} px-3 py-1.5 rounded-full text-xs font-semibold`}>
                    {prioStyle.label}
                  </span>
                )}
                {/* Category pill */}
                {!editing && task.category && (
                  <span
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: task.category.color + '15', color: task.category.color }}
                  >
                    {task.category.name}
                  </span>
                )}
              </div>

              {/* Status selector */}
              {task.status !== 'archived' && (
                <div className="flex gap-2 mb-5">
                  {STATUS_PILLS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => handleStatusChange(s.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 ${
                        task.status === s.key
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Edit fields ────────────────────────── */}
              {editing && (
                <div className="space-y-4 mb-5">
                  {/* Priority */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Prioridad</label>
                    <div className="flex gap-2">
                      {PRIORITIES.map(p => (
                        <button
                          key={p.key}
                          onClick={() => setEditPriority(p.key)}
                          className={`flex-1 px-3 py-2 rounded-full text-sm font-medium text-center transition-colors ${
                            editPriority === p.key ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descripción</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-4 py-3 text-sm text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none"
                    />
                  </div>
                  {/* Due date */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Fecha límite</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={e => setEditDueDate(e.target.value)}
                      className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Categoría</label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <button
                        onClick={() => setEditCategoryId(undefined)}
                        className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                          !editCategoryId ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Sin categoría
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setEditCategoryId(editCategoryId === cat.id ? undefined : cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                            editCategoryId === cat.id ? 'text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                          style={editCategoryId === cat.id ? { backgroundColor: cat.color } : undefined}
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
                      <button onClick={() => setEditAssignedTo(undefined)} className={`flex flex-col items-center gap-1 ${!editAssignedTo ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center ${!editAssignedTo ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
                          <span className="text-xs text-slate-500">—</span>
                        </div>
                        <span className="text-[11px] text-slate-500">Nadie</span>
                      </button>
                      {users.map(u => (
                        <button key={u.id} onClick={() => setEditAssignedTo(u.id)} className={`flex flex-col items-center gap-1 ${editAssignedTo === u.id ? 'opacity-100' : 'opacity-50'}`}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.display_name} className={`w-10 h-10 rounded-full ${editAssignedTo === u.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`} />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center ${editAssignedTo === u.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
                              <span className="text-sm font-semibold text-indigo-600">{u.display_name.charAt(0)}</span>
                            </div>
                          )}
                          <span className="text-[11px] text-slate-500">{u.display_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Meta Info (read-only) ──────────────── */}
              {!editing && (
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <span className={dueDateInfo.color}>{dueDateInfo.text}</span>
                  </div>
                  {task.assignee && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-500">
                      <User size={16} className="text-slate-400 shrink-0" />
                      <span>Asignada a:</span>
                      {task.assignee.avatar_url ? (
                        <img src={task.assignee.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-indigo-600">{task.assignee.display_name.charAt(0)}</span>
                        </div>
                      )}
                      <span>{task.assignee.display_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-slate-500">
                    <User size={16} className="text-slate-400 shrink-0" />
                    <span>Creada por: {task.creator.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-500">
                    <Clock size={16} className="text-slate-400 shrink-0" />
                    <span>{formatRelativeDate(task.created_at)}</span>
                  </div>
                </div>
              )}

              {/* Description (read-only) */}
              {!editing && task.description && (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mb-4">
                  {task.description}
                </p>
              )}

              {/* Divider */}
              <div className="h-px bg-slate-100 my-4" />

              {/* ── Comments ────────────────────────────── */}
              {taskDetail && (
                <TaskComments
                  taskId={task.id}
                  comments={taskDetail.comments}
                  currentUser={currentUser}
                  onCommentsChanged={comments => setTaskDetail({ ...taskDetail, comments })}
                />
              )}

              {/* ── Action Bar ──────────────────────────── */}
              <div className="mt-5 space-y-2">
                {editing ? (
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 h-11 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 h-11 bg-indigo-500 text-white rounded-xl font-medium text-sm hover:bg-indigo-600 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                    >
                      {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar'}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full h-11 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
                    >
                      Editar
                    </button>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full h-9 text-slate-400 text-xs font-medium flex items-center justify-center gap-1.5 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                        Archivar tarea
                      </button>
                    ) : (
                      <div className="bg-red-50/60 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-[13px] text-red-700">¿Archivar esta tarea?</span>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmDelete(false)} className="text-[12px] text-slate-500 px-3 py-1.5">
                            Cancelar
                          </button>
                          <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="text-[12px] bg-red-500 text-white px-3 py-1.5 rounded-full"
                          >
                            {deleting ? 'Archivando...' : 'Archivar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Safe area */}
        <div className="md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
};

export default TaskDetailModal;
