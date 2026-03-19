import type {
  Quote,
  CreateQuotePayload,
  UpdateQuotePayload,
  CreateQuoteItemPayload,
  QuoteStats,
  ProductSearchResult,
  QuoteNotification,
} from '@/types/quotes';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const quotesApiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('google_token');
  if (!token) throw new Error('No authentication token found');

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

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

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
    } catch { /* ignore */ }
    throw new Error(errorMessage);
  }

  return response.json();
};

// ==================== Quotes ====================

export async function listQuotes(params?: {
  status?: string;
  engineer?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Quote[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.engineer) searchParams.set('engineer', params.engineer);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  const res = await quotesApiRequest<{ success: boolean; data: Quote[]; total: number }>(
    `/quotes${qs ? `?${qs}` : ''}`
  );
  return { data: res.data, total: res.total };
}

export async function getQuote(id: number): Promise<Quote> {
  const res = await quotesApiRequest<{ success: boolean; data: Quote }>(`/quotes/${id}`);
  return res.data;
}

export async function createQuote(payload: CreateQuotePayload): Promise<Quote> {
  const res = await quotesApiRequest<{ success: boolean; data: Quote }>('/quotes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateQuote(id: number, payload: UpdateQuotePayload): Promise<Quote> {
  const res = await quotesApiRequest<{ success: boolean; data: Quote }>(`/quotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteQuote(id: number): Promise<void> {
  await quotesApiRequest<{ success: boolean }>(`/quotes/${id}`, { method: 'DELETE' });
}

export async function sendQuote(id: number): Promise<{ data: Quote; quote_url: string }> {
  const res = await quotesApiRequest<{ success: boolean; data: Quote; quote_url: string }>(
    `/quotes/${id}/send`,
    { method: 'POST' }
  );
  return { data: res.data, quote_url: res.quote_url };
}

export async function getQuoteStats(): Promise<QuoteStats> {
  const res = await quotesApiRequest<{ success: boolean; data: QuoteStats }>('/quotes/stats');
  return res.data;
}

// ==================== Quote Items ====================

export async function addQuoteItem(quoteId: number, payload: CreateQuoteItemPayload): Promise<{ id: number }> {
  const res = await quotesApiRequest<{ success: boolean; data: { id: number } }>(
    `/quotes/${quoteId}/items`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
  return res.data;
}

export async function updateQuoteItem(
  quoteId: number,
  itemId: number,
  payload: Partial<CreateQuoteItemPayload>
): Promise<void> {
  await quotesApiRequest<{ success: boolean }>(
    `/quotes/${quoteId}/items/${itemId}`,
    { method: 'PUT', body: JSON.stringify(payload) }
  );
}

export async function deleteQuoteItem(quoteId: number, itemId: number): Promise<void> {
  await quotesApiRequest<{ success: boolean }>(
    `/quotes/${quoteId}/items/${itemId}`,
    { method: 'DELETE' }
  );
}

// ==================== Product Search ====================

export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
  const res = await quotesApiRequest<{ success: boolean; data: ProductSearchResult[] }>(
    `/quotes/product-search/query?q=${encodeURIComponent(query)}`
  );
  return res.data;
}

// ==================== Notifications ====================

export async function listNotifications(unreadOnly = false): Promise<QuoteNotification[]> {
  const res = await quotesApiRequest<{ success: boolean; data: QuoteNotification[] }>(
    `/notifications?unread_only=${unreadOnly}`
  );
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await quotesApiRequest<{ success: boolean; data: { unread_count: number } }>(
    '/notifications/count'
  );
  return res.data.unread_count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await quotesApiRequest<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await quotesApiRequest<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
}
