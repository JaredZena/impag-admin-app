import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNotifications } from '@/components/ui/notification';
import { apiRequest, ApiError } from '@/utils/api';

export interface ProductImage {
  key: string;
  url: string;
}

interface ProductImagesSectionProps {
  productId: string;
  initialImages: ProductImage[];
}

const ProductImagesSection: React.FC<ProductImagesSectionProps> = ({ productId, initialImages }) => {
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  // Presigned URLs expire (~1h). On the first broken thumbnail, refetch the
  // product once to get fresh URLs; the ref prevents a refetch loop when an
  // object is genuinely missing.
  const refreshedUrlsRef = useRef(false);

  const handleImageError = async () => {
    if (refreshedUrlsRef.current) return;
    refreshedUrlsRef.current = true;
    try {
      const response = await apiRequest(`/products/${productId}`);
      const fresh: ProductImage[] = response?.data?.images ?? [];
      setImages(curr =>
        curr.map(img => fresh.find(f => f.key === img.key) ?? img)
      );
    } catch {
      // Leave broken thumbnails; a page reload recovers.
    }
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset the input so selecting the same file again re-triggers onChange
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });
      try {
        const formData = new FormData();
        formData.append('file', file);
        // apiRequest skips the Content-Type header for FormData bodies,
        // letting the browser set the multipart boundary itself.
        const response = await apiRequest(`/products/${productId}/images`, {
          method: 'POST',
          body: formData,
        });
        if (response?.data?.key) {
          setImages(prev => [...prev, { key: response.data.key, url: response.data.url }]);
        }
      } catch (err: any) {
        let message = err?.message || 'Error desconocido';
        if (err instanceof ApiError) {
          if (err.status === 413) {
            message = 'La imagen es demasiado grande';
          } else if (err.status === 415) {
            message = 'Tipo de archivo no permitido';
          } else if (err.status === 400) {
            message = 'El archivo no es una imagen válida';
          }
        }
        addNotification({
          type: 'error',
          title: `No se pudo subir "${file.name}"`,
          message,
        });
        // Continue with the remaining files
      }
    }
    setUploading(false);
    setUploadProgress(null);
  };

  const handleDelete = async (key: string) => {
    setDeletingKey(key);
    try {
      await apiRequest(`/products/${productId}/images`, {
        method: 'DELETE',
        body: JSON.stringify({ key }),
      });
      setImages(prev => prev.filter(img => img.key !== key));
      addNotification({ type: 'success', title: 'Imagen eliminada' });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error al eliminar la imagen',
        message: err?.message || 'Error desconocido',
      });
    } finally {
      setDeletingKey(null);
      setConfirmingDeleteKey(null);
    }
  };

  const handleMakeCover = async (key: string) => {
    const target = images.find(img => img.key === key);
    if (!target || images[0]?.key === key || reordering || uploading) return;

    const previous = images;
    const reorderedImages = [target, ...images.filter(img => img.key !== key)];

    // Optimistic update; roll back if the server rejects the new order
    setImages(reorderedImages);
    setReordering(true);
    try {
      await apiRequest(`/products/${productId}/images/order`, {
        method: 'PUT',
        body: JSON.stringify({ keys: reorderedImages.map(img => img.key) }),
      });
      addNotification({ type: 'success', title: 'Portada actualizada' });
    } catch (err: any) {
      // Restore the previous ORDER without undoing membership changes that
      // may have landed meanwhile (e.g. an upload finishing mid-request).
      setImages(curr => {
        const order = new Map(previous.map((img, i) => [img.key, i]));
        return [...curr].sort(
          (a, b) => (order.get(a.key) ?? Infinity) - (order.get(b.key) ?? Infinity)
        );
      });
      addNotification({
        type: 'error',
        title: 'No se pudo cambiar la portada',
        message: err?.message || 'Error desconocido',
      });
    } finally {
      setReordering(false);
    }
  };

  return (
    <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm sm:text-lg">Imágenes del producto</span>
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {images.length}
          </span>
        </h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <Button
            onClick={handleSelectFiles}
            disabled={uploading}
            className="bg-green-600 hover:bg-green-700 text-white text-sm w-full sm:w-auto"
          >
            {uploading && uploadProgress ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subiendo {uploadProgress.current}/{uploadProgress.total}...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar imágenes
              </>
            )}
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm sm:text-base text-gray-500">
            Sin imágenes — las fotos aparecerán en todoparaelcampo.com.mx para productos enlazados
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {images.map((image, index) => (
            <div
              key={image.key}
              className="group relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
            >
              <img
                src={image.url}
                alt={`Imagen ${index + 1} del producto`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleImageError}
              />

              {index === 0 && (
                <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white shadow">
                  Portada
                </span>
              )}

              {/* Actions: always visible on mobile/touch, hover-reveal on md+ */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                {confirmingDeleteKey === image.key ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-medium text-white">¿Eliminar?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(image.key)}
                      disabled={deletingKey === image.key}
                      className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded disabled:opacity-60"
                    >
                      {deletingKey === image.key ? 'Eliminando...' : 'Sí'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteKey(null)}
                      disabled={deletingKey === image.key}
                      className="text-xs font-medium bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded disabled:opacity-60"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    {index !== 0 ? (
                      <button
                        type="button"
                        onClick={() => handleMakeCover(image.key)}
                        disabled={reordering || uploading}
                        className="text-xs font-medium bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded disabled:opacity-60"
                      >
                        Hacer portada
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteKey(image.key)}
                      className="text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ProductImagesSection;
