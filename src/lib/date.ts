// Fechas de calendario como 'YYYY-MM-DD' en la zona horaria LOCAL del dispositivo (diseño D4).

export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalISODate(date: Date = new Date()): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidISODate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const d = fromISODate(value);
  return toLocalISODate(d) === value;
}

/** Fecha local a mediodía: evita saltos de día por cambios de horario (DST a medianoche). */
export function fromISODate(iso: ISODate): Date {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Fecha inválida: ${iso}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

export function isFuture(iso: ISODate, today: ISODate = toLocalISODate()): boolean {
  return iso > today;
}

/** "Hoy", "Ayer" o "lun 22 sep" (con año si no es el año actual). */
export function formatDayLabel(iso: ISODate, today: ISODate = toLocalISODate()): string {
  if (iso === today) return 'Hoy';
  if (iso === addDays(today, -1)) return 'Ayer';
  const d = fromISODate(iso);
  const label = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return iso.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${d.getFullYear()}`;
}
