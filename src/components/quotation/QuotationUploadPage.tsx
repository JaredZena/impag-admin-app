import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Category {
  id: number;
  name: string;
}

interface SupplierDetectionInfo {
  confidence: 'high' | 'medium' | 'low' | 'none';
  detected_name: string;
  has_rfc: boolean;
  has_contact_info: boolean;
  warning?: string;
  existing_supplier: boolean;
}

interface SupplierInfo {
  id: number;
  name: string;
  detection_info: SupplierDetectionInfo;
  products_count: number;
}

interface MultiSupplierDetectionInfo {
  suppliers_detected: SupplierDetectionInfo[];
  overall_confidence: 'high' | 'medium' | 'low' | 'none';
  warnings: string[];
}

interface ProcessingResult {
  suppliers: { [key: string]: SupplierInfo };
  products_processed: number;
  supplier_products_created: number;
  supplier_product_ids: number[];  // List of created supplier product IDs for reassignment
  supplier_detection: MultiSupplierDetectionInfo;
  skus_generated: Array<{
    product_name: string;
    supplier_name: string;
    variant_sku: string;
    base_sku: string;
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
  const [showSupplierWarning, setShowSupplierWarning] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('text');
  const [textInput, setTextInput] = useState<string>('');

  // Fetch categories and suppliers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, suppliersResponse] = await Promise.all([
          apiRequest('/categories'),
          apiRequest('/suppliers')
        ]);
        setCategories(categoriesResponse.data || []);
        setSuppliers(suppliersResponse.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Error al cargar datos. Puedes continuar pero algunas funciones pueden estar limitadas.');
      }
    };

    fetchData();
  }, []);

  const handleFileSelect = (file: File) => {
    // Define supported file types
    const supportedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'text/plain'  // WhatsApp conversation exports
    ];
    
    if (!supportedTypes.includes(file.type)) {
      setError('Por favor selecciona un documento válido (PDF, PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP, TXT).');
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
    if (inputMethod === 'file' && !selectedFile) return;
    if (inputMethod === 'text' && !textInput.trim()) {
      setError('Por favor ingresa el texto con la información de productos.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let response;
      
      if (inputMethod === 'text') {
        // Handle text input - send as JSON
        const requestBody = {
          text_content: textInput.trim(),
          category_id: selectedCategory ? parseInt(selectedCategory) : null
        };

        response = await apiRequest('/quotations/process-text', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Handle file upload - send as FormData
        const formData = new FormData();
        formData.append('file', selectedFile!);
        
        if (selectedCategory) {
          formData.append('category_id', selectedCategory);
        }

        response = await apiRequest('/quotations/process', {
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type, let the browser set it for FormData
          },
        });
      }

      setResult(response);
      console.log('Upload successful:', response);
      
      // Check if any supplier detection had issues
      if (response.supplier_detection && 
          response.supplier_detection.overall_confidence && 
          ['none', 'low'].includes(response.supplier_detection.overall_confidence)) {
        setShowSupplierWarning(true);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      
      // Extract error message
      const errorMessage = err?.message || err?.detail || 'Error al procesar el documento';
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSupplierReassignment = async () => {
    if (!selectedSupplierId || !result) return;
    
    try {
      setIsProcessing(true);
      
      // Use the supplier product IDs from the upload response
      const supplierProductIds = result.supplier_product_ids || [];
      
      if (supplierProductIds.length === 0) {
        setError('No se encontraron productos para reasignar');
        return;
      }
      
      await apiRequest('/quotations/reassign-supplier', {
        method: 'POST',
        body: JSON.stringify({
          supplier_product_ids: supplierProductIds,
          new_supplier_id: parseInt(selectedSupplierId)
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setShowSupplierWarning(false);
      setResult(null); // Clear the result to prevent re-upload
      setError(null);
      
      // Show success message
      alert(`Proveedor reasignado exitosamente. ${supplierProductIds.length} productos fueron actualizados.`);
      
    } catch (err: any) {
      console.error('Supplier reassignment failed:', err);
      setError(`Error al reasignar proveedor: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setTextInput('');
    setSelectedCategory('');
    setResult(null);
    setError(null);
    setShowSupplierWarning(false);
    setSelectedSupplierId('');
    setInputMethod('text'); // Reset to text as primary method
  };

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
      <div className="container mx-auto max-w-5xl px-4 pt-20 pb-12">

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-4">
            Cargar Productos
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Importa productos automáticamente desde documentos, capturas de WhatsApp, cotizaciones y más
          </p>
          <div className="flex items-center justify-center space-x-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Múltiples Formatos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Procesamiento Rápido</span>
            </div>
          </div>
        </div>

        {/* Input Method Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">Elige tu método preferido</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div 
              onClick={() => setInputMethod('text')}
              className={`group relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                inputMethod === 'text' 
                  ? 'border-green-500 bg-green-50 shadow-lg scale-105' 
                  : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md hover:scale-102'
              }`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  inputMethod === 'text' ? 'bg-green-500' : 'bg-gray-100 group-hover:bg-green-100'
                }`}>
                  <svg className={`w-8 h-8 transition-colors duration-300 ${
                    inputMethod === 'text' ? 'text-white' : 'text-gray-600 group-hover:text-green-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Pegar Texto</h3>
                <p className="text-gray-600 mb-4">Ideal para contenido copiado</p>
                <ul className="text-sm text-left space-y-2 text-gray-500">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    WhatsApp conversations
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Spreadsheet data
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Product lists
                  </li>
                </ul>
                <div className="mt-4 text-xs text-green-600 font-medium">⚡ Procesamiento instantáneo</div>
              </div>
              {inputMethod === 'text' && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <div 
              onClick={() => setInputMethod('file')}
              className={`group relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                inputMethod === 'file' 
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:scale-102'
              }`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  inputMethod === 'file' ? 'bg-blue-500' : 'bg-gray-100 group-hover:bg-blue-100'
                }`}>
                  <svg className={`w-8 h-8 transition-colors duration-300 ${
                    inputMethod === 'file' ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Subir Archivo</h3>
                <p className="text-gray-600 mb-4">Para documentos existentes</p>
                <ul className="text-sm text-left space-y-2 text-gray-500">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    PDFs & Images
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Screenshots
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Quotations
                  </li>
                </ul>
                <div className="mt-4 text-xs text-blue-600 font-medium">🔍 OCR Recognition</div>
              </div>
              {inputMethod === 'file' && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Card className="p-8 mb-8 shadow-xl border-0 rounded-2xl bg-gradient-to-br from-white to-gray-50">
          {inputMethod === 'text' ? (
            /* Text Input Method */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pegar Contenido</h3>
                <p className="text-gray-600">Pega aquí el contenido con información de productos</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Formatos compatibles
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Conversaciones de WhatsApp
                  </div>
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Datos de Google Sheets
                  </div>
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Cotizaciones en texto
                  </div>
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Listas de productos
                  </div>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Pega aquí el contenido...

Ejemplos válidos:
📱 Conversación de WhatsApp con productos y precios
📊 Tabla copiada de Excel con datos de productos
📄 Lista de cotización en formato texto
🛍️ Catálogo de productos con especificaciones"
                  className="w-full h-80 p-6 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 resize-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white shadow-inner"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace' }}
                />
                <div className="absolute bottom-4 right-6 flex items-center space-x-4 text-sm">
                  <div className="flex items-center text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2M7 4h10M7 4v16M17 4v16M17 20H7" />
                    </svg>
                    {textInput.length.toLocaleString()} caracteres
                  </div>
                  {textInput.length > 0 && (
                    <div className="flex items-center text-green-600 font-medium">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Listo para procesar
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* File Upload Method */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Subir Archivo</h3>
                <p className="text-gray-600">Arrastra y suelta o haz clic para seleccionar archivos</p>
              </div>

              <div
                className={`relative border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 scale-102 shadow-lg' 
                    : selectedFile 
                      ? 'border-green-500 bg-green-50 shadow-lg' 
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 hover:scale-102'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className="space-y-4">
                  {selectedFile ? (
                    <div className="space-y-4">
                      <div className="w-20 h-20 mx-auto bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900 mb-2">{selectedFile.name}</div>
                        <div className="text-sm text-gray-600 mb-4">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Archivo'}
                        </div>
                        <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Archivo listo para procesar
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isDragOver ? 'bg-blue-500 scale-110' : 'bg-gray-200 group-hover:bg-blue-100 group-hover:scale-110'
                      }`}>
                        <svg className={`w-10 h-10 transition-colors duration-300 ${
                          isDragOver ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900 mb-2">
                          {isDragOver ? 'Suelta el archivo aquí' : 'Arrastra archivos aquí'}
                        </div>
                        <p className="text-gray-600 mb-6">o haz clic para seleccionar desde tu computadora</p>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Formatos soportados
                </h4>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-medium text-blue-800">Documentos</div>
                    <div className="text-blue-700">PDF, TXT</div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-blue-800">Imágenes</div>
                    <div className="text-blue-700">PNG, JPG, WEBP, GIF</div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-blue-800">Límites</div>
                    <div className="text-blue-700">Máximo 10MB</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Selection - Common for both methods */}
          <div className="space-y-4 bg-gray-50 rounded-xl p-6 border">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-1">Categoría de Producto</label>
                <p className="text-sm text-gray-600">Opcional - La IA puede clasificar automáticamente</p>
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
            >
              <option value="">🤖 Clasificación automática con IA</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  📂 {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <Button
              onClick={handleUpload}
              disabled={(inputMethod === 'file' && !selectedFile) || (inputMethod === 'text' && !textInput.trim()) || isProcessing}
              className={`flex-1 py-4 px-8 text-lg font-semibold rounded-xl transition-all duration-300 ${
                isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : (inputMethod === 'text' && textInput.trim()) || (inputMethod === 'file' && selectedFile)
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  <span>Procesando con IA...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Procesar con IA</span>
                </div>
              )}
            </Button>
            
            {(selectedFile || textInput || result || error) && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="px-8 py-4 text-base font-medium border-2 hover:bg-gray-50 transition-all duration-200 rounded-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Limpiar y Reiniciar
              </Button>
            )}
          </div>
        </Card>

        {error && (
          <Card className="p-8 mb-8 border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-lg">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error en el procesamiento</h3>
                <p className="text-red-700 leading-relaxed">{error}</p>
                <Button 
                  onClick={() => setError(null)} 
                  variant="outline"
                  className="mt-4 border-red-300 text-red-700 hover:bg-red-50"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <Card className="p-8 mb-8 shadow-2xl border-0 rounded-3xl bg-gradient-to-br from-white to-emerald-50">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
                ¡Procesamiento Completado!
              </h2>
              <p className="text-lg text-gray-600">Tu contenido ha sido procesado exitosamente con IA</p>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 hover:scale-105 transition-transform duration-200">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-blue-800 mb-1">{Object.keys(result.suppliers).length}</div>
                <div className="text-sm font-medium text-blue-700">Proveedores Detectados</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 hover:scale-105 transition-transform duration-200">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-green-800 mb-1">{result.products_processed}</div>
                <div className="text-sm font-medium text-green-700">Productos Procesados</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 hover:scale-105 transition-transform duration-200">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-purple-800 mb-1">{result.supplier_products_created}</div>
                <div className="text-sm font-medium text-purple-700">Relaciones Creadas</div>
              </div>
            </div>

            {/* Suppliers Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Proveedores Detectados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(result.suppliers).map(([supplierName, supplierInfo]) => (
                  <div key={supplierName} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                    <div className="font-medium text-gray-800">{supplierName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {supplierInfo.products_count} productos
                    </div>
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        supplierInfo.detection_info.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        supplierInfo.detection_info.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        supplierInfo.detection_info.confidence === 'low' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {supplierInfo.detection_info.confidence === 'high' ? 'Confianza Alta' :
                         supplierInfo.detection_info.confidence === 'medium' ? 'Confianza Media' :
                         supplierInfo.detection_info.confidence === 'low' ? 'Confianza Baja' : 'Sin Confianza'}
                      </span>
                    </div>
                  </div>
                ))}
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
                      {product.supplier_name && (
                        <div className="text-sm text-blue-600 mt-1">
                          Proveedor: {product.supplier_name}
                        </div>
                      )}
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

            {/* Action Buttons */}
            <div className="text-center pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button 
                  onClick={() => navigate('/supplier-products')}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Ver Productos
                </Button>
                <Button 
                  onClick={handleReset}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Procesar Otro Contenido
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Supplier Warning Dialog */}
        {showSupplierWarning && result && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4 p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Detección de Proveedor Limitada</h3>
                  <p className="text-sm text-gray-600">Se requiere revisión manual</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Se detectaron algunos proveedores con baja confianza. Revisa y corrige si es necesario.
                </p>
                
                {result.supplier_detection.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Advertencias:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {result.supplier_detection.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="space-y-3 mb-4">
                  <h4 className="font-medium text-gray-800">Proveedores Detectados:</h4>
                  {result.supplier_detection.suppliers_detected
                    .filter(supplier => ['low', 'none'].includes(supplier.confidence))
                    .map((supplier, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm">
                        <div className="mb-2">
                          <span className="font-medium">Proveedor:</span> {supplier.detected_name}
                        </div>
                        <div className="mb-2">
                          <span className="font-medium">Confianza:</span> 
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            supplier.confidence === 'high' ? 'bg-green-100 text-green-800' :
                            supplier.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            supplier.confidence === 'low' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {supplier.confidence === 'high' ? 'Alta' :
                             supplier.confidence === 'medium' ? 'Media' :
                             supplier.confidence === 'low' ? 'Baja' : 'Ninguna'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          RFC: {supplier.has_rfc ? '✓' : '✗'} | 
                          Contacto: {supplier.has_contact_info ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Proveedor Correcto:
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Proveedor --</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleSupplierReassignment}
                  disabled={!selectedSupplierId || isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isProcessing ? 'Procesando...' : 'Reasignar Proveedor'}
                </Button>
                <Button
                  onClick={() => setShowSupplierWarning(false)}
                  variant="outline"
                  disabled={isProcessing}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Mantener Actual
                </Button>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                <p>
                  💡 <strong>Consejo:</strong> Asegúrate de que el documento contenga información clara del proveedor 
                  (nombre, RFC, contacto) para una mejor detección automática.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationUploadPage;
