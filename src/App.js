import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import './App.css';
export default function QueryApp() {
    const [query, setQuery] = useState("");
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
    const sendQuery = async () => {
        if (!query.trim()) {
            setError("Por favor ingresa un producto a cotizar");
            return;
        }
        setLoading(true);
        setResponse(null);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/query`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query }),
            });
            if (!res.ok) {
                throw new Error(`Error en la solicitud: ${res.status}`);
            }
            const data = await res.json();
            setResponse(data.response);
        }
        catch (error) {
            console.error("Error fetching data:", error);
            setError("Error al generar la cotización. Por favor intenta de nuevo.");
        }
        finally {
            setLoading(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            sendQuery();
        }
    };
    const currentDate = new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return (_jsx("div", { className: "flex flex-col w-screen min-h-screen items-center justify-center bg-gradient-to-br from-green-500 to-blue-700 p-4", children: _jsxs(Card, { className: "w-full max-w-3xl shadow-xl bg-white rounded-xl overflow-hidden", children: [_jsx(CardHeader, { className: "bg-gray-50 border-b pb-4", children: _jsxs(CardTitle, { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center space-x-2", children: [_jsx("img", { src: "/logo.png", alt: "IMPAG Logo", className: "h-8 w-auto", onError: (e) => { e.currentTarget.style.display = 'none'; } }), _jsx("h1", { className: "text-3xl font-bold text-gray-800", children: "Cotizador IMPAG" })] }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Fecha: ", currentDate] })] }) }), _jsxs(CardContent, { className: "space-y-6 p-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "product-query", className: "text-sm font-medium text-gray-700", children: "\u00BFQu\u00E9 producto deseas cotizar?" }), _jsxs("div", { className: "flex space-x-2", children: [_jsx(Input, { id: "product-query", className: "border-gray-300 text-gray-900 placeholder-gray-500 flex-grow", type: "text", placeholder: "Ej: kit de bombeo solar de 3500 lph a 10 mca", value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: handleKeyDown, disabled: loading }), _jsx(Button, { onClick: sendQuery, disabled: loading, className: "bg-green-600 hover:bg-green-700", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Generando..."] })) : "Generar Cotización" })] }), error && (_jsx("p", { className: "text-sm text-red-600 mt-1", children: error }))] }), loading && (_jsxs("div", { className: "flex flex-col items-center justify-center py-8", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-green-600" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "Generando tu cotizaci\u00F3n personalizada..." })] })), response && (_jsxs("div", { className: "mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden", children: [_jsxs("div", { className: "bg-gray-50 px-4 py-2 border-b flex justify-between items-center", children: [_jsx("h3", { className: "text-sm font-medium text-gray-700", children: "Cotizaci\u00F3n Generada" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => {
                                                navigator.clipboard.writeText(response);
                                                alert("¡Cotización copiada al portapapeles!");
                                            }, className: "text-xs", children: "Copiar" })] }), _jsx("div", { className: "p-4 max-h-[60vh] overflow-auto bg-white prose prose-sm max-w-none", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], components: {
                                            table: ({ ...props }) => (_jsx("table", { className: "min-w-full border-collapse border border-gray-300", ...props })),
                                            th: ({ ...props }) => (_jsx("th", { className: "border border-gray-300 bg-gray-100 px-4 py-2 text-left", ...props })),
                                            td: ({ ...props }) => (_jsx("td", { className: "border border-gray-300 px-4 py-2", ...props }))
                                        }, children: response }) })] }))] }), _jsxs(CardFooter, { className: "bg-gray-50 border-t px-6 py-4 text-center text-xs text-gray-500", children: ["IMPAG \u2022 Calle Jos\u00E9 Ram\u00F3n Vald\u00E9z 404, Nuevo Ideal, Durango, M\u00E9xico C.P 34410", _jsx("br", {}), "Tel: 677 119 77 37 \u2022 Email: impagtodoparaelcampo@gmail.com"] })] }) }));
}
