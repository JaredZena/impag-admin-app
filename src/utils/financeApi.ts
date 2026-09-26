// mirror of routes/finance.py in impag-quot
// Gastos fijos mensuales + punto de equilibrio. All requests go through
// apiRequest from '@/utils/api' so 401 handling stays centralized.

import { apiRequest } from '@/utils/api';

export type ExpenseCategory = 'operativo' | 'financiamiento' | 'otro';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  operativo: 'Operativo',
  financiamiento: 'Financiamiento',
  otro: 'Otro / variable',
};
export const CATEGORY_ORDER: ExpenseCategory[] = ['operativo', 'financiamiento', 'otro'];

export interface ExpenseConcept {
  id: number;
  name: string;
  category: ExpenseCategory;
  default_amount: number;
  active: boolean;
  sort_order: number;
  notes: string | null;
}

export interface MonthlyExpense {
  id: number;
  month: string; // YYYY-MM
  concept_id: number | null;
  name: string;
  category: ExpenseCategory;
  amount: number;
  paid: boolean;
  paid_on: string | null;
  notes: string | null;
}

export interface SeriesPoint {
  month: string;
  expenses_source: 'registrado' | 'plantilla' | 'sin_datos';
  operativo: number;
  financiamiento: number;
  otro: number;
  fixed_total: number;
  unpaid: number;
  sales: number;
  gross_profit: number;
  taxes: number;
  taxes_source: 'declarado' | 'estimado';
  breakeven_operativo: number | null;
  breakeven_fixed: number | null;
  result: number;
  is_partial: boolean;
}

export interface Scenario {
  key: 'operativo' | 'fijo' | 'al_corriente';
  label: string;
  expenses: number;
  breakeven: number | null;
  gap: number | null;
}

export interface FinanceDashboard {
  label: string;
  month: string;
  today: string;
  margin: { pct: number; source: 'medido' | 'manual' | 'supuesto'; measured_pct: number | null; sample: number };
  tax: { pct: number; source: 'medido' | 'manual' | 'supuesto'; measured_pct: number | null; months: string[] };
  effective_margin: number;
  selected: SeriesPoint & {
    opened: boolean;
    items: MonthlyExpense[];
    days_elapsed: number;
    days_in_month: number;
    projection: number;
    projection_gap: number | null;
  };
  scenarios: Scenario[];
  arrears: { total: number; items: MonthlyExpense[] };
  reference: {
    year: number;
    completed_months: number;
    avg_sales: number | null;
    median_sales: number | null;
    months_below_breakeven: number;
  };
  pipeline: {
    open_count: number;
    open_total: number;
    gross_profit_if_all_close: number;
    share_needed_to_cover_gap: number | null;
  };
  series: SeriesPoint[];
}

export async function getFinanceDashboard(params: {
  month?: string;
  months?: number;
  marginPct?: number | null;
  taxPct?: number | null;
}): Promise<FinanceDashboard> {
  const qs = new URLSearchParams();
  if (params.month) qs.set('month', params.month);
  if (params.months) qs.set('months', String(params.months));
  if (params.marginPct) qs.set('margin_pct', String(params.marginPct));
  if (params.taxPct !== null && params.taxPct !== undefined) qs.set('tax_pct', String(params.taxPct));
  return apiRequest(`/finance/dashboard?${qs.toString()}`);
}

export async function listConcepts(): Promise<ExpenseConcept[]> {
  return apiRequest('/finance/concepts');
}

export async function createConcept(body: Partial<ExpenseConcept> & { name: string }): Promise<ExpenseConcept> {
  return apiRequest('/finance/concepts', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateConcept(id: number, body: Partial<ExpenseConcept>): Promise<ExpenseConcept> {
  return apiRequest(`/finance/concepts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteConcept(id: number): Promise<void> {
  await apiRequest(`/finance/concepts/${id}`, { method: 'DELETE' });
}

export async function openMonth(month: string): Promise<{ created: number; items: MonthlyExpense[] }> {
  return apiRequest(`/finance/months/${month}/open`, { method: 'POST' });
}

export async function addExpense(
  month: string,
  body: { name?: string; concept_id?: number; category?: ExpenseCategory; amount: number; paid?: boolean; notes?: string },
): Promise<MonthlyExpense> {
  return apiRequest(`/finance/months/${month}/expenses`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateExpense(id: number, body: Partial<MonthlyExpense>): Promise<MonthlyExpense> {
  return apiRequest(`/finance/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteExpense(id: number): Promise<void> {
  await apiRequest(`/finance/expenses/${id}`, { method: 'DELETE' });
}

export interface TaxDeclaration {
  month: string; // YYYY-MM periodo
  amount: number;
  notes: string | null;
}

export async function listTaxes(): Promise<TaxDeclaration[]> {
  return apiRequest('/finance/taxes');
}

export async function putTax(month: string, body: { amount: number; notes?: string | null }): Promise<TaxDeclaration> {
  return apiRequest(`/finance/taxes/${month}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteTax(month: string): Promise<void> {
  await apiRequest(`/finance/taxes/${month}`, { method: 'DELETE' });
}
