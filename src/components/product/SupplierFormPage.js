import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';
const initialFormData = {
    name: '',
    common_name: '',
    legal_name: '',
    rfc: '',
    description: '',
    contact_name: '',
    contact_common_name: '',
    email: '',
    phone: '',
    address: '',
    website_url: '',
};
const SupplierFormPage = () => {
    const { supplierId } = useParams();
    const navigate = useNavigate();
    const isEditing = supplierId && supplierId !== 'new';
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [errors, setErrors] = useState({});
    useEffect(() => {
        if (isEditing) {
            fetchSupplier();
        }
    }, [supplierId, isEditing]);
    const fetchSupplier = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiRequest(`/suppliers/${supplierId}`);
            if (response.data) {
                setFormData({
                    name: response.data.name || '',
                    common_name: response.data.common_name || '',
                    legal_name: response.data.legal_name || '',
                    rfc: response.data.rfc || '',
                    description: response.data.description || '',
                    contact_name: response.data.contact_name || '',
                    contact_common_name: response.data.contact_common_name || '',
                    email: response.data.email || '',
                    phone: response.data.phone || '',
                    address: response.data.address || '',
                    website_url: response.data.website_url || '',
                });
            }
        }
        catch (err) {
            setError(err.message || 'Error al cargar el proveedor');
            console.error('Error fetching supplier:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }
        if (formData.website_url && !formData.website_url.match(/^https?:\/\/.+/)) {
            newErrors.website_url = 'URL debe comenzar con http:// o https://';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            // Prepare data - remove empty strings for optional fields
            const submitData = { ...formData };
            Object.keys(submitData).forEach(key => {
                if (key !== 'name' && key !== 'rfc' && submitData[key] === '') {
                    delete submitData[key];
                }
            });
            if (isEditing) {
                await apiRequest(`/suppliers/${supplierId}`, {
                    method: 'PUT',
                    body: JSON.stringify(submitData),
                });
            }
            else {
                await apiRequest('/suppliers', {
                    method: 'POST',
                    body: JSON.stringify(submitData),
                });
            }
            // Navigate back to supplier list or detail page
            if (isEditing) {
                navigate(`/supplier-admin/${supplierId}`);
            }
            else {
                navigate('/suppliers');
            }
        }
        catch (err) {
            setError(err.message || 'Error al guardar el proveedor');
            console.error('Error saving supplier:', err);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleCancel = () => {
        if (isEditing) {
            navigate(`/supplier-admin/${supplierId}`);
        }
        else {
            navigate('/suppliers');
        }
    };
    const handleArchiveSupplier = async () => {
        if (!isEditing || !supplierId)
            return;
        setArchiving(true);
        setError(null);
        try {
            await apiRequest(`/suppliers/${supplierId}/archive`, {
                method: 'PATCH',
            });
            // Navigate back to supplier list after successful archive
            navigate('/suppliers', {
                state: { message: 'Proveedor eliminado exitosamente' }
            });
        }
        catch (err) {
            setError(err.message || 'Error al eliminar el proveedor');
            console.error('Error archiving supplier:', err);
        }
        finally {
            setArchiving(false);
            setShowArchiveDialog(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsx("div", { className: "container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8", children: _jsx(Card, { className: "p-6 sm:p-8", children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "h-8 w-48 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "space-y-4", children: Array.from({ length: 8 }).map((_, i) => (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-4 w-24 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "h-10 w-full bg-gray-200 rounded animate-pulse" })] }, i))) })] }) }) }) }));
    }
    return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8", children: [_jsxs("div", { className: "mb-6 sm:mb-8", children: [_jsx("div", { className: "flex items-center space-x-4 mb-4", children: _jsxs(Button, { variant: "outline", onClick: handleCancel, className: "border-green-200 text-green-700 hover:bg-green-50", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), "Regresar"] }) }), _jsx("h1", { className: "text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent", children: isEditing ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor' }), _jsx("p", { className: "text-sm sm:text-base text-gray-600 mt-2", children: isEditing
                                ? 'Modifica la información del proveedor'
                                : 'Completa los datos del nuevo proveedor' })] }), _jsx(Card, { className: "p-6 sm:p-8", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("svg", { className: "w-5 h-5 text-red-400 mr-2 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error" }), _jsx("p", { className: "text-sm text-red-700 mt-1", children: error })] })] }) })), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2", children: "Informaci\u00F3n B\u00E1sica" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["Nombre ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { type: "text", value: formData.name, onChange: (e) => handleInputChange('name', e.target.value), placeholder: "Nombre del proveedor", className: errors.name ? 'border-red-300' : '' }), errors.name && (_jsx("p", { className: "text-sm text-red-600 mt-1", children: errors.name }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre Com\u00FAn" }), _jsx(Input, { type: "text", value: formData.common_name, onChange: (e) => handleInputChange('common_name', e.target.value), placeholder: "Nombre comercial" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Raz\u00F3n Social" }), _jsx(Input, { type: "text", value: formData.legal_name, onChange: (e) => handleInputChange('legal_name', e.target.value), placeholder: "Raz\u00F3n social completa" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "RFC" }), _jsx(Input, { type: "text", value: formData.rfc, onChange: (e) => handleInputChange('rfc', e.target.value.toUpperCase()), placeholder: "RFC del proveedor", className: errors.rfc ? 'border-red-300' : '' }), errors.rfc && (_jsx("p", { className: "text-sm text-red-600 mt-1", children: errors.rfc }))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n" }), _jsx("textarea", { value: formData.description, onChange: (e) => handleInputChange('description', e.target.value), placeholder: "Descripci\u00F3n del proveedor y servicios", rows: 3, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2", children: "Informaci\u00F3n de Contacto" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre de Contacto" }), _jsx(Input, { type: "text", value: formData.contact_name, onChange: (e) => handleInputChange('contact_name', e.target.value), placeholder: "Nombre del contacto principal" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre Com\u00FAn del Contacto" }), _jsx(Input, { type: "text", value: formData.contact_common_name, onChange: (e) => handleInputChange('contact_common_name', e.target.value), placeholder: "Nombre com\u00FAn del contacto" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx(Input, { type: "email", value: formData.email, onChange: (e) => handleInputChange('email', e.target.value), placeholder: "email@empresa.com", className: errors.email ? 'border-red-300' : '' }), errors.email && (_jsx("p", { className: "text-sm text-red-600 mt-1", children: errors.email }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tel\u00E9fono" }), _jsx(Input, { type: "tel", value: formData.phone, onChange: (e) => handleInputChange('phone', e.target.value), placeholder: "+52 55 1234 5678" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Direcci\u00F3n" }), _jsx(Input, { type: "text", value: formData.address, onChange: (e) => handleInputChange('address', e.target.value), placeholder: "Direcci\u00F3n completa" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Sitio Web" }), _jsx(Input, { type: "url", value: formData.website_url, onChange: (e) => handleInputChange('website_url', e.target.value), placeholder: "https://www.empresa.com", className: errors.website_url ? 'border-red-300' : '' }), errors.website_url && (_jsx("p", { className: "text-sm text-red-600 mt-1", children: errors.website_url }))] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200", children: [_jsx(Button, { type: "submit", disabled: submitting, className: "bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none", children: submitting ? (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-3 h-4 w-4 text-white", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), isEditing ? 'Guardando...' : 'Creando...'] })) : (_jsxs(_Fragment, { children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), isEditing ? 'Guardar Cambios' : 'Crear Proveedor'] })) }), _jsx(Button, { type: "button", variant: "outline", onClick: handleCancel, disabled: submitting, className: "flex-1 sm:flex-none", children: "Cancelar" })] }), isEditing && (_jsx("div", { className: "pt-8 border-t border-red-200", children: _jsxs("div", { className: "bg-red-50 rounded-lg p-6 border border-red-200", children: [_jsxs("h3", { className: "text-lg font-semibold text-red-800 mb-2 flex items-center", children: [_jsx("svg", { className: "w-5 h-5 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" }) }), "Zona de Peligro"] }), _jsx("p", { className: "text-red-700 text-sm mb-4", children: "Esta acci\u00F3n eliminar\u00E1 permanentemente el proveedor del sistema. Los datos asociados se conservar\u00E1n pero el proveedor no aparecer\u00E1 en las listas." }), _jsxs(Button, { type: "button", onClick: () => setShowArchiveDialog(true), disabled: submitting || archiving, className: "bg-red-600 hover:bg-red-700 text-white border-red-600", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }), "Eliminar Proveedor"] })] }) })), showArchiveDialog && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg p-6 max-w-md w-full mx-4", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx("div", { className: "w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3", children: _jsx("svg", { className: "w-6 h-6 text-red-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" }) }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Confirmar Eliminaci\u00F3n" })] }), _jsx("p", { className: "text-gray-600 mb-6", children: "\u00BFEst\u00E1s seguro de que deseas eliminar este proveedor? Esta acci\u00F3n mover\u00E1 el proveedor a un estado archivado y no aparecer\u00E1 en las listas principales." }), _jsxs("p", { className: "text-sm text-gray-500 mb-6", children: [_jsx("strong", { children: "Proveedor:" }), " ", formData.name] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsx(Button, { onClick: handleArchiveSupplier, disabled: archiving, className: "bg-red-600 hover:bg-red-700 text-white flex-1", children: archiving ? (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "animate-spin w-4 h-4 mr-2", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Eliminando..."] })) : ('Sí, Eliminar Proveedor') }), _jsx(Button, { type: "button", variant: "outline", onClick: () => setShowArchiveDialog(false), disabled: archiving, className: "flex-1", children: "Cancelar" })] })] }) }))] }) })] }) }));
};
export default SupplierFormPage;
