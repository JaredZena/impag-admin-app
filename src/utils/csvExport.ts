/**
 * Utility functions for CSV export
 */

export interface ColumnOption {
  key: string;
  label: string;
  defaultSelected?: boolean;
}

/**
 * Convert data array to CSV string
 */
export function convertToCSV(
  data: Record<string, any>[],
  columns: ColumnOption[],
  selectedColumns: string[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Filter columns to only include selected ones
  const visibleColumns = columns.filter(col => selectedColumns.includes(col.key));

  // Create header row
  const headers = visibleColumns.map(col => escapeCSVValue(col.label));
  const headerRow = headers.join(',');

  // Create data rows
  const rows = data.map(row => {
    return visibleColumns.map(col => {
      const value = row[col.key];
      return escapeCSVValue(formatValue(value));
    }).join(',');
  });

  // Combine header and rows
  return [headerRow, ...rows].join('\n');
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format value for CSV export
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join('; ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8 support
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

