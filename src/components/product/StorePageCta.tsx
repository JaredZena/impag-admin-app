import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useStoreLinks } from '@/hooks/useStoreLinks';

// A product with no page on todoparaelcampo.com.mx: offer «Nueva página»
// (Tienda en línea opens on this product).
const StorePageCta: React.FC<{ productId: string }> = ({ productId }) => {
  const links = useStoreLinks(productId);
  if (!links || links.length > 0) return null;
  return (
    <Card className="p-3 sm:p-4 mb-6 sm:mb-8 shadow-sm border-0 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Este producto no está en la tienda en línea</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Crea su página en todoparaelcampo.com.mx con su foto, precio y especificaciones.
        </p>
      </div>
      <Link
        to={`/tienda?nueva=${productId}`}
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Crear página en la tienda
      </Link>
    </Card>
  );
};

export default StorePageCta;
