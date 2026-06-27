import { useState, useEffect } from 'react';
import { exportMonthlyExcel } from './utils/exportExcel';
import { Menu, LayoutDashboard, TrendingUp, BarChart2, BookOpen, MoreHorizontal, Eye, EyeOff, Moon, Sun } from 'lucide-react';
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
import TradeReview from './components/TradeReview';
import CalendarView from './components/CalendarView';
import ChartLibrary from './components/ChartLibrary';
import Market from './components/Market';
import SettingsModal from './components/SettingsModal';

const TF_RANGES = ['1W', '1M', '3M', 'YTD', 'ALL'];

function filterByTimeframe(trades, tf) {
  if (tf === 'ALL') return trades;
  const now = new Date();
  let cutoff;
  if (tf === '1W')  { cutoff = new Date(now); cutoff.setDate(now.getDate() - 7); }
  else if (tf === '1M')  { cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1); }
  else if (tf === '3M')  { cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 3); }
  else if (tf === 'YTD') { cutoff = new Date(now.getFullYear(), 0, 1); }
  return trades.filter(t => t.date && new Date(t.date) >= cutoff);
}

function calcSummary(trades) {
  const closed = trades.filter(t => t.pnl != null);
  const pnls = closed.map(t => parseFloat(t.pnl));
  const total = pnls.reduce((a, b) => a + b, 0);
  const wins = pnls.filter(p => p > 0).length;
  const winRate = closed.length ? (wins / closed.length * 100).toFixed(1) : '0.0';
  const rVals = closed.filter(t => t.r_value != null && t.r_value !== '').map(t => parseFloat(t.r_value)).filter(r => !isNaN(r));
  const avgR = rVals.length ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2) : null;
  const avgWin = wins ? pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) / wins : 0;
  const losses = pnls.filter(p => p < 0).length;
  const avgLoss = losses ? Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0) / losses) : 0;
  return { total, wins, losses, winRate, avgR, count: closed.length, avgWin, avgLoss };
}

export default function App() {
  const { trades, addTrade, updateTrade, deleteTrade, importTrades, clearIbkrTrades } = useTrades();
  const [section, setSection] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dashTimeframe, setDashTimeframe] = useState('ALL');
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelMonth, setExcelMonth] = useState(() => new Date().getMonth() + 1);
  const [excelYear, setExcelYear] = useState(() => new Date().getFullYear());
  const [excelRisk, setExcelRisk] = useState(400);
  const [excelMsg, setExcelMsg] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('apex_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apex_theme', theme);
  }, [theme]);
  const filteredTrades = filterByTimeframe(trades, dashTimeframe);
  const s = calcSummary(filteredTrades);

  // Auto daily IBKR sync — runs once per day automatically
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastSync = localStorage.getItem('ibkr_last_auto_sync');
    if (lastSync !== today) {
      const autoSync = async () => {
        try {
          const r1 = await fetch('/api/ibkr?step=request');
          const d1 = await r1.json();
          if (d1.error) return;
          const { refCode, dlUrl } = d1;
          for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const r2 = await fetch(`/api/ibkr?step=download&refCode=${encodeURIComponent(refCode)}&dlUrl=${encodeURIComponent(dlUrl)}`);
            const d2 = await r2.json();
            if (d2.error || d2.pending) continue;
            const count = importTrades(d2.trades || []);
            if (count > 0) {
              setImportMsg(`Auto-synced ${count} new trades from IBKR`);
              setTimeout(() => setImportMsg(''), 5000);
            }
            localStorage.setItem('ibkr_last_auto_sync', today);
            break;
          }
        } catch {}
      };
      autoSync();
    }
  }, []);

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
      // Step 1: ask IBKR to generate the report
      const r1 = await fetch('/api/ibkr?step=request');
      const d1 = await r1.json();
      if (d1.error) throw new Error(d1.error);
      const { refCode, dlUrl } = d1;

      // Step 2: poll the browser side until the report is ready (up to ~75s)
      let data = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 5000 : 5000));
        const r2 = await fetch(`/api/ibkr?step=download&refCode=${encodeURIComponent(refCode)}&dlUrl=${encodeURIComponent(dlUrl)}`);
        const d2 = await r2.json();
        if (d2.error) throw new Error(d2.error);
        if (!d2.pending) { data = d2; break; }
      }
      if (!data) throw new Error('Report took too long — try again in a moment');

      importTrades(data.trades || []);
      setImportMsg(`${data.count} trades synced from IBKR`);
    } catch (e) { setImportMsg(`Sync failed: ${e.message}`); }
    finally { setSyncing(false); setTimeout(() => setImportMsg(''), 6000); }
  };

  const handleExcelExport = async () => {
    try {
      setExcelMsg('Generating...');
      const count = await exportMonthlyExcel(trades, excelYear, excelMonth, excelRisk);
      setExcelMsg(`✓ Exported ${count} trades`);
      setTimeout(() => { setExcelMsg(''); setShowExcelModal(false); }, 2000);
    } catch (e) {
      setExcelMsg(`Error: ${e.message}`);
    }
  };

  const PAGE_TITLES = {
    dashboard: 'Dashboard', trades: 'Trade Log', portfolio: 'Portfolio',
    stats: 'Statistics', calendar: 'Calendar', review: 'Trade Review', charts: 'Chart Library',
    journal: 'Journal', survey: 'Daily Check-in',
    scenarios: 'If / Then', learning: 'Learning', routine: 'Daily Routine',
    tax: 'Tax Report', market: 'Market',
  };

  const BOTTOM_NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'trades',    label: 'Trades',    icon: TrendingUp },
    { key: 'stats',     label: 'Stats',     icon: BarChart2 },
    { key: 'journal',   label: 'Journal',   icon: BookOpen },
    { key: '__more',    label: 'More',      icon: MoreHorizontal },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }} className={hideAmounts ? 'hide-amounts' : ''}>
      {/* Sidebar */}
      <Sidebar active={section} onSelect={setSection} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} onExcelExport={() => setShowExcelModal(true)} />

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
              {/* Sync button — visible on mobile too */}
              <button
                onClick={handleManualSync}
                disabled={syncing}
                title="Sync IBKR"
                style={{
                  background: syncing ? 'var(--bg-card)' : 'var(--navy)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  cursor: syncing ? 'not-allowed' : 'pointer', display: 'flex',
                  alignItems: 'center', gap: 5, opacity: syncing ? 0.7 : 1,
                }}
              >
                {syncing ? '⟳' : '⇅'} {syncing ? 'Syncing…' : 'Sync'}
              </button>
              {importMsg && <span style={{ fontSize: 12, color: importMsg.startsWith('Sync failed') ? 'var(--red)' : 'var(--green)', fontWeight: 500 }}>{importMsg}</span>}
              <button className="btn btn-ghost hide-mobile" onClick={() => setShowSettings(true)} style={{ fontSize: 12 }}>⚙️ IBKR</button>
              <button className="btn btn-ghost hide-mobile" onClick={() => { if(confirm('Delete all IBKR trades?')) { clearIbkrTrades(); setImportMsg('IBKR trades cleared'); setTimeout(() => setImportMsg(''), 3000); }}} style={{ fontSize: 12, color: 'var(--red)' }}>Clear IBKR</button>
              <button className="btn btn-ghost hide-mobile" onClick={() => setShowExcelModal(true)} style={{ fontSize: 12, color: '#34d399' }}>📊 Excel</button>
              <button className="btn btn-ghost hide-mobile" onClick={handleExportBackup} style={{ fontSize: 12 }}>Export</button>
              <label className="btn btn-ghost" style={{ fontSize: 12, cursor: 'pointer' }}>
                Restore <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
              </label>
              <button className="btn btn-ghost hide-mobile" onClick={() => setShowImport(true)} style={{ fontSize: 12 }}>Import CSV</button>
              <button
                className="btn btn-ghost"
                onClick={() => setHideAmounts(h => !h)}
                title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
                style={{ fontSize: 12, padding: '7px 10px', color: hideAmounts ? 'var(--navy)' : 'var(--text-muted)' }}
              >
                {hideAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                style={{ fontSize: 12, padding: '7px 10px' }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 12 }}>+ Add</button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>

          {section === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Timeframe filter */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>Period:</span>
                {TF_RANGES.map(tf => (
                  <button key={tf} onClick={() => setDashTimeframe(tf)} style={{
                    fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: dashTimeframe === tf ? 'var(--navy)' : 'var(--bg-card)',
                    color: dashTimeframe === tf ? '#fff' : 'var(--text-muted)',
                    fontWeight: dashTimeframe === tf ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>{tf}</button>
                ))}
              </div>
              <div className="stat-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                <StatCard label="Total P&L" value={`${s.total >= 0 ? '+' : ''}$${Math.abs(s.total).toFixed(2)}`} color={s.total >= 0 ? 'var(--green)' : 'var(--red)'} sub={`${s.count} closed trades`} />
                <StatCard label="Win Rate"  value={`${s.winRate}%`} color={parseFloat(s.winRate) >= 50 ? 'var(--green)' : 'var(--red)'} sub={`${s.wins}W / ${s.losses}L`} />
                <StatCard label="Avg Win"   value={`+$${s.avgWin.toFixed(2)}`} color="var(--green)" sub="Per winning trade" />
                <StatCard label="Avg Loss"  value={`-$${s.avgLoss.toFixed(2)}`} color="var(--red)" sub="Per losing trade" />
                <StatCard label="Avg R"     value={s.avgR ? `${s.avgR}R` : '—'} color="var(--navy)" sub="Per trade" />
                <StatCard label="Closed"    value={s.count} color="var(--text)" sub="Total trades" />
              </div>
              <PnLChart trades={filteredTrades} externalRange={dashTimeframe === 'ALL' ? 'ALL' : dashTimeframe} />
              <div className="table-scroll">
                <TradesTable trades={filteredTrades.slice(0, 50)} onUpdate={updateTrade} onDelete={deleteTrade} />
              </div>
            </div>
          )}

          {section === 'trades'    && <div className="table-scroll"><TradesTable trades={trades} onUpdate={updateTrade} onDelete={deleteTrade} /></div>}
          {section === 'portfolio' && <Portfolio trades={trades} />}
          {section === 'stats'     && <Stats trades={trades} />}
          {section === 'calendar'  && <CalendarView trades={trades} />}
          {section === 'journal'   && <JournalSection />}
          {section === 'survey'    && <DailySurvey />}
          {section === 'scenarios' && <Scenarios />}
          {section === 'learning'  && <Learning />}
          {section === 'routine'   && <Routine />}
          {section === 'tax'       && <TaxReport />}
          {section === 'review'    && <TradeReview trades={trades} onUpdate={updateTrade} />}
          {section === 'charts'    && <ChartLibrary trades={trades} onUpdate={updateTrade} />}
          {section === 'market'    && <Market />}

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
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Excel Export Modal */}
      {showExcelModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowExcelModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>📊 Export Monthly Excel</span>
              <button onClick={() => setShowExcelModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month</label>
                  <select className="input" value={excelMonth} onChange={e => setExcelMonth(Number(e.target.value))}>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
                  <input className="input" type="number" value={excelYear} onChange={e => setExcelYear(Number(e.target.value))} min={2020} max={2030} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Per Trade ($) — for R calculations</label>
                <input className="input" type="number" value={excelRisk} onChange={e => setExcelRisk(Number(e.target.value))} placeholder="400" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px' }}>
                {(() => {
                  const count = trades.filter(t => {
                    if (t.pnl == null || !t.date) return false;
                    const [y, m] = t.date.split('-').map(Number);
                    return y === excelYear && m === excelMonth;
                  }).length;
                  return count > 0
                    ? <span style={{ color: 'var(--green)' }}>✓ {count} trades found for this month</span>
                    : <span style={{ color: 'var(--red)' }}>⚠ No closed trades for this month</span>;
                })()}
              </div>
              {excelMsg && (
                <div style={{ fontSize: 12, color: excelMsg.startsWith('Error') ? 'var(--red)' : 'var(--green)', textAlign: 'center', fontWeight: 600 }}>
                  {excelMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowExcelModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleExcelExport} style={{ background: '#059669' }}>
                  ⬇ Download Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation — mobile only */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`bottom-nav-item${section === key ? ' active' : ''}`}
            onClick={() => key === '__more' ? setSidebarOpen(true) : setSection(key)}
          >
            <Icon size={20} strokeWidth={section === key ? 2.2 : 1.6} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
