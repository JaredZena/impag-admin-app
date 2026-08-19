// Shared bits between CustomersPage (table) and CustomerDetailPage.

export const SOURCE_CLS: Record<string, string> = {
  whatsapp: 'text-green-700 bg-green-50', visita: 'text-blue-700 bg-blue-50',
  marketplace: 'text-purple-700 bg-purple-50', messenger: 'text-sky-700 bg-sky-50',
};

export const SV_TAG = 'sembrando-vida';

// Relative time in Spanish — same idiom as PublishStorefrontButton's formatRelativeTime
export function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.floor((Date.now() - then) / 60_000);
  if (diffMin < 1) return 'hace unos segundos';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `hace ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
  const diffYears = Math.floor(diffMonths / 12);
  return `hace ${diffYears} año${diffYears !== 1 ? 's' : ''}`;
}
