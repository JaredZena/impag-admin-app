import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Category {
  id: number;
  name: string;
}

interface ProcessingResult {
  supplier: string;
  products_processed: number;
  supplier_products_created: number;
  skus_generated: Array<{
    product_name: string;
    base_sku: string;
    variant_sku: string;
    ai_suggested: string;
    category_id: number;
  }>;
}

const QuotationUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiRequest('/categories');
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Error al cargar categorías. Puedes subir sin seleccionar una categoría.');
      }
    };

    fetchCategories();
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Por favor selecciona un archivo PDF.');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona un archivo PDF primero.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (selectedCategory) {
        formData.append('category_id', selectedCategory);
      }

      // Get the token for authentication
      const token = localStorage.getItem('google_token');
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      // Make the API request with proper headers for file upload
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://democratic-cuckoo-impag-f0717e14.koyeb.app'}/quotations/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem('google_token');
        window.location.reload();
        throw new Error('Sesión expirada');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error al subir: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSelectedCategory('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2 text-center">
            Subir Cotización PDF
          </h1>
          <p className="text-gray-600 text-center">Sube cotizaciones de proveedores para extraer automáticamente productos y precios</p>
        </div>

        <Card className="p-6 mb-6 shadow-lg border-0 rounded-xl">
          <div className="mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="text-5xl mb-4">📄</div>
              {selectedFile ? (
                <>
                  <div className="text-lg font-medium text-gray-700 mb-2">{selectedFile.name}</div>
                  <div className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-medium text-gray-700 mb-2">
                    {isDragOver ? 'Suelta el archivo PDF aquí' : 'Haz clic para seleccionar o arrastra un archivo PDF'}
                  </div>
                  <div className="text-sm text-gray-500">Tamaño máximo: 10MB</div>
                </>
              )}
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría de Producto (Opcional)</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Detectar categoría automáticamente</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500 mt-2">
              Si no se selecciona, la IA categorizará automáticamente los productos
            </div>
          </div>

          {!result && (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? 'Procesando...' : 'Subir y Procesar'}
            </Button>
          )}
        </Card>

        {isProcessing && (
          <Card className="p-8 mb-6 text-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <div className="text-gray-700">
                Procesando PDF y extrayendo información de productos...
              </div>
            </div>
          </Card>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {result && (
          <Card className="p-6 mb-6 shadow-lg border-0 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Resultados del Procesamiento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Proveedor</div>
                <div className="text-xl font-semibold text-gray-800">{result.supplier || 'Desconocido'}</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Productos Procesados</div>
                <div className="text-xl font-semibold text-gray-800">{result.products_processed}</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Relaciones Creadas</div>
                <div className="text-xl font-semibold text-gray-800">{result.supplier_products_created}</div>
              </div>
            </div>

            {result.skus_generated && result.skus_generated.length > 0 && (
              <>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Productos Creados/Actualizados</h3>
                <div className="space-y-3 mb-6">
                  {result.skus_generated.map((product, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                      <div className="font-medium text-gray-800">{product.product_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        SKU: {product.variant_sku} | Base: {product.base_sku}
                      </div>
                      {product.ai_suggested !== 'N/A' && (
                        <div className="text-xs text-gray-500 mt-1">
                          IA Sugirió: {product.ai_suggested}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm font-medium">
              ✅ ¡Cotización procesada exitosamente! Todos los productos y relaciones con proveedores han sido creados o actualizados en la base de datos.
            </div>
          </Card>
        )}

        {result && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">¿Qué quieres hacer ahora?</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                onClick={() => navigate('/product-admin')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Ver Productos
              </Button>
              
              <Button
                onClick={() => navigate('/suppliers')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Ver Proveedores
              </Button>
              
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 text-lg font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Subir Otra Cotización
              </Button>
            </div>
          </div>
        )}

        {!result && (
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={() => navigate('/product-admin')}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              Ver Productos
            </Button>
            
            <Button
              onClick={() => navigate('/suppliers')}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Ver Proveedores
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationUploadPage;