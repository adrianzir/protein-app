import { describe, expect, it } from '@jest/globals';

import { validateCredentials } from './validation';

describe('validateCredentials', () => {
  it('acepta credenciales válidas', () => {
    expect(validateCredentials(' ana@mail.com ', '12345678')).toBeNull();
  });

  it('rechaza correos inválidos', () => {
    expect(validateCredentials('ana@', '12345678')).toMatch(/correo/);
  });

  it('rechaza contraseñas cortas', () => {
    expect(validateCredentials('ana@mail.com', '123')).toMatch(/contraseña/);
  });
});
