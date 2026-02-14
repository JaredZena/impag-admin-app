import React, { useState, useRef } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import type { Task, TaskUser } from '@/types/tasks';

type DueDateUrgency = 'overdue' | 'due_today' | 'approaching' | 'comfortable' | 'no_date';

function getDueDateUrgency(dueDate: string | null): DueDateUrgency {
  if (!dueDate) return 'no_date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays <= 2) return 'approaching';
  return 'comfortable';
}

function getDueDateText(dueDate: string | null): string {
  if (!dueDate) return 'Sin fecha límite';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < -1) return `Vencida hace ${Math.abs(diffDays)} días`;
  if (diffDays === -1) return 'Vencida ayer';
  if (diffDays === 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  if (diffDays <= 7) return `Vence en ${diffDays} días`;
  const d = due;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `Vence el ${d.getDate()} ${months[d.getMonth()]}`;
}

const urgencyBorder: Record<DueDateUrgency, string> = {
  overdue: 'border-l-[3px] border-l-red-400',
  due_today: 'border-l-[3px] border-l-amber-400',
  approaching: 'border-l-[3px] border-l-yellow-300',
  comfortable: 'border-l-[3px] border-l-transparent',
  no_date: 'border-l-[3px] border-l-transparent',
};

const urgencyBg: Record<DueDateUrgency, string> = {
  overdue: 'bg-red-50/40',
  due_today: 'bg-white/70',
  approaching: 'bg-white/70',
  comfortable: 'bg-white/70',
  no_date: 'bg-white/70',
};

const urgencyDateColor: Record<DueDateUrgency, string> = {
  overdue: 'text-red-500',
  due_today: 'text-amber-500',
  approaching: 'text-amber-500',
  comfortable: 'text-slate-500',
  no_date: 'text-slate-400 italic',
};

const priorityStyles: Record<string, string> = {
  urgent: 'bg-red-50 text-red-500',
  high: 'bg-amber-50 text-amber-600',
  medium: 'bg-indigo-50 text-indigo-500',
};

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

interface TaskCardProps {
  task: Task;
  onToggleDone: (task: Task) => void;
  onClick: (task: Task) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleDone, onClick, draggable, isDragging, onDragStart, onDragEnd }) => {
  const isDone = task.status === 'done';
  const urgency = getDueDateUrgency(task.due_date);
  const [swiping, setSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setSwipeX(Math.min(diff, 200));
  };

  const handleTouchEnd = () => {
    if (!swiping) return;
    const cardWidth = cardRef.current?.offsetWidth || 300;
    if (swipeX > cardWidth * 0.4) {
      onToggleDone(task);
    }
    setSwipeX(0);
    setSwiping(false);
  };

  const swipeProgress = cardRef.current ? swipeX / (cardRef.current.offsetWidth * 0.4) : 0;

  return (
    <div className="relative mx-4 md:mx-0">
      {/* Swipe reveal background */}
      {swipeX > 0 && (
        <div className="absolute inset-0 bg-green-500 rounded-2xl flex items-center pl-6">
          <Check
            size={24}
            className="text-white transition-transform"
            style={{ transform: `scale(${Math.min(swipeProgress, 1) * 0.5 + 0.5})` }}
          />
        </div>
      )}

      <div
        ref={cardRef}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={!isDone ? handleTouchStart : undefined}
        onTouchMove={!isDone ? handleTouchMove : undefined}
        onTouchEnd={!isDone ? handleTouchEnd : undefined}
        onClick={() => onClick(task)}
        className={`
          relative backdrop-blur-xl border border-white/50 rounded-2xl px-4 py-3 cursor-pointer
          shadow-[0_8px_32px_rgba(99,102,241,0.06)]
          transition-all duration-200
          md:hover:bg-white/90 md:hover:shadow-[0_12px_40px_rgba(99,102,241,0.12)]
          active:scale-[0.98]
          ${draggable ? 'md:cursor-grab md:active:cursor-grabbing' : ''}
          ${isDragging ? 'opacity-40 scale-[0.97]' : ''}
          ${urgencyBorder[urgency]}
          ${isDone ? 'bg-white/50 opacity-60' : urgencyBg[urgency]}
        `}
        style={{ transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined }}
      >
        {/* Row 1: Checkbox + Title + Priority */}
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone(task);
            }}
            className="shrink-0 mt-0.5 p-1 -m-1"
            style={{ minWidth: 48, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                ${isDone
                  ? 'bg-green-500 border-green-500'
                  : 'border-slate-300/60 hover:border-indigo-400'
                }`}
            >
              {isDone && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <span
                className={`text-[15px] font-semibold leading-snug line-clamp-2 ${
                  isDone ? 'line-through text-slate-400' : 'text-slate-800'
                }`}
              >
                {task.title}
              </span>
              {task.priority !== 'low' && !isDone && (
                <span
                  className={`shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                    priorityStyles[task.priority] || ''
                  }`}
                >
                  {priorityLabels[task.priority]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta row: due date · category · assignee · comments */}
        <div className="flex items-center gap-2 mt-1.5 ml-[36px] flex-wrap">
          {!isDone && (
            <>
              <span className={`text-[11px] ${urgencyDateColor[urgency]}`}>
                {getDueDateText(task.due_date)}
              </span>
              {task.category && (
                <>
                  <span className="text-slate-300 text-[10px]">&middot;</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                    style={{ backgroundColor: task.category.color + '15', color: task.category.color }}
                  >
                    {task.category.name}
                  </span>
                </>
              )}
            </>
          )}
          {isDone && task.completed_at && (
            <span className="text-[11px] text-slate-400">
              {(() => {
                const daysSince = Math.floor((Date.now() - new Date(task.completed_at).getTime()) / 86400000);
                const daysLeft = 3 - daysSince;
                return daysLeft > 0 ? `Se archivará en ${daysLeft}d` : 'Se archivará pronto';
              })()}
            </span>
          )}
          <span className="ml-auto" />
          {task.assignee && (
            <div className="flex items-center gap-1 shrink-0">
              {task.assignee.avatar_url ? (
                <img src={task.assignee.avatar_url} alt={task.assignee.display_name} className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-[9px] font-semibold text-indigo-600">{task.assignee.display_name.charAt(0)}</span>
                </div>
              )}
              <span className="text-[11px] text-slate-400 hidden min-[480px]:inline">{task.assignee.display_name}</span>
            </div>
          )}
          {task.comment_count > 0 && (
            <div className="flex items-center gap-0.5">
              <MessageCircle size={12} className="text-slate-400" />
              <span className="text-[11px] text-slate-400">{task.comment_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
