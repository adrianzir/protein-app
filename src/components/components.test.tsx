import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChipGroup } from './ChipGroup';
import { DayNavigator } from './DayNavigator';
import { MacroProgress } from './MacroProgress';
import { colors } from './theme';

describe('MacroProgress', () => {
  it('muestra consumido / meta sin alerta bajo la meta', async () => {
    await render(<MacroProgress label="Proteína" consumed={100.4} target={128} unit="g" color={colors.protein} />);
    expect(screen.getByText('100 / 128 g')).toBeTruthy();
    expect(screen.queryByText(/▲/)).toBeNull();
  });

  it('muestra "▲ +N" y color de alerta al superar la meta (R6.2)', async () => {
    await render(<MacroProgress label="Proteína" consumed={140.2} target={128} unit="g" color={colors.protein} />);
    expect(screen.getByText(/▲ \+12/)).toBeTruthy();
    expect(screen.getByLabelText('Proteína: 140 de 128 g, excedido por 12')).toBeTruthy();
    expect(screen.getByTestId('macro-progress-fill')).toHaveStyle({ backgroundColor: colors.danger, width: '100%' });
  });

  it('no alerta si al redondear queda igual a la meta', async () => {
    await render(<MacroProgress label="Kcal" consumed={2759.4} target={2759} unit="kcal" color={colors.kcal} />);
    expect(screen.queryByText(/▲/)).toBeNull();
  });

  it('sin meta muestra solo lo consumido', async () => {
    await render(<MacroProgress label="Kcal" consumed={500} target={null} unit="kcal" color={colors.kcal} />);
    expect(screen.getByText('500 kcal')).toBeTruthy();
  });
});

describe('DayNavigator', () => {
  const today = '2026-09-24';

  it('en hoy: ▶ desactivado y sin "Ir a hoy" (R6.4)', async () => {
    const onChange = jest.fn();
    await render(<DayNavigator date={today} today={today} onChange={onChange} />);
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.queryByText('Ir a hoy')).toBeNull();
    expect(screen.getByLabelText('Día siguiente')).toBeDisabled();
  });

  it('◀ va al día anterior; en días pasados permite volver a hoy', async () => {
    const onChange = jest.fn();
    await render(<DayNavigator date="2026-09-22" today={today} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Día anterior'));
    expect(onChange).toHaveBeenLastCalledWith('2026-09-21');
    await fireEvent.press(screen.getByLabelText('Día siguiente'));
    expect(onChange).toHaveBeenLastCalledWith('2026-09-23');
    await fireEvent.press(screen.getByText('Ir a hoy'));
    expect(onChange).toHaveBeenLastCalledWith(today);
  });
});

describe('ChipGroup', () => {
  it('marca la opción elegida y notifica cambios', async () => {
    const onChange = jest.fn();
    await render(
      <ChipGroup
        label="Objetivo"
        options={[
          { value: 'lose', label: 'Bajar' },
          { value: 'gain', label: 'Subir' },
        ]}
        value="lose"
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('Bajar')).toBeChecked();
    expect(screen.getByLabelText('Subir')).not.toBeChecked();
    await fireEvent.press(screen.getByLabelText('Subir'));
    expect(onChange).toHaveBeenCalledWith('gain');
  });
});
