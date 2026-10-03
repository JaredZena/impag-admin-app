const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === 'true';

// Error that preserves the HTTP status code so callers can branch on it (e.g. 503)
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Backend messages that are still in English, as the team should read them.
const ENGLISH_DETAILS: [RegExp, string][] = [
  [/quote not found/i, 'No se encontró la cotización. Puede que ya se haya borrado; recarga la página.'],
  [/task not found/i, 'No se encontró el pendiente. Puede que ya se haya cerrado; recarga la página.'],
  [/item not found/i, 'No se encontró ese producto en la cotización. Recarga la página.'],
  [/only draft quotes can be deleted/i, 'Solo se pueden borrar cotizaciones en borrador.'],
  [/cannot send a quote with no items/i, 'La cotización no tiene productos. Agrega al menos uno antes de enviarla.'],
  [/not found/i, 'No se encontró. Puede que ya se haya borrado; recarga la página.'],
  [/not authenticated|forbidden|not allowed/i, 'Tu cuenta no tiene permiso para esto. Avísale a Jared.'],
];

// Turns an HTTP error body into one sentence a non-technical person can act on:
// no raw HTML, no [object Object], no English.
export const friendlyErrorMessage = (status: number, body: string): string => {
  let detail: unknown = null;
  try {
    const data = JSON.parse(body);
    detail = data.detail ?? data.error ?? data.message ?? null;
  } catch {
    // HTML or empty body: the generic message below is better than the raw text
  }
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{loc: [..., 'field'], msg: '...'}]
    const fields = detail
      .map((d) => (d && Array.isArray(d.loc) ? String(d.loc[d.loc.length - 1]) : ''))
      .filter(Boolean);
    return fields.length
      ? `Revisa los datos: falta o no es válido «${fields.join('», «')}».`
      : 'Revisa los datos: falta algo o tiene un formato incorrecto.';
  }
  if (typeof detail === 'string' && detail.trim()) {
    const english = ENGLISH_DETAILS.find(([re]) => re.test(detail as string));
    return english ? english[1] : detail;
  }
  if (status >= 500) return 'El servidor tuvo un problema. Espera un minuto e intenta de nuevo.';
  if (status === 404) return 'No se encontró. Puede que ya se haya borrado; recarga la página.';
  if (status === 403) return 'Tu cuenta no tiene permiso para esto. Avísale a Jared.';
  return `No se pudo completar (error ${status}). Intenta de nuevo.`;
};

// Global session expiration handler - will be set by App.tsx
let sessionExpirationHandler: (() => void) | null = null;

export const setSessionExpirationHandler = (handler: () => void) => {
  sessionExpirationHandler = handler;
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('google_token');

  if (!token && !DISABLE_AUTH) {
    throw new Error('Tu sesión no está activa. Vuelve a entrar con Google.');
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    // fetch only throws when the request never reached the server
    throw new ApiError('Sin conexión con el servidor. Revisa el internet e intenta de nuevo.', 0);
  }

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
    
    throw new Error('Tu sesión expiró. Vuelve a entrar con Google.');
  }

  if (!response.ok) {
    throw new ApiError(friendlyErrorMessage(response.status, await response.text()), response.status);
  }

  return response.json();
};
