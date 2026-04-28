import { useState, useEffect, useRef } from 'react';

function pushToServer(key, data) {
  fetch(`/api/store?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  }).catch(() => {});
}

export function useLocalStore(key, initial = []) {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || initial; }
    catch { return initial; }
  });
  const initialized = useRef(false);

  // Save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));
    if (initialized.current) pushToServer(key, data);
  }, [data]);

  // Load from server on startup — server is source of truth
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(key) || '[]');
    fetch(`/api/store?key=${key}`)
      .then(r => r.json())
      .then(d => {
        if (d.data?.length) {
          setData(d.data);
        } else if (local.length) {
          pushToServer(key, local);
        }
        initialized.current = true;
      })
      .catch(() => { initialized.current = true; });
  }, []);

  const add = (item) => setData(prev => [{ ...item, id: item.id || `${key}-${Date.now()}` }, ...prev]);
  const update = (id, fields) => setData(prev => prev.map(x => x.id === id ? { ...x, ...fields } : x));
  const remove = (id) => setData(prev => prev.filter(x => x.id !== id));

  return { data, add, update, remove };
}
