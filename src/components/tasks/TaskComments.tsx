import React, { useState, useRef, useEffect } from 'react';
import { Send, Pencil, Trash2, Loader2 } from 'lucide-react';
import { createComment, updateComment, deleteComment } from '@/utils/tasksApi';
import type { TaskComment, TaskUser } from '@/types/tasks';

function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'hace unos segundos';
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `ayer a las ${date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

interface TaskCommentsProps {
  taskId: number;
  comments: TaskComment[];
  currentUser: TaskUser | null;
  onCommentsChanged: (comments: TaskComment[]) => void;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, comments, currentUser, onCommentsChanged }) => {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      const res = await createComment(taskId, newComment.trim());
      onCommentsChanged([...comments, res.data]);
      setNewComment('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      // Keep content for retry
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (commentId: number) => {
    if (!editContent.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await updateComment(taskId, commentId, editContent.trim());
      onCommentsChanged(comments.map(c => c.id === commentId ? res.data : c));
      setEditingId(null);
    } catch {
      // Keep editing state
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await deleteComment(taskId, commentId);
      onCommentsChanged(comments.filter(c => c.id !== commentId));
      setDeletingId(null);
    } catch {
      // Keep state
    } finally {
      setActionLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Comentarios
        </span>
        <span className="bg-indigo-50 text-indigo-500 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
          {comments.length}
        </span>
      </div>

      {/* Comments list */}
      <div className="space-y-3 mb-4">
        {comments.map(comment => (
          <div key={comment.id} className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
            {deletingId === comment.id ? (
              /* Delete confirmation */
              <div className="bg-red-50/60 backdrop-blur-sm rounded-xl p-3 border border-red-200/50">
                <p className="text-[13px] text-red-700 mb-2">¿Eliminar este comentario?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="text-[12px] text-slate-500 px-3 py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={actionLoading}
                    className="text-[12px] bg-red-500 text-white px-3 py-1.5 rounded-full"
                  >
                    {actionLoading ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ) : editingId === comment.id ? (
              /* Edit mode */
              <div>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-xl px-3 py-2 text-[13px] text-slate-600 outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-[12px] text-slate-500 px-3 py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleEdit(comment.id)}
                    disabled={actionLoading}
                    className="text-[12px] bg-indigo-500 text-white px-3 py-1.5 rounded-full"
                  >
                    {actionLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              /* Normal view */
              <>
                <div className="flex items-center gap-2.5">
                  {comment.user.avatar_url ? (
                    <img src={comment.user.avatar_url} alt={comment.user.display_name} className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-[11px] font-semibold text-indigo-600">{comment.user.display_name.charAt(0)}</span>
                    </div>
                  )}
                  <span className="text-[13px] font-semibold text-slate-700">{comment.user.display_name}</span>
                  <span className="text-[11px] text-slate-400 ml-auto">{formatCommentDate(comment.created_at)}</span>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed mt-1.5">
                  {comment.content}
                  {comment.last_updated && (
                    <span className="text-[11px] text-slate-400 italic ml-1">(editado)</span>
                  )}
                </p>
                {currentUser && comment.user_id === currentUser.id && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                      className="p-1.5 rounded-lg text-slate-400 active:text-indigo-500 active:bg-slate-100/60 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingId(comment.id)}
                      className="p-1.5 rounded-lg text-slate-400 active:text-red-500 active:bg-slate-100/60 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* New comment input */}
      <div className="flex items-end gap-2.5">
        {currentUser && (
          currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt={currentUser.display_name} className="w-8 h-8 rounded-full shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-indigo-600">{currentUser.display_name.charAt(0)}</span>
            </div>
          )
        )}
        <textarea
          ref={inputRef}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comentario..."
          rows={1}
          className="flex-1 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-4 py-3 text-[15px] text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 resize-none"
          onInput={e => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={!newComment.trim() || sending}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90
            ${newComment.trim()
              ? 'bg-indigo-500 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
              : 'bg-indigo-500/40 text-white/60'
            }`}
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};

export default TaskComments;
