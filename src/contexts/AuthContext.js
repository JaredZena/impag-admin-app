import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext(undefined);
const LOCAL_STORAGE_KEY = 'impag_user';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // Restore user from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            }
            catch {
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);
    // Login with Google user object
    const login = (googleUser) => {
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
        const userObj = {
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
        if (window.google && window.google.accounts) {
            window.google.accounts.id.disableAutoSelect();
        }
        if (window.gapi && window.gapi.auth2) {
            const auth2 = window.gapi.auth2.getAuthInstance();
            if (auth2) {
                auth2.signOut();
            }
        }
    };
    const value = {
        user,
        login,
        logout,
        isLoading,
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
