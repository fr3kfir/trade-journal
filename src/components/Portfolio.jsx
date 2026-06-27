import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

function fmt$(v, sign = false) {
  const s = sign ? (v >= 0 ? '+' : '') : '';
  return `${s}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PnlBadge({ value }) {
  if (value == null || isNaN(value)) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  const color = value > 0 ? 'var(--green)' : value < 0 ? 'var(--red)' : 'var(--text-faint)';
  return <span style={{ fontWeight: 700, color }} className="amount">{fmt$(value, true)}</span>;
}

function BarCell({ value, nav }) {
  if (!nav || !value) return null;
  const pct = Math.min(Math.abs(value / nav) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--navy)', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 34 }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function RiskWarning({ position, nav }) {
  if (!position.costBasis || !position.quantity) return null;
  const stopPct = 0.08; // default 8% stop if no stop defined
  const riskAmt = Math.abs(position.quantity) * position.costBasis * stopPct;
  const riskPct = nav ? (riskAmt / nav * 100) : null;
  if (riskPct && riskPct > 2) {
    return <AlertTriangle size={12} color="#d97706" title={`Estimated risk > 2% of NAV`} />;
  }
  return null;
}

export default function Portfolio({ trades = [] }) {
  const [ibkr, setIbkr]       = useState(null);   // { positions, nav, totalUnrealized, totalExposure, updatedAt }
  const [loading, setLoading]  = useState(true);
  const [syncing, setSyncing]  = useState(false);
  const [error, setError]      = useState('');

  const loadCached = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/ibkr?step=portfolio');
      const d = await r.json();
      setIbkr(d?.positions ? d : null);
    } catch { setIbkr(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCached(); }, [loadCached]);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      const r1 = await fetch('/api/ibkr?step=request');
      const d1 = await r1.json();
      if (d1.error) throw new Error(d1.error);
      const { refCode, dlUrl } = d1;

      let portfolio = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const r2 = await fetch(`/api/ibkr?step=download&refCode=${encodeURIComponent(refCode)}&dlUrl=${encodeURIComponent(dlUrl)}`);
        const d2 = await r2.json();
        if (d2.error) throw new Error(d2.error);
        if (!d2.pending) { portfolio = d2.portfolio; break; }
      }
      if (portfolio) setIbkr(portfolio);
      else setError('Report ready but no position data — make sure your Flex query includes Open Positions');
    } catch (e) {
      setError(e.message);
    } finally { setSyncing(false); }
  };

  const updatedAgo = ibkr?.updatedAt ? (() => {
    const ms = Date.now() - new Date(ibkr.updatedAt).getTime();
    const m  = Math.floor(ms / 60000);
    const h  = Math.floor(m / 60);
    if (h > 0)  return `לפני ${h}ש'`;
    if (m > 0)  return `לפני ${m}ד'`;
    return 'זה עתה';
  })() : null;

  const hasPositions = ibkr?.positions?.length > 0;
  const nav          = ibkr?.nav;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Portfolio — פוזיציות פתוחות</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            {ibkr?.updatedAt ? (
              <><Wifi size={12} color="var(--green)" /><span style={{ fontSize: 12, color: 'var(--text-faint)' }}>IBKR · עודכן {updatedAgo}</span></>
            ) : (
              <><WifiOff size={12} color="var(--text-faint)" /><span style={{ fontSize: 12, color: 'var(--text-faint)' }}>לא מסונכרן</span></>
            )}
          </div>
        </div>
        <button
          onClick={handleSync} disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: syncing ? 'var(--bg-card)' : 'var(--navy)',
            color: syncing ? 'var(--text-faint)' : '#fff',
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'מסנכרן עם IBKR…' : 'Sync IBKR'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#dc262618', border: '1px solid #dc262633', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* NAV + Summary Cards */}
      {(nav || ibkr?.totalUnrealized != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {nav && (
            <div style={{ background: 'var(--navy)', borderRadius: 10, padding: '14px 16px', color: '#fff' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Net Liquidation (NAV)</div>
              <div style={{ fontSize: 24, fontWeight: 800 }} className="amount">{fmt$(nav)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>גודל חשבון IBKR</div>
            </div>
          )}
          {ibkr?.totalUnrealized != null && (
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Unrealized P&L</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: ibkr.totalUnrealized >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">
                {fmt$(ibkr.totalUnrealized, true)}
              </div>
            </div>
          )}
          {ibkr?.totalExposure > 0 && (
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>חשיפה כוללת</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }} className="amount">{fmt$(ibkr.totalExposure)}</div>
              {nav && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{(ibkr.totalExposure / nav * 100).toFixed(0)}% מה-NAV</div>}
            </div>
          )}
          {hasPositions && (
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>פוזיציות פתוחות</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{ibkr.positions.length}</div>
            </div>
          )}
        </div>
      )}

      {/* IBKR Positions Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>טוען פוזיציות מ-IBKR…</div>
      ) : hasPositions ? (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>IBKR — פוזיציות חיות</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  {['מניה', 'כיוון', 'כמות', 'עלות ממוצעת', 'מחיר כעת', 'Unreal. P&L', 'שווי', '% NAV', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ibkr.positions.map((p, i) => {
                  const isLong = p.side === 'Long' || p.quantity > 0;
                  const pnlPct = p.costBasis && p.markPrice ? ((p.markPrice - p.costBasis) / p.costBasis * 100 * (isLong ? 1 : -1)) : null;
                  return (
                    <tr key={p.symbol + i} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Symbol */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{p.symbol}</div>
                        {p.description && (
                          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      {/* Side */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                          background: isLong ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                          color: isLong ? 'var(--green)' : 'var(--red)',
                          display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content',
                        }}>
                          {isLong ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {isLong ? 'Long' : 'Short'}
                        </span>
                      </td>
                      {/* Qty */}
                      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13 }}>
                        {Math.abs(p.quantity).toLocaleString()}
                      </td>
                      {/* Cost */}
                      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--text-muted)' }}>
                        {p.costBasis ? fmt$(p.costBasis) : '—'}
                      </td>
                      {/* Mark */}
                      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13 }}>
                        {p.markPrice ? (
                          <div>
                            <div>{fmt$(p.markPrice)}</div>
                            {pnlPct != null && (
                              <div style={{ fontSize: 10, color: pnlPct >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                                {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      {/* Unreal P&L */}
                      <td style={{ padding: '10px 12px' }}>
                        <PnlBadge value={p.unrealizedPnl} />
                      </td>
                      {/* Position Value */}
                      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--text-muted)' }}>
                        {p.positionValue ? fmt$(Math.abs(p.positionValue)) : '—'}
                      </td>
                      {/* % NAV */}
                      <td style={{ padding: '10px 12px', minWidth: 100 }}>
                        <BarCell value={Math.abs(p.positionValue)} nav={nav} />
                      </td>
                      {/* Risk warning */}
                      <td style={{ padding: '10px 12px' }}>
                        <RiskWarning position={p} nav={nav} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>אין פוזיציות מ-IBKR</div>
          <div style={{ fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
            לחץ <strong>Sync IBKR</strong> למעלה לעדכון.<br />
            אם הסינכרון עובד אבל אין פוזיציות — צריך להוסיף <strong>Open Positions</strong> לשאילתת ה-Flex שלך ב-IBKR
            (ראה הוראות למטה).
          </div>
        </div>
      )}

      {/* Instructions banner */}
      <div style={{
        background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 10, padding: '14px 18px',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 10 }}>
          ⚙️ הגדרת Flex Query ב-IBKR (פעם אחת)
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 2 }}>
          <li>כנס ל-<strong>client.ibkr.com</strong> → <strong>Performance &amp; Reports</strong> → <strong>Flex Queries</strong></li>
          <li>לחץ על השאילתה הקיימת שלך (Query ID: <strong>1443506</strong>) ועריכה</li>
          <li>תחת <strong>Sections</strong> → הוסף: <strong>Open Positions</strong> ו-<strong>Equity Summary by Report Date in Base</strong></li>
          <li>ב-Open Positions → בחר את כל השדות, ובמיוחד: <em>Symbol, Position, Mark Price, Cost Basis Price, Position Value, Unrealized P&amp;L, % of NAV, Side</em></li>
          <li>שמור → חזור לכאן ולחץ <strong>Sync IBKR</strong></li>
        </ol>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
