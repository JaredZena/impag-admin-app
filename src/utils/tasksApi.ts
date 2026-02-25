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
} from '@/types/tasks';

const TASKS_API_BASE = import.meta.env.VITE_TASKS_API_BASE_URL || 'http://localhost:8001';

const tasksApiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('google_token');

  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => { headers[key] = value; });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${TASKS_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('google_token');
    window.location.reload();
    throw new Error('Authentication expired');
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API request failed: ${response.statusText}`;
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.detail) errorMessage = errorData.detail;
      if (errorData.error) errorMessage = errorData.error;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

// ── Users ──────────────────────────────────────────────

export const fetchUsers = () =>
  tasksApiRequest<TasksApiResponse<TaskUser[]>>('/users/');

export const fetchCurrentUser = () =>
  tasksApiRequest<TasksApiResponse<TaskUser>>('/users/me');

// ── Tasks ──────────────────────────────────────────────

export const fetchTasks = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return tasksApiRequest<TasksApiResponse<Task[]>>(`/tasks/${query}`);
};

export const fetchTask = (id: number) =>
  tasksApiRequest<TasksApiResponse<TaskWithComments>>(`/tasks/${id}`);

export const createTask = (payload: CreateTaskPayload) =>
  tasksApiRequest<TasksApiResponse<Task>>('/tasks/', {
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
  tasksApiRequest<TasksApiResponse<TaskCategory[]>>('/categories/');

export const createCategory = (payload: CreateCategoryPayload) =>
  tasksApiRequest<TasksApiResponse<TaskCategory>>('/categories/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateCategory = (id: number, payload: UpdateCategoryPayload) =>
  tasksApiRequest<TasksApiResponse<TaskCategory>>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteCategory = (id: number) =>
  tasksApiRequest<TasksApiResponse<{ id: number }>>(`/categories/${id}`, {
    method: 'DELETE',
  });

export const reorderCategories = (order: number[]) =>
  tasksApiRequest<TasksApiResponse<null>>('/categories/reorder', {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });
