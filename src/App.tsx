import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function QueryApp() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error al generar la cotización. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendQuery();
    }
  };

  const currentDate = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col w-screen min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-green-700 p-4">
      <Card className="w-full max-w-3xl shadow-xl bg-white rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b pb-4">
          <CardTitle className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <img 
                src="/logo.png" 
                alt="IMPAG Logo" 
                className="h-8 w-auto"
                onError={(e) => {e.currentTarget.style.display = 'none'}}
              />
              <h1 className="text-3xl font-bold text-gray-800">Cotizador IMPAG</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">Fecha: {currentDate}</p>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <label htmlFor="product-query" className="text-sm font-medium text-gray-700">
              ¿Qué producto deseas cotizar?
            </label>
            <div className="flex space-x-2">
              <Input
                id="product-query"
                className="border-gray-300 text-gray-900 placeholder-gray-500 flex-grow"
                type="text"
                placeholder="Ej: kit de bombeo solar de 3500 lph a 10 mca"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button 
                onClick={sendQuery} 
                disabled={loading} 
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : "Generar Cotización"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <p className="mt-2 text-sm text-gray-600">Generando tu cotización personalizada...</p>
            </div>
          )}
          
          {response && (
            <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Cotización Generada</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(response);
                    alert("¡Cotización copiada al portapapeles!");
                  }}
                  className="text-xs"
                >
                  Copiar
                </Button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-auto bg-white">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="bg-gray-50 border-t px-6 py-4 text-center text-xs text-gray-500">
          IMPAG TECH • Calle Morelos 16, San Luis Huexotla, Texcoco, México C.P 56220
          <br />
          Tel: 553 578 0901 • Email: impagtodoparaelcampo@gmail.com
        </CardFooter>
      </Card>
    </div>
  );
}