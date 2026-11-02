import { uploadsApi } from '../api/endpoints';

const MAX_SIDE = 2048;
const QUALITY = 0.8;

// Opens the system picker (on iOS: camera or photo library).
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    let settled = false;
    const done = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', () => done(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => done(null));
    document.body.appendChild(input);
    input.click();
  });
}

// Shrinks the photo in the browser before uploading (longest side 2048 px,
// JPEG 0.8): saves space and data, and turns HEIC into JPEG. If the browser
// can't decode the file, the original is uploaded as-is (the server accepts
// jpeg/png/webp/heic).
async function shrink(file: File): Promise<{ blob: Blob; name: string }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('no blob');
    return { blob, name: 'photo.jpg' };
  } catch {
    return { blob: file, name: file.name || 'photo.jpg' };
  }
}

export async function uploadImageFile(file: File): Promise<string> {
  const { blob, name } = await shrink(file);
  const { url } = await uploadsApi.upload(blob, name);
  return url;
}
