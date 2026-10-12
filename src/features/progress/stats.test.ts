import { describe, expect, it } from '@jest/globals';

import { sumMacros, type Macros } from '@/features/diary/macros';

import { chartScale, dailyTotals, periodDays, periodSummary, shiftPeriod, type DayRow } from './stats';

const m = (kcal: number, proteinG = 0, carbsG = 0, fatG = 0): Macros => ({ kcal, proteinG, carbsG, fatG });
const row = (eatenOn: string, kcal: number, proteinG = 0): DayRow => ({ eatenOn, ...m(kcal, proteinG) });

describe('periodDays', () => {
  it('lista los días del período terminando en el día indicado', () => {
    expect(periodDays('2026-10-09', 7)).toEqual([
      '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
    ]);
  });
  it('cruza meses y años', () => {
    expect(periodDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
    expect(periodDays('2027-01-01', 2)).toEqual(['2026-12-31', '2027-01-01']);
    expect(periodDays('2026-10-09', 30)).toHaveLength(30);
    expect(periodDays('2026-10-09', 30)[0]).toBe('2026-09-10');
  });
});

describe('shiftPeriod', () => {
  const today = '2026-10-09';
  it('retrocede y avanza un período completo', () => {
    expect(shiftPeriod(today, 7, -1, today)).toBe('2026-10-02');
    expect(shiftPeriod('2026-10-02', 7, 1, today)).toBe(today);
    expect(shiftPeriod(today, 30, -1, today)).toBe('2026-09-09');
  });
  it('no pasa de hoy', () => {
    expect(shiftPeriod('2026-10-05', 7, 1, today)).toBe(today);
    expect(shiftPeriod(today, 7, 1, today)).toBe(today);
  });
});

describe('dailyTotals', () => {
  const days = ['2026-10-07', '2026-10-08', '2026-10-09'];
  it('suma por día con sumMacros y deja null los días sin registros', () => {
    const rows = [row('2026-10-07', 500, 30), row('2026-10-09', 300, 10), row('2026-10-07', 250.5, 12.3)];
    const daily = dailyTotals(rows, days);
    expect(daily.map((d) => d.date)).toEqual(days);
    expect(daily[0].totals).toEqual(sumMacros([rows[0], rows[2]]));
    expect(daily[1].totals).toBeNull();
    expect(daily[2].totals).toEqual(sumMacros([rows[1]]));
  });
  it('ignora filas fuera del período', () => {
    expect(dailyTotals([row('2026-10-01', 900)], days).every((d) => d.totals === null)).toBe(true);
  });
});

describe('periodSummary', () => {
  const goals = m(2000, 120, 250, 60);
  const daily = [
    { date: 'a', totals: m(2000, 100) },
    { date: 'b', totals: null },
    { date: 'c', totals: m(2200, 140) }, // +10 %: borde, cuenta
    { date: 'd', totals: m(1799, 80) }, // −10,05 %: no cuenta
  ];

  it('promedia solo los días con registros y cuenta días dentro de la meta', () => {
    const s = periodSummary(daily, goals);
    expect(s.daysTotal).toBe(4);
    expect(s.daysLogged).toBe(3);
    expect(s.average?.kcal).toBeCloseTo(1999.67, 2);
    expect(s.average?.proteinG).toBeCloseTo(106.67, 2);
    expect(s.daysWithinGoal).toBe(2);
  });

  it('sin meta no cuenta días dentro de la meta', () => {
    expect(periodSummary(daily, null).daysWithinGoal).toBeNull();
    expect(periodSummary(daily, m(0)).daysWithinGoal).toBeNull();
  });

  it('sin registros no hay promedio', () => {
    const s = periodSummary([{ date: 'a', totals: null }], goals);
    expect(s).toEqual({ daysTotal: 1, daysLogged: 0, average: null, daysWithinGoal: 0 });
  });
});

describe('chartScale', () => {
  it('incluye el valor más alto con margen y usa marcas redondeadas', () => {
    expect(chartScale([1850, null, 2400], 2000)).toEqual({ max: 3000, ticks: [1000, 2000, 3000] });
    expect(chartScale([95, 120], null)).toEqual({ max: 150, ticks: [50, 100, 150] });
  });
  it('incluye la meta aunque los valores sean menores', () => {
    const s = chartScale([800], 2759);
    expect(s.max).toBeGreaterThanOrEqual(2759 * 1.1);
    expect(s).toEqual({ max: 3600, ticks: [1200, 2400, 3600] });
  });
  it('usa pasos de 2,5 cuando corresponde', () => {
    expect(chartScale([60], null)).toEqual({ max: 75, ticks: [25, 50, 75] });
  });
  it('sin datos ni meta devuelve una escala mínima', () => {
    expect(chartScale([null, null], null)).toEqual({ max: 3, ticks: [1, 2, 3] });
  });
});
