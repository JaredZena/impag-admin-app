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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'impag_user';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase());

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
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
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userObj));
  };

  // Logout and clear session
  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
} 