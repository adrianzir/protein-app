/** Normaliza texto para buscar: minúsculas, sin tildes ni diéresis y espacios colapsados (R3.2). */
export function normalizeSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
