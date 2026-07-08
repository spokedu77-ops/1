'use client';

import type { NoteBlock } from './types';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';

const DB_NAME = 'spm-note-oplog-v1';
const DB_VERSION = 1;

export type NoteLocalDocumentRecord = {
  documentId: string;
  lastAppliedSeq: number;
  blocks: NoteBlock[];
  updatedAt: number;
};

export type NoteLocalOutboundOp = NoteBlockOpPushItem & {
  documentId: string;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'documentId' });
      }
      if (!db.objectStoreNames.contains('outbound')) {
        const store = db.createObjectStore('outbound', { keyPath: 'clientOpId' });
        store.createIndex('byDocument', 'documentId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function runTx<T>(
  mode: IDBTransactionMode,
  storeNames: string | string[],
  fn: (stores: Record<string, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = db.transaction(names, mode);
    const stores: Record<string, IDBObjectStore> = {};
    for (const name of names) stores[name] = tx.objectStore(name);
    Promise.resolve(fn(stores))
      .then((result) => {
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction failed'));
        };
      })
      .catch((error) => {
        tx.abort();
        db.close();
        reject(error);
      });
  }));
}

export async function readLocalDocument(documentId: string): Promise<NoteLocalDocumentRecord | null> {
  return runTx('readonly', 'documents', async (stores) => new Promise((resolve, reject) => {
    const request = stores.documents.get(documentId);
    request.onsuccess = () => resolve((request.result as NoteLocalDocumentRecord | undefined) ?? null);
    request.onerror = () => reject(request.error);
  }));
}

export async function writeLocalDocument(record: NoteLocalDocumentRecord): Promise<void> {
  await runTx('readwrite', 'documents', async (stores) => new Promise<void>((resolve, reject) => {
    const request = stores.documents.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }));
}

export async function appendOutboundOps(
  documentId: string,
  ops: NoteBlockOpPushItem[],
): Promise<void> {
  if (ops.length === 0) return;
  const now = Date.now();
  await runTx('readwrite', 'outbound', async (stores) => {
    for (const op of ops) {
      await new Promise<void>((resolve, reject) => {
        const request = stores.outbound.put({
          ...op,
          documentId,
          createdAt: now,
        } satisfies NoteLocalOutboundOp);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  });
}

export async function listOutboundOps(documentId: string): Promise<NoteLocalOutboundOp[]> {
  return runTx('readonly', 'outbound', async (stores) => new Promise((resolve, reject) => {
    const index = stores.outbound.index('byDocument');
    const request = index.getAll(documentId);
    request.onsuccess = () => {
      const rows = (request.result as NoteLocalOutboundOp[]).sort((a, b) => a.createdAt - b.createdAt);
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  }));
}

export async function removeOutboundOps(clientOpIds: string[]): Promise<void> {
  if (clientOpIds.length === 0) return;
  await runTx('readwrite', 'outbound', async (stores) => {
    for (const id of clientOpIds) {
      await new Promise<void>((resolve, reject) => {
        const request = stores.outbound.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  });
}

export async function clearDocumentLocal(documentId: string): Promise<void> {
  await runTx('readwrite', ['documents', 'outbound'], async (stores) => {
    await new Promise<void>((resolve, reject) => {
      const request = stores.documents.delete(documentId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const outbound = await listOutboundOps(documentId);
    for (const op of outbound) {
      await new Promise<void>((resolve, reject) => {
        const request = stores.outbound.delete(op.clientOpId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  });
}
