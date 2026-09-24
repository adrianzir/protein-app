// Tokens de diseño (diseño §6). Estilos con StyleSheet nativo, sin librería de UI.

export const colors = {
  primary: '#16a34a',
  primaryPressed: '#15803d',
  onPrimary: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  border: '#d1d5db',
  track: '#e5e7eb',
  surface: '#ffffff',
  background: '#f9fafb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#1d4ed8',
  infoBg: '#eff6ff',
  // Un color por macro, usado en barras y etiquetas.
  kcal: '#16a34a',
  protein: '#2563eb',
  carbs: '#d97706',
  fat: '#9333ea',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 10, pill: 999 } as const;

export const font = {
  small: 13,
  body: 16,
  title: 18,
  large: 24,
} as const;

/** Área táctil mínima recomendada (iOS 44 pt, Android 48 dp). */
export const MIN_TOUCH = 44;
