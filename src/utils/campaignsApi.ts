import { apiRequest } from '@/utils/api';
import type {
  ActivateCampaignResponse,
  Campaign,
  CampaignGenerateRequest,
  CampaignItem,
  CampaignItemUpdatePayload,
  CampaignStatus,
  CampaignUpdatePayload,
  GeneratePostResponse,
} from '@/types/campaigns';

export const generateCampaign = (body: CampaignGenerateRequest): Promise<Campaign> =>
  apiRequest('/campaigns/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const generatePlan = (id: number): Promise<Campaign> =>
  apiRequest(`/campaigns/${id}/generate-plan`, { method: 'POST' });

export const fetchCampaigns = (status?: CampaignStatus): Promise<Campaign[]> =>
  apiRequest(`/campaigns${status ? `?status=${encodeURIComponent(status)}` : ''}`);

export const fetchCampaign = (id: number): Promise<Campaign> =>
  apiRequest(`/campaigns/${id}`);

export const updateCampaign = (id: number, patch: CampaignUpdatePayload): Promise<Campaign> =>
  apiRequest(`/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const updateItem = (itemId: number, patch: CampaignItemUpdatePayload): Promise<CampaignItem> =>
  apiRequest(`/campaigns/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const activateCampaign = (id: number): Promise<ActivateCampaignResponse> =>
  apiRequest(`/campaigns/${id}/activate`, { method: 'POST' });

export const generatePostForItem = (itemId: number): Promise<GeneratePostResponse> =>
  apiRequest(`/campaigns/items/${itemId}/generate-post`, { method: 'POST' });

export const deleteCampaign = async (id: number): Promise<void> => {
  try {
    await apiRequest(`/campaigns/${id}`, { method: 'DELETE' });
  } catch (e) {
    // DELETE returns 204 with an empty body; apiRequest's response.json() throws
    // a SyntaxError on it. Real HTTP errors are thrown as plain Error, so only
    // the empty-body parse failure is swallowed here.
    if (e instanceof SyntaxError) return;
    throw e;
  }
};
