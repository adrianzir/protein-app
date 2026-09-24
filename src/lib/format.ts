/** Entero redondeado, para kcal y macros en resúmenes. */
export const formatInt = (n: number) => String(Math.round(n));

/** Gramos con hasta 1 decimal, sin ".0" sobrante: 150 → "150", 12.25 → "12.3". */
export function formatGrams(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Interpreta un número escrito por el usuario; acepta coma o punto decimal ("12,5" → 12.5).
 * Devuelve null si está vacío o no es un número válido.
 */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t);
}

/** Texto para un campo numérico a partir de un número guardado. */
export const decimalToText = (n: number | null | undefined) => (n == null ? '' : formatGrams(n));
