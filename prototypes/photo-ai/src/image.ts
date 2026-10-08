import sharp from 'sharp';

// Igual que hará la app (PLAN §3): lado mayor ≤ 1024 px, JPEG, para acotar costo y tiempo de subida.
export const MAX_SIDE = 1024;

export type PreparedImage = { base64: string; bytes: number; width: number; height: number };

export async function prepareImage(path: string): Promise<PreparedImage> {
  const { data, info } = await sharp(path)
    .rotate() // respeta la orientación EXIF de las fotos del teléfono
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { base64: data.toString('base64'), bytes: data.length, width: info.width, height: info.height };
}
