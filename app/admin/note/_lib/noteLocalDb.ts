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

const localDocumentMemory = new Map<string, NoteLocalDocumentRecord>();

/** IDB 비동기 read 전 첫 paint용 — writeLocalDocument·readLocalDocument가 갱신 */
export function readLocalDocumentMemory(documentId: string): NoteLocalDocumentRecord | null {
  const hit = localDocumentMemory.get(documentId);
  if (!hit) return null;
  return {
    ...hit,
    blocks: hit.blocks.map((block) => ({
      ...block,
      content: block.content && typeof block.content === 'object'
        ? { ...(block.content as Record<string, unknown>) }
        : block.content,
    })),
  };
}

function rememberLocalDocumentMemory(record: NoteLocalDocumentRecord): void {
  localDocumentMemory.set(record.documentId, {
    ...record,
    blocks: record.blocks.map((block) => ({
      ...block,
      content: block.content && typeof block.content === 'object'
        ? { ...(block.content as Record<string, unknown>) }
        : block.content,
    })),
  });
}

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
  const result: NoteLocalDocumentRecord | null = await runTx(
    'readonly',
    'documents',
    (stores) => new Promise<NoteLocalDocumentRecord | null>((resolve, reject) => {
      const request = stores.documents.get(documentId);
      request.onsuccess = () => {
        const raw = request.result as NoteLocalDocumentRecord | undefined;
        resolve(raw ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
    }),
  );
  if (result !== null) {
    rememberLocalDocumentMemory(result);
  }
  return result;
}

export async function writeLocalDocument(record: NoteLocalDocumentRecord): Promise<void> {
  rememberLocalDocumentMemory(record);
  await runTx<void>('readwrite', 'documents', (stores) => new Promise<void>((resolve, reject) => {
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
  await runTx<void>('readwrite', 'outbound', async (stores) => {
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
  return runTx<NoteLocalOutboundOp[]>('readonly', 'outbound', (stores) => new Promise<NoteLocalOutboundOp[]>((resolve, reject) => {
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
  await runTx<void>('readwrite', 'outbound', async (stores) => {
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
  await runTx<void>('readwrite', ['documents', 'outbound'], async (stores) => {
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
