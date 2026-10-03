import { apiRequest } from './api';
import type {
  Task,
  TaskWithComments,
  TaskUser,
  TaskCategory,
  TaskComment,
  CreateTaskPayload,
  UpdateTaskPayload,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  TasksApiResponse,
  ImportResult,
  PendientesSyncPreview,
} from '@/types/tasks';


// Same auth, errors and re-login dialog as the rest of the app. Never reload
// the page on 401: that would throw away whatever was pasted in a dialog.
const tasksApiRequest = <T>(endpoint: string, options: RequestInit = {}): Promise<T> =>
  apiRequest(endpoint, options) as Promise<T>;

// ── Users ──────────────────────────────────────────────

export const fetchUsers = () =>
  tasksApiRequest<TasksApiResponse<TaskUser[]>>('/task-users');

export const fetchCurrentUser = () =>
  tasksApiRequest<TasksApiResponse<TaskUser>>('/task-users/me');

// ── Tasks ──────────────────────────────────────────────

export const fetchTasks = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return tasksApiRequest<TasksApiResponse<Task[]>>(`/tasks${query}`);
};

export const fetchTask = (id: number) =>
  tasksApiRequest<TasksApiResponse<TaskWithComments>>(`/tasks/${id}`);

export const createTask = (payload: CreateTaskPayload) =>
  tasksApiRequest<TasksApiResponse<Task>>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTask = (id: number, payload: UpdateTaskPayload) =>
  tasksApiRequest<TasksApiResponse<Task>>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateTaskStatus = (id: number, status: string) =>
  tasksApiRequest<TasksApiResponse<Task>>(`/tasks/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

export const deleteTask = (id: number) =>
  tasksApiRequest<TasksApiResponse<{ id: number }>>(`/tasks/${id}`, {
    method: 'DELETE',
  });

export const fetchArchivedTasks = () =>
  tasksApiRequest<TasksApiResponse<Task[]>>('/tasks/archive');

export const importTasks = (text: string, assignedTo?: number) =>
  tasksApiRequest<TasksApiResponse<ImportResult>>('/tasks/import', {
    method: 'POST',
    body: JSON.stringify({ text, assigned_to: assignedTo }),
  });

export const autoClassifyTasks = (reclassifyAll = false) =>
  tasksApiRequest<TasksApiResponse<{ classified: number; skipped: number; no_match: number }>>('/tasks/auto-classify', {
    method: 'POST',
    body: JSON.stringify({ reclassify_all: reclassifyAll }),
  });

// ── Comments ───────────────────────────────────────────

export const fetchComments = (taskId: number) =>
  tasksApiRequest<TasksApiResponse<TaskComment[]>>(`/tasks/${taskId}/comments`);

export const createComment = (taskId: number, content: string) =>
  tasksApiRequest<TasksApiResponse<TaskComment>>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const updateComment = (taskId: number, commentId: number, content: string) =>
  tasksApiRequest<TasksApiResponse<TaskComment>>(`/tasks/${taskId}/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });

export const deleteComment = (taskId: number, commentId: number) =>
  tasksApiRequest<TasksApiResponse<{ id: number }>>(`/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
  });

// ── Categories ─────────────────────────────────────────

export const fetchCategories = () =>
  tasksApiRequest<TasksApiResponse<TaskCategory[]>>('/task-categories');

export const createCategory = (payload: CreateCategoryPayload) =>
  tasksApiRequest<TasksApiResponse<TaskCategory>>('/task-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateCategory = (id: number, payload: UpdateCategoryPayload) =>
  tasksApiRequest<TasksApiResponse<TaskCategory>>(`/task-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteCategory = (id: number) =>
  tasksApiRequest<TasksApiResponse<{ id: number }>>(`/task-categories/${id}`, {
    method: 'DELETE',
  });

export const reorderCategories = (order: number[]) =>
  tasksApiRequest<TasksApiResponse<null>>('/task-categories/reorder', {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });

// Lista *PENDIENTES ddmmaa* de WhatsApp → tablero (nuevas, siguen, se cierran).
export const syncPendientes = (text: string, dryRun: boolean) =>
  tasksApiRequest<TasksApiResponse<PendientesSyncPreview>>('/tasks/pendientes/sync', {
    method: 'POST',
    body: JSON.stringify({ text, dry_run: dryRun }),
  });

// El tablero como mensaje *PENDIENTES ddmmaa*, listo para el grupo.
export const fetchPendientesText = () =>
  tasksApiRequest<TasksApiResponse<{ text: string }>>('/tasks/pendientes/text');
