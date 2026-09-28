/**
 * Cross-platform multipart file parts.
 *
 * React Native and the browser describe a file part differently, and picking the wrong shape
 * fails silently instead of loudly:
 *
 * - **Native (iOS/Android)** — React Native's multipart writer streams the bytes of the file
 *   when the part value is a `{ uri, name, type }` descriptor.
 * - **Web (react-native-web)** — the DOM `FormData` only accepts `string | Blob | File`.
 *   Handing it a descriptor object stringifies it, so the server receives the literal text
 *   `"[object Object]"` instead of an image.
 *
 * `toUploadPart` returns the right value for the platform in use, so callers just build the
 * `FormData` as usual:
 *
 *   const fd = new FormData();
 *   for (const part of await toUploadParts(images)) {
 *     fd.append('AfterServiceImage', part);
 *   }
 */
import { Platform } from 'react-native';

/**
 * @typedef {{ uri: string, name: string, type: string }} UploadFile
 *   A local photo/signature as produced by `compressImage` / `saveSignatureDataUrl`.
 */

/** True for an uploadable descriptor (has a local `uri`) rather than a text field. */
export function isUploadFile(value) {
  return (
    !!value && typeof value === 'object' && typeof value.uri === 'string' && value.uri.length > 0
  );
}

/**
 * Convert one local file descriptor into the part value that actually carries the bytes.
 *
 * @param {UploadFile} file
 * @returns {Promise<any>} native → `{ uri, name, type }`; web → a real `File`/`Blob`
 */
export async function toUploadPart(file) {
  if (!isUploadFile(file)) {
    throw new Error('Missing photo data. Please pick the photo again.');
  }

  const name = file.name || 'photo.jpg';
  const type = file.type || 'image/jpeg';

  // Native: React Native's networking layer reads the file itself, so the descriptor is the
  // part value it expects. A `File`/`Blob` here would be sent as the text "[object Blob]".
  if (Platform.OS !== 'web') {
    return { uri: file.uri, name, type };
  }

  // Web: `uri` is a `blob:` / `data:` url, so load the bytes and send a real binary part.
  const response = await fetch(file.uri);
  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('The selected photo could not be read. Please pick it again.');
  }

  const fileType = blob.type || type;
  // `File` gives the part its filename; every browser that runs the app has it.
  return typeof File !== 'undefined' ? new File([blob], name, { type: fileType }) : blob;
}

/**
 * `toUploadPart` for a list of files — resolves in the same order it was given.
 *
 * @param {UploadFile[]} files
 * @returns {Promise<any[]>}
 */
export function toUploadParts(files = []) {
  return Promise.all(files.map((file) => toUploadPart(file)));
}

export default { isUploadFile, toUploadPart, toUploadParts };
