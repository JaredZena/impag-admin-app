import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Archive, Loader2, AlertTriangle } from 'lucide-react';
import { fetchArchivedTasks } from '@/utils/tasksApi';
import type { Task } from '@/types/tasks';

function formatArchiveDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const TaskArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchArchivedTasks();
        setTasks(res.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#f8f9fc] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Archivo</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 p-6">
          <AlertTriangle size={32} className="text-red-400 mb-3" />
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); }}
            className="mt-3 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm"
          >
            Reintentar
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center">
            <Archive size={40} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mt-6">No hay tareas archivadas</h3>
          <p className="text-sm text-slate-400 text-center max-w-[260px] mt-2 leading-relaxed">
            Las tareas completadas se archivan automáticamente después de 3 días
          </p>
        </div>
      ) : (
        <div className="py-3 space-y-3 px-4 md:px-6 md:max-w-3xl md:mx-auto">
          {tasks.map(task => (
            <div
              key={task.id}
              className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Archive size={12} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[15px] font-semibold text-slate-500 leading-snug line-clamp-2">
                    {task.title}
                  </span>
                  {task.description && (
                    <p className="text-[13px] text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-400">
                    {task.category && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: task.category.color + '15', color: task.category.color }}
                      >
                        {task.category.name}
                      </span>
                    )}
                    {task.archived_at && (
                      <span>Archivada el {formatArchiveDate(task.archived_at)}</span>
                    )}
                    {task.assignee && (
                      <span>{task.assignee.display_name}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskArchivePage;
