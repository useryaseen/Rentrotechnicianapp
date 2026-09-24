/**
 * FormData builder for multipart requests.
 *
 * Implements the exact rules from the web app's `technicianApi.js` → `endTask()`:
 *   Object.entries(payload).forEach(([key, value]) => {
 *     if (Array.isArray(value)) {
 *       if (value.length > 0 && value.every((v) => v instanceof File)) {
 *         value.forEach((v) => fd.append(key, v));        // N parts with the SAME field name
 *       } else {
 *         fd.append(key, JSON.stringify(value));          // e.g. BomItemslist / Taskslist
 *       }
 *     } else if (value instanceof File) {
 *       fd.append(key, value);                            // signatures
 *     } else {
 *       fd.append(key, value ?? '');                      // scalars; null/undefined → ""
 *     }
 *   });
 *
 * We expect the caller to have already prepared the values:
 *   - For repeated file parts (like AfterServiceImage): an array of File objects.
 *   - For JSON-stringifiable arrays (BomItemslist, Taskslist): an array of plain objects.
 *   - For single files (signatures): a File object.
 *   - For scalars: string, number, boolean, etc.
 *
 * Returns a FormData instance ready to be passed to axios.
 */
import { isWebUri } from 'expo-constants'; // Not strictly needed, but useful for web detection if ever needed.

/**
 * Appends a value to a FormData instance following the web app's rules.
 * @param {FormData} fd
 * @param {string} key
 * @param {any} value
 */
function appendValue(fd, key, value) {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(v => v instanceof File)) {
      // Repeated file parts: e.g., AfterServiceImage
      value.forEach(v => fd.append(key, v));
    } else {
      // Array of plain objects: JSON-stringify
      fd.append(key, JSON.stringify(value));
    }
  } else if (value instanceof File) {
    // Single file: signature
    fd.append(key, value);
  } else {
    // Scalar: null/undefined becomes empty string
    fd.append(key, value ?? '');
  }
}

/**
 * Builds a FormData object from a plain JavaScript object.
 * @param {Object} payload - The payload to convert.
 * @returns {FormData}
 */
export function buildFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    appendValue(fd, key, value);
  });
  return fd;
}

export default { buildFormData };