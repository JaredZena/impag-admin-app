// Siguiente paso de una cotización: qué hacer, quién y para cuándo.
//
// Las fechas son días de calendario (YYYY-MM-DD) en la hora local del
// navegador (Durango / Ciudad de México). Nunca se pasan por new Date('YYYY-MM-DD'),
// que las lee como UTC y en México las corre al día anterior.

import type { Quote } from '@/types/quotes';

export const NEXT_ACTION_MAX = 200;

// Quiénes pueden tener un siguiente paso, como los guarda el backend.
export const NEXT_ACTION_OWNERS = ['Hernán', 'JD', 'Daniel', 'Jared'] as const;

// Cuenta de Google → nombre de pila. La cuenta de Hernán es la de la tienda.
const OWNER_BY_EMAIL: Record<string, string> = {
  'impagtodoparaelcampo@gmail.com': 'Hernán',
  'juandanielbetancourt@gmail.com': 'JD',
  'juandanielbetancourtg@gmail.com': 'Daniel',
  'jaredzenahernandez@gmail.com': 'Jared',
  'jared.zena@resilia.com': 'Jared',
};

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** "hernan" / "HERNÁN" → "Hernán"; un nombre fuera de la lista se deja como viene. */
export function normalizeOwner(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return NEXT_ACTION_OWNERS.find((o) => fold(o) === fold(trimmed)) ?? trimmed;
}

export function sameOwner(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeOwner(a);
  const nb = normalizeOwner(b);
  return na !== null && nb !== null && fold(na) === fold(nb);
}

/** Nombre de pila de quien tiene la sesión abierta, o null si no se sabe. */
export function ownerForUser(user: { email?: string | null; name?: string | null } | null | undefined): string | null {
  if (!user) return null;
  const byEmail = user.email ? OWNER_BY_EMAIL[user.email.trim().toLowerCase()] : undefined;
  if (byEmail) return byEmail;
  const first = user.name?.trim().split(/\s+/)[0];
  if (!first) return null;
  return NEXT_ACTION_OWNERS.find((o) => fold(o) === fold(first)) ?? null;
}

// ==================== Fechas ====================

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local → "YYYY-MM-DD". */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" (o un ISO que empiece así) → medianoche local; null si no es fecha. */
export function parseYmd(value: string | null | undefined): Date | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return date.getMonth() === Number(m[2]) - 1 ? date : null;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Días de calendario de `from` a `to` (negativo si `to` ya pasó). */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

/** Domingo de esta semana (la semana empieza en lunes); hoy si hoy es domingo. */
export function endOfWeek(today: Date): Date {
  return addDays(today, (7 - today.getDay()) % 7);
}

/** El próximo `weekday` (0 = domingo … 6 = sábado) después de hoy, nunca hoy. */
export function nextWeekday(today: Date, weekday: number): Date {
  return addDays(today, ((weekday - today.getDay() + 6) % 7) + 1);
}

/** "mié 7" */
export function shortDay(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

/** "mié 7 oct" */
export function shortDate(date: Date): string {
  return `${shortDay(date)} ${MONTHS[date.getMonth()]}`;
}

export type DueTone = 'overdue' | 'today' | 'tomorrow' | 'later';

export interface DueLabel {
  text: string;
  tone: DueTone;
  /** Fecha completa ("mié 7 oct"), para un title o un texto secundario. */
  date: string;
}

/** "atrasado 2 días" / "hoy" / "mañana" / "vence mié 7" (o "vence mié 14 oct" si falta más de una semana). */
export function dueLabel(due: string | null | undefined, today: Date = new Date()): DueLabel | null {
  const date = parseYmd(due);
  if (!date) return null;
  const days = daysBetween(today, date);
  const full = shortDate(date);
  if (days < 0) {
    const late = -days;
    return { text: `atrasado ${late} ${late === 1 ? 'día' : 'días'}`, tone: 'overdue', date: full };
  }
  if (days === 0) return { text: 'hoy', tone: 'today', date: full };
  if (days === 1) return { text: 'mañana', tone: 'tomorrow', date: full };
  return { text: `vence ${days < 7 ? shortDay(date) : full}`, tone: 'later', date: full };
}

export const DUE_TONE_CLASS: Record<DueTone, string> = {
  overdue: 'text-red-600 font-semibold',
  today: 'text-amber-700 font-semibold',
  tomorrow: 'text-gray-700',
  later: 'text-gray-500',
};

// Botones rápidos de «Para cuándo».
export function quickDueOptions(today: Date): { label: string; ymd: string; hint: string }[] {
  const options = [
    { label: 'Hoy', date: today },
    { label: 'Mañana', date: addDays(today, 1) },
    { label: 'Viernes', date: nextWeekday(today, 5) },
    { label: 'Próx. lunes', date: nextWeekday(today, 1) },
  ];
  return options.map((o) => ({ label: o.label, ymd: toYmd(o.date), hint: shortDay(o.date) }));
}

// ==================== «Qué sigue» ====================

export type NextStepGroup = 'overdue' | 'today' | 'week';

export const NEXT_STEP_GROUPS: { key: NextStepGroup; label: string; className: string }[] = [
  { key: 'overdue', label: 'Atrasadas', className: 'text-red-600' },
  { key: 'today', label: 'Hoy', className: 'text-amber-700' },
  { key: 'week', label: 'Esta semana', className: 'text-gray-500' },
];

/**
 * Cotizaciones con un siguiente paso que vence a más tardar el domingo, por
 * grupo y en orden de fecha. Se filtra aquí también por si el backend todavía
 * no entiende next_action_due_to y devuelve la lista completa.
 */
export function groupNextSteps(quotes: Quote[], today: Date): Record<NextStepGroup, Quote[]> {
  const todayYmd = toYmd(today);
  const sundayYmd = toYmd(endOfWeek(today));
  const groups: Record<NextStepGroup, Quote[]> = { overdue: [], today: [], week: [] };
  const dated = quotes
    .map((q) => ({ q, due: parseYmd(q.next_action_due) }))
    .filter((x): x is { q: Quote; due: Date } => Boolean(x.q.next_action?.trim()) && x.due !== null)
    .map(({ q, due }) => ({ q, ymd: toYmd(due) }))
    .filter((x) => x.ymd <= sundayYmd)
    .sort((a, b) => a.ymd.localeCompare(b.ymd) || a.q.id - b.q.id);
  for (const { q, ymd } of dated) {
    groups[ymd < todayYmd ? 'overdue' : ymd === todayYmd ? 'today' : 'week'].push(q);
  }
  return groups;
}
