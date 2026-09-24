const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/** Devuelve un mensaje de error o null si las credenciales son válidas. */
export function validateCredentials(email: string, password: string): string | null {
  if (!EMAIL_RE.test(email.trim())) return 'Ingresa un correo válido.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

/** Resultado de validar un formulario: el valor limpio o errores por campo. */
export type ValidationResult<T, E> = { ok: true; value: T } | { ok: false; errors: E };
