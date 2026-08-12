import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './appVersion';

describe('APP_VERSION', () => {
  it('matches package.json and the planned release', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.version).toBe('7.12.0');
    expect(APP_VERSION).toBe(pkg.version);
  });
});
