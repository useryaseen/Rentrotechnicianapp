/**
 * Date / number formatting helpers.
 *
 * Rules ported from the web app (spec §10.2, §10.6, §14 item 11):
 *  - sentinel dates from the API (`01/01/1900 00:00:00`, `0001-01-01T00:00:00`,
 *    any year <= 1900) are treated as "not set" and must never be rendered;
 *  - times are shown as `DD MMM YYYY, HH:mm` (en-GB) for schedules;
 *  - amounts are displayed in AED.
 */

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const pad2 = (n) => String(n).padStart(2, '0');

/** Parse any API date, returning null for sentinels / invalid values. */
export function parseApiDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'string') {
    const text = value.trim();
    if (text === '-' || text === '0' || text === '') return null;
    // `01/01/1900 00:00:00` / `01/01/1900`
    const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
    if (slash) {
      const year = Number(slash[3]);
      if (year <= 1900) return null;
      const date = new Date(year, Number(slash[2]) - 1, Number(slash[1]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    // `0001-01-01T00:00:00` is the .NET default and is not a real date
    const isoYear = /^(\d{4})-/.exec(text);
    if (isoYear && Number(isoYear[1]) <= 1900) return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() <= 1900) return null;
  return date;
}

export function isValidDateValue(value) {
  return parseApiDate(value) != null;
}

/** `DD MMM YYYY`, or '' when the value is a sentinel. */
export function formatDate(value, fallback = '') {
  const date = parseApiDate(value);
  if (!date) return fallback;
  return `${pad2(date.getDate())} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** `HH:mm`, or '' when the value is a sentinel. */
export function formatTime(value, fallback = '') {
  const date = parseApiDate(value);
  if (!date) return fallback;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** `DD MMM YYYY, HH:mm` (en-GB), or '' when the value is a sentinel. */
export function formatDateTime(value, fallback = '') {
  const date = parseApiDate(value);
  if (!date) return fallback;
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** `DD MMM YYYY` for day-group headers in Completed Services. */
export function formatLongDate(value, fallback = '') {
  const date = parseApiDate(value);
  if (!date) return fallback;
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  return `${weekday}, ${pad2(date.getDate())} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** `YYYY-MM-DD` used by fromDate/toDate/stDate/endDate query params. */
export function toIsoDate(value = new Date()) {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}


/**
 * Timezone-less midnight (`YYYY-MM-DDT00:00:00`).
 *
 * ⚠️ Spec §14 item 11: `installationDate` / `hiredOn` MUST use this format and
 * must NOT go through `toISOString()` — a UTC+4 device would otherwise roll the
 * date back one day.
 */
export function toLocalMidnight(value = new Date()) {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return `${toIsoDate(date)}T00:00:00`;
}

/** ISO 8601 timestamp used for ServiceDate. */
export function toIsoDateTime(value = new Date()) {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return new Date().toISOString();
  return date.toISOString();
}

export function addDays(value, days) {
  const date = value instanceof Date ? new Date(value) : parseApiDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return date;
}

export function startOfDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : parseApiDate(value);
  if (!date) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameDay(a, b) {
  const first = parseApiDate(a);
  const second = parseApiDate(b);
  if (!first || !second) return false;
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function isBeforeToday(value) {
  const date = parseApiDate(value);
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

/** Whole days from today to `value` (negative when overdue). */
export function daysUntil(value) {
  const date = parseApiDate(value);
  if (!date) return null;
  const diff = startOfDay(date).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86400000);
}

/** Human size for the `originalSize → compressedSize` badges. */
export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const aedFallback = (amount) => `${Number(amount || 0).toFixed(2)} AED`;

/** AED display; falls back to a manual format if Hermes Intl is unavailable. */
export function formatCurrencyAED(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return aedFallback(0);
  try {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return aedFallback(value);
  }
}

/** Greeting used by the dashboard header card. */
export function greetingForNow(value = new Date()) {
  const date = value instanceof Date ? value : new Date();
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** `YYYY-MM-DDTHH:mm` so native date/time pickers round-trip cleanly. */
export function toDateTimeLocalValue(value) {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return `${toIsoDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function initialsOf(name) {
  const text = String(name || '').trim();
  if (!text) return '?';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
