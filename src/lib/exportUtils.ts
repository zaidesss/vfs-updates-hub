/**
 * Export utilities for generating and downloading CSV files
 */

// Escape CSV values properly
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert array of objects to CSV string
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; header: string }[]
): string {
  if (data.length === 0) return '';

  // Header row
  const headerRow = columns.map(col => escapeCSVValue(col.header)).join(',');

  // Data rows
  const dataRows = data.map(row =>
    columns
      .map(col => {
        const keys = String(col.key).split('.');
        let value: any = row;
        for (const k of keys) {
          value = value?.[k];
        }
        return escapeCSVValue(value);
      })
      .join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

// Trigger CSV file download
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export data as CSV file
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; header: string }[],
  filename: string
): void {
  const csvContent = arrayToCSV(data, columns);
  downloadCSV(csvContent, filename);
}

// Format seconds to human-readable string for export
export function formatSecondsForExport(seconds: number | null): string {
  if (seconds === null) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Format percentage for export
export function formatPercentForExport(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(1)}%`;
}
