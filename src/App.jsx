import { useState, useEffect } from 'react';
import { useTrades } from './hooks/useTrades';
import StatCard from './components/StatCard';
import PnLChart from './components/PnLChart';
import TradesTable from './components/TradesTable';
import TradeModal from './components/TradeModal';
import ImportModal from './components/ImportModal';
import Stats from './components/Stats';

function calcSummary(trades) {
  const closed = trades.filter(t => t.pnl != null);
  const pnls = closed.map(t => parseFloat(t.pnl));
  const total = pnls.reduce((a, b) => a + b, 0);
  const wins = pnls.filter(p => p > 0).length;
  const winRate = closed.length ? (wins / closed.length * 100).toFixed(1) : '0.0';
  const rVals = trades.filter(t => t.r_value).map(t => parseFloat(t.r_value));
  const avgR = rVals.length ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2) : null;
  return { total, wins, losses: closed.length - wins, winRate, avgR, count: closed.length };
}

export default function App() {
  const { trades, addTrade, updateTrade, deleteTrade, importTrades } = useTrades();
  const [tab, setTab] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const s = calcSummary(trades);

  useEffect(() => {
    fetch('/api/trades')
      .then(r => r.json())
      .then(d => { if (d.trades?.length) importTrades(d.trades); })
      .catch(() => {});
  }, []);

  const handleImport = (newTrades) => {
    const count = importTrades(newTrades);
    setImportMsg(`${count} new trade${count !== 1 ? 's' : ''} imported`);
    setTimeout(() => setImportMsg(''), 4000);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/trades');
      const d = await r.json();
      const count = importTrades(d.trades || []);
      setImportMsg(`${count} new trades synced`);
    } catch { setImportMsg('Sync failed'); }
    finally { setSyncing(false); setTimeout(() => setImportMsg(''), 4000); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 32 }}>

          {/* Logo */}
          <div style={{ flexShrink: 0 }}>
            <img src="/logo.svg" alt="ApexJournal" style={{ height: 36, display: 'block' }} />
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', gap: 24, borderBottom: 'none', height: '100%', alignItems: 'stretch' }}>
            {[['dashboard','Dashboard'], ['trades','Trades'], ['stats','Statistics']].map(([key, label]) => (
              <button
                key={key}
                className={`nav-tab ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
                style={{ paddingLeft: 0, paddingRight: 0 }}
              >{label}</button>
            ))}
          </nav>

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {importMsg && (
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>{importMsg}</span>
            )}
            <button className="btn btn-ghost" onClick={handleManualSync} disabled={syncing} style={{ fontSize: 12 }}>
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowImport(true)} style={{ fontSize: 12 }}>Import CSV</button>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 12 }}>+ Add Trade</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 24px' }}>

        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard
                label="Total P&L"
                value={`${s.total >= 0 ? '+' : ''}$${Math.abs(s.total).toFixed(2)}`}
                color={s.total >= 0 ? 'var(--green)' : 'var(--red)'}
                sub={`${s.count} closed trades`}
              />
              <StatCard
                label="Win Rate"
                value={`${s.winRate}%`}
                color={parseFloat(s.winRate) >= 50 ? 'var(--green)' : 'var(--red)'}
                sub={`${s.wins}W / ${s.losses}L`}
              />
              <StatCard
                label="Avg R"
                value={s.avgR ? `${s.avgR}R` : '—'}
                color="var(--navy)"
                sub="Per trade"
              />
              <StatCard
                label="Total Trades"
                value={s.count}
                color="var(--text)"
                sub="Closed"
              />
            </div>
            <PnLChart trades={trades} />
            <TradesTable trades={trades.slice(0, 30)} onUpdate={updateTrade} onDelete={deleteTrade} />
          </div>
        )}

        {tab === 'trades' && (
          <TradesTable trades={trades} onUpdate={updateTrade} onDelete={deleteTrade} />
        )}

        {tab === 'stats' && <Stats trades={trades} />}
      </main>

      {showAdd && (
        <TradeModal
          onSave={t => { addTrade({ ...t, id: `manual-${Date.now()}` }); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
