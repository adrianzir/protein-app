import { describe, expect, it } from '@jest/globals';

import { normalizeSearch } from './text';

describe('normalizeSearch', () => {
  it('quita tildes, diéresis y mayúsculas', () => {
    expect(normalizeSearch('Plátano')).toBe('platano');
    expect(normalizeSearch('PINGÜINO Ñandú')).toBe('pinguino nandu');
  });

  it('colapsa y recorta espacios', () => {
    expect(normalizeSearch('  pan   de\tmolde ')).toBe('pan de molde');
  });

  it('devuelve cadena vacía para solo espacios', () => {
    expect(normalizeSearch('   ')).toBe('');
  });
});
