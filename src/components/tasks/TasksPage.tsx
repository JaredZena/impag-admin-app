import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Copy,
  ArrowUpDown,
  Sparkles,
  MessageSquareText,
  MoreHorizontal,
} from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import { fetchTasks, fetchUsers, fetchCategories, fetchCurrentUser, updateTaskStatus, autoClassifyTasks, fetchPendientesText } from '@/utils/tasksApi';
import { getPipelineSummary } from '@/utils/quotesApi';
import type { Task, TaskUser, TaskCategory, TaskStatus } from '@/types/tasks';
import type { QuotePipelineSummary } from '@/types/quotes';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskDetailModal from './TaskDetailModal';
import PendientesSyncModal from './PendientesSyncModal';
import { useOpenFromLink } from '@/hooks/useOpenFromLink';

type TabKey = 'pending' | 'in_progress' | 'done';

const TAB_CONFIG: { key: TabKey; label: string; dotColor: string }[] = [
  { key: 'pending', label: 'Pendientes', dotColor: 'bg-amber-400' },
  { key: 'in_progress', label: 'En Progreso', dotColor: 'bg-indigo-500' },
  { key: 'done', label: 'Completadas', dotColor: 'bg-green-500' },
];

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

type SortMode = 'priority' | 'task_number';

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  return [...tasks].sort((a, b) => {
    if (mode === 'task_number') {
      const na = a.task_number ?? 9999;
      const nb = b.task_number ?? 9999;
      return na - nb;
    }
    const pa = PRIORITY_ORDER[a.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

type CategoryGroup = { category: TaskCategory | null; tasks: Task[] };

function groupTasksByCategory(tasks: Task[], categories: TaskCategory[]): CategoryGroup[] {
  const map = new Map<number | null, Task[]>();
  for (const task of tasks) {
    const key = task.category_id ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  }
  const result: CategoryGroup[] = [];
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  for (const cat of sorted) {
    if (map.has(cat.id)) result.push({ category: cat, tasks: map.get(cat.id)! });
  }
  if (map.has(null)) result.push({ category: null, tasks: map.get(null)! });
  return result;
}

// ── Cotizaciones abiertas (aviso ligero) ──────────────────────────────
// Una sola línea, descartable por sesión — no compite con la UI de tareas.

const PIPELINE_STRIP_DISMISSED_KEY = 'quote_pipeline_strip_dismissed';

const fmtMXN = (n: number): string =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const QuotePipelineStrip: React.FC = () => {
  const [summary, setSummary] = useState<QuotePipelineSummary | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(PIPELINE_STRIP_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getPipelineSummary();
        if (!cancelled) setSummary(s);
      } catch {
        // Endpoint aún no desplegado o error transitorio — el aviso no se muestra.
      }
    })();
    return () => { cancelled = true; };
  }, [dismissed]);

  if (dismissed || !summary || summary.open_total <= 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(PIPELINE_STRIP_DISMISSED_KEY, '1');
    } catch {
      // Sin sessionStorage el aviso solo desaparece en esta vista.
    }
  };

  return (
    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200/60 px-4 py-2 md:px-6">
      <Link to="/sales" className="flex-1 min-w-0 truncate text-[13px] text-amber-800 hover:text-amber-900">
        💰 <span className="font-semibold">{fmtMXN(summary.open_total)}</span>
        {' '}en {summary.open_count} {summary.open_count === 1 ? 'cotización abierta' : 'cotizaciones abiertas'}
        {summary.stale_count > 0 && (
          <> · <span className="font-semibold">{summary.stale_count} sin seguimiento</span></>
        )}
      </Link>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg text-amber-500 hover:bg-amber-100 transition-colors shrink-0"
        aria-label="Descartar aviso de cotizaciones"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ── Opción del menú ⋯ ────────────────────────────────

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  dot?: boolean;
}> = ({ icon, label, onSelect, disabled, dot }) => (
  <button
    role="menuitem"
    onClick={onSelect}
    disabled={disabled}
    className="w-full flex items-center gap-3 min-h-[44px] px-4 py-2 text-left text-[15px] text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 transition-colors"
  >
    <span className="text-slate-500 shrink-0">{icon}</span>
    <span className="flex-1">{label}</span>
    {dot && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
  </button>
);

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
  const [showSync, setShowSync] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('priority');

  // Filters
  const [filterAssignee, setFilterAssignee] = useState<string>(searchParams.get('assigned_to') || '');
  const [filterPriority, setFilterPriority] = useState<string>(searchParams.get('priority') || '');
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get('category_id') || '');

  const [classifying, setClassifying] = useState(false);

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
  const isFiltering = !!(hasActiveFilters || searchTerm);

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
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Error al cargar las tareas');
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

  // Un enlace a /tasks?pegar=1 abre directo el pegado de la lista
  const openSync = useCallback(() => setShowSync(true), []);
  useOpenFromLink('pegar', openSync);

  // ── Menú ⋯ ────────────────────────────────────────────

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const runMenuItem = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

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

  const handleClassify = useCallback(async () => {
    setClassifying(true);
    try {
      const res = await autoClassifyTasks();
      const { classified, no_match } = res.data;
      if (classified === 0) {
        addNotification({ type: 'success', title: 'Todas las tareas ya tienen categoría', duration: 3000 });
      } else {
        addNotification({
          type: 'success',
          title: `${classified} tareas clasificadas${no_match > 0 ? `, ${no_match} sin coincidencia` : ''}`,
          duration: 4000,
        });
        await loadData();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Espera')) {
        addNotification({ type: 'error', title: msg, duration: 6000 });
      } else {
        addNotification({ type: 'error', title: 'Error al clasificar tareas', duration: 5000 });
      }
    } finally {
      setClassifying(false);
    }
  }, [addNotification, loadData]);

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
      pending: sortTasks(result.pending, sortMode),
      in_progress: sortTasks(result.in_progress, sortMode),
      done: sortTasks(result.done, sortMode),
    };
  }, [tasks, sortMode]);

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

  // ── Export to WhatsApp ───────────────────────────────

  // Copia el tablero como el mensaje *PENDIENTES ddmmaa* que Hernán manda al
  // grupo (mismas seis secciones, numeradas por sección).
  const handleExportTasks = useCallback(async () => {
    try {
      const res = await fetchPendientesText();
      await navigator.clipboard.writeText(res.data.text);
      addNotification({ type: 'success', title: 'PENDIENTES copiados para WhatsApp', duration: 3000 });
    } catch {
      addNotification({ type: 'error', title: 'Error al copiar', duration: 3000 });
    }
  }, [addNotification]);

  // ── Loading State ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f9fc]">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 pl-16 pr-4 py-3 md:px-6 md:py-4">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pendientes</h1>
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
      {/* ── Sticky Header ───────────────────────────────── */}
      {/* pr-16 / md:pr-20 deja libre la campana de notificaciones (fija arriba a la derecha) */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 pl-16 pr-16 py-3 md:pl-6 md:pr-20 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar tareas..."
                autoFocus
                className="flex-1 min-w-0 h-10 bg-slate-100 rounded-xl px-4 text-base text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchTerm(''); }}
                className="w-10 h-10 p-0 shrink-0 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar búsqueda"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pendientes</h1>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowSync(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <MessageSquareText size={16} />
                  <span>Pegar lista<span className="hidden xl:inline"> de WhatsApp</span></span>
                </button>
                <button
                  onClick={handleExportTasks}
                  className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <Copy size={16} />
                  <span>Copiar<span className="hidden xl:inline"> PENDIENTES</span></span>
                </button>

                {/* Menú ⋯ con las acciones secundarias */}
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    className={`relative w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-colors ${
                      menuOpen || hasActiveFilters ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    aria-label="Más opciones"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <MoreHorizontal size={22} />
                    {hasActiveFilters && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-2 w-60 py-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-50"
                    >
                      <MenuItem
                        icon={<ArrowUpDown size={18} />}
                        label={sortMode === 'priority' ? 'Ordenar por número' : 'Ordenar por prioridad'}
                        onSelect={() => runMenuItem(() => setSortMode(s => s === 'priority' ? 'task_number' : 'priority'))}
                      />
                      <MenuItem
                        icon={classifying ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        label={classifying ? 'Clasificando…' : 'Clasificar con IA'}
                        onSelect={() => runMenuItem(handleClassify)}
                        disabled={classifying}
                      />
                      <MenuItem
                        icon={<Archive size={18} />}
                        label="Archivo"
                        onSelect={() => runMenuItem(() => navigate('/tasks/archive'))}
                      />
                      <MenuItem
                        icon={<Search size={18} />}
                        label="Buscar"
                        onSelect={() => runMenuItem(() => setShowSearch(true))}
                      />
                      <MenuItem
                        icon={<SlidersHorizontal size={18} />}
                        label={showFilters ? 'Ocultar filtros' : 'Filtros'}
                        onSelect={() => runMenuItem(() => setShowFilters(f => !f))}
                        dot={!!hasActiveFilters}
                      />
                    </div>
                  )}
                </div>

                {/* Desktop create button */}
                <button
                  onClick={() => setShowForm(true)}
                  className="hidden md:flex items-center gap-2 h-10 px-4 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors"
                >
                  <Plus size={18} />
                  Nueva Tarea
                </button>
              </div>
            </>
          )}
        </div>

        {/* Teléfono: las dos acciones del día con texto, debajo del título */}
        <div className="sm:hidden -mx-12 mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowSync(true)}
            className="h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-[15px] font-semibold active:bg-green-700"
          >
            <MessageSquareText size={18} />
            Pegar lista
          </button>
          <button
            onClick={handleExportTasks}
            className="h-10 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-medium active:bg-slate-100"
          >
            <Copy size={18} />
            Copiar
          </button>
        </div>
      </div>

      {/* ── Aviso de cotizaciones abiertas ──────────────── */}
      <QuotePipelineStrip />

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
      <div className="sticky top-[116px] sm:top-[64px] z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 md:hidden">
        <div className="flex relative">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-1 py-3 text-center text-[13px] font-medium whitespace-nowrap transition-colors relative ${
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
            <div className={`rounded-2xl p-3 min-h-[300px] transition-colors duration-200 ${
              dragOverColumn === tab.key
                ? 'bg-indigo-50/50 ring-2 ring-indigo-300/50 ring-inset'
                : 'bg-white/20 backdrop-blur-[2px]'
            }`}>
              {tasksByStatus[tab.key].length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-slate-400">
                  {dragOverColumn === tab.key ? 'Soltar aquí' : 'No hay tareas'}
                </div>
              ) : (
                groupTasksByCategory(tasksByStatus[tab.key], categories).map(({ category, tasks: groupTasks }) => (
                  <div key={category?.id ?? 'uncategorized'} className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      {category && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                      )}
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {category ? category.name : 'Sin Categoría'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {groupTasks.map(task => (
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
                      ))}
                    </div>
                  </div>
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

        <div className="py-3">
          {currentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
                <ClipboardList size={40} className="text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mt-6">
                {tasks.length > 0 ? 'No hay tareas aquí' : isFiltering ? 'Sin resultados' : 'No hay tareas todavía'}
              </h3>
              <p className="text-sm text-slate-400 text-center max-w-[260px] mt-2 leading-relaxed">
                {tasks.length > 0
                  ? `No hay tareas con estado "${TAB_CONFIG.find(t => t.key === activeTab)?.label}"`
                  : isFiltering
                    ? 'Ninguna tarea coincide con la búsqueda o los filtros.'
                    : 'Toca «Pegar lista» y pega el mensaje PENDIENTES de WhatsApp.'}
              </p>
              {tasks.length === 0 && (
                isFiltering ? (
                  <button
                    onClick={clearFilters}
                    className="mt-5 h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[15px] font-medium active:bg-slate-100"
                  >
                    Quitar búsqueda y filtros
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSync(true)}
                    className="mt-5 h-11 px-5 inline-flex items-center gap-2 rounded-xl bg-green-600 text-white text-[15px] font-semibold active:bg-green-700"
                  >
                    <MessageSquareText size={18} />
                    Pegar lista
                  </button>
                )
              )}
            </div>
          ) : (
            groupTasksByCategory(currentTasks, categories).map(({ category, tasks: groupTasks }) => (
              <div key={category?.id ?? 'uncategorized'} className="mb-2">
                <div className="flex items-center gap-2 px-4 py-2 sticky top-[160px] sm:top-[108px] z-10 bg-[#f8f9fc]/90 backdrop-blur-sm">
                  {category && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                  )}
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    {category ? category.name : 'Sin Categoría'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">({groupTasks.length})</span>
                </div>
                <div className="space-y-3">
                  {groupTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleDone={handleToggleDone}
                      onClick={setSelectedTask}
                    />
                  ))}
                </div>
              </div>
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

      {showSync && (
        <PendientesSyncModal
          onClose={() => setShowSync(false)}
          onSynced={() => {
            setShowSync(false);
            loadData();
            addNotification({ type: 'success', title: 'Pendientes sincronizados con WhatsApp', duration: 3000 });
          }}
        />
      )}

    </div>
  );
};

export default TasksPage;
