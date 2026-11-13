/**
 * RFC-4180 compliant CSV cell escaping + Excel/Calc formula injection protection.
 */
const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let text = String(value).replace(/\r\n|\r|\n/g, ' ');
  if (FORMULA_TRIGGER_RE.test(text)) {
    text = "'" + text;
  }
  return '"' + text.replace(/"/g, '""') + '"';
}

export function buildSafeCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(',');
  const bodyLines = rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(','));
  // Prefix UTF-8 BOM for proper Excel Unicode rendering
  return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
}
