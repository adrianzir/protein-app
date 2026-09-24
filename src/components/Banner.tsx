import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, font } from './theme';

type Props = {
  message: string;
  variant?: 'info' | 'error';
  actionLabel?: string;
  onAction?: () => void;
};

/** Aviso no bloqueante (perfil incompleto, error de red, OFF no disponible). */
export function Banner({ message, variant = 'info', actionLabel, onAction }: Props) {
  const palette = variant === 'error' ? errorPalette : infoPalette;
  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.fg }]}
      accessibilityRole={variant === 'error' ? 'alert' : 'summary'}
    >
      <Text style={[styles.message, { color: palette.fg }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.action, { color: palette.fg }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const infoPalette = { bg: colors.infoBg, fg: colors.info };
const errorPalette = { bg: colors.dangerBg, fg: colors.danger };

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: { flex: 1, fontSize: font.small },
  action: { fontWeight: '700', fontSize: font.small },
});
