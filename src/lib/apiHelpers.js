/**
 * Shared API response helpers.
 *
 * The 10 ERP Web API mixes envelopes (`bare array`, `{ data: [...] }`,
 * `{ serviceList: [...] }`, `{ success, message, data }`) and mixes field
 * casing (`accCode` / `AccCode` / `acc_code`). The web app normalises
 * defensively everywhere — these helpers are the single place that logic lives
 * on mobile (spec §8.1, §10.3, §10.4).
 */

export function asList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/** First non-empty value among the given keys (dual-casing fallbacks). */
export function pickField(source, keys) {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function pickText(source, keys, fallback = '') {
  const value = pickField(source, keys);
  if (value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text === '-') return fallback;
  return text;
}

export function hasText(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return text !== '' && text !== '-';
}

/** Left-pad status codes to 3 characters (`1` → `001`). */
export function pad3(code) {
  if (code === undefined || code === null || code === '') return '';
  return String(code).trim().padStart(3, '0');
}

const SENTINEL_UUIDS = new Set([
  '00000000-0000-0000-0000-000000000000',
  '0',
  '',
  'null',
  'undefined',
]);

/** `taskinitiated` is a GUID only once the visit has actually been started. */
export function isSentinelUuid(value) {
  if (value === undefined || value === null) return true;
  return SENTINEL_UUIDS.has(String(value).trim().toLowerCase());
}

/**
 * Pulls the most useful message out of an axios error.
 * Priority ported from the web app: data.message → data.errorCode → data
 * (string) → message → fallback.
 */
export function getErrorMessage(error, fallback = 'Unknown error') {
  const data = error?.response?.data;
  if (data) {
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (typeof data === 'object') {
      if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
      if (typeof data.errorMessage === 'string' && data.errorMessage.trim()) {
        return data.errorMessage.trim();
      }
      if (typeof data.errorCode === 'string' && data.errorCode.trim()) return data.errorCode.trim();
      if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
    }
  }
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  return fallback;
}

export function getErrorCode(error) {
  return error?.response?.data?.errorCode || error?.response?.data?.ErrorCode || null;
}

export function isHttpStatus(error, status) {
  return error?.response?.status === status;
}

export function isNetworkError(error) {
  return Boolean(error) && !error.response && Boolean(error.request);
}

/** `{ success: false, ... }` style envelopes are NOT failures by HTTP status. */
export function isFailureEnvelope(data) {
  return Boolean(data) && typeof data === 'object' && data.success === false;
}

/**
 * Builds a query string, keeping empty strings out but preserving `0` and
 * `false` (the API treats a missing key differently from an empty one).
 */
export function buildQuery(params = {}) {
  const parts = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value);
    if (text === '') return;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(text)}`);
  });
  return parts.join('&');
}

export function withQuery(path, params) {
  const query = buildQuery(params);
  return query ? `${path}?${query}` : path;
}
