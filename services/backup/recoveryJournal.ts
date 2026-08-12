import type { ImportRecoveryJournal } from './model';

const DATABASE_NAME = 'fintrack-ai-recovery';
const DATABASE_VERSION = 1;
const STORE_NAME = 'imports';
const ACTIVE_RECORD_KEY = 'active';

type JournalStatus = ImportRecoveryJournal['status'];

export interface RecoveryJournalAdapter {
  getActive(): Promise<ImportRecoveryJournal | null>;
  create(journal: ImportRecoveryJournal): Promise<void>;
  setStatus(status: JournalStatus): Promise<void>;
  remove(): Promise<void>;
}

function errorOrFallback(error: DOMException | null, fallback: string): Error | DOMException {
  return error ?? new Error(fallback);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let request: IDBOpenDBRequest;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    try {
      request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      fail(error);
      return;
    }

    request.onupgradeneeded = () => {
      try {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      } catch (error) {
        request.transaction?.abort();
        fail(error);
      }
    };
    request.onerror = () => fail(errorOrFallback(request.error, 'Unable to open recovery database'));
    request.onblocked = () => fail(new Error('Recovery database open was blocked'));
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      resolve(request.result);
    };
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  execute: (
    store: IDBObjectStore,
    setResult: (result: T) => void,
    rejectRequest: (error: unknown) => void,
  ) => void,
): Promise<T> {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction;
    let result: T;
    let settled = false;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      try { transaction.abort(); } catch { /* The transaction may already be inactive. */ }
      database.close();
      reject(error);
    };

    try {
      transaction = database.transaction(STORE_NAME, mode);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(result);
    };
    transaction.onerror = () => fail(errorOrFallback(transaction.error, 'Recovery transaction failed'));
    transaction.onabort = () => fail(errorOrFallback(transaction.error, 'Recovery transaction was aborted'));

    try {
      execute(transaction.objectStore(STORE_NAME), (value) => { result = value; }, fail);
    } catch (error) {
      fail(error);
    }
  });
}

export const recoveryJournal: RecoveryJournalAdapter = {
  getActive: () => runTransaction<ImportRecoveryJournal | null>('readonly', (store, setResult, rejectRequest) => {
    const request = store.get(ACTIVE_RECORD_KEY);
    request.onsuccess = () => setResult((request.result as ImportRecoveryJournal | undefined) ?? null);
    request.onerror = () => rejectRequest(errorOrFallback(request.error, 'Unable to read recovery journal'));
  }),

  create: (journal) => runTransaction<void>('readwrite', (store, setResult, rejectRequest) => {
    setResult(undefined);
    const request = store.add(journal, ACTIVE_RECORD_KEY);
    request.onerror = () => rejectRequest(errorOrFallback(request.error, 'Unable to create recovery journal'));
  }),

  setStatus: (status) => runTransaction<void>('readwrite', (store, setResult, rejectRequest) => {
    setResult(undefined);
    const getRequest = store.get(ACTIVE_RECORD_KEY);
    getRequest.onerror = () => rejectRequest(errorOrFallback(getRequest.error, 'Unable to read recovery journal'));
    getRequest.onsuccess = () => {
      const active = getRequest.result as ImportRecoveryJournal | undefined;
      if (!active) {
        rejectRequest(new Error('No active recovery journal'));
        return;
      }

      const putRequest = store.put({ ...active, status }, ACTIVE_RECORD_KEY);
      putRequest.onerror = () => rejectRequest(errorOrFallback(putRequest.error, 'Unable to update recovery journal'));
    };
  }),

  remove: () => runTransaction<void>('readwrite', (store, setResult, rejectRequest) => {
    setResult(undefined);
    const request = store.delete(ACTIVE_RECORD_KEY);
    request.onerror = () => rejectRequest(errorOrFallback(request.error, 'Unable to remove recovery journal'));
  }),
};
