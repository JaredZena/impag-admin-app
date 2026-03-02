import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Download, ExternalLink, FileText, Image, File as FileIcon, MessageSquare } from 'lucide-react';
import { FILE_CATEGORY_LABELS, CATEGORY_SUBTYPES } from '@/types/files';
import type { SearchResult, FileCategory, FileMetadata } from '@/types/files';
import { getFileDownloadUrl, getFileViewUrl } from '@/utils/filesApi';

// ─── Helpers ─────────────────────────────────────────────────

function getCategoryBadgeColor(category: string): string {
  const colors: Record<string, string> = {
    'cotizacion': 'bg-blue-100 text-blue-700',
    'nota': 'bg-amber-100 text-amber-700',
    'factura': 'bg-rose-100 text-rose-700',
    'comprobante-de-pago': 'bg-violet-100 text-violet-700',
    'project-image': 'bg-purple-100 text-purple-700',
    'packaging-logistics': 'bg-orange-100 text-orange-700',
    'whatsapp-chat': 'bg-emerald-100 text-emerald-700',
    'ficha-tecnica': 'bg-cyan-100 text-cyan-700',
    'imagen-de-producto': 'bg-pink-100 text-pink-700',
    'infografia': 'bg-teal-100 text-teal-700',
    'article': 'bg-sky-100 text-sky-700',
    'control-de-ventas': 'bg-lime-100 text-lime-700',
    'catalogo': 'bg-indigo-100 text-indigo-700',
    'estado-de-cuenta': 'bg-yellow-100 text-yellow-700',
  };
  return colors[category] || 'bg-slate-100 text-slate-700';
}

// Categories where multiple chunks per file are useful (large docs with varied content)
const MULTI_CHUNK_CATEGORIES = new Set(['whatsapp-chat', 'ficha-tecnica', 'control-de-ventas', 'catalogo']);

function isPreviewableImage(ct: string | undefined): boolean {
  return !!ct && ct.startsWith('image/');
}

function getThumbnailForContentType(contentType: string | undefined, category: string) {
  if (category === 'whatsapp-chat') {
    return (
      <div className="w-10 h-10 rounded bg-emerald-50 flex items-center justify-center shrink-0">
        <MessageSquare size={20} className="text-emerald-500" />
      </div>
    );
  }
  if (contentType === 'application/pdf') {
    return (
      <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center shrink-0">
        <FileText size={20} className="text-red-500" />
      </div>
    );
  }
  if (isPreviewableImage(contentType)) {
    return null; // handled by lazy preview
  }
  return (
    <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center shrink-0">
      <FileIcon size={20} className="text-blue-500" />
    </div>
  );
}

// ─── Lazy thumbnail hook ─────────────────────────────────────

function useLazyPreviewUrl(fileId: number, contentType: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isPreviewableImage(contentType) || fetchedRef.current) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          fetchedRef.current = true;
          getFileDownloadUrl(fileId)
            .then(({ url }) => setUrl(url))
            .catch(() => {});
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fileId, contentType]);

  return { ref, previewUrl: url };
}

// ─── Thumbnail sub-components ────────────────────────────────

function SemanticThumbnail({ result }: { result: SearchResult }) {
  const { ref, previewUrl } = useLazyPreviewUrl(result.file_id, result.content_type);
  const staticThumb = getThumbnailForContentType(result.content_type, result.category);
  if (staticThumb) return staticThumb;

  return (
    <div ref={ref} className="w-10 h-10 rounded overflow-hidden shrink-0 bg-purple-50 flex items-center justify-center">
      {previewUrl ? (
        <img src={previewUrl} alt={result.original_filename} className="w-full h-full object-cover" />
      ) : (
        <Image size={20} className="text-purple-400" />
      )}
    </div>
  );
}

function FileThumbnail({ file }: { file: FileMetadata }) {
  const { ref, previewUrl } = useLazyPreviewUrl(file.id, file.content_type);
  const staticThumb = getThumbnailForContentType(file.content_type, file.category);
  if (staticThumb) return staticThumb;

  return (
    <div ref={ref} className="w-10 h-10 rounded overflow-hidden shrink-0 bg-purple-50 flex items-center justify-center">
      {previewUrl ? (
        <img src={previewUrl} alt={file.original_filename} className="w-full h-full object-cover" />
      ) : (
        <Image size={20} className="text-purple-400" />
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

interface SearchResultsProps {
  textMatches: FileMetadata[];
  textLoading: boolean;
  semanticResults: SearchResult[];
  semanticLoading: boolean;
  query: string;
  parentCategory?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  textMatches,
  textLoading,
  semanticResults,
  semanticLoading,
  query,
  parentCategory,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Reset filter when query changes
  useEffect(() => {
    setActiveCategory('');
  }, [query]);

  // Dedup semantic results:
  // 1. Remove results that already appear in text matches
  // 2. "Todas" (no filter): always keep only the best chunk per file
  // 3. Specific multi-chunk category selected: show all chunks for that category
  const textIds = useMemo(() => new Set(textMatches.map((f) => f.id)), [textMatches]);
  const dedupedSemantic = useMemo(() => {
    const afterTextDedup = semanticResults.filter((r) => !textIds.has(r.file_id));
    const effectiveCategory = activeCategory || parentCategory || '';
    const allowMultiChunks = effectiveCategory && MULTI_CHUNK_CATEGORIES.has(effectiveCategory);

    // Keep best chunk per file (results are already sorted by score)
    const seenFiles = new Set<number>();
    return afterTextDedup.filter((r) => {
      if (allowMultiChunks && MULTI_CHUNK_CATEGORIES.has(r.category)) return true;
      if (seenFiles.has(r.file_id)) return false;
      seenFiles.add(r.file_id);
      return true;
    });
  }, [semanticResults, textIds, activeCategory, parentCategory]);

  // Category pills from combined results
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of textMatches) counts[f.category] = (counts[f.category] || 0) + 1;
    for (const r of dedupedSemantic) counts[r.category] = (counts[r.category] || 0) + 1;
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [textMatches, dedupedSemantic]);

  const filteredText = useMemo(
    () => (activeCategory ? textMatches.filter((f) => f.category === activeCategory) : textMatches),
    [textMatches, activeCategory],
  );
  const filteredSemantic = useMemo(
    () => (activeCategory ? dedupedSemantic.filter((r) => r.category === activeCategory) : dedupedSemantic),
    [dedupedSemantic, activeCategory],
  );

  const totalCount = textMatches.length + dedupedSemantic.length;

  const handleView = async (fileId: number) => {
    try {
      const { url } = await getFileViewUrl(fileId);
      window.open(url, '_blank');
    } catch { /* silently fail */ }
  };

  const handleDownload = async (fileId: number) => {
    try {
      const { url } = await getFileDownloadUrl(fileId);
      window.open(url, '_blank');
    } catch { /* silently fail */ }
  };

  const hasNoResults = !textLoading && !semanticLoading && textMatches.length === 0 && semanticResults.length === 0;

  if (hasNoResults && query) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500">No se encontraron resultados para &ldquo;{query}&rdquo;</p>
        <p className="text-slate-400 text-sm mt-1">Intenta con otros terminos de busqueda</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Result count */}
      {totalCount > 0 && (
        <p className="text-sm text-slate-500">
          {activeCategory
            ? `${filteredText.length + filteredSemantic.length} de ${totalCount} resultado${totalCount !== 1 ? 's' : ''} para "${query}"`
            : `${totalCount} resultado${totalCount !== 1 ? 's' : ''} para "${query}"`}
        </p>
      )}

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory('')}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({totalCount})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                activeCategory === cat
                  ? getCategoryBadgeColor(cat) + ' ring-1 ring-offset-1 ring-slate-300'
                  : getCategoryBadgeColor(cat) + ' opacity-60 hover:opacity-100'
              }`}
            >
              {FILE_CATEGORY_LABELS[cat as FileCategory] || cat} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Text matches — "Coincidencias por nombre" */}
      {filteredText.length > 0 && (
        <>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide pt-1">
            Coincidencias por nombre ({filteredText.length})
          </p>
          {filteredText.map((file) => (
            <Card
              key={`text-${file.id}`}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleView(file.id)}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <FileThumbnail file={file} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 text-sm truncate">
                      {file.original_filename}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${getCategoryBadgeColor(file.category)}`}>
                      {FILE_CATEGORY_LABELS[file.category] || file.category}
                    </span>
                    {file.subtype && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 bg-slate-50 text-slate-600 border border-slate-200">
                        {CATEGORY_SUBTYPES[file.category]?.find(o => o.value === file.subtype)?.label || file.subtype}
                      </span>
                    )}
                  </div>
                  {file.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{file.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleView(file.id); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Abrir"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(file.id); }}
                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Semantic matches — "Coincidencias por contenido" */}
      {semanticLoading && (
        <div className="flex items-center gap-2 py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          <span className="text-xs text-slate-400">Buscando por contenido...</span>
        </div>
      )}
      {!semanticLoading && filteredSemantic.length > 0 && (
        <>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide pt-1">
            Coincidencias por contenido ({filteredSemantic.length})
          </p>
          {filteredSemantic.map((result, idx) => (
            <Card
              key={`sem-${result.file_id}-${result.chunk_index}-${idx}`}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleView(result.file_id)}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <SemanticThumbnail result={result} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 text-sm truncate">
                      {result.original_filename}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${getCategoryBadgeColor(result.category)}`}>
                      {FILE_CATEGORY_LABELS[result.category as FileCategory] || result.category}
                    </span>
                  </div>
                  {/* Relevance score bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 max-w-[120px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.round(result.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  {/* Snippet */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {result.snippet}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleView(result.file_id); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Abrir"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(result.file_id); }}
                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Loading state when only text is loading and no results yet */}
      {textLoading && textMatches.length === 0 && !semanticLoading && semanticResults.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-sm text-slate-500">Buscando...</span>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
