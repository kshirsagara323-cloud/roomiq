import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getStorageInstance, IMAGE_MODE } from './firebase';

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PER_LISTING = IMAGE_MODE === 'storage' ? 6 : 4;
const INLINE_BUDGET = 180000; // characters per photo when photos are kept inside Firestore (1 MiB doc limit)

async function toCanvas(file, maxSide) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const blobOf = (canvas, q) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
const dataUrlOf = (canvas, q) => canvas.toDataURL('image/jpeg', q);

export function validateFiles(files) {
  for (const f of files) {
    if (!OK_TYPES.includes(f.type)) throw new Error(`"${f.name}" is not a JPG, PNG or WebP image.`);
    if (f.size > 10 * 1024 * 1024) throw new Error(`"${f.name}" is larger than 10 MB.`);
  }
}

// Returns an array of URLs (Firebase Storage) or data URLs (free Firestore mode)
export async function processImages(files, uid, propertyId) {
  validateFiles(files);
  const out = [];
  for (const file of files) {
    if (IMAGE_MODE === 'storage') {
      const canvas = await toCanvas(file, 1600);
      const blob = await blobOf(canvas, 0.82);
      const r = ref(getStorageInstance(), `properties/${uid}/${propertyId}/${crypto.randomUUID()}.jpg`);
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      out.push(await getDownloadURL(r));
    } else {
      const canvas = await toCanvas(file, 960);
      let url = '';
      for (const q of [0.72, 0.58, 0.45, 0.32]) {
        url = dataUrlOf(canvas, q);
        if (url.length <= INLINE_BUDGET) break;
      }
      if (url.length > INLINE_BUDGET) throw new Error(`"${file.name}" is too detailed to compress. Try a smaller photo.`);
      out.push(url);
    }
  }
  return out;
}

// best-effort cleanup when a photo is removed or a listing is deleted
export async function removeImages(urls) {
  if (IMAGE_MODE !== 'storage') return;
  await Promise.all(
    urls
      .filter((u) => u.startsWith('https://firebasestorage.googleapis.com'))
      .map((u) => deleteObject(ref(getStorageInstance(), u)).catch(() => null)),
  );
}
