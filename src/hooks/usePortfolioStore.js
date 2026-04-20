import { useState, useEffect, useRef } from 'react';

const KEY = 'apex_portfolio';

function pushToServer(positions) {
  fetch('/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  }).catch(() => {});
}

export function usePortfolioStore() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });
  const initialized = useRef(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
    if (initialized.current) pushToServer(data);
  }, [data]);

  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(KEY) || '[]');
    fetch('/api/portfolio')
      .then(r => r.json())
      .then(d => {
        if (d.positions?.length) {
          setData(d.positions);
        } else if (local.length) {
          pushToServer(local);
        }
        initialized.current = true;
      })
      .catch(() => { initialized.current = true; });
  }, []);

  const add = (item) => setData(prev => [{ ...item, id: item.id || `portfolio-${Date.now()}` }, ...prev]);
  const update = (id, fields) => setData(prev => prev.map(x => x.id === id ? { ...x, ...fields } : x));
  const remove = (id) => setData(prev => prev.filter(x => x.id !== id));

  return { data, add, update, remove };
}
