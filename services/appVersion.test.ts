import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './appVersion';

describe('APP_VERSION', () => {
  it('matches package.json and the planned release', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.version).toBe('7.12.1');
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('keeps runtime metadata aligned with the shared package version', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const metadata = JSON.parse(readFileSync('metadata.json', 'utf8'));
    const visibleMetadata = `${metadata.name} ${metadata.description}`;
    const mentionedVersions = [...visibleMetadata.matchAll(/\b[Vv]?(\d+\.\d+\.\d+)\b/g)]
      .map((match) => match[1]);

    expect(metadata.name).toContain(`v${pkg.version}`);
    expect(new Set(mentionedVersions)).toEqual(new Set([pkg.version]));
  });
});
