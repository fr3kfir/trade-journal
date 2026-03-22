import { useState, useEffect } from 'react';
import { useTrades } from './hooks/useTrades';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import PnLChart from './components/PnLChart';
import TradesTable from './components/TradesTable';
import TradeModal from './components/TradeModal';
import ImportModal from './components/ImportModal';
import Stats from './components/Stats';
import Portfolio from './components/Portfolio';
import JournalSection from './components/JournalSection';
import DailySurvey from './components/DailySurvey';
import Scenarios from './components/Scenarios';
import Learning from './components/Learning';
import Routine from './components/Routine';

function calcSummary(trades) {
  const closed = trades.filter(t => t.pnl != null);
  const pnls = closed.map(t => parseFloat(t.pnl));
  const total = pnls.reduce((a, b) => a + b, 0);
  const wins = pnls.filter(p => p > 0).length;
  const winRate = closed.length ? (wins / closed.length * 100).toFixed(1) : '0.0';
  const rVals = trades.filter(t => t.r_value).map(t => parseFloat(t.r_value));
  const avgR = rVals.length ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2) : null;
  const avgWin = wins ? pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) / wins : 0;
  const losses = closed.length - wins;
  const avgLoss = losses ? Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0) / losses) : 0;
  return { total, wins, losses, winRate, avgR, count: closed.length, avgWin, avgLoss };
}

export default function App() {
  const { trades, addTrade, updateTrade, deleteTrade, importTrades } = useTrades();
  const [section, setSection] = useState('dashboard');
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
    setImportMsg(`${count} new trades imported`);
    setTimeout(() => setImportMsg(''), 4000);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/trades');
      const d = await r.json();
      importTrades(d.trades || []);
      setImportMsg('Trades synced');
    } catch { setImportMsg('Sync failed'); }
    finally { setSyncing(false); setTimeout(() => setImportMsg(''), 4000); }
  };

  const PAGE_TITLES = {
    dashboard: 'Dashboard', trades: 'Trade Log', portfolio: 'Portfolio',
    stats: 'Statistics', journal: 'Journal', survey: 'Daily Check-in',
    scenarios: 'If / Then', learning: 'Learning', routine: 'Daily Routine',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <Sidebar active={section} onSelect={setSection} />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{PAGE_TITLES[section]}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {importMsg && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>{importMsg}</span>}
              <button className="btn btn-ghost" onClick={handleManualSync} disabled={syncing} style={{ fontSize: 12 }}>
                {syncing ? 'Syncing...' : 'Sync IBKR'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowImport(true)} style={{ fontSize: 12 }}>Import CSV</button>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 12 }}>+ Add Trade</button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>

          {section === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                <StatCard label="Total P&L" value={`${s.total >= 0 ? '+' : ''}$${Math.abs(s.total).toFixed(2)}`} color={s.total >= 0 ? 'var(--green)' : 'var(--red)'} sub={`${s.count} closed trades`} />
                <StatCard label="Win Rate"  value={`${s.winRate}%`} color={parseFloat(s.winRate) >= 50 ? 'var(--green)' : 'var(--red)'} sub={`${s.wins}W / ${s.losses}L`} />
                <StatCard label="Avg Win"   value={`+$${s.avgWin.toFixed(2)}`} color="var(--green)" sub="Per winning trade" />
                <StatCard label="Avg Loss"  value={`-$${s.avgLoss.toFixed(2)}`} color="var(--red)" sub="Per losing trade" />
                <StatCard label="Avg R"     value={s.avgR ? `${s.avgR}R` : '—'} color="var(--navy)" sub="Per trade" />
                <StatCard label="Closed"    value={s.count} color="var(--text)" sub="Total trades" />
              </div>
              <PnLChart trades={trades} />
              <TradesTable trades={trades.slice(0, 50)} onUpdate={updateTrade} onDelete={deleteTrade} />
            </div>
          )}

          {section === 'trades'    && <TradesTable trades={trades} onUpdate={updateTrade} onDelete={deleteTrade} />}
          {section === 'portfolio' && <Portfolio />}
          {section === 'stats'     && <Stats trades={trades} />}
          {section === 'journal'   && <JournalSection />}
          {section === 'survey'    && <DailySurvey />}
          {section === 'scenarios' && <Scenarios />}
          {section === 'learning'  && <Learning />}
          {section === 'routine'   && <Routine />}

        </main>
      </div>

      {showAdd && (
        <TradeModal
          onSave={t => { addTrade({ ...t, id: `manual-${Date.now()}` }); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showImport && (
        <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
