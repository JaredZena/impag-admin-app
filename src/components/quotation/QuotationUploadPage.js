import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
const QuotationUploadPage = () => {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    // Fetch categories on component mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await apiRequest('/categories');
                setCategories(response.data || []);
            }
            catch (err) {
                console.error('Failed to fetch categories:', err);
                setError('Error al cargar categorías. Puedes subir sin seleccionar una categoría.');
            }
        };
        fetchCategories();
    }, []);
    const handleFileSelect = (file) => {
        // Define supported file types
        const supportedTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            'image/bmp',
            'image/tiff',
            'image/webp'
        ];
        if (!supportedTypes.includes(file.type)) {
            setError('Por favor selecciona un archivo PDF o imagen (PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP).');
            return;
        }
        setSelectedFile(file);
        setError(null);
        setResult(null);
    };
    const handleFileInputChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };
    const handleDragOver = (event) => {
        event.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = (event) => {
        event.preventDefault();
        setIsDragOver(false);
    };
    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };
    const handleUpload = async () => {
        if (!selectedFile)
            return;
        setIsProcessing(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            if (selectedCategory) {
                formData.append('category_id', selectedCategory);
            }
            const response = await apiRequest('/quotations/process', {
                method: 'POST',
                body: formData,
                headers: {
                // Don't set Content-Type, let the browser set it for FormData
                },
            });
            setResult(response);
            console.log('Upload successful:', response);
        }
        catch (err) {
            console.error('Upload failed:', err);
            // Extract error message
            const errorMessage = err?.message || err?.detail || 'Error al procesar el archivo';
            setError(`Error: ${errorMessage}`);
        }
        finally {
            setIsProcessing(false);
        }
    };
    const handleReset = () => {
        setSelectedFile(null);
        setSelectedCategory('');
        setResult(null);
        setError(null);
    };
    return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-4xl px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2 text-center", children: "Subir Cotizaci\u00F3n" }), _jsx("p", { className: "text-gray-600 text-center", children: "Sube cotizaciones de proveedores (PDF o im\u00E1genes) para extraer autom\u00E1ticamente productos y precios" })] }), _jsxs(Card, { className: "p-6 mb-6 shadow-lg border-0 rounded-xl", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: `border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${isDragOver
                                    ? 'border-blue-500 bg-blue-50'
                                    : selectedFile
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50'}`, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onClick: () => document.getElementById('file-input')?.click(), children: [_jsx("div", { className: "text-5xl mb-4", children: selectedFile?.type.startsWith('image/') ? '🖼️' : '📄' }), selectedFile ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-lg font-medium text-gray-700 mb-2", children: selectedFile.name }), _jsxs("div", { className: "text-sm text-gray-500", children: [(selectedFile.size / 1024 / 1024).toFixed(2), " MB"] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-lg font-medium text-gray-700 mb-2", children: isDragOver ? 'Suelta el archivo aquí' : 'Haz clic para seleccionar o arrastra un archivo' }), _jsxs("div", { className: "text-sm text-gray-500", children: [_jsx("div", { children: "Formatos: PDF, PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP" }), _jsx("div", { children: "Tama\u00F1o m\u00E1ximo: 10MB" })] })] })), _jsx("input", { id: "file-input", type: "file", accept: ".pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp", onChange: handleFileInputChange, className: "hidden" })] }) }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Categor\u00EDa de Producto (Opcional)" }), _jsxs("select", { value: selectedCategory, onChange: (e) => setSelectedCategory(e.target.value), className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm", style: {
                                        backgroundColor: 'white',
                                        color: '#111827',
                                        border: '1px solid #d1d5db'
                                    }, children: [_jsx("option", { value: "", style: { backgroundColor: 'white', color: '#111827' }, children: "Seleccionar categor\u00EDa (la IA elegir\u00E1 autom\u00E1ticamente si no se especifica)" }), categories.map((category) => (_jsx("option", { value: category.id.toString(), style: { backgroundColor: 'white', color: '#111827' }, children: category.name }, category.id)))] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: handleUpload, disabled: !selectedFile || isProcessing, className: "flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 text-lg", children: isProcessing ? (_jsxs("div", { className: "flex items-center justify-center", children: [_jsx("div", { className: "animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" }), "Procesando..."] })) : ('Procesar Cotización') }), (selectedFile || result || error) && (_jsx(Button, { onClick: handleReset, variant: "outline", className: "px-6 py-3", children: "Limpiar" }))] })] }), error && (_jsx(Card, { className: "p-4 mb-6 border-red-200 bg-red-50", children: _jsx("div", { className: "text-red-700", children: error }) })), result && (_jsxs(Card, { className: "p-6 shadow-lg border-0 rounded-xl", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800 mb-4", children: "Resultado del Procesamiento" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6", children: [_jsxs("div", { className: "text-center p-4 bg-blue-50 rounded-lg", children: [_jsx("div", { className: "text-sm text-gray-500 mb-1", children: "Proveedor" }), _jsx("div", { className: "text-xl font-semibold text-gray-800", children: result.supplier })] }), _jsxs("div", { className: "text-center p-4 bg-green-50 rounded-lg", children: [_jsx("div", { className: "text-sm text-gray-500 mb-1", children: "Productos Procesados" }), _jsx("div", { className: "text-xl font-semibold text-gray-800", children: result.products_processed })] }), _jsxs("div", { className: "text-center p-4 bg-gray-50 rounded-lg", children: [_jsx("div", { className: "text-sm text-gray-500 mb-1", children: "Relaciones Creadas" }), _jsx("div", { className: "text-xl font-semibold text-gray-800", children: result.supplier_products_created })] })] }), result.skus_generated && result.skus_generated.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "text-lg font-medium text-gray-800 mb-3", children: "Productos Creados/Actualizados" }), _jsx("div", { className: "space-y-3 mb-6", children: result.skus_generated.map((product, index) => (_jsxs("div", { className: "p-4 bg-gray-50 rounded-lg border-l-4 border-green-500", children: [_jsx("div", { className: "font-medium text-gray-800", children: product.product_name }), _jsxs("div", { className: "text-sm text-gray-600 mt-1", children: ["SKU: ", product.variant_sku, " | Base: ", product.base_sku] }), product.ai_suggested !== 'N/A' && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["IA Sugiri\u00F3: ", product.ai_suggested] }))] }, index))) })] })), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: () => navigate('/product-admin'), className: "bg-green-600 hover:bg-green-700 text-white", children: "Ver Productos" }), _jsx(Button, { onClick: () => navigate('/suppliers'), variant: "outline", children: "Ver Proveedores" }), _jsx(Button, { onClick: handleReset, variant: "outline", children: "Procesar Otro Archivo" })] })] }))] }) }));
};
export default QuotationUploadPage;
