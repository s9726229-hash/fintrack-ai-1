import type { PortableFinancialData } from './model';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, nestedValue]) => [key, sortKeys(nestedValue)]),
  );
}

export async function sha256Snapshot(snapshot: PortableFinancialData): Promise<string> {
  const serialized = JSON.stringify(sortKeys(snapshot));
  const bytes = new TextEncoder().encode(serialized);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
