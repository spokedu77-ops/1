const documentId = process.argv[2] ?? '630e1104-84f9-41a2-b25b-7c4faa6a1300';

console.log(`Paste this in the browser console on /admin/note to clear the local note cache for ${documentId}:\n`);
console.log(`await new Promise((resolve, reject) => {
  const req = indexedDB.open('spm-note-oplog-v1');
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction(['documents', 'outbound'], 'readwrite');
    tx.objectStore('documents').delete('${documentId}');
    const index = tx.objectStore('outbound').index('byDocument');
    const all = index.getAll('${documentId}');
    all.onsuccess = () => {
      for (const op of all.result) tx.objectStore('outbound').delete(op.clientOpId);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  };
});
location.reload();`);
