import { useState, useEffect, useRef } from 'react';

const KEY = 'apex_journal';

function pushToServer(entries) {
  fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: entries }),
  }).catch(() => {});
}

export function useJournalStore() {
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });
  const initialized = useRef(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(entries));
    if (initialized.current) pushToServer(entries);
  }, [entries]);

  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(KEY) || '[]');
    fetch('/api/journal')
      .then(r => r.json())
      .then(d => {
        if (d.data?.length) {
          setEntries(d.data);
        } else if (local.length) {
          pushToServer(local);
        }
        initialized.current = true;
      })
      .catch(() => { initialized.current = true; });
  }, []);

  const add = (item) => setEntries(prev => [{ ...item, id: item.id || `journal-${Date.now()}` }, ...prev]);
  const update = (id, fields) => setEntries(prev => prev.map(x => x.id === id ? { ...x, ...fields } : x));
  const remove = (id) => setEntries(prev => prev.filter(x => x.id !== id));

  return { data: entries, add, update, remove };
}
