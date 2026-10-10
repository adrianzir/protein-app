import { Alert, Platform } from 'react-native';

/** Confirmación con Cancelar; en web Alert no admite botones, se usa window.confirm. */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  style: 'default' | 'destructive' = 'default',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style, onPress: () => resolve(true) },
    ]);
  });
}

/** Confirmación destructiva (eliminar). */
export function confirmDestructive(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return confirmAction(title, message, confirmLabel, 'destructive');
}

/** Mensaje legible de un error de Supabase o de red. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
