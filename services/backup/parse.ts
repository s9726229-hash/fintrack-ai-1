import { SECRET_STORAGE_KEYS } from '../../constants';
import { AssetType, Currency } from '../../types';
import type { BackupDiagnostic, BackupMetadata, ParsedBackup, PortableFinancialData } from './model';
import { createEmptyPortableData, normalizeTechParameters } from './snapshot';
import { migrateLegacyBackup } from './migrations';

export type ParseBackupResult = { ok: true; parsed: ParsedBackup } | { ok: false; errors: BackupDiagnostic[] };

const portableKeys = new Set<keyof PortableFinancialData>(['assets', 'transactions', 'recurring', 'recurringExecuted', 'portfolioHistory', 'budgets', 'stockHistory', 'stockTransactions', 'feeDiscount', 'techParameters', 'dividendEvents', 'dividendScannedAt']);
const collectionKeys: (keyof PortableFinancialData)[] = ['assets', 'transactions', 'recurring', 'portfolioHistory', 'budgets', 'stockHistory', 'stockTransactions'];
const assetTypes = new Set(Object.values(AssetType));
const currencies = new Set(Object.values(Currency));

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T;
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)])) as T;
  return value;
}
function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

function validate(snapshot: PortableFinancialData, metadata: BackupMetadata): BackupDiagnostic[] {
  const errors: BackupDiagnostic[] = [];
  const add = (path: string, code: string, message: string) => errors.push({ path, code, message });
  const requiredString = (value: unknown, path: string) => { if (typeof value !== 'string' || value.length === 0) add(path, 'invalid_string', 'Expected a non-empty string.'); };
  const number = (value: unknown, path: string) => { if (typeof value !== 'number' || !Number.isFinite(value)) add(path, 'invalid_number', 'Expected a finite number.'); };
  const date = (value: unknown, path: string) => { if (!isIsoDate(value)) add(path, 'invalid_date', 'Expected a valid ISO date.'); };
  const optionalNumber = (value: unknown, path: string) => { if (value !== undefined) number(value, path); };
  const nullableNumber = (value: unknown, path: string) => { if (value !== undefined && value !== null) number(value, path); };

  if (metadata.format !== 'fintrack-ai-backup') add('metadata.format', 'invalid_format', 'Unsupported backup format.');
  if (metadata.schemaVersion !== 1) add('metadata.schemaVersion', 'unsupported_schema', 'Unsupported backup schema version.');
  requiredString(metadata.appVersion, 'metadata.appVersion');
  if (!isIsoTimestamp(metadata.createdAt)) add('metadata.createdAt', 'invalid_date', 'Expected a valid ISO timestamp.');
  for (const key of collectionKeys) if (!Array.isArray(snapshot[key])) add(`data.${key}`, 'invalid_type', 'Expected an array.');
  if (!isRecord(snapshot.recurringExecuted)) add('data.recurringExecuted', 'invalid_type', 'Expected an object.');
  if (!isRecord(snapshot.dividendEvents)) add('data.dividendEvents', 'invalid_type', 'Expected an object.');
  if (!isRecord(snapshot.dividendScannedAt)) add('data.dividendScannedAt', 'invalid_type', 'Expected an object.');
  number(snapshot.feeDiscount, 'data.feeDiscount');
  if (!isRecord(snapshot.techParameters)) add('data.techParameters', 'invalid_type', 'Expected an object.');

  if (Array.isArray(snapshot.assets)) snapshot.assets.forEach((asset, index) => {
    const path = `data.assets[${index}]`;
    if (!isRecord(asset)) return add(path, 'invalid_type', 'Expected an object.');
    requiredString(asset.id, `${path}.id`); requiredString(asset.name, `${path}.name`);
    if (!assetTypes.has(asset.type as AssetType)) add(`${path}.type`, 'invalid_enum', 'Unsupported asset type.');
    if (!currencies.has(asset.currency as Currency)) add(`${path}.currency`, 'invalid_enum', 'Unsupported currency.');
    ['amount', 'exchangeRate', 'lastUpdated'].forEach((key) => number(asset[key], `${path}.${key}`));
    ['originalAmount', 'interestRate', 'termYears', 'paidYears', 'interestOnlyPeriod', 'shares', 'avgCost', 'currentPrice', 'ma20', 'yield', 'dividendPerShare', 'rsi', 'ma20Slope', 'ma60', 'foreignConsecBuy', 'foreignConsecSell', 'trustConsecBuy', 'trustConsecSell'].forEach((key) => optionalNumber(asset[key], `${path}.${key}`));
    ['marginChangeRatio', 'marginChange', 'institutionalForeign', 'institutionalTrust', 'institutionalDealer', 'dailyChangeRatio', 'dailyChange'].forEach((key) => nullableNumber(asset[key], `${path}.${key}`));
    if (asset.biasSlopes !== undefined) {
      if (!Array.isArray(asset.biasSlopes)) add(`${path}.biasSlopes`, 'invalid_type', 'Expected an array.');
      else asset.biasSlopes.forEach((value, slopeIndex) => number(value, `${path}.biasSlopes[${slopeIndex}]`));
    }
    if (asset.startDate !== undefined) date(asset.startDate, `${path}.startDate`);
    if (asset.exDate !== undefined) date(asset.exDate, `${path}.exDate`);
    if (asset.paymentDate !== undefined) date(asset.paymentDate, `${path}.paymentDate`);
  });
  if (Array.isArray(snapshot.transactions)) snapshot.transactions.forEach((transaction, index) => {
    const path = `data.transactions[${index}]`;
    if (!isRecord(transaction)) return add(path, 'invalid_type', 'Expected an object.');
    ['id', 'category', 'item'].forEach((key) => requiredString(transaction[key], `${path}.${key}`)); date(transaction.date, `${path}.date`); number(transaction.amount, `${path}.amount`);
    if (!['EXPENSE', 'INCOME', 'DIVIDEND'].includes(transaction.type as string)) add(`${path}.type`, 'invalid_enum', 'Unsupported transaction type.');
    if (transaction.source !== undefined && !['MANUAL', 'AI_VOICE', 'INVOICE_CSV'].includes(transaction.source as string)) add(`${path}.source`, 'invalid_enum', 'Unsupported transaction source.');
  });
  if (Array.isArray(snapshot.recurring)) snapshot.recurring.forEach((item, index) => {
    const path = `data.recurring[${index}]`;
    if (!isRecord(item)) return add(path, 'invalid_type', 'Expected an object.');
    ['id', 'name', 'category'].forEach((key) => requiredString(item[key], `${path}.${key}`)); number(item.amount, `${path}.amount`); number(item.dayOfMonth, `${path}.dayOfMonth`);
    if (!['EXPENSE', 'INCOME'].includes(item.type as string)) add(`${path}.type`, 'invalid_enum', 'Unsupported transaction type.');
    if (!['MONTHLY', 'YEARLY'].includes(item.frequency as string)) add(`${path}.frequency`, 'invalid_enum', 'Unsupported recurrence frequency.');
    optionalNumber(item.monthOfYear, `${path}.monthOfYear`);
  });
  if (Array.isArray(snapshot.portfolioHistory)) snapshot.portfolioHistory.forEach((item, index) => {
    const path = `data.portfolioHistory[${index}]`;
    if (!isRecord(item)) return add(path, 'invalid_type', 'Expected an object.');
    date(item.date, `${path}.date`); ['totalAssets', 'totalLiabilities', 'netWorth'].forEach((key) => number(item[key], `${path}.${key}`));
    if (!isRecord(item.assetDistribution)) add(`${path}.assetDistribution`, 'invalid_type', 'Expected an object.'); else Object.entries(item.assetDistribution).forEach(([key, value]) => number(value, `${path}.assetDistribution.${key}`));
  });
  if (Array.isArray(snapshot.budgets)) snapshot.budgets.forEach((item, index) => {
    const path = `data.budgets[${index}]`; if (!isRecord(item)) return add(path, 'invalid_type', 'Expected an object.'); requiredString(item.category, `${path}.category`); number(item.limit, `${path}.limit`);
  });
  if (Array.isArray(snapshot.stockHistory)) snapshot.stockHistory.forEach((item, index) => {
    const path = `data.stockHistory[${index}]`; if (!isRecord(item)) return add(path, 'invalid_type', 'Expected an object.'); date(item.date, `${path}.date`); ['totalMarketValue', 'totalUnrealizedPL'].forEach((key) => number(item[key], `${path}.${key}`));
    if (!Array.isArray(item.positions)) add(`${path}.positions`, 'invalid_type', 'Expected an array.'); else item.positions.forEach((position, positionIndex) => { if (!isRecord(position)) add(`${path}.positions[${positionIndex}]`, 'invalid_type', 'Expected an object.'); else { requiredString(position.symbol, `${path}.positions[${positionIndex}].symbol`); number(position.marketValue, `${path}.positions[${positionIndex}].marketValue`); } });
  });
  if (Array.isArray(snapshot.stockTransactions)) snapshot.stockTransactions.forEach((transaction, index) => {
    const path = `data.stockTransactions[${index}]`; if (!isRecord(transaction)) return add(path, 'invalid_type', 'Expected an object.');
    ['id', 'symbol', 'tradeType'].forEach((key) => requiredString(transaction[key], `${path}.${key}`)); date(transaction.date, `${path}.date`); ['shares', 'price', 'fees', 'amount'].forEach((key) => number(transaction[key], `${path}.${key}`)); optionalNumber(transaction.realizedProfit, `${path}.realizedProfit`);
    if (!['BUY', 'SELL'].includes(transaction.side as string)) add(`${path}.side`, 'invalid_enum', 'Unsupported stock transaction side.');
  });
  if (isRecord(snapshot.recurringExecuted)) Object.entries(snapshot.recurringExecuted).forEach(([key, value]) => { if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) add(`data.recurringExecuted.${key}`, 'invalid_type', 'Expected an array of strings.'); });
  if (isRecord(snapshot.techParameters)) Object.entries(snapshot.techParameters).forEach(([key, value]) => number(value, `data.techParameters.${key}`));
  if (isRecord(snapshot.dividendEvents)) Object.entries(snapshot.dividendEvents).forEach(([symbol, events]) => { if (!Array.isArray(events)) return add(`data.dividendEvents.${symbol}`, 'invalid_type', 'Expected an array.'); events.forEach((event, index) => { if (!isRecord(event)) return add(`data.dividendEvents.${symbol}[${index}]`, 'invalid_type', 'Expected an object.'); date(event.exDate, `data.dividendEvents.${symbol}[${index}].exDate`); if (event.paymentDate !== undefined) date(event.paymentDate, `data.dividendEvents.${symbol}[${index}].paymentDate`); number(event.dividendPerShare, `data.dividendEvents.${symbol}[${index}].dividendPerShare`); }); });
  if (isRecord(snapshot.dividendScannedAt)) Object.entries(snapshot.dividendScannedAt).forEach(([symbol, value]) => number(value, `data.dividendScannedAt.${symbol}`));
  return errors;
}

function currentEnvelope(input: Record<string, unknown>): { snapshot: PortableFinancialData; metadata: BackupMetadata; ignoredSecretKeys: string[]; ignoredUnknownKeys: string[] } | BackupDiagnostic[] {
  const errors: BackupDiagnostic[] = [];
  if (!isRecord(input.metadata)) errors.push({ path: 'metadata', code: 'invalid_type', message: 'Expected an object.' });
  if (!isRecord(input.data)) errors.push({ path: 'data', code: 'invalid_type', message: 'Expected an object.' });
  if (errors.length > 0) return errors;
  const data = input.data as Record<string, unknown>;
  const defaults = createEmptyPortableData();
  for (const key of portableKeys) {
    if (!Object.hasOwn(data, key)) continue;
    if (key === 'techParameters' && isRecord(data[key])) {
      defaults.techParameters = normalizeTechParameters(cloneValue(data[key])).value;
    } else {
      defaults[key] = cloneValue(data[key]) as never;
    }
  }
  const ignoredSecretKeys = Object.keys(data).filter((key) => (SECRET_STORAGE_KEYS as readonly string[]).includes(key));
  const ignoredTechParameterKeys = isRecord(data.techParameters)
    ? normalizeTechParameters(data.techParameters).ignoredKeys.map((key) => `data.techParameters.${key}`)
    : [];
  return {
    snapshot: defaults,
    metadata: cloneValue(input.metadata) as BackupMetadata,
    ignoredSecretKeys,
    ignoredUnknownKeys: [
      ...Object.keys(input).filter((key) => key !== 'metadata' && key !== 'data'),
      ...Object.keys(data).filter((key) => !portableKeys.has(key as keyof PortableFinancialData) && !ignoredSecretKeys.includes(key)),
      ...ignoredTechParameterKeys,
    ],
  };
}

export function parseBackupJson(raw: string): ParseBackupResult {
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return { ok: false, errors: [{ path: '$', code: 'invalid_json', message: 'Backup is not valid JSON.' }] }; }
  if (!isRecord(input)) return { ok: false, errors: [{ path: '$', code: 'invalid_type', message: 'Expected a JSON object.' }] };
  const isEnvelope = Object.hasOwn(input, 'metadata') || Object.hasOwn(input, 'data');
  if (isEnvelope) {
    const normalized = currentEnvelope(input);
    if (Array.isArray(normalized)) return { ok: false, errors: normalized };
    const errors = validate(normalized.snapshot, normalized.metadata);
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, parsed: { ...normalized, migrationNotes: [], deduplicationCounts: { stockTransactions: 0 } } };
  }
  const normalized = migrateLegacyBackup(input);
  const errors = validate(normalized.snapshot, normalized.metadata);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, parsed: normalized };
}
