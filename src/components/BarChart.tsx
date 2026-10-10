import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { chartScale } from '@/features/progress/stats';

import { colors, font, spacing } from './theme';

// Spec 004 · R4.3, R4.6, R4.7, R6.4: gráfico de barras de Progreso (una serie + línea de meta).

export type BarDatum = {
  date: string;
  /** `null` = día sin registros: sin barra, con un punto en la base (R4.6). */
  value: number | null;
  /** Etiqueta corta del eje X ("lun", "6"). */
  label: string;
  /** Texto para lectores de pantalla ("lunes 6 de octubre: 1850 kcal"). */
  accessibilityLabel: string;
};

type Props = {
  data: readonly BarDatum[];
  goal: number | null;
  color: string;
  /** Resumen del período en texto, alternativa accesible al gráfico (R6.4). */
  summary: string;
  onPressDay: (date: string) => void;
  /** Muestra la etiqueta del eje X cada N días (30 días: cada 5). */
  labelEvery?: number;
  height?: number;
};

const AXIS_WIDTH = 40;
const LABEL_HEIGHT = 20;
const TOP_PADDING = 8;
const MAX_BAR_WIDTH = 24;
const BAR_RADIUS = 4;

/** Barra con el extremo de datos redondeado (4 px) y la base recta. */
export function barPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(BAR_RADIUS, width / 2, height);
  const bottom = y + height;
  return [
    `M${x},${bottom}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${bottom}`,
    'Z',
  ].join(' ');
}

/** Marcas del eje: compactas desde mil ("1,2k"). */
export function formatTick(value: number): string {
  if (value < 1000) return String(Math.round(value * 10) / 10).replace('.', ',');
  return `${String(Math.round(value / 100) / 10).replace('.', ',')}k`;
}

export function BarChart({ data, goal, color, summary, onPressDay, labelEvery = 1, height = 180 }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const scale = chartScale(data.map((d) => d.value), goal);
  const plotWidth = Math.max(0, width - AXIS_WIDTH);
  const plotHeight = height - TOP_PADDING;
  const y = (v: number) => TOP_PADDING + plotHeight - (v / scale.max) * plotHeight;
  const column = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.min(MAX_BAR_WIDTH, column * 0.6);

  return (
    <View style={styles.container} onLayout={onLayout} testID="bar-chart">
      <View style={{ height }}>
        {/* El dibujo es una sola imagen para el lector de pantalla, con el resumen del período (R6.4) */}
        <View style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel={summary}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              {/* Cuadrícula recesiva: líneas finas y sólidas en las marcas */}
              {scale.ticks.map((t) => (
                <Line key={t} x1={AXIS_WIDTH} x2={width} y1={y(t)} y2={y(t)} stroke={colors.track} strokeWidth={1} />
              ))}
              <Line x1={AXIS_WIDTH} x2={width} y1={y(0)} y2={y(0)} stroke={colors.border} strokeWidth={1} />
              {data.map((d, i) => {
                const cx = AXIS_WIDTH + column * i + column / 2;
                if (d.value === null) {
                  return <Circle key={d.date} cx={cx} cy={y(0) - 3} r={3} fill={colors.border} testID="bar-empty" />;
                }
                const top = y(d.value);
                return (
                  <Path
                    key={d.date}
                    d={barPath(cx - barWidth / 2, top, barWidth, y(0) - top)}
                    fill={color}
                    testID="bar"
                  />
                );
              })}
              {goal ? (
                <Line
                  x1={AXIS_WIDTH}
                  x2={width}
                  y1={y(goal)}
                  y2={y(goal)}
                  stroke={colors.text}
                  strokeWidth={1.5}
                  testID="goal-line"
                />
              ) : null}
            </Svg>
          ) : null}

          {/* Textos del eje y de la meta en tinta de texto, nunca en el color de la serie */}
          {width > 0
            ? scale.ticks.map((t) => (
                <Text key={t} style={[styles.tick, { top: y(t) - 8 }]} importantForAccessibility="no">
                  {formatTick(t)}
                </Text>
              ))
            : null}
          {width > 0 && goal ? (
            <Text style={[styles.goalLabel, { top: Math.max(0, y(goal) - 18) }]} importantForAccessibility="no">
              Meta {formatTick(goal)}
            </Text>
          ) : null}
        </View>

        {/* Zonas táctiles: la columna completa de cada día, más grande que la barra (R4.7) */}
        <View style={[styles.hitRow, { left: AXIS_WIDTH, height }]}>
          {data.map((d) => (
            <Pressable
              key={d.date}
              onPress={() => onPressDay(d.date)}
              accessibilityRole="button"
              accessibilityLabel={d.accessibilityLabel}
              style={styles.hit}
            />
          ))}
        </View>
      </View>

      <View style={[styles.labels, { marginLeft: AXIS_WIDTH }]} importantForAccessibility="no-hide-descendants">
        {data.map((d, i) => (
          <Text key={d.date} style={styles.label} numberOfLines={1}>
            {i % labelEvery === 0 || i === data.length - 1 ? d.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  tick: {
    position: 'absolute',
    left: 0,
    width: AXIS_WIDTH - spacing.xs,
    textAlign: 'right',
    fontSize: 11,
    color: colors.muted,
  },
  goalLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  hitRow: { position: 'absolute', top: 0, right: 0, flexDirection: 'row' },
  hit: { flex: 1 },
  labels: { flexDirection: 'row', height: LABEL_HEIGHT },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: font.small - 2,
    color: colors.muted,
  },
});
