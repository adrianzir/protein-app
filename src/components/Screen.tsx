import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from './theme';

type Props = PropsWithChildren<{
  /** Sin scroll, para pantallas con su propia lista. */
  scroll?: boolean;
  /** Bordes con área segura; con header de navegación basta ['bottom', 'left', 'right']. */
  edges?: Edge[];
  /** Alto del header, para que el teclado no tape el contenido en iOS (R8.3). */
  keyboardOffset?: number;
  contentStyle?: ViewStyle;
}>;

export function Screen({
  children,
  scroll = true,
  edges = ['bottom', 'left', 'right'],
  keyboardOffset = 0,
  contentStyle,
}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
});
