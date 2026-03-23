import { useState } from 'react';
import { useTrades } from '../hooks/useTrades';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

export default function TaxReport() {
  const { trades } = useTrades();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [usdToIls, setUsdToIls] = useState('3.7');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const closedForYear = trades.filter(
    t => t.pnl != null && t.date && String(t.date).startsWith(String(taxYear))
  );

  const generate = async () => {
    setError('');
    setReport('');
    setLoading(true);
    try {
      const res = await fetch('/api/tax-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades, taxYear, usdToIls: parseFloat(usdToIls) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyReport = () => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const printReport = () => window.print();

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Controls */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px 24px', display: 'flex', flexWrap: 'wrap',
        gap: 16, alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>שנת מס</label>
          <select
            value={taxYear}
            onChange={e => setTaxYear(Number(e.target.value))}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: 8, padding: '8px 12px',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>שער USD/ILS (ממוצע שנתי)</label>
          <input
            type="number"
            step="0.01"
            min="1"
            max="20"
            value={usdToIls}
            onChange={e => setUsdToIls(e.target.value)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: 8, padding: '8px 12px',
              fontSize: 14, width: 100, fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>עסקאות סגורות</label>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 14px', fontSize: 14,
            color: closedForYear.length > 0 ? 'var(--green)' : 'var(--text-muted)',
            fontWeight: 600, minWidth: 60, textAlign: 'center',
          }}>
            {closedForYear.length}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || closedForYear.length === 0}
          style={{
            padding: '9px 22px', borderRadius: 8, border: 'none',
            background: loading ? 'var(--border)' : 'var(--navy)',
            color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: loading || closedForYear.length === 0 ? 'not-allowed' : 'pointer',
            opacity: closedForYear.length === 0 ? 0.5 : 1,
            fontFamily: 'inherit', transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'מחשב...' : 'הפק דוח מס'}
        </button>
      </div>

      {closedForYear.length === 0 && (
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 24, textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 14,
        }}>
          אין עסקאות סגורות לשנת {taxYear}.<br />
          <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
            עסקה נספרת כשיש לה ערך בעמודת P&L.
          </span>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 10, padding: '14px 18px',
          color: '#dc2626', fontSize: 14,
        }}>
          שגיאה: {error}
        </div>
      )}

      {loading && (
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 40, textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 14,
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
          Claude מחשב את דוח המס שלך...<br />
          <span style={{ fontSize: 12 }}>זה עשוי לקחת כ-20 שניות</span>
        </div>
      )}

      {report && (
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {/* Report toolbar */}
          <div style={{
            borderBottom: '1px solid var(--border)', padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              דוח מס רווחי הון — {taxYear}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={copyReport}
                style={{
                  padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--bg-panel)', color: 'var(--text)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {copied ? '✓ הועתק' : 'העתק'}
              </button>
              <button
                onClick={printReport}
                className="no-print"
                style={{
                  padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--bg-panel)', color: 'var(--text)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                הדפס
              </button>
            </div>
          </div>

          {/* Report body — RTL Hebrew */}
          <div
            dir="rtl"
            style={{
              padding: '24px 28px',
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.85,
              whiteSpace: 'pre-wrap',
              fontFamily: "'Segoe UI', 'Arial Hebrew', Arial, sans-serif",
            }}
          >
            {report}
          </div>
        </div>
      )}

    </div>
  );
}
