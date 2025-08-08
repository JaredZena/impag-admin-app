import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
function GoogleIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 48 48", className: "inline-block w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 3xl:w-10 3xl:h-10", "aria-hidden": "true", children: _jsx("g", { children: _jsx("path", { fill: "#4285F4", d: "M43.6 20.5H42V20H24v8h11.3C34.7 32.1 30.1 35 24 35c-6.1 0-11.3-4.1-13.1-9.6-1.8-5.5 0-11.5 4.6-15.1C19.2 6.1 21.6 5 24 5c4.1 0 7.8 1.6 10.6 4.2l7.1-7.1C37.5 0.7 30.9-2 24 0.1 12.1 3.2 3.2 14.1 3.2 26c0 11.9 8.9 22.8 20.8 25.9 6.9 2.1 13.5-0.6 18.7-5.1l-7.1-7.1C31.8 42.4 28.1 44 24 44c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.2 0 6.2 1.1 8.6 3.1l6.1-6.1C36.2 7.1 30.4 5 24 5c-10.5 0-19 8.5-19 19s8.5 19 19 19c10.5 0 19-8.5 19-19 0-1.3-0.1-2.5-0.4-3.7z" }) }) }));
}
const Login = () => {
    const { login, isLoading } = useAuth();
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState(null);
    // Google Identity Services initialization
    useEffect(() => {
        const initGoogleIdentity = () => {
            if (!window.google)
                return;
            console.log('Initializing Google Identity Services with client ID:', GOOGLE_CLIENT_ID);
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                use_fedcm_for_prompt: false,
            });
            setIsGoogleLoaded(true);
            console.log('Google Identity Services initialized successfully');
        };
        if (window.google) {
            initGoogleIdentity();
        }
        else {
            const checkGoogle = setInterval(() => {
                if (window.google) {
                    clearInterval(checkGoogle);
                    initGoogleIdentity();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkGoogle);
                if (!window.google) {
                    setError('Failed to load Google Sign-In');
                }
            }, 5000);
        }
    }, []);
    // Handle the credential response from Google
    const handleCredentialResponse = useCallback((response) => {
        try {
            // Store the raw JWT token for API calls
            localStorage.setItem('google_token', response.credential);
            // Decode for user info (existing code)
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            const googleUser = {
                getBasicProfile: () => ({
                    getEmail: () => payload.email,
                    getName: () => payload.name,
                    getImageUrl: () => payload.picture,
                    getId: () => payload.sub,
                })
            };
            login(googleUser);
            setIsSigningIn(false);
        }
        catch (err) {
            console.error('Failed to process Google credential:', err);
            setError('Failed to process Google sign-in');
            setIsSigningIn(false);
        }
    }, [login]);
    // Handle Google Sign-In button click
    const handleGoogleSignIn = useCallback(() => {
        if (!window.google || !isGoogleLoaded) {
            setError('Google Sign-In not ready');
            return;
        }
        setError(null);
        setIsSigningIn(true);
        const buttonContainer = document.getElementById('google-signin-button');
        if (buttonContainer) {
            buttonContainer.innerHTML = '';
            window.google.accounts.id.renderButton(buttonContainer, {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                text: 'signin_with',
                width: '100%',
            });
        }
    }, [isGoogleLoaded]);
    return (_jsx("div", { className: "fixed inset-0 w-screen h-screen flex items-center justify-center bg-gray-50", children: _jsxs("div", { className: "w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-10 xl:p-12 2xl:p-16", children: [_jsxs("div", { className: "text-center mb-6 sm:mb-8 lg:mb-10 xl:mb-12", children: [_jsx("h1", { className: "text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-900 mb-2 sm:mb-4", children: "IMPAG Admin Login" }), _jsx("p", { className: "text-gray-600 text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl", children: "Sign in to access your dashboard" })] }), isLoading || !isGoogleLoaded ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 lg:py-12 xl:py-16", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 xl:h-16 xl:w-16 2xl:h-20 2xl:w-20 border-t-2 border-b-2 border-blue-600 mb-4 lg:mb-6 xl:mb-8" }), _jsx("div", { className: "text-gray-500 text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl", children: "Loading Google Sign-In..." })] })) : (
                        /* Login Form */
                        _jsxs("div", { className: "space-y-4 sm:space-y-6 lg:space-y-8", children: [_jsx("div", { id: "google-signin-button", className: "w-full" }), _jsxs("button", { onClick: handleGoogleSignIn, disabled: !isGoogleLoaded || isSigningIn, className: "flex items-center justify-center gap-3 lg:gap-4 xl:gap-5 2xl:gap-6 bg-white border-2 border-gray-300 rounded-lg lg:rounded-xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-5 xl:px-10\n  xl:py-6 2xl:px-12 2xl:py-8 text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-700 font-medium hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 w-full\n  shadow-sm hover:shadow-md", children: [_jsx(GoogleIcon, {}), isSigningIn ? 'Signing in...' : 'Click to load Google Sign-In'] })] })), error && (_jsxs("div", { className: "mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-5 bg-red-50 border border-red-200 rounded-lg lg:rounded-xl", children: [_jsx("div", { className: "text-red-600 text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-center", children: error }), _jsx("button", { className: "block mt-2 sm:mt-3 lg:mt-4 mx-auto underline text-blue-600 hover:text-blue-800 text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl transition-colors duration-150", onClick: () => setError(null), children: "Retry" })] }))] }), _jsxs("div", { className: "mt-6 sm:mt-8 lg:mt-10 xl:mt-12 text-center text-gray-400 text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl", children: ["\u00A9 ", new Date().getFullYear(), " IMPAG Admin"] })] }) }));
};
export default Login;
