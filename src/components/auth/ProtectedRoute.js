import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
const ProtectedRoute = ({ children }) => {
    const { user, isLoading, logout } = useAuth();
    // Loading state
    if (isLoading) {
        return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center bg-gray-50", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" }), _jsx("p", { className: "text-gray-600 text-lg", children: "Loading IMPAG Admin..." })] }));
    }
    // Not authenticated
    if (!user) {
        return _jsx(Login, {});
    }
    // Authenticated: show user indicator and children
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed top-4 right-4 z-50", children: _jsxs("div", { className: "flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm", children: [user.picture && (_jsx("img", { src: user.picture, alt: user.name, className: "w-6 h-6 rounded-full" })), _jsx("span", { className: "text-sm text-gray-700", children: user.name }), _jsx("button", { onClick: logout, className: "text-xs text-gray-500 hover:text-red-600", children: "Logout" })] }) }), children] }));
};
export default ProtectedRoute;
