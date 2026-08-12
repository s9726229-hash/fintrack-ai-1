import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { beforeEach } from 'vitest';

export const ensureWebCrypto = () => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto,
    });
  }
};

ensureWebCrypto();

beforeEach(() => {
  localStorage.clear();
});
