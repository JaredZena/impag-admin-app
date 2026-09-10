import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const { renderGoogleButton } = useAuth();
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Google's script may still be loading when the dialog opens, so retry for
  // a few seconds before falling back to the One Tap button below.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let tries = 0;
    const attempt = () => {
      if (cancelled) return;
      if (buttonRef.current && renderGoogleButton(buttonRef.current)) {
        setGoogleReady(true);
        return;
      }
      if (tries++ < 20) setTimeout(attempt, 250);
    };
    attempt();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
            Vuelve a entrar con tu cuenta de Google para seguir trabajando. Lo que ya guardaste no se pierde.
          </p>
        </div>

        <div className="space-y-3">
          {/* Google's own button: a real click, so the sign-in window always opens. */}
          <div ref={buttonRef} className="flex justify-center" />

          {!googleReady && (
            <Button
              onClick={handleReauthenticate}
              disabled={isReauthenticating}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isReauthenticating ? 'Autenticando...' : 'Iniciar Sesión Nuevamente'}
            </Button>
          )}

          <Button
            onClick={onClose}
            variant="outline"
            disabled={isReauthenticating}
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </Button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            💡 <strong>Consejo:</strong> En una computadora compartida usa Cerrar sesión al terminar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredDialog;
