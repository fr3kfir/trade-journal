import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }) {
  const [token, setToken]     = useState('');
  const [queryId, setQueryId] = useState('');
  const [tokenSet, setTokenSet] = useState(false);
  const [msg, setMsg]         = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setTokenSet(d.ibkrTokenSet);
        setQueryId(d.ibkrQueryId || '');
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!token && !queryId) { setMsg('Enter at least one value to save.'); return; }
    setSaving(true);
    try {
      const body = {};
      if (token)   body.ibkrToken   = token.trim();
      if (queryId) body.ibkrQueryId = queryId.trim();
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMsg('Saved! Now click "Sync IBKR" to test.');
      setToken('');
      setTokenSet(true);
    } catch (e) {
      setMsg('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>⚙️ IBKR Settings</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {/* How to get token */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>How to get your IBKR Flex token:</div>
          1. Login to <b>client.ibkr.com</b> → <b>Performance & Reports</b> → <b>Flex Queries</b><br />
          2. Click <b>Flex Web Service</b> on the left<br />
          3. Copy your <b>Current Token</b> (or click Generate)<br />
          4. Also copy your <b>Query ID</b> from the Flex Queries list
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Flex Token {tokenSet && <span style={{ color: 'var(--green)', marginLeft: 6 }}>✓ saved</span>}
            </label>
            <input
              className="input"
              type="password"
              placeholder={tokenSet ? '••••••••••••• (leave blank to keep current)' : 'Paste your token here'}
              value={token}
              onChange={e => setToken(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Query ID</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 1443506"
              value={queryId}
              onChange={e => setQueryId(e.target.value)}
            />
          </div>

          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: msg.startsWith('Error') ? '#ef444420' : '#22c55e18',
              border: `1px solid ${msg.startsWith('Error') ? '#ef444430' : '#22c55e33'}`,
              color: msg.startsWith('Error') ? '#ef4444' : 'var(--green)',
            }}>
              {msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
