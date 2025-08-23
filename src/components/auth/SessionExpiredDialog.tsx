import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SessionExpiredDialogProps {
  isOpen: boolean;
  onReauthenticate: () => void;
  onClose: () => void;
}

const SessionExpiredDialog: React.FC<SessionExpiredDialogProps> = ({
  isOpen,
  onReauthenticate,
  onClose,
}) => {
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  if (!isOpen) return null;

  const handleReauthenticate = async () => {
    setIsReauthenticating(true);
    try {
      await onReauthenticate();
    } catch (error) {
      console.error('Reauthentication failed:', error);
    } finally {
      setIsReauthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sesión Expirada</h3>
            <p className="text-sm text-gray-600">Tu sesión ha expirado por seguridad</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700">
            Por tu seguridad, tu sesión ha expirado. Para continuar trabajando, 
            necesitas autenticarte nuevamente con tu cuenta de Google.
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleReauthenticate}
            disabled={isReauthenticating}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isReauthenticating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Autenticando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Iniciar Sesión Nuevamente
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isReauthenticating}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </Button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            💡 <strong>Consejo:</strong> Para evitar que la sesión expire, mantén la aplicación activa. 
            Las sesiones se renuevan automáticamente mientras uses la aplicación.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredDialog;
