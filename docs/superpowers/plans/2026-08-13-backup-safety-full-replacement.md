# FinTrackAI Backup Safety and Full Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship FinTrackAI 7.12.0 with secret-free local and Google Drive backups, validated full-replacement imports, and persistent interrupted-import recovery.

**Architecture:** Introduce a focused `services/backup` boundary containing pure snapshot/schema/migration/preview functions and browser adapters for `localStorage` and IndexedDB. Local files and Google Drive share one envelope and parsing pipeline; `App` checks the recovery journal before reading financial data or enabling background writers.

**Tech Stack:** React 18, TypeScript, Vite 5, Vitest, jsdom, fake-indexeddb, browser Web Crypto, localStorage, IndexedDB, Google Drive API.

## Global Constraints

- Release version is exactly `7.12.0`; `package.json`, `package-lock.json`, runtime metadata, README badge, and visible version copy must agree.
- New backups never contain `ft_api_key` or `ft_finmind_token`.
- Legacy credentials are detected by key name only, reported as ignored, and never imported or displayed.
- `ft_theme` and `ft_google_client_id` retain the current device values during full replacement.
- Import never calls `localStorage.clear()` and never falls back to unprotected writes when IndexedDB is unavailable.
- Missing portable financial fields normalize to explicit safe defaults and replace old device data.
- Local-file import and Google Drive restore use the same parse, preview, confirmation, and replacement path.
- Google Drive backup remains plaintext JSON; UI and README must not claim encryption or zero leakage risk.
- Existing warm UI, Traditional Chinese copy, Taiwan-market red-profit/green-loss semantics, and DSSLab split boundary remain unchanged.

---

## File Structure

### New files

- `services/appVersion.ts` — exposes the Vite-injected package version.
- `services/backup/model.ts` — backup envelope, normalized financial snapshot, validation, preview, and recovery types.
- `services/backup/snapshot.ts` — reads/writes only the managed portable localStorage keys and defines safe defaults.
- `services/backup/export.ts` — creates, serializes, and downloads secret-free versioned envelopes.
- `services/backup/migrations.ts` — converts legacy flat backups into the current snapshot without mutating input.
- `services/backup/parse.ts` — parses unknown JSON, runs migration, validates core fields, and returns structured diagnostics.
- `services/backup/preview.ts` — computes current-versus-target counts, resets, migration notes, and ignored fields.
- `services/backup/stableDigest.ts` — stable key-order serialization and SHA-256 digest.
- `services/backup/recoveryJournal.ts` — IndexedDB adapter for the one active recovery journal.
- `services/backup/replace.ts` — full-replacement coordinator with read-back verification and rollback.
- `hooks/useImportRecovery.ts` — startup journal inspection and user-triggered rollback state.
- `components/ImportRecoveryGate.tsx` — blocking recovery UI shown before the app can write financial data.
- `test/setup.ts` — jsdom storage reset, fake IndexedDB, and Web Crypto test setup.
- `services/backup/*.test.ts` — unit and storage integration coverage.
- `components/ImportRecoveryGate.test.tsx` — startup recovery interaction coverage.
- `views/Settings.backup.test.tsx` — local and Drive preview/confirmation flow coverage.

### Modified files

- `package.json`, `package-lock.json` — version `7.12.0`, test scripts, and test dependencies.
- `vite.config.ts`, `vite-env.d.ts` — inject and declare `__APP_VERSION__`; configure Vitest.
- `constants.ts` — managed portable keys, preserved device keys, secret keys, and rebuildable cache keys.
- `services/storage.ts` — retain domain getters/savers; remove old unsafe backup serialization/import entry points after callers migrate.
- `services/googleDrive.ts` — upload supplied JSON and return downloaded JSON without importing it.
- `views/Settings.tsx` — shared preview model, full-replacement confirmation, safe pre-import download, and corrected copy.
- `App.tsx` — recovery-first startup and background-write gating.
- `hooks/useAutoTasks.ts`, `hooks/useDailySnapshot.ts` — accept an `enabled` guard.
- `README.md` — version and accurate storage/network/Drive wording.
- `docs/superpowers/specs/2026-08-13-backup-safety-full-replacement-design.md` — retain approved status.

---

### Task 1: Establish the 7.12.0 version source and test harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `vite-env.d.ts`
- Create: `services/appVersion.ts`
- Create: `test/setup.ts`
- Create: `services/appVersion.test.ts`

**Interfaces:**
- Produces: `APP_VERSION: string`, backed by Vite global `__APP_VERSION__`.
- Produces: `npm.cmd test` for one-shot Vitest execution and `npm.cmd run test:watch` for local watch mode.

- [ ] **Step 1: Install the test dependencies and bump the package version**

Run:

```powershell
npm.cmd install --save-dev vitest jsdom fake-indexeddb @testing-library/react @testing-library/jest-dom
npm.cmd version 7.12.0 --no-git-tag-version
```

Expected: `package.json` and `package-lock.json` both report `7.12.0`; no Git tag is created.

- [ ] **Step 2: Add the scripts and write the failing version test**

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `services/appVersion.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test and verify the missing module failure**

Run: `npm.cmd test -- services/appVersion.test.ts`

Expected: FAIL because `services/appVersion.ts` does not exist.

- [ ] **Step 4: Inject the package version and configure the test environment**

In `vite.config.ts`, import `package.json`, add:

```ts
define: {
  __APP_VERSION__: JSON.stringify(packageJson.version),
},
test: {
  environment: 'jsdom',
  setupFiles: ['./test/setup.ts'],
},
```

Declare in `vite-env.d.ts`:

```ts
declare const __APP_VERSION__: string;
```

Create `services/appVersion.ts`:

```ts
export const APP_VERSION = __APP_VERSION__;
```

Create `test/setup.ts` with `import '@testing-library/jest-dom/vitest'`, fake IndexedDB, `localStorage.clear()` in `beforeEach`, and Node `webcrypto` only when `globalThis.crypto.subtle` is absent.

- [ ] **Step 5: Verify tests and build**

Run:

```powershell
npm.cmd test -- services/appVersion.test.ts
npm.cmd run build
```

Expected: version test PASS; TypeScript and Vite build exit 0.

- [ ] **Step 6: Commit the version foundation**

```powershell
git add package.json package-lock.json vite.config.ts vite-env.d.ts services/appVersion.ts services/appVersion.test.ts test/setup.ts
git commit -m "test: establish 7.12.0 version and test harness"
```

---

### Task 2: Create the normalized portable snapshot and secret-free export

**Files:**
- Modify: `constants.ts`
- Create: `services/backup/model.ts`
- Create: `services/backup/snapshot.ts`
- Create: `services/backup/export.ts`
- Create: `services/backup/export.test.ts`

**Interfaces:**
- Produces: `PortableFinancialData` with `assets`, `transactions`, `recurring`, `recurringExecuted`, `portfolioHistory`, `budgets`, `stockHistory`, `stockTransactions`, `feeDiscount`, `techParameters`, `dividendEvents`, and `dividendScannedAt`.
- Produces: `readPortableSnapshot(storage: Storage): PortableFinancialData`.
- Produces: `writePortableSnapshot(storage: Storage, snapshot: PortableFinancialData): void`.
- Produces: `createBackupEnvelope(snapshot, createdAt): BackupEnvelope` and `serializeBackup(envelope): string`.

- [ ] **Step 1: Write failing export and replacement-boundary tests**

Tests must seed all portable keys plus:

```ts
localStorage.setItem('ft_api_key', 'gemini-secret');
localStorage.setItem('ft_finmind_token', 'finmind-secret');
localStorage.setItem('ft_google_client_id', 'device-client');
localStorage.setItem('ft_theme', 'warm');
```

Assertions:

```ts
expect(serialized).not.toContain('gemini-secret');
expect(serialized).not.toContain('finmind-secret');
expect(serialized).not.toContain('ft_api_key');
expect(serialized).not.toContain('ft_finmind_token');
expect(envelope.metadata).toMatchObject({
  format: 'fintrack-ai-backup',
  schemaVersion: 1,
  appVersion: '7.12.0',
});
```

Also verify `writePortableSnapshot` overwrites every portable key but preserves the four seeded secret/device values.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm.cmd test -- services/backup/export.test.ts`

Expected: FAIL because the backup modules do not exist.

- [ ] **Step 3: Define exact key groups and model types**

Export immutable arrays from `constants.ts`:

```ts
export const PORTABLE_STORAGE_KEYS = [/* the 12 approved financial keys */] as const;
export const DEVICE_STORAGE_KEYS = ['ft_theme', 'ft_google_client_id'] as const;
export const SECRET_STORAGE_KEYS = ['ft_api_key', 'ft_finmind_token'] as const;
export const REBUILDABLE_CACHE_KEYS = ['ft_dsslab_raw_cache'] as const;
```

In `model.ts`, define `BackupMetadata`, `BackupEnvelope`, `PortableFinancialData`, `BackupDiagnostic`, `ParsedBackup`, `BackupPreview`, and `ImportRecoveryJournal` using existing domain types from `types.ts`.

- [ ] **Step 4: Implement safe defaults, snapshot I/O, and export**

Implement `createEmptyPortableData()` with `DEFAULT_TECH_PARAMS` and `0.28` fee discount. `writePortableSnapshot` must set every portable key explicitly and must not enumerate or clear all localStorage. `createBackupEnvelope` uses schema version `1` and `APP_VERSION`.

- [ ] **Step 5: Run the focused and full tests**

Run:

```powershell
npm.cmd test -- services/backup/export.test.ts
npm.cmd test
```

Expected: all tests PASS; serialized backup contains only metadata and portable data.

- [ ] **Step 6: Commit the safe export boundary**

```powershell
git add constants.ts services/backup/model.ts services/backup/snapshot.ts services/backup/export.ts services/backup/export.test.ts
git commit -m "feat: add secret-free backup envelope"
```

---

### Task 3: Parse, migrate, and validate backups before any write

**Files:**
- Create: `services/backup/migrations.ts`
- Create: `services/backup/parse.ts`
- Create: `services/backup/parse.test.ts`

**Interfaces:**
- Consumes: `PortableFinancialData`, `BackupEnvelope`, and `createEmptyPortableData()` from Task 2.
- Produces: `parseBackupJson(raw: string): ParseBackupResult` where result is `{ ok: true; parsed: ParsedBackup } | { ok: false; errors: BackupDiagnostic[] }`.
- Produces: `ParsedBackup` containing normalized `snapshot`, metadata, migration notes, ignored secret keys, ignored unknown keys, and deduplication counts.

- [ ] **Step 1: Write failing parser and legacy migration tests**

Cover these fixtures directly in the test file:

- Current schema-1 envelope parses successfully.
- Existing flat backup using `ft_metadata` and `ft_*` keys migrates successfully.
- Legacy Asset `transactions` move into `stockTransactions`; duplicate IDs retain one transaction.
- `ft_api_key` and `ft_finmind_token` appear only in `ignoredSecretKeys` and never in the snapshot.
- Missing portable fields receive safe defaults.
- Core fields with the wrong type, `NaN`-equivalent invalid numbers, malformed dates, or unsupported schema versions return `ok: false`.
- Unknown non-core root fields are reported and ignored.

- [ ] **Step 2: Run the parser test and verify failure**

Run: `npm.cmd test -- services/backup/parse.test.ts`

Expected: FAIL because `parseBackupJson` is missing.

- [ ] **Step 3: Implement non-mutating legacy migration**

Implement:

```ts
export function migrateLegacyBackup(input: Record<string, unknown>): MigrationResult
```

Clone every migrated Asset before deleting the legacy `transactions` property. Map legacy storage keys to semantic snapshot properties, collect ignored secret/unknown key names, and deduplicate stock transactions by `id`.

- [ ] **Step 4: Implement structural and domain validation**

Use explicit unknown-value guards. Reject a core collection unless it has the required container type; validate IDs, ISO-like dates, allowed transaction enums, and every financial number with `Number.isFinite`. Return path-based diagnostics such as `{ path: 'data.transactions[2].amount', code: 'invalid_number', message: '金額必須是有限數值' }` without echoing the value.

- [ ] **Step 5: Run parser and full tests**

Run:

```powershell
npm.cmd test -- services/backup/parse.test.ts
npm.cmd test
```

Expected: every fixture PASS and no persistent storage is touched by parser tests.

- [ ] **Step 6: Commit validated parsing**

```powershell
git add services/backup/migrations.ts services/backup/parse.ts services/backup/parse.test.ts
git commit -m "feat: validate and migrate backup files"
```

---

### Task 4: Build the current-versus-target preview model

**Files:**
- Create: `services/backup/preview.ts`
- Create: `services/backup/preview.test.ts`

**Interfaces:**
- Consumes: current `PortableFinancialData` and `ParsedBackup`.
- Produces: `buildBackupPreview(current, parsed): BackupPreview`.
- `BackupPreview` exposes metadata, named count rows `{ key, label, before, after, delta, reset }`, migration notes, deduplication counts, ignored secret keys, and ignored unknown keys.

- [ ] **Step 1: Write the failing preview test**

Create a current snapshot with 2 assets, 5 transactions, and 1 budget; create a target with 1 asset, 7 transactions, and no budgets. Assert:

```ts
expect(row('assets')).toMatchObject({ before: 2, after: 1, delta: -1, reset: false });
expect(row('transactions')).toMatchObject({ before: 5, after: 7, delta: 2, reset: false });
expect(row('budgets')).toMatchObject({ before: 1, after: 0, delta: -1, reset: true });
expect(preview.ignoredSecretKeys).toEqual(['ft_api_key']);
```

- [ ] **Step 2: Run the preview test and verify failure**

Run: `npm.cmd test -- services/backup/preview.test.ts`

Expected: FAIL because `buildBackupPreview` is missing.

- [ ] **Step 3: Implement deterministic preview rows**

Create a fixed row-definition map for assets, transactions, recurring, budgets, stock transactions, stock history, and dividend events. Count dividend events across every symbol. Do not infer counts by enumerating unknown object keys.

- [ ] **Step 4: Run preview and full tests**

Run:

```powershell
npm.cmd test -- services/backup/preview.test.ts
npm.cmd test
```

Expected: all tests PASS and row order is stable.

- [ ] **Step 5: Commit preview logic**

```powershell
git add services/backup/preview.ts services/backup/preview.test.ts
git commit -m "feat: add backup replacement preview"
```

---

### Task 5: Add the IndexedDB recovery journal and full-replacement coordinator

**Files:**
- Create: `services/backup/stableDigest.ts`
- Create: `services/backup/recoveryJournal.ts`
- Create: `services/backup/replace.ts`
- Create: `services/backup/replace.test.ts`

**Interfaces:**
- Consumes: `readPortableSnapshot`, `writePortableSnapshot`, and `PortableFinancialData`.
- Produces: `sha256Snapshot(snapshot): Promise<string>` using stable key ordering and Web Crypto SHA-256.
- Produces: `recoveryJournal` methods `getActive()`, `create(journal)`, `setStatus(status)`, and `remove()`.
- Produces: `replacePortableData(target, deps?): Promise<ReplaceResult>` and `restorePreviousSnapshot(journal, deps?): Promise<RestoreResult>`.

- [ ] **Step 1: Write failing journal and replacement tests**

Using fake IndexedDB and an injectable `Storage` adapter, cover:

- Successful replacement writes every portable key, verifies digest, deletes the journal, preserves secrets/device settings, and removes only registered cache keys.
- A throw on the third `setItem` restores the complete previous snapshot and removes the journal after verified rollback.
- Failed rollback retains the `writing` journal.
- Journal creation failure produces `{ ok: false, code: 'recovery_unavailable' }` before the first localStorage write.
- Stable digest is identical for objects whose keys have different insertion order.

- [ ] **Step 2: Run the replacement test and verify failure**

Run: `npm.cmd test -- services/backup/replace.test.ts`

Expected: FAIL because replacement and journal modules are missing.

- [ ] **Step 3: Implement stable serialization and SHA-256**

Recursively sort object keys while preserving array order, encode with `TextEncoder`, and convert `crypto.subtle.digest('SHA-256', bytes)` to lowercase hex.

- [ ] **Step 4: Implement the one-record IndexedDB journal**

Use database `fintrack-ai-recovery`, version `1`, object store `imports`, and fixed record key `active`. Promise wrappers must reject on request, transaction, blocked, and open errors. Do not silently substitute memory storage.

- [ ] **Step 5: Implement replacement and verified rollback**

Order operations exactly:

```text
read previous snapshot
create prepared journal
set writing status
write every portable key
remove registered rebuildable cache keys
read back and compare SHA-256
set verified status
remove journal
```

On any failure after `writing`, write the prior snapshot, verify its digest, and remove the journal only when rollback verification succeeds.

- [ ] **Step 6: Run replacement and full tests**

Run:

```powershell
npm.cmd test -- services/backup/replace.test.ts
npm.cmd test
```

Expected: all success, failure, interruption-state, and preservation tests PASS.

- [ ] **Step 7: Commit recoverable replacement**

```powershell
git add services/backup/stableDigest.ts services/backup/recoveryJournal.ts services/backup/replace.ts services/backup/replace.test.ts
git commit -m "feat: make backup replacement recoverable"
```

---

### Task 6: Block app startup until interrupted imports are resolved

**Files:**
- Create: `hooks/useImportRecovery.ts`
- Create: `components/ImportRecoveryGate.tsx`
- Create: `components/ImportRecoveryGate.test.tsx`
- Modify: `hooks/useAutoTasks.ts`
- Modify: `hooks/useDailySnapshot.ts`
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `recoveryJournal.getActive()` and `restorePreviousSnapshot()`.
- Produces: `useImportRecovery(): { status: 'checking' | 'ready' | 'needs-recovery' | 'recovery-failed'; journal; recover; downloadRecoverySnapshot }`.
- Adds: `enabled: boolean` to `UseAutoTasksProps` and `UseDailySnapshotProps`.

- [ ] **Step 1: Write failing startup recovery tests**

Render the gate with injected recovery state and assert:

- `checking` shows a loading state and no app children.
- `writing` shows「上次資料匯入未完成」and a「回復匯入前資料」button.
- Recovery success calls `refreshData` and enables children.
- Recovery failure retains the blocking screen and exposes「下載復原快照」and「重試」.
- `prepared` is removed automatically before ready.
- `verified` is removed automatically before ready.

- [ ] **Step 2: Run the gate test and verify failure**

Run: `npm.cmd test -- components/ImportRecoveryGate.test.tsx`

Expected: FAIL because the hook and component do not exist.

- [ ] **Step 3: Implement recovery-first startup**

`App` must not call `refreshData()` until the hook reports `ready`. Pass `enabled: recovery.status === 'ready'` to auto tasks and daily snapshots. Add the same guard at the start of the debt-balance effect. Render `ImportRecoveryGate` before `Layout` while checking or blocked.

- [ ] **Step 4: Guard background writers**

In both hooks, add `if (!enabled) return;` as the first effect condition and include `enabled` in dependencies. Manual enrichment remains unreachable behind the blocking gate; no new polling is introduced.

- [ ] **Step 5: Run focused tests, full tests, and build**

Run:

```powershell
npm.cmd test -- components/ImportRecoveryGate.test.tsx
npm.cmd test
npm.cmd run build
```

Expected: tests PASS; build exits 0; no financial writer runs while recovery is unresolved.

- [ ] **Step 6: Commit startup protection**

```powershell
git add hooks/useImportRecovery.ts components/ImportRecoveryGate.tsx components/ImportRecoveryGate.test.tsx hooks/useAutoTasks.ts hooks/useDailySnapshot.ts App.tsx
git commit -m "feat: recover interrupted imports before startup"
```

---

### Task 7: Unify local and Google Drive backup flows in Settings

**Files:**
- Modify: `services/googleDrive.ts`
- Modify: `services/storage.ts`
- Modify: `views/Settings.tsx`
- Create: `views/Settings.backup.test.tsx`

**Interfaces:**
- Consumes: `parseBackupJson`, `buildBackupPreview`, `replacePortableData`, `readPortableSnapshot`, `createBackupEnvelope`, `serializeBackup`, and `downloadBackupFile`.
- Changes: `uploadToDrive(fileContent: string): Promise<void>`.
- Changes: `downloadFromDrive(): Promise<string>`; it performs no import.
- Removes callers of legacy `getFullDataJson()` and `importData()` before deleting those two unsafe exports.

- [ ] **Step 1: Write failing local and Drive workflow tests**

Mock Drive transport and assert:

- Local selection parses and shows current/after/delta rows before any write.
- Drive download opens the identical preview rather than importing immediately.
- Confirmation first triggers a secret-free pre-import download, then calls replacement with the parsed target.
- Cancel causes zero writes.
- Invalid core data shows a diagnostic and never opens confirmation.
- Preview lists ignored legacy credential key names but never their values.
- Successful Drive upload receives serialized safe JSON and success copy does not contain「加密」.

- [ ] **Step 2: Run the Settings backup test and verify failure**

Run: `npm.cmd test -- views/Settings.backup.test.tsx`

Expected: FAIL against the current direct-import behavior.

- [ ] **Step 3: Make Google Drive a transport-only service**

Remove storage imports from `googleDrive.ts`. Accept serialized JSON in `uploadToDrive`; return raw JSON from `downloadFromDrive`. Keep file lookup, OAuth, and filename behavior unchanged.

- [ ] **Step 4: Replace Settings raw state with parsed preview state**

Store `{ parsed, preview }`, not `{ raw, stats, metadata }`. Both FileReader and Drive download call one `prepareImport(raw)` function. Render all fixed preview rows plus migration, dedupe, ignored-secret, ignored-unknown, and reset notices.

- [ ] **Step 5: Implement explicit full-replacement confirmation**

The button text is「完整取代目前財務資料」. On click:

1. Create and trigger `fintrack_ai_pre_import_YYYY-MM-DD.json` from the current snapshot.
2. Await `replacePortableData(parsed.snapshot)`.
3. On success, close preview, call `onDataChange`, and reload only after success feedback.
4. On recoverable failure, show the returned error; never clear the current preview until the user cancels.

- [ ] **Step 6: Delete unsafe backup entry points after migration**

Remove `getFullDataJson()` and `importData()` from `services/storage.ts` only after `rg -n "getFullDataJson|importData"` shows no remaining callers outside deleted definitions. Keep domain getters/savers, reset behavior, and credential setters unchanged.

- [ ] **Step 7: Run focused tests, full tests, and build**

Run:

```powershell
npm.cmd test -- views/Settings.backup.test.tsx
npm.cmd test
npm.cmd run build
```

Expected: all tests PASS; build exits 0; local and Drive flows share the same preview and replacement coordinator.

- [ ] **Step 8: Commit unified backup UX**

```powershell
git add services/googleDrive.ts services/storage.ts views/Settings.tsx views/Settings.backup.test.tsx
git commit -m "feat: unify safe local and Drive restore flows"
```

---

### Task 8: Correct safety copy, expose version 7.12.0, and run release verification

**Files:**
- Modify: `README.md`
- Modify: `views/Settings.tsx`
- Modify: `docs/superpowers/specs/2026-08-13-backup-safety-full-replacement-design.md` only if implementation evidence requires a factual correction

**Interfaces:**
- Consumes: `APP_VERSION` from Task 1.
- Produces: accurate user-facing backup privacy copy and visible `FinTrack AI v7.12.0`.

- [ ] **Step 1: Write a failing copy/version regression test**

Extend `views/Settings.backup.test.tsx` to assert:

```ts
expect(screen.getByText('FinTrack AI v7.12.0')).toBeInTheDocument();
expect(screen.getByText(/備份不包含 Gemini API Key 與 FinMind Token/)).toBeInTheDocument();
expect(document.body.textContent).not.toContain('資料已加密');
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm.cmd test -- views/Settings.backup.test.tsx`

Expected: FAIL because current visible version/copy is absent or inaccurate.

- [ ] **Step 3: Update Settings and README copy**

Use `APP_VERSION` in Settings. Change README badge to `V7.12.0`; replace「無伺服器、無資料外洩風險」with an accurate local-first statement; replace「Google Drive 雲端加密同步」with「Google Drive 備份（可選，明文 JSON、不含 API 憑證）」. State that market-data and optional Google services make external network requests.

- [ ] **Step 4: Run complete automated verification**

Run:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Expected: every command exits 0. Record the Vite bundle-size warning if unchanged; it belongs to the later performance phase and does not invalidate this data-safety release.

- [ ] **Step 5: Perform manual browser verification with sanitized data**

Start `npm.cmd run dev`, then verify:

- New local backup JSON contains no credential keys or values.
- Google Drive upload receives the same safe envelope.
- A legacy backup previews migration and ignored credential key names.
- Missing budget data previews a reset and removes old budgets after confirmation.
- Cancel leaves all data unchanged.
- Simulated interrupted `writing` journal blocks the app and successfully restores.
- Warm and dark themes remain unchanged; desktop and 375px layouts have no horizontal overflow.

Never seed real API credentials into test fixtures, screenshots, console output, or committed files.

- [ ] **Step 6: Review dependency audit without expanding this phase**

Run: `npm.cmd audit --omit=dev`

Expected: capture the current `@google/genai` transitive findings for the separately approved dependency phase. Do not claim they are fixed by this backup release, and do not change unrelated production dependencies in this task.

- [ ] **Step 7: Commit release copy and evidence-ready version**

```powershell
git add README.md views/Settings.tsx views/Settings.backup.test.tsx
git commit -m "docs: release safe backup flow as 7.12.0"
```

---

## Final Review Gate

Before declaring implementation complete:

1. Run `rg -n "ft_api_key|ft_finmind_token" services/backup services/googleDrive.ts` and confirm occurrences are limited to explicit ignore/preservation tests and key classifications.
2. Run `rg -n "加密|無資料外洩風險|getFullDataJson|importData" README.md views/Settings.tsx services` and confirm no inaccurate copy or unsafe legacy entry point remains.
3. Run `git log --oneline 5bfba6f..HEAD` and confirm each task produced its intended isolated commit.
4. Run `git status --short` and distinguish any pre-existing user changes from implementation changes.
5. Do not push, deploy, or merge until the user reviews the locally verified 7.12.0 result.
