import { TextField, type TextFieldProps } from './TextField';

type Props = Omit<TextFieldProps, 'keyboardType' | 'inputMode'>;

/**
 * Campo numérico con teclado decimal (R8.3). El valor se maneja como texto para permitir
 * estados intermedios ("12,"); se convierte con `parseDecimal` al validar.
 */
export function NumberField(props: Props) {
  return <TextField keyboardType="decimal-pad" inputMode="decimal" {...props} />;
}
