// Generic export utilities for CSV and XLS formats

export interface ExportColumn<T> {
  label: string;
  value: (item: T) => string | number;
}

function escapeCSV(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toRows<T>(data: T[], columns: ExportColumn<T>[]): string[][] {
  return data.map(item => columns.map(col => {
    const v = col.value(item);
    if (v === null || v === undefined) return '';
    return String(v);
  }));
}

export function downloadCSV<T>(fileBaseName: string, data: T[], columns: ExportColumn<T>[]): void {
  const headers = columns.map(c => c.label).join(',');
  const rows = toRows(data, columns)
    .map(r => r.map(cell => escapeCSV(cell)).join(','))
    .join('\n');

  const csvContent = `\uFEFF${headers}\n${rows}`; // BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `${fileBaseName}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadXLS<T>(fileBaseName: string, data: T[], columns: ExportColumn<T>[]): void {
  const headerHtml = columns.map(c => `<th style="border:1px solid #ccc;padding:4px;text-align:left">${c.label}</th>`).join('');
  const rowsHtml = toRows(data, columns)
    .map(row => `<tr>${row.map(cell => `<td style="border:1px solid #ccc;padding:4px">${String(cell).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${`<thead><tr>${headerHtml}</tr></thead>`}${`<tbody>${rowsHtml}</tbody>`}</table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `${fileBaseName}-${date}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}