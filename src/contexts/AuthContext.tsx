import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export interface AuthContextType {
  user: User | null;
  login: (googleUser: any) => void;
  logout: () => void;
  isLoading: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  forceReauthenticate: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'impag_user';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase());

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore user from localStorage and validate token
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const token = localStorage.getItem('google_token');
    
    if (stored && token) {
      try {
        const userData = JSON.parse(stored);
        
        // Validate token format and expiry
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Math.floor(Date.now() / 1000);
            
            // If token is expired, mark session as expired
            if (payload.exp && payload.exp < now) {
              console.log('Token expired on restoration');
              setSessionExpired(true);
              setUser(userData); // Keep user data for context
            } else {
              setUser(userData);
            }
          } else {
            // Invalid token format
            setUser(null);
            localStorage.removeItem('google_token');
          }
        } catch (tokenError) {
          console.error('Invalid token format:', tokenError);
          setUser(null);
          localStorage.removeItem('google_token');
        }
      } catch {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem('google_token');
      }
    } else if (stored && !token) {
      // User data exists but no token - session expired
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
        setSessionExpired(true);
      } catch {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Login with Google user object
  const login = (googleUser: any) => {
    if (!googleUser || !googleUser.getBasicProfile) {
      alert('Google login failed.');
      return;
    }
    const profile = googleUser.getBasicProfile();
    const email = profile.getEmail().toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) {
      alert('Unauthorized email. Please use an authorized Google account.');
      logout();
      return;
    }
    const userObj: User = {
      email,
      name: profile.getName(),
      picture: profile.getImageUrl(),
      sub: profile.getId(),
    };
    setUser(userObj);
    setSessionExpired(false); // Clear any previous session expiry
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userObj));
  };

  // Clear session expired state
  const clearSessionExpired = () => {
    setSessionExpired(false);
  };

  // Force reauthentication
  const forceReauthenticate = () => {
    setSessionExpired(true);
  };

  // Logout and clear session
  const logout = () => {
    setUser(null);
    setSessionExpired(false);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('google_token');
    // Google sign out - works with both old gapi and new google identity services
    if ((window as any).google && (window as any).google.accounts) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    if ((window as any).gapi && (window as any).gapi.auth2) {
      const auth2 = (window as any).gapi.auth2.getAuthInstance();
      if (auth2) {
        auth2.signOut();
      }
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    sessionExpired,
    clearSessionExpired,
    forceReauthenticate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
} 