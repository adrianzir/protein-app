import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fromISODate, isValidISODate, toLocalISODate, type ISODate } from '@/lib/date';

import { TextField } from './TextField';
import { colors, font, MIN_TOUCH, radius, spacing } from './theme';

type Props = {
  label: string;
  value: ISODate | null;
  onChange: (value: ISODate) => void;
  maximumDate?: Date;
  error?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');
const formatDMY = (iso: ISODate) => {
  const d = fromISODate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/**
 * Fecha con selector nativo: diálogo en Android, rueda en iOS. En web (solo pruebas)
 * se escribe como AAAA-MM-DD porque el selector nativo no existe.
 */
export function DateField({ label, value, onChange, maximumDate, error }: Props) {
  const [open, setOpen] = useState(false);
  const [webText, setWebText] = useState(value ?? '');

  if (Platform.OS === 'web') {
    return (
      <TextField
        label={label}
        placeholder="AAAA-MM-DD"
        value={webText}
        onChangeText={(t) => {
          setWebText(t);
          if (isValidISODate(t)) onChange(t);
        }}
        error={error}
      />
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(toLocalISODate(date));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDMY(value) : 'sin elegir'}`}
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text style={value ? styles.value : styles.placeholder}>{value ? formatDMY(value) : 'Elegir fecha'}</Text>
      </Pressable>
      {open ? (
        <View>
          <DateTimePicker
            mode="date"
            value={value ? fromISODate(value) : new Date(1995, 0, 1)}
            maximumDate={maximumDate}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="es"
            onChange={handleChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={styles.done}>
              <Text style={styles.doneText}>Listo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  field: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  fieldError: { borderColor: colors.danger },
  value: { fontSize: font.body, color: colors.text },
  placeholder: { fontSize: font.body, color: colors.muted },
  done: { alignSelf: 'flex-end', padding: spacing.sm },
  doneText: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  error: { color: colors.danger, fontSize: font.small },
});
