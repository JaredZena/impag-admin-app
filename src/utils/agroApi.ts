import { apiRequest } from './api';
import type { AgroAdmin, AgroListResponse, AgroSettings, AgroSettingsResponse, AgroStats } from '@/types/agro';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface ListAgroProjectsParams {
  lead_status?: string;
  status?: string;
  q?: string;
  state?: string;
  sector?: string;
  days?: number;
  has_contact?: boolean;
  limit?: number;
  offset?: number;
}

/** GET /agroproyectos/projects */
export async function listAgroProjects(params: ListAgroProjectsParams = {}): Promise<AgroListResponse> {
  const sp = new URLSearchParams();
  if (params.lead_status) sp.set('lead_status', params.lead_status);
  if (params.status) sp.set('status', params.status);
  if (params.q) sp.set('q', params.q);
  if (params.state) sp.set('state', params.state);
  if (params.sector) sp.set('sector', params.sector);
  if (params.days) sp.set('days', String(params.days));
  if (params.has_contact !== undefined) sp.set('has_contact', String(params.has_contact));
  sp.set('limit', String(params.limit ?? 50));
  if (params.offset) sp.set('offset', String(params.offset));
  const res = (await apiRequest(`/agroproyectos/projects?${sp.toString()}`)) as Envelope<AgroListResponse>;
  return res.data;
}

/** GET /agroproyectos/projects/{id} */
export async function getAgroProject(id: number): Promise<AgroAdmin> {
  const res = (await apiRequest(`/agroproyectos/projects/${id}`)) as Envelope<AgroAdmin>;
  return res.data;
}

/** PATCH /agroproyectos/projects/{id} — lead_status, staff_notes, assigned_to */
export async function patchAgroProject(
  id: number,
  patch: Partial<Pick<AgroAdmin, 'lead_status' | 'staff_notes' | 'assigned_to'>>
): Promise<AgroAdmin> {
  const res = (await apiRequest(`/agroproyectos/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })) as Envelope<AgroAdmin>;
  return res.data;
}

/** GET /agroproyectos/stats?days= */
export async function getAgroStats(days = 30): Promise<AgroStats> {
  const res = (await apiRequest(`/agroproyectos/stats?days=${days}`)) as Envelope<AgroStats>;
  return res.data;
}

/** GET /agroproyectos/settings */
export async function getAgroSettings(): Promise<AgroSettingsResponse> {
  const res = (await apiRequest('/agroproyectos/settings')) as Envelope<AgroSettingsResponse>;
  return res.data;
}

/** PUT /agroproyectos/settings (partial) */
export async function updateAgroSettings(patch: Partial<AgroSettings>): Promise<AgroSettingsResponse> {
  const res = (await apiRequest('/agroproyectos/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  })) as Envelope<AgroSettingsResponse>;
  return res.data;
}
