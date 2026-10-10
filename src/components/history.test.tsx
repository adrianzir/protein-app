import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { FoodRef } from '@/features/foods/types';

import { BarChart, barPath, formatTick, type BarDatum } from './BarChart';
import { FoodRow } from './FoodRow';
import { MealSection } from './MealSection';
import { colors } from './theme';

const food: FoodRef = {
  source: 'catalog',
  id: 'c1',
  name: 'Palta',
  brand: 'Hass',
  per100g: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
};

describe('FoodRow (Spec 004 · T11)', () => {
  it('sin extras se ve como antes', async () => {
    await render(<FoodRow food={food} onPress={() => {}} />);
    expect(screen.queryByTestId('food-row-star')).toBeNull();
    expect(screen.getByLabelText('Palta, Hass, 160 kcal / 100 g')).toBeTruthy();
  });

  it('muestra subtítulo y estrella de favorito, también para el lector de pantalla', async () => {
    const onPress = jest.fn();
    await render(<FoodRow food={food} onPress={onPress} subtitle="Última vez: 150 g" favorite />);
    expect(screen.getByText('Última vez: 150 g')).toBeTruthy();
    expect(screen.getByTestId('food-row-star')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Palta, Hass, favorito, Última vez: 150 g, 160 kcal / 100 g'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('MealSection (Spec 004 · T12)', () => {
  it('ofrece repetir de ayer solo con la comida vacía', async () => {
    const onRepeat = jest.fn();
    await render(<MealSection title="Almuerzo" kcal={0} empty onAdd={() => {}} repeatCount={2} onRepeat={onRepeat} />);
    expect(screen.queryByText('Sin registros')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Repetir de ayer en Almuerzo: 2 alimentos'));
    expect(onRepeat).toHaveBeenCalled();
  });

  it('sin registros ayer muestra "Sin registros"', async () => {
    await render(<MealSection title="Cena" kcal={0} empty onAdd={() => {}} repeatCount={0} onRepeat={() => {}} />);
    expect(screen.getByText('Sin registros')).toBeTruthy();
    expect(screen.queryByText(/Repetir de ayer/)).toBeNull();
  });

  it('con registros hoy no ofrece repetir', async () => {
    await render(
      <MealSection title="Cena" kcal={300} empty={false} onAdd={() => {}} repeatCount={3} onRepeat={() => {}}>
        <Text>Pollo</Text>
      </MealSection>,
    );
    expect(screen.getByText('Pollo')).toBeTruthy();
    expect(screen.queryByText(/Repetir de ayer/)).toBeNull();
  });

  it('singular para un alimento', async () => {
    await render(<MealSection title="Snack" kcal={0} empty onAdd={() => {}} repeatCount={1} onRepeat={() => {}} />);
    expect(screen.getByLabelText('Repetir de ayer en Snack: 1 alimento')).toBeTruthy();
  });
});

describe('BarChart (Spec 004 · T13)', () => {
  const data: BarDatum[] = [
    { date: '2026-10-07', value: 1850, label: 'mar', accessibilityLabel: 'martes 7 de octubre: 1850 kcal' },
    { date: '2026-10-08', value: null, label: 'mié', accessibilityLabel: 'miércoles 8 de octubre: sin registros' },
    { date: '2026-10-09', value: 2400, label: 'jue', accessibilityLabel: 'jueves 9 de octubre: 2400 kcal' },
  ];
  const layout = async () =>
    fireEvent(screen.getByTestId('bar-chart'), 'layout', { nativeEvent: { layout: { width: 360, height: 220 } } });

  it('dibuja una barra por día con registros y un punto en los días vacíos', async () => {
    await render(<BarChart data={data} goal={2000} color={colors.kcal} summary="Resumen" onPressDay={() => {}} />);
    await layout();
    expect(screen.getAllByTestId('bar')).toHaveLength(2);
    expect(screen.getAllByTestId('bar-empty')).toHaveLength(1);
    expect(screen.getByTestId('goal-line')).toBeTruthy();
    expect(screen.getByText('Meta 2k')).toBeTruthy();
    expect(screen.getByText('3k')).toBeTruthy(); // marca superior de la escala
  });

  it('sin meta no dibuja la línea', async () => {
    await render(<BarChart data={data} goal={null} color={colors.kcal} summary="Resumen" onPressDay={() => {}} />);
    await layout();
    expect(screen.queryByTestId('goal-line')).toBeNull();
    expect(screen.queryByText(/Meta/)).toBeNull();
  });

  it('tiene un resumen accesible y cada día es un botón que abre ese día (R4.7, R6.4)', async () => {
    const onPressDay = jest.fn();
    await render(
      <BarChart data={data} goal={2000} color={colors.kcal} summary="Promedio 2125 kcal" onPressDay={onPressDay} />,
    );
    await layout();
    expect(screen.getByLabelText('Promedio 2125 kcal')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('miércoles 8 de octubre: sin registros'));
    expect(onPressDay).toHaveBeenCalledWith('2026-10-08');
  });

  it('muestra etiquetas del eje X cada N días y siempre la última', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      value: 100,
      label: String(i + 1),
      accessibilityLabel: `día ${i + 1}`,
    }));
    await render(
      <BarChart data={many} goal={null} color={colors.kcal} summary="R" onPressDay={() => {}} labelEvery={5} />,
    );
    await layout();
    // Las etiquetas están ocultas para el lector de pantalla: cada botón ya nombra su día.
    const hidden = { includeHiddenElements: true };
    for (const shown of ['1', '6', '11', '12']) expect(screen.getByText(shown, hidden)).toBeTruthy();
    expect(screen.queryByText('2', hidden)).toBeNull();
  });
});

describe('barPath', () => {
  it('redondea solo el extremo de datos y deja la base recta', () => {
    expect(barPath(10, 20, 24, 100)).toBe('M10,120 L10,24 Q10,20 14,20 L30,20 Q34,20 34,24 L34,120 Z');
  });
  it('no redondea más que la mitad del ancho ni que la altura', () => {
    expect(barPath(0, 0, 4, 1)).toBe('M0,1 L0,1 Q0,0 1,0 L3,0 Q4,0 4,1 L4,1 Z');
  });
});

describe('formatTick', () => {
  it('compacta desde mil con coma decimal', () => {
    expect(formatTick(0)).toBe('0');
    expect(formatTick(150)).toBe('150');
    expect(formatTick(2.5)).toBe('2,5');
    expect(formatTick(1000)).toBe('1k');
    expect(formatTick(1200)).toBe('1,2k');
    expect(formatTick(3600)).toBe('3,6k');
  });
});
