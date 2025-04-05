import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import './App.css'; 

export default function QueryApp() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const copyToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentDate = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col w-screen min-h-screen items-center justify-center bg-gradient-to-br from-green-500 to-blue-700 p-2 sm:p-4 overflow-x-hidden">
      <Card className="w-full mx-auto max-w-3xl md:max-w-2xl lg:max-w-3xl shadow-xl bg-white rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b pb-3 sm:pb-4 px-4 sm:px-6">
          <CardTitle className="text-center">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <img 
                  src="/impag.png" 
                  alt="IMPAG Logo Left" 
                  className="h-10 sm:h-16 w-auto"
                  onError={(e) => {e.currentTarget.style.display = 'none'}}
                />
              </div>
              <div className="flex flex-col items-center">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Cotizador IMPAG</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Fecha: {currentDate}</p>
              </div>
              <div className="flex-shrink-0">
                <img 
                  src="/todoparaelcampo.jpg" 
                  alt="IMPAG Logo Right" 
                  className="h-14 sm:h-24 w-auto"
                  onError={(e) => {e.currentTarget.style.display = 'none'}}
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
          <div className="space-y-2">
            <label htmlFor="product-query" className="text-sm font-medium text-gray-700">
              ¿Qué producto deseas cotizar?
            </label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Input
                id="product-query"
                className="border-gray-300 text-gray-900 placeholder-gray-500 flex-grow"
                type="text"
                placeholder="Ej: kit de bombeo solar de 3500 lph a 10 mca"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button 
                onClick={sendQuery} 
                disabled={loading} 
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : "Generar Cotización"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-4 sm:py-6">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <p className="mt-2 text-sm text-gray-600 text-center">Generando tu cotización personalizada...</p>
            </div>
          )}
          
          {response && (
            <div className="mt-4 sm:mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Cotización Generada</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyToClipboard}
                  className="text-xs sm:text-sm px-2 py-1 h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? "¡Copiado!" : "Copiar"}
                </Button>
              </div>
              <div className="p-3 sm:p-4 max-h-[50vh] sm:max-h-[60vh] overflow-auto bg-white prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({...props}) => (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300" {...props} />
                      </div>
                    ),
                    th: ({...props}) => (
                      <th className="border border-gray-300 bg-gray-100 px-2 sm:px-4 py-1 sm:py-2 text-left text-xs sm:text-sm" {...props} />
                    ),
                    td: ({...props}) => (
                      <td className="border border-gray-300 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm" {...props} />
                    )
                  }}
                >
                  {response}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="bg-gray-50 border-t px-3 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm text-gray-500">
          <div className="w-full text-center">
            <p className="hidden sm:block">IMPAG • Calle José Ramón Valdéz 404, Nuevo Ideal, Durango, México C.P 34410 • Tel: 677 119 77 37 • Email: impagtodoparaelcampo@gmail.com</p>
            <div className="sm:hidden">
              <p>IMPAG • Calle José Ramón Valdéz 404, Nuevo Ideal, Durango, México</p>
              <p>C.P 34410 • Tel: 677 119 77 37 • Email: impagtodoparaelcampo@gmail.com</p>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}