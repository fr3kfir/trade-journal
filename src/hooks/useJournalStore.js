import { useState, useEffect, useRef } from 'react';

const KEY = 'apex_journal';
const URL = '/api/trades?section=journal';

function pushToServer(entries) {
  return fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: entries }),
  });
}

export function useJournalStore() {
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });
  const [syncStatus, setSyncStatus] = useState('loading');
  const initialized = useRef(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(entries));
    if (!initialized.current) return;
    // Debounced push — one request per burst of edits instead of one per keystroke
    const t = setTimeout(() => {
      setSyncStatus('saving');
      pushToServer(entries)
        .then(r => r.ok ? setSyncStatus('synced') : setSyncStatus('error'))
        .catch(() => setSyncStatus('error'));
    }, 500);
    return () => clearTimeout(t);
  }, [entries]);

  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(KEY) || '[]');
    fetch(URL)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        if (d.data?.length) {
          setEntries(d.data);
        } else if (local.length) {
          pushToServer(local).catch(() => {});
        }
        initialized.current = true;
        setSyncStatus('synced');
      })
      .catch(err => {
        initialized.current = true;
        setSyncStatus('error:' + (err.message || 'unknown'));
      });
  }, []);

  const add = (item) => setEntries(prev => [{ ...item, id: item.id || `journal-${Date.now()}` }, ...prev]);
  const update = (id, fields) => setEntries(prev => prev.map(x => x.id === id ? { ...x, ...fields } : x));
  const remove = (id) => setEntries(prev => prev.filter(x => x.id !== id));

  return { data: entries, add, update, remove, syncStatus };
}
