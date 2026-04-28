import { useState, useEffect } from 'react';

export function useLocalStore(key, initial = []) {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || initial; }
    catch { return initial; }
  });

  useEffect(() => { localStorage.setItem(key, JSON.stringify(data)); }, [data]);

  const add = (item) => setData(prev => [{ ...item, id: item.id || `${key}-${Date.now()}` }, ...prev]);
  const update = (id, fields) => setData(prev => prev.map(x => x.id === id ? { ...x, ...fields } : x));
  const remove = (id) => setData(prev => prev.filter(x => x.id !== id));

  return { data, add, update, remove };
}
