import { RefreshCw, WifiOff } from 'lucide-react';

// What a screen shows when its data didn't load: the reason in plain Spanish and
// a retry button, so a failed load never looks like an empty list.
export default function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="text-center py-12 px-4 bg-white border border-red-100 rounded-xl">
      <WifiOff size={36} className="mx-auto text-red-300 mb-3" />
      <p className="font-medium text-gray-900">No se pudo cargar</p>
      <p className="text-sm text-gray-500 mt-1 mb-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800"
      >
        <RefreshCw size={16} />
        Reintentar
      </button>
    </div>
  );
}
