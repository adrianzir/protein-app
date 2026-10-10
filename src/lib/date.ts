// Fechas de calendario como 'YYYY-MM-DD' en la zona horaria LOCAL del dispositivo (diseño D4).

export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

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

/** Día de la semana abreviado: "lun". */
export function formatWeekdayShort(iso: ISODate): string {
  return WEEKDAYS[fromISODate(iso).getDay()];
}

/** Fecha completa para lectores de pantalla: "jueves 9 de octubre" (con año si no es el actual). */
export function formatDayLong(iso: ISODate, today: ISODate = toLocalISODate()): string {
  const d = fromISODate(iso);
  const label = `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
  return iso.slice(0, 4) === today.slice(0, 4) ? label : `${label} de ${d.getFullYear()}`;
}

/** Rango de fechas: "3–9 oct", "28 sep – 4 oct" o "29 dic 2025 – 4 ene 2026". */
export function formatPeriodLabel(start: ISODate, end: ISODate, today: ISODate = toLocalISODate()): string {
  const a = fromISODate(start);
  const b = fromISODate(end);
  const thisYear = today.slice(0, 4);
  if (start.slice(0, 4) !== end.slice(0, 4) || end.slice(0, 4) !== thisYear) {
    return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  }
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}
