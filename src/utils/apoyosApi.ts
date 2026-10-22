// Service module for the "Apoyos gubernamentales" admin API (impag-quot routes/apoyos.py).
// Same auth/error handling as the rest of the app — everything goes through apiRequest.

import { apiRequest } from './api';
import type {
  ApoyoAdmin,
  ApoyoInput,
  ApoyoListParams,
  ApoyoListResponse,
  ApoyoRun,
  ApoyoRunDispatchResult,
  ApoyoStatus,
  ApoyosSettings,
  ApoyosSettingsResponse,
  ApoyosSiteStatus,
  ApoyosStats,
} from '@/types/apoyos';

const call = <T>(endpoint: string, options: RequestInit = {}): Promise<T> =>
  apiRequest(endpoint, options) as Promise<T>;

// ==================== Apoyos ====================

export async function listApoyos(params: ApoyoListParams = {}): Promise<ApoyoListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  if (params.state) qs.set('state', params.state);
  if (params.sector) qs.set('sector', params.sector);
  if (params.window) qs.set('window', params.window);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  const res = await call<{ success: boolean; data: ApoyoListResponse }>(`/apoyos${suffix ? `?${suffix}` : ''}`);
  return res.data;
}

export async function getApoyosStats(): Promise<ApoyosStats> {
  const res = await call<{ success: boolean; data: ApoyosStats }>('/apoyos/stats');
  return res.data;
}

export async function getApoyo(id: number): Promise<ApoyoAdmin> {
  const res = await call<{ success: boolean; data: ApoyoAdmin }>(`/apoyos/${id}`);
  return res.data;
}

export async function createApoyo(payload: ApoyoInput): Promise<ApoyoAdmin> {
  const res = await call<{ success: boolean; data: ApoyoAdmin }>('/apoyos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateApoyo(id: number, payload: Partial<ApoyoInput>): Promise<ApoyoAdmin> {
  const res = await call<{ success: boolean; data: ApoyoAdmin }>(`/apoyos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setApoyoStatus(id: number, status: ApoyoStatus): Promise<ApoyoAdmin> {
  const res = await call<{ success: boolean; data: ApoyoAdmin }>(`/apoyos/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function deleteApoyo(id: number): Promise<void> {
  await call<{ success: boolean; data: { deleted: boolean } }>(`/apoyos/${id}`, { method: 'DELETE' });
}

// ==================== Site publish ====================

export async function publishApoyosSite(): Promise<{ status: string }> {
  const res = await call<{ success: boolean; data: { status: string } }>('/apoyos/site/publish', {
    method: 'POST',
  });
  return res.data;
}

export async function getApoyosSiteStatus(): Promise<ApoyosSiteStatus> {
  const res = await call<{ success: boolean; data: ApoyosSiteStatus }>('/apoyos/site/status');
  return res.data;
}

// ==================== Runs ====================

export async function listApoyoRuns(limit = 50): Promise<ApoyoRun[]> {
  const res = await call<{ success: boolean; data: ApoyoRun[] }>(`/apoyos/runs?limit=${limit}`);
  return res.data;
}

export async function getApoyoRun(id: number): Promise<ApoyoRun> {
  const res = await call<{ success: boolean; data: ApoyoRun }>(`/apoyos/runs/${id}`);
  return res.data;
}

export async function createApoyoRun(): Promise<ApoyoRunDispatchResult> {
  const res = await call<{ success: boolean; data: ApoyoRunDispatchResult }>('/apoyos/runs', {
    method: 'POST',
  });
  return res.data;
}

export async function cancelApoyoRun(id: number): Promise<ApoyoRun> {
  const res = await call<{ success: boolean; data: ApoyoRun }>(`/apoyos/runs/${id}/cancel`, {
    method: 'POST',
  });
  return res.data;
}

// ==================== Settings ====================

export async function getApoyosSettings(): Promise<ApoyosSettingsResponse> {
  const res = await call<{ success: boolean; data: ApoyosSettingsResponse }>('/apoyos/settings');
  return res.data;
}

export async function updateApoyosSettings(patch: Partial<ApoyosSettings>): Promise<ApoyosSettingsResponse> {
  const res = await call<{ success: boolean; data: ApoyosSettingsResponse }>('/apoyos/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  return res.data;
}
