// App sessions (routes/auth_session.py in impag-quot).
//
// Google ID tokens last one hour and nothing renewed them, so people were sent
// back to the login screen every hour. After a Google sign-in we exchange the
// Google token for a 30-day app session token and store it where apiRequest
// already reads its bearer token ('google_token'). If the backend has sessions
// off (503) or the call fails, we keep the Google token — same as before.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SESSION_PREFIX = 'impag1.';

export async function exchangeForSession(googleCredential: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${googleCredential}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const token = body?.data?.token;
    return typeof token === 'string' && token.startsWith(SESSION_PREFIX) ? token : null;
  } catch {
    return null;
  }
}

/** Swap the stored Google token for an app session in the background. */
export function upgradeToSession(googleCredential: string): void {
  void exchangeForSession(googleCredential).then((sessionToken) => {
    // Only replace the token we exchanged: a newer sign-in may have happened meanwhile.
    if (sessionToken && localStorage.getItem('google_token') === googleCredential) {
      localStorage.setItem('google_token', sessionToken);
    }
  });
}

export interface TokenPayload {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  exp?: number;
}

/**
 * Payload of a JWT-shaped token (Google ID token or app session token).
 * base64url-safe and UTF-8 aware, so names like "Hernán" decode correctly.
 */
export function decodeTokenPayload(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload && typeof payload === 'object' ? (payload as TokenPayload) : null;
  } catch {
    return null;
  }
}
