/**
 * Currency & Number Formatting Helpers for Indian Rupees (₹)
 * and Phone normalization rules.
 */

export function formatINR(amount: number, includeDecimals = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  const hasFraction = includeDecimals || (amount % 1 !== 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    // 1 Crore = 10,000,000
    const cr = (abs / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
    return `${sign}₹${cr}Cr`;
  }
  if (abs >= 100000) {
    // 1 Lakh = 100,000
    const lakh = (abs / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
    return `${sign}₹${lakh}L`;
  }
  if (abs >= 1000) {
    // 1 Thousand = 1,000
    const k = (abs / 1000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${k}k`;
  }
  return formatINR(amount);
}

/**
 * Shared phone normalization:
 * Strip spaces, dashes, brackets, and '+';
 * Drop one leading '0';
 * A 10-digit number gets the prefix '91'.
 */
export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/[\s\-\(\)\+]/g, '');
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (/^\d{10}$/.test(digits)) {
    return `91${digits}`;
  }
  if (/^\d{11,13}$/.test(digits)) {
    return digits;
  }
  return digits.length > 5 ? digits : null;
}

export function formatPhoneDisplay(normalized?: string | null): string {
  if (!normalized) return '';
  if (normalized.startsWith('91') && normalized.length === 12) {
    const p = normalized.slice(2);
    return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  }
  return `+${normalized}`;
}
