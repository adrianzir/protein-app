import { Stack } from 'expo-router';

import { colors } from '@/components/theme';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="food-search" options={{ title: 'Buscar alimento', presentation: 'modal' }} />
      <Stack.Screen name="food-new" options={{ title: 'Nuevo alimento', presentation: 'modal' }} />
      <Stack.Screen name="log/new" options={{ title: 'Registrar', presentation: 'modal' }} />
      <Stack.Screen name="log/[id]" options={{ title: 'Editar registro', presentation: 'modal' }} />
    </Stack>
  );
}
