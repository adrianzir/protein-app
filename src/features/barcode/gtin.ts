// Spec 002 · Códigos de barras GTIN (EAN-13, EAN-8, UPC-A, UPC-E). Diseño §2.

/** Tipos que se leen con la cámara (sin QR, R1.2). */
export const SCAN_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;
export type ScanBarcodeType = (typeof SCAN_BARCODE_TYPES)[number];

const DIGITS = /^\d+$/;

/** Dígito verificador GS1 (módulo 10, pesos 3-1 desde la derecha) para el código sin su último dígito. */
export function gs1CheckDigit(payload: string): number {
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const digit = payload.charCodeAt(payload.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

const hasValidCheckDigit = (code: string) =>
  gs1CheckDigit(code.slice(0, -1)) === Number(code[code.length - 1]);

/** Solo dígitos, largo 8/12/13 y dígito verificador correcto (R1.5, R5.2). */
export function isValidGtin(code: string): boolean {
  return DIGITS.test(code) && [8, 12, 13].includes(code.length) && hasValidCheckDigit(code);
}

/**
 * Expande un UPC-E (8 dígitos: sistema 0/1 + 6 dígitos + verificador) a UPC-A (12 dígitos)
 * según las reglas GS1. Devuelve null si no es un UPC-E válido.
 */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const ns = code[0];
  const d = code.slice(1, 7);
  const check = code[7];
  const last = Number(d[5]);

  let body: string;
  if (last <= 2) body = `${d[0]}${d[1]}${d[5]}0000${d[2]}${d[3]}${d[4]}`;
  else if (last === 3) body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
  else if (last === 4) body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
  else body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${d[5]}`;

  const upcA = `${ns}${body}${check}`;
  return hasValidCheckDigit(upcA) ? upcA : null;
}

/**
 * GTIN canónico para guardar y buscar: EAN-13 o EAN-8. UPC-A (12) → EAN-13 con "0" delante;
 * UPC-E → UPC-A → EAN-13. Así un mismo producto coincide aunque el teléfono lo lea distinto.
 * Devuelve null si el código no es válido.
 */
export function normalizeGtin(raw: string, type?: string): string | null {
  const code = raw.replace(/\s+/g, '');
  if (!DIGITS.test(code)) return null;

  if (type === 'upc_e') {
    const upcA = expandUpcE(code);
    return upcA ? `0${upcA}` : null;
  }

  if (code.length === 8) {
    if (isValidGtin(code)) return code; // EAN-8
    const upcA = expandUpcE(code); // UPC-E escrito a mano
    return upcA ? `0${upcA}` : null;
  }
  if (code.length === 12) return isValidGtin(code) ? `0${code}` : null;
  if (code.length === 13) return isValidGtin(code) ? code : null;
  return null;
}

/** GTIN canónico recibido como parámetro de ruta; undefined si falta o no es canónico. */
export function parseBarcodeParam(raw: string | string[] | undefined): string | undefined {
  if (typeof raw !== 'string') return undefined;
  return normalizeGtin(raw) === raw ? raw : undefined;
}
