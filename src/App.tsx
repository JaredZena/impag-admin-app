import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Copy, CheckCircle, Droplets, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import './App.css'; 
import impagLogo from './assets/impag.png';
import todoParaElCampoLogo from './assets/todoparaelcampo.jpg';

export default function QueryApp() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

  const sendQuery = async () => {
    if (!query.trim()) {
      setError("Por favor ingresa un producto a cotizar");
      return;
    }

    setLoading(true);
    setResponse(null);
    setError(null);
    setLoadingStep(0);
    
    // Simulate progress steps
    const progressSteps = [
      "Analizando requerimientos...",
      "Calculando precios...",
      "Generando cotización..."
    ];
    
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < progressSteps.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 800);

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
      setLoadingStep(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendQuery();
    }
  };

  const copyToClipboard = async () => {
    if (response) {
      try {
        await navigator.clipboard.writeText(response);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const currentDate = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col w-screen min-h-screen items-center justify-center bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-2 sm:p-4 overflow-x-hidden">
      <Card className="w-full mx-auto max-w-3xl md:max-w-2xl lg:max-w-3xl shadow-2xl bg-white rounded-2xl overflow-hidden border-0 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 pb-4 sm:pb-6 px-4 sm:px-6">
          <CardTitle className="text-center">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <img 
                  src={impagLogo} 
                  alt="IMPAG Logo Left" 
                  className="h-10 sm:h-16 w-auto"
                  onError={(e) => {e.currentTarget.style.display = 'none'}}
                />
              </div>
              <div className="flex flex-col items-center">
                <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">Cotizador IMPAG</h1>
                <p className="text-sm sm:text-base text-green-600 mt-2 font-medium">Fecha: {currentDate}</p>
              </div>
              <div className="flex-shrink-0">
                <img 
                  src={todoParaElCampoLogo}
                  alt="IMPAG Logo Right" 
                  className="h-12 sm:h-20 w-auto"
                  onError={(e) => {e.currentTarget.style.display = 'none'}}
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
          <div className="space-y-2">
            <label htmlFor="product-query" className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Droplets className="h-5 w-5 text-green-600" />
              ¿Qué producto deseas cotizar?
            </label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Input
                id="product-query"
                className="border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 placeholder-gray-400 flex-grow rounded-lg transition-all duration-200 shadow-sm"
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
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold w-full sm:w-auto whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg"
              >
                {loading ? (
                  <>
                    <Zap className="mr-2 h-5 w-5 animate-pulse" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    <span>Generar Cotización</span>
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-6 sm:py-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="relative">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-30"></div>
                <Loader2 className="h-12 w-12 animate-spin text-green-600 relative z-10" />
              </div>
              <div className="mt-4 text-center">
                <p className="text-lg font-semibold text-green-700">
                  {["Analizando requerimientos...", "Calculando precios...", "Generando cotización..."][loadingStep]}
                </p>
                <div className="flex justify-center mt-3 space-x-1">
                  {[0, 1, 2].map((step) => (
                    <div
                      key={step}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        step <= loadingStep ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {response && (
            <div className="mt-4 sm:mt-6 bg-white rounded-xl border-2 border-green-100 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-6 py-3 border-b border-green-100 flex justify-between items-center">
                <h3 className="text-base font-bold text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Cotización Generada
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyToClipboard}
                  className={`text-sm px-3 py-2 h-9 transition-all duration-200 ${
                    copied 
                      ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200' 
                      : 'hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </>
                  )}
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