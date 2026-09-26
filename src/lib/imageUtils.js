/**
 * Image utilities: compression for uploads and saving drawn signatures.
 *
 * Ported from the web app's `src/utils/image.js` (spec §9.4):
 *  - photos are resized to max 1600px on the longest side and re-encoded as JPEG 0.75;
 *  - drawn signatures stay PNG (no JPEG pass, strokes would degrade);
 *  - any compression failure falls back to the original file instead of blocking the upload.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';

let counter = 0;
const uniqueSuffix = () => `${Date.now()}-${counter++}`;

function fileSize(uri) {
  try {
    const file = new File(uri);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

/**
 * Compress a picked photo.
 *
 * @param {{ uri: string, width?: number, height?: number, fileSize?: number }} asset
 *   an ImagePicker asset (or any object with a local `uri`)
 * @param {string} name - upload file name, e.g. `before-1.jpg`
 * @returns {Promise<{ uri: string, name: string, type: string, originalSize: number, compressedSize: number }>}
 */
export async function compressImage(asset, name, { maxDimension = 1600, quality = 0.75 } = {}) {
  const originalSize = asset.fileSize || fileSize(asset.uri);
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    const width = asset.width ?? 0;
    const height = asset.height ?? 0;
    if (width > maxDimension || height > maxDimension) {
      context.resize(width >= height ? { width: maxDimension } : { height: maxDimension });
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    return {
      uri: result.uri,
      name,
      type: 'image/jpeg',
      originalSize,
      compressedSize: fileSize(result.uri) || originalSize,
    };
  } catch {
    return {
      uri: asset.uri,
      name,
      type: asset.mimeType || 'image/jpeg',
      originalSize,
      compressedSize: originalSize,
    };
  }
}

/**
 * Persist a drawn signature (PNG data URL from the signature canvas) to the cache
 * directory so it can be uploaded as a multipart file part.
 *
 * @param {string} dataUrl - `data:image/png;base64,...`
 * @param {string} label - e.g. `Customer Signature` → `Customer Signature-signature.png`
 * @returns {{ uri: string, name: string, type: string }}
 */
export function saveSignatureDataUrl(dataUrl, label) {
  const base64 = String(dataUrl).replace(/^data:image\/\w+;base64,/, '');
  const file = new File(Paths.cache, `signature-${uniqueSuffix()}.png`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return { uri: file.uri, name: `${label}-signature.png`, type: 'image/png' };
}

export default {
  compressImage,
  saveSignatureDataUrl,
};
