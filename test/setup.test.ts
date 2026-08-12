import { describe, expect, it } from 'vitest';
import { ensureWebCrypto } from './setup';

describe('ensureWebCrypto', () => {
  it('installs Node webcrypto when crypto is absent', () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });

    try {
      ensureWebCrypto();
      expect(globalThis.crypto?.subtle).toBeDefined();
    } finally {
      if (cryptoDescriptor) {
        Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'crypto');
      }
    }
  });
});
