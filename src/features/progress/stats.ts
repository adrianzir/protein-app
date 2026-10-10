import { sumMacros, type Macros } from '@/features/diary/macros';
import { addDays, type ISODate } from '@/lib/date';

// Spec 004 · R4, R5: cálculos de la pantalla Progreso.

export const PERIOD_LENGTHS = [7, 30] as const;
export type PeriodLength = (typeof PERIOD_LENGTHS)[number];

export type Metric = keyof Macros;

/** Margen para contar un día "dentro de la meta" de calorías (Q3: ±10 %). */
export const GOAL_TOLERANCE = 0.1;

/** Días del período que termina en `end`, del más antiguo al más nuevo (R5.1). */
export function periodDays(end: ISODate, length: number): ISODate[] {
  return Array.from({ length }, (_, i) => addDays(end, i - length + 1));
}

/** Fin del período anterior (`-1`) o siguiente (`1`), sin pasar de hoy (R4.2). */
export function shiftPeriod(end: ISODate, length: number, dir: -1 | 1, today: ISODate): ISODate {
  const next = addDays(end, dir * length);
  return next > today ? today : next;
}

export type DayRow = Macros & { eatenOn: ISODate };
export type DayTotals = { date: ISODate; totals: Macros | null };

/** Totales por día con la misma suma que Hoy; `null` si el día no tiene registros (R4.6, R5.3). */
export function dailyTotals(rows: readonly DayRow[], days: readonly ISODate[]): DayTotals[] {
  const byDay = new Map<ISODate, DayRow[]>();
  for (const row of rows) byDay.set(row.eatenOn, [...(byDay.get(row.eatenOn) ?? []), row]);
  return days.map((date) => {
    const items = byDay.get(date);
    return { date, totals: items ? sumMacros(items) : null };
  });
}

export type PeriodSummary = {
  daysTotal: number;
  daysLogged: number;
  /** Promedio diario de los días con registros; `null` si no hay ninguno. */
  average: Macros | null;
  /** Días con calorías dentro de ±10 % de la meta; `null` sin meta. */
  daysWithinGoal: number | null;
};

export function periodSummary(daily: readonly DayTotals[], goals: Macros | null): PeriodSummary {
  const logged = daily.flatMap((d) => (d.totals ? [d.totals] : []));
  const total = sumMacros(logged);
  const n = logged.length;
  const average =
    n === 0 ? null : { kcal: total.kcal / n, proteinG: total.proteinG / n, carbsG: total.carbsG / n, fatG: total.fatG / n };
  const goal = goals?.kcal;
  const daysWithinGoal =
    goal && goal > 0 ? logged.filter((t) => Math.abs(t.kcal - goal) <= goal * GOAL_TOLERANCE).length : null;
  return { daysTotal: daily.length, daysLogged: n, average, daysWithinGoal };
}

export type ChartScale = { max: number; ticks: number[] };

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const TICK_COUNT = 3;

/** Escala del eje: incluye la meta, deja 10 % de margen y usa 3 marcas redondeadas. */
export function chartScale(values: readonly (number | null)[], goal: number | null): ChartScale {
  const top = Math.max(0, goal ?? 0, ...values.map((v) => v ?? 0)) * 1.1;
  const rough = top > 0 ? top / TICK_COUNT : 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = magnitude * (NICE_STEPS.find((s) => s * magnitude >= rough) ?? 10);
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => step * (i + 1));
  return { max: ticks[TICK_COUNT - 1], ticks };
}
