import { DEVICE_STORAGE_KEYS } from '../../constants';

export interface BackupStatus { exportedAt?: string; cloudAt?: string }
const key = 'ft_backup_status';
export function readBackupStatus(storage: Pick<Storage, 'getItem'>): BackupStatus {
  try {
    const value = JSON.parse(storage.getItem(key) || '{}');
    if (!value || typeof value !== 'object') return {};
    const result: BackupStatus = {};
    for (const field of ['exportedAt', 'cloudAt'] as const) {
      if (typeof value[field] === 'string' && Number.isFinite(Date.parse(value[field]))) result[field] = value[field];
    }
    return result;
  } catch { return {}; }
}
export function recordBackup(storage: Pick<Storage, 'getItem' | 'setItem'>, field: keyof BackupStatus, date = new Date()) {
  storage.setItem(key, JSON.stringify({ ...readBackupStatus(storage), [field]: date.toISOString() }));
}
export function needsBackupReminder(status: BackupStatus, now = new Date()) {
  const times = Object.values(status).map(value => Date.parse(value)).filter(time => Number.isFinite(time) && time <= now.getTime());
  return !times.length || now.getTime() - Math.max(...times) >= 7 * 24 * 60 * 60 * 1000;
}
const retiredNames = new Set([
  'etfAdditionalBuyBias', 'etfStrongAdditionalBuyBias',
  ...['largeCap', 'smallCap'].flatMap(prefix => ['BiasMax', 'BiasMin', 'CoolDownDays', 'RsiMax', 'RsiMin'].map(suffix => `${prefix}TrendAdd${suffix}`)),
]);
export function groupIgnoredFields(keys: string[]) {
  const groups = { device: [] as string[], retired: [] as string[], unknown: [] as string[] };
  for (const field of keys) {
    if ((DEVICE_STORAGE_KEYS as readonly string[]).includes(field)) groups.device.push(field);
    else if (/^(ft_tech_params|data\.techParameters)\./.test(field) && retiredNames.has(field.split('.').at(-1)!)) groups.retired.push(field);
    else groups.unknown.push(field);
  }
  return groups;
}
