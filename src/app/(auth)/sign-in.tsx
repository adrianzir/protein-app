import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { validateCredentials } from '@/lib/validation';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(mode: 'signIn' | 'signUp') {
    const error = validateCredentials(email, password);
    if (error) return Alert.alert('Revisa tus datos', error);

    setBusy(true);
    const credentials = { email: email.trim(), password };
    const result =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setBusy(false);

    if (result.error) return Alert.alert('Error', result.error.message);
    if (mode === 'signUp' && !result.data.session) {
      Alert.alert('Revisa tu correo', 'Te enviamos un enlace para confirmar tu cuenta.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Protein App</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} disabled={busy} onPress={() => submit('signIn')}>
        <Text style={styles.buttonText}>{busy ? 'Cargando…' : 'Ingresar'}</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => submit('signUp')}>
        <Text style={styles.link}>Crear cuenta</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: '#16a34a', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#16a34a', textAlign: 'center', padding: 8 },
});
