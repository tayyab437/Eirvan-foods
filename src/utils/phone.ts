/**
 * Canonical Pakistani mobile number normalization & validation matching backend RequestValidator::normalizePhone.
 * Accepts 03XXXXXXXXX, 03XX-XXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX, 00923XXXXXXXXX, 9203XXXXXXXXX, 009203XXXXXXXXX.
 */
export function normalizePakistaniPhone(raw: string): string {
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';

  if (/^00923\d{9}$/.test(digits)) {
    return `0${digits.slice(4)}`;
  }
  if (/^009203\d{9}$/.test(digits)) {
    return digits.slice(4);
  }
  if (/^923\d{9}$/.test(digits)) {
    return `0${digits.slice(2)}`;
  }
  if (/^9203\d{9}$/.test(digits)) {
    return digits.slice(2);
  }
  if (/^3\d{9}$/.test(digits)) {
    return `0${digits}`;
  }
  return digits;
}

export function isValidPakistaniPhone(raw: string): boolean {
  const normalized = normalizePakistaniPhone(raw);
  return /^03\d{9}$/.test(normalized);
}
