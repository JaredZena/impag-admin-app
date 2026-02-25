export interface TaskUser {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  is_active: boolean;
}

export interface TaskCategory {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  task_count?: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  task_number: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  category_id: number | null;
  created_by: number;
  assigned_to: number | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  last_updated: string | null;
  creator: TaskUser;
  assignee: TaskUser | null;
  category: TaskCategory | null;
  comment_count: number;
}

export interface TaskWithComments extends Task {
  comments: TaskComment[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  last_updated: string | null;
  user: TaskUser;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  due_date?: string;
  assigned_to?: number;
  category_id?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: number | null;
  category_id?: number | null;
}

export interface CreateCategoryPayload {
  name: string;
  color: string;
  icon?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  color?: string;
  icon?: string;
}

export interface TasksApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  message: string | null;
}
