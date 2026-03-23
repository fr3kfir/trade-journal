import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
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
import TaxReport from './components/TaxReport';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const s = calcSummary(trades);

  useEffect(() => {
    // Catch migration data from URL hash
    if (window.location.hash && window.location.hash.length > 1) {
      try {
        const data = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
        if (Array.isArray(data) && data.length) {
          importTrades(data);
          setImportMsg(`${data.length} trades restored!`);
          setTimeout(() => setImportMsg(''), 5000);
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch {}
    }
    fetch('/api/trades')
      .then(r => r.json())
      .then(d => { if (d.trades?.length) importTrades(d.trades); })
      .catch(() => {});
  }, []);

  const handleExportBackup = () => {
    const data = JSON.stringify(trades, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'apex_trades_backup.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed)) {
          importTrades(parsed);
          setImportMsg(`${parsed.length} trades restored from backup`);
          setTimeout(() => setImportMsg(''), 4000);
        }
      } catch { setImportMsg('Invalid backup file'); setTimeout(() => setImportMsg(''), 4000); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
    tax: 'Tax Report',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <Sidebar active={section} onSelect={setSection} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Hamburger — mobile only */}
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{PAGE_TITLES[section]}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              {importMsg && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }} className="hide-mobile">{importMsg}</span>}
              <button className="btn btn-ghost hide-mobile" onClick={handleManualSync} disabled={syncing} style={{ fontSize: 12 }}>
                {syncing ? 'Syncing...' : 'Sync IBKR'}
              </button>
              <button className="btn btn-ghost hide-mobile" onClick={handleExportBackup} style={{ fontSize: 12 }}>Export</button>
              <label className="btn btn-ghost hide-mobile" style={{ fontSize: 12, cursor: 'pointer' }}>
                Restore <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
              </label>
              <button className="btn btn-ghost hide-mobile" onClick={() => setShowImport(true)} style={{ fontSize: 12 }}>Import CSV</button>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 12 }}>+ Add</button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>

          {section === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="stat-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                <StatCard label="Total P&L" value={`${s.total >= 0 ? '+' : ''}$${Math.abs(s.total).toFixed(2)}`} color={s.total >= 0 ? 'var(--green)' : 'var(--red)'} sub={`${s.count} closed trades`} />
                <StatCard label="Win Rate"  value={`${s.winRate}%`} color={parseFloat(s.winRate) >= 50 ? 'var(--green)' : 'var(--red)'} sub={`${s.wins}W / ${s.losses}L`} />
                <StatCard label="Avg Win"   value={`+$${s.avgWin.toFixed(2)}`} color="var(--green)" sub="Per winning trade" />
                <StatCard label="Avg Loss"  value={`-$${s.avgLoss.toFixed(2)}`} color="var(--red)" sub="Per losing trade" />
                <StatCard label="Avg R"     value={s.avgR ? `${s.avgR}R` : '—'} color="var(--navy)" sub="Per trade" />
                <StatCard label="Closed"    value={s.count} color="var(--text)" sub="Total trades" />
              </div>
              <PnLChart trades={trades} />
              <div className="table-scroll">
                <TradesTable trades={trades.slice(0, 50)} onUpdate={updateTrade} onDelete={deleteTrade} />
              </div>
            </div>
          )}

          {section === 'trades'    && <div className="table-scroll"><TradesTable trades={trades} onUpdate={updateTrade} onDelete={deleteTrade} /></div>}
          {section === 'portfolio' && <Portfolio />}
          {section === 'stats'     && <Stats trades={trades} />}
          {section === 'journal'   && <JournalSection />}
          {section === 'survey'    && <DailySurvey />}
          {section === 'scenarios' && <Scenarios />}
          {section === 'learning'  && <Learning />}
          {section === 'routine'   && <Routine />}
          {section === 'tax'       && <TaxReport />}

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
