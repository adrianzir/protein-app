import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function TodayScreen() {
  const { session } = useAuth();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Hoy' }} />
      <Text style={styles.text}>Hola, {session?.user.email}</Text>
      <Text style={styles.muted}>Aquí irá tu resumen diario de macros (Fase 1).</Text>
      <Pressable onPress={() => supabase.auth.signOut()}>
        <Text style={styles.link}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { fontSize: 18, fontWeight: '600' },
  muted: { color: '#666', textAlign: 'center' },
  link: { color: '#16a34a', padding: 8 },
});
