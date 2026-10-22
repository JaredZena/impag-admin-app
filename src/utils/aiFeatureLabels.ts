// Mirrors impag-quot routes/ai_usage.py FEATURE_LABELS. /ai-usage/events and
// /ai-usage/summary already add `label` server-side; this is only needed
// where a usage row comes without one (services/agroproyectos.py agro_admin()
// → AgroDetailPage's per-project usage table).
export const FEATURE_LABELS: Record<string, string> = {
  'agroproyectos.plan': 'Agroproyectos · plan',
  'agroproyectos.productos': 'Agroproyectos · productos',
  'agroproyectos.riego': 'Agroproyectos · diseño de riego',
  'agroproyectos.chat': 'Agroproyectos · preguntas',
  'apoyos.discovery': 'Apoyos · búsqueda',
  'apoyos.recheck': 'Apoyos · verificación',
  'solar.read_bill': 'Cotizador solar · lectura de recibo',
  'solar.advice': 'Cotizador solar · explicación',
};

export const featureLabel = (feature: string): string => FEATURE_LABELS[feature] ?? feature;
