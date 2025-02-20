import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
export default function QueryApp() {
    const [query, setQuery] = useState("");
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const sendQuery = async () => {
        setLoading(true);
        setResponse(null);
        try {
            console.log('Sending query');
            const res = await fetch("/api/query", { method: "POST", headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query }), });
            console.log("Response status:", res.status); // Log HTTP status
            console.log("Response headers:", res.headers); // Log headers
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            const data = await res.json();
            console.log("Response data:", data); // Log response body
            setResponse(JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error("Error fetching data:", error);
            setResponse("Error fetching data");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "flex flex-col w-screen min-h-screen items-center justify-center bg-gradient-to-r from-blue-500 to-green-700", children: _jsx(Card, { className: "w-full max-w-2xl p-6 shadow-lg bg-white", children: _jsxs(CardContent, { className: "space-y-6 px-6 py-4 flex flex-col items-center text-center", children: [_jsx("h1", { className: "text-4xl font-bold", children: "Cotizador IMPAG" }), _jsx(Input, { className: "border-gray-300 text-gray-900 placeholder-gray-500", type: "text", placeholder: "Ingresa el o los productos a cotizar", value: query, onChange: (e) => setQuery(e.target.value) }), _jsx(Button, { onClick: sendQuery, disabled: loading, children: loading ? "Generando..." : "Generar Cotización" }), _jsx("pre", { className: "mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto break-words w-full max-w-lg max-h-[500px] min-h-[100px]", children: _jsx("code", { className: "whitespace-pre-wrap", children: response && (() => {
                                try {
                                    const parsedResponse = JSON.parse(response); // Convert JSON string to object
                                    return parsedResponse.response.split("\\n").map((line, index) => (_jsxs("span", { children: [line, _jsx("br", {})] }, index)));
                                }
                                catch (error) {
                                    console.error("Error formatting response:", error);
                                    return "Error formatting response"; // Handle parsing errors
                                }
                            })() }) })] }) }) }));
}
