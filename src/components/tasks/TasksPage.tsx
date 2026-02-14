import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  SlidersHorizontal,
  Search,
  X,
  Archive,
  ClipboardList,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import { fetchTasks, fetchUsers, fetchCategories, fetchCurrentUser, updateTaskStatus } from '@/utils/tasksApi';
import type { Task, TaskUser, TaskCategory, TaskStatus } from '@/types/tasks';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskDetailModal from './TaskDetailModal';

type TabKey = 'pending' | 'in_progress' | 'done';

const TAB_CONFIG: { key: TabKey; label: string; dotColor: string }[] = [
  { key: 'pending', label: 'Pendientes', dotColor: 'bg-amber-400' },
  { key: 'in_progress', label: 'En Progreso', dotColor: 'bg-indigo-500' },
  { key: 'done', label: 'Completadas', dotColor: 'bg-green-500' },
];

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addNotification } = useNotifications();

  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<TaskUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get('tab') as TabKey) || 'pending'
  );
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState<string>(searchParams.get('assigned_to') || '');
  const [filterPriority, setFilterPriority] = useState<string>(searchParams.get('priority') || '');
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get('category_id') || '');

  // Drag & drop (desktop board)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TabKey | null>(null);

  // Pull-to-refresh (mobile)
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const isPulling = useRef(false);
  const PULL_THRESHOLD = 80;

  const hasActiveFilters = filterAssignee || filterPriority || filterCategory;

  // ── Data Loading ──────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (filterAssignee) params.assigned_to = filterAssignee;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category_id = filterCategory;

      const [tasksRes, usersRes, categoriesRes, meRes] = await Promise.all([
        fetchTasks(params),
        fetchUsers(),
        fetchCategories(),
        fetchCurrentUser(),
      ]);

      setTasks(tasksRes.data);
      setUsers(usersRes.data);
      setCategories(categoriesRes.data);
      setCurrentUser(meRes.data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterAssignee, filterPriority, filterCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── URL Params Sync ───────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'pending') params.set('tab', activeTab);
    if (searchTerm) params.set('search', searchTerm);
    if (filterAssignee) params.set('assigned_to', filterAssignee);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterCategory) params.set('category_id', filterCategory);
    setSearchParams(params, { replace: true });
  }, [activeTab, searchTerm, filterAssignee, filterPriority, filterCategory, setSearchParams]);

  // ── Task Actions ──────────────────────────────────────

  const handleToggleDone = useCallback(async (task: Task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    const prevTasks = tasks;
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: newStatus as TaskStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null } : t
    ));
    try {
      await updateTaskStatus(task.id, newStatus);
      addNotification({
        type: 'success',
        title: newStatus === 'done' ? 'Tarea completada' : 'Tarea reabierta',
        duration: 3000,
      });
    } catch {
      setTasks(prevTasks);
      addNotification({ type: 'error', title: 'Error al actualizar la tarea', duration: 5000 });
    }
  }, [tasks, addNotification]);

  const handleTaskCreated = useCallback((newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
    setShowForm(false);
    addNotification({ type: 'success', title: 'Tarea creada', duration: 3000 });
  }, [addNotification]);

  const handleTaskUpdated = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(null);
  }, []);

  const handleTaskDeleted = useCallback((taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
    addNotification({ type: 'success', title: 'Tarea archivada', duration: 3000 });
  }, [addNotification]);

  // ── Drag & Drop (Desktop Board) ────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, taskId: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(taskId));
    setDraggingTaskId(taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, column: TabKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(column);
  }, []);

  const handleColumnDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  }, []);

  const handleColumnDrop = useCallback(async (e: React.DragEvent, targetStatus: TabKey) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingTaskId(null);

    const taskId = Number(e.dataTransfer.getData('text/plain'));
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic update
    const prevTasks = tasks;
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: targetStatus as TaskStatus, completed_at: targetStatus === 'done' ? new Date().toISOString() : null }
        : t
    ));

    try {
      await updateTaskStatus(taskId, targetStatus);
      const statusLabels: Record<TabKey, string> = { pending: 'Pendiente', in_progress: 'En Progreso', done: 'Completada' };
      addNotification({ type: 'success', title: `Tarea movida a ${statusLabels[targetStatus]}`, duration: 3000 });
    } catch {
      setTasks(prevTasks);
      addNotification({ type: 'error', title: 'Error al mover la tarea', duration: 5000 });
    }
  }, [tasks, addNotification]);

  // ── Filtered & Sorted Tasks ───────────────────────────

  const tasksByStatus = useMemo(() => {
    const result: Record<TabKey, Task[]> = { pending: [], in_progress: [], done: [] };
    for (const task of tasks) {
      if (task.status in result) {
        result[task.status as TabKey].push(task);
      }
    }
    return {
      pending: sortTasks(result.pending),
      in_progress: sortTasks(result.in_progress),
      done: sortTasks(result.done),
    };
  }, [tasks]);

  const tabCounts = useMemo(() => ({
    pending: tasksByStatus.pending.length,
    in_progress: tasksByStatus.in_progress.length,
    done: tasksByStatus.done.length,
  }), [tasksByStatus]);

  const currentTasks = tasksByStatus[activeTab];

  // ── Clear Filters ─────────────────────────────────────

  const clearFilters = () => {
    setFilterAssignee('');
    setFilterPriority('');
    setFilterCategory('');
    setSearchTerm('');
    setShowSearch(false);
  };

  // ── Pull-to-Refresh (Mobile) ────────────────────────

  const handlePullStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) {
      pullStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing]);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const diff = e.touches[0].clientY - pullStartY.current;
    if (diff > 0) {
      // Dampen the pull (feels more natural)
      setPullDistance(Math.min(diff * 0.5, 120));
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, [refreshing]);

  const handlePullEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD); // Hold at threshold while loading
      try {
        await loadData();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, PULL_THRESHOLD, loadData]);

  // ── Loading State ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f9fc]">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 pl-16 pr-4 py-3 md:px-6 md:py-4">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Tareas</h1>
        </div>
        <div className="p-4 space-y-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-24 bg-white/40 backdrop-blur-sm rounded-2xl animate-pulse mx-4 md:mx-0"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f9fc] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700">Error al cargar</h2>
          <p className="text-sm text-slate-400 mt-2">{error}</p>
          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="mt-4 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8f9fc] pb-24 md:pb-8">
      {/* ── Mobile Sticky Header ────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 pl-16 pr-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar tareas..."
                autoFocus
                className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-[15px] text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchTerm(''); }}
                className="p-2 rounded-xl text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Tareas</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('/tasks/archive')}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Archivo"
                >
                  <Archive size={20} />
                </button>
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <Search size={20} />
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`relative p-2 rounded-xl transition-colors ${
                    hasActiveFilters ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal size={20} />
                  {hasActiveFilters && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </button>
                {/* Desktop create button */}
                <button
                  onClick={() => setShowForm(true)}
                  className="hidden md:flex items-center gap-2 ml-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors"
                >
                  <Plus size={18} />
                  Nueva Tarea
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Filter Panel (inline for now) ───────────────── */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4 md:px-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Assignee filter */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Asignado a</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterAssignee('')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !filterAssignee ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Todos
              </button>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setFilterAssignee(filterAssignee === String(u.id) ? '' : String(u.id))}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filterAssignee === String(u.id) ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {u.display_name}
                </button>
              ))}
            </div>
          </div>

          {/* Priority filter */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Prioridad</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['', 'urgent', 'high', 'medium', 'low'].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(filterPriority === p ? '' : p)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filterPriority === p || (!p && !filterPriority)
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p === '' ? 'Todas' : p === 'urgent' ? 'Urgente' : p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Categoría</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterCategory('')}
                className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  !filterCategory ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterCategory(filterCategory === 'none' ? '' : 'none')}
                className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  filterCategory === 'none' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Sin categoría
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(filterCategory === String(cat.id) ? '' : String(cat.id))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                    filterCategory === String(cat.id)
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  style={filterCategory === String(cat.id) ? { backgroundColor: cat.color } : undefined}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-500 font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── Active Filter Pills ─────────────────────────── */}
      {hasActiveFilters && !showFilters && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 md:px-6 bg-white/50">
          {filterAssignee && (
            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap">
              {users.find(u => u.id === Number(filterAssignee))?.display_name}
              <button onClick={() => setFilterAssignee('')}><X size={12} /></button>
            </span>
          )}
          {filterPriority && (
            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap">
              {filterPriority === 'urgent' ? 'Urgente' : filterPriority === 'high' ? 'Alta' : filterPriority === 'medium' ? 'Media' : 'Baja'}
              <button onClick={() => setFilterPriority('')}><X size={12} /></button>
            </span>
          )}
          {filterCategory && (
            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap">
              {filterCategory === 'none' ? 'Sin categoría' : categories.find(c => c.id === Number(filterCategory))?.name}
              <button onClick={() => setFilterCategory('')}><X size={12} /></button>
            </span>
          )}
        </div>
      )}

      {/* ── Mobile Status Tabs ──────────────────────────── */}
      <div className="sticky top-[52px] z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 md:hidden">
        <div className="flex relative">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-center text-[13px] font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-indigo-600 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              {tab.label}
              <span className={`ml-1 text-[11px] ${activeTab === tab.key ? 'text-indigo-400' : 'text-slate-400'}`}>
                ({tabCounts[tab.key]})
              </span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-indigo-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop Three-Column Board ──────────────────── */}
      <div className="hidden md:grid md:grid-cols-3 gap-5 lg:gap-6 p-6 lg:p-8">
        {TAB_CONFIG.map(tab => (
          <div
            key={tab.key}
            onDragOver={e => handleColumnDragOver(e, tab.key)}
            onDragLeave={handleColumnDragLeave}
            onDrop={e => handleColumnDrop(e, tab.key)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`w-2 h-2 rounded-full ${tab.dotColor}`} />
              <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                {tab.label}
              </span>
              <span className="text-[11px] bg-slate-200/70 text-slate-500 rounded-full px-2 py-0.5 font-medium ml-auto">
                {tabCounts[tab.key]}
              </span>
            </div>
            {/* Column body */}
            <div className={`rounded-2xl p-3 min-h-[300px] space-y-3 transition-colors duration-200 ${
              dragOverColumn === tab.key
                ? 'bg-indigo-50/50 ring-2 ring-indigo-300/50 ring-inset'
                : 'bg-white/20 backdrop-blur-[2px]'
            }`}>
              {tasksByStatus[tab.key].length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-slate-400">
                  {dragOverColumn === tab.key ? 'Soltar aquí' : 'No hay tareas'}
                </div>
              ) : (
                tasksByStatus[tab.key].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleDone={handleToggleDone}
                    onClick={setSelectedTask}
                    draggable
                    isDragging={draggingTaskId === task.id}
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Mobile Task List with Pull-to-Refresh ─────── */}
      <div
        className="md:hidden"
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
        {/* Pull indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: pullDistance > 0 ? pullDistance : 0 }}
        >
          <RefreshCw
            size={20}
            className={`text-indigo-400 transition-transform duration-200 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 360}deg)`, opacity: Math.min(pullDistance / (PULL_THRESHOLD * 0.6), 1) }}
          />
        </div>

        <div className="py-3 space-y-3">
          {currentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
                <ClipboardList size={40} className="text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mt-6">
                {tasks.length === 0 ? 'No hay tareas todavía' : 'No hay tareas aquí'}
              </h3>
              <p className="text-sm text-slate-400 text-center max-w-[260px] mt-2 leading-relaxed">
                {tasks.length === 0
                  ? 'Toca el botón + para crear tu primera tarea'
                  : `No hay tareas con estado "${TAB_CONFIG.find(t => t.key === activeTab)?.label}"`}
              </p>
            </div>
          ) : (
            currentTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                onClick={setSelectedTask}
              />
            ))
          )}
        </div>
      </div>

      {/* ── FAB (Mobile Only) ───────────────────────────── */}
      <button
        onClick={() => setShowForm(true)}
        className={`md:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-indigo-500 text-white flex items-center justify-center
          shadow-[0_8px_24px_rgba(99,102,241,0.35)] active:scale-90 transition-transform
          ${tasks.length === 0 ? 'animate-pulse' : ''}
        `}
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* ── Task Form (Bottom Sheet / Panel) ────────────── */}
      {showForm && (
        <TaskForm
          users={users}
          categories={categories}
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onCreated={handleTaskCreated}
        />
      )}

      {/* ── Task Detail Modal ───────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          categories={categories}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
          onStatusChanged={(task, newStatus) => {
            handleToggleDone({ ...task, status: newStatus === 'done' ? 'pending' : 'done' } as Task);
          }}
        />
      )}
    </div>
  );
};

export default TasksPage;
