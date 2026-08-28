import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }) {
  const [token, setToken]     = useState('');
  const [queryId, setQueryId] = useState('');
  const [confirmQueryId, setConfirmQueryId] = useState('');
  const [tokenSet, setTokenSet] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicKeySet, setAnthropicKeySet] = useState(false);
  const [msg, setMsg]         = useState('');
  const [saving, setSaving]   = useState(false);
  const [accountSize, setAccountSize] = useState(() => localStorage.getItem('apex_account_size') || '');
  const [riskPct,     setRiskPct]     = useState(() => localStorage.getItem('apex_risk_pct')     || '1');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setTokenSet(d.ibkrTokenSet);
        setQueryId(d.ibkrQueryId || '');
        setConfirmQueryId(d.ibkrConfirmQueryId || '');
        setAnthropicKeySet(d.anthropicKeySet);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {};
      if (token)   body.ibkrToken   = token.trim();
      if (queryId) body.ibkrQueryId = queryId.trim();
      body.ibkrConfirmQueryId = confirmQueryId.trim();
      if (anthropicKey) body.anthropicKey = anthropicKey.trim();
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
      if (anthropicKey) { setAnthropicKey(''); setAnthropicKeySet(true); }
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
          <span style={{ fontSize: 15, fontWeight: 600 }}>⚙️ Settings</span>
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

        {/* ── Risk Settings ── */}
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', marginBottom: 12 }}>📐 Position Sizing — Risk Management</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>גודל חשבון ($)</label>
              <input className="input" type="number" placeholder="e.g. 50000" value={accountSize} onChange={e => setAccountSize(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ריסק לעסקה (%)</label>
              <input className="input" type="number" step="0.25" min="0.25" max="5" placeholder="1" value={riskPct} onChange={e => setRiskPct(e.target.value)} />
            </div>
          </div>
          {accountSize && riskPct && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
              ריסק מקסימאלי לעסקה: ${(parseFloat(accountSize) * parseFloat(riskPct) / 100).toFixed(0)}
            </div>
          )}
          <button
            onClick={() => { localStorage.setItem('apex_account_size', accountSize); localStorage.setItem('apex_risk_pct', riskPct); setMsg('Risk settings saved!'); }}
            style={{ marginTop: 10, fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid #6366f1', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
          >שמור הגדרות ריסק</button>
        </div>

        {/* ── AI Chat ── */}
        <div style={{ background: 'rgba(30,58,95,0.06)', border: '1px solid rgba(30,58,95,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>🤖 AI Chat</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 10 }}>
            כדי לשוחח עם ה-AI על העסקאות שלך צריך מפתח API של Anthropic (Claude).
            אפשר ליצור אחד ב-<b>console.anthropic.com</b> → API Keys.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Anthropic API Key {anthropicKeySet && <span style={{ color: 'var(--green)', marginLeft: 6 }}>✓ saved</span>}
            </label>
            <input
              className="input"
              type="password"
              placeholder={anthropicKeySet ? '••••••••••••• (leave blank to keep current)' : 'sk-ant-...'}
              value={anthropicKey}
              onChange={e => setAnthropicKey(e.target.value)}
            />
          </div>
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
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Query ID (Activity)</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 1443506"
              value={queryId}
              onChange={e => setQueryId(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirm Query ID — סנכרון עסקאות של היום
            </label>
            <input
              className="input"
              type="text"
              placeholder="Trade Confirmation Flex Query ID (optional)"
              value={confirmQueryId}
              onChange={e => setConfirmQueryId(e.target.value)}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              דו״ח ה-Activity מתעדכן רק בלילה, ולכן עסקאות של היום לא מופיעות בו.
              כדי לראות אותן מיד: צור ב-IBKR <b>Trade Confirmation Flex Query</b> (Reports → Flex Queries →
              Trade Confirmation), תקופה <b>Today</b>, פורמט XML, והדבק כאן את ה-Query ID.
              ה-P&L הרשמי יתווסף אוטומטית למחרת בלי למחוק הערות שכתבת.
            </div>
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
