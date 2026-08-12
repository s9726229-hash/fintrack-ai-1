import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { beforeEach } from 'vitest';

if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  });
}

beforeEach(() => {
  localStorage.clear();
});
