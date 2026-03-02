const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://democratic-cuckoo-impag-f0717e14.koyeb.app';
const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === 'true';

// Global session expiration handler - will be set by App.tsx
let sessionExpirationHandler: (() => void) | null = null;

export const setSessionExpirationHandler = (handler: () => void) => {
  sessionExpirationHandler = handler;
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('google_token');

  if (!token && !DISABLE_AUTH) {
    throw new Error('No authentication token found');
  }

  // Prepare headers
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle options.headers properly - it could be a Headers object or plain object
  if (options.headers) {
    if (options.headers instanceof Headers) {
      // Convert Headers object to plain object
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else {
      // It's already a plain object, safe to spread
      Object.assign(headers, options.headers);
    }
  }

  // Don't set Content-Type for FormData - let the browser set it automatically
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired - use the session expiration handler if available
    console.log('Session expired - handling gracefully');
    localStorage.removeItem('google_token');
    
    if (sessionExpirationHandler) {
      sessionExpirationHandler();
    } else {
      // Fallback to page reload if no handler is set
      window.location.reload();
    }
    
    throw new Error('Authentication expired');
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API request failed: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // If not JSON, use the raw text
      if (errorText) {
        errorMessage = errorText;
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};
