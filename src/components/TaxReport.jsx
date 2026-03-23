import { useState, useMemo } from 'react';
import { useTrades } from '../hooks/useTrades';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

// Israeli CPI (CBS) — Base: 2020=100
const CPI = {
  2020: { jan: 100.6, dec: 100.9 },
  2021: { jan: 100.7, dec: 103.1 },
  2022: { jan: 103.7, dec: 111.4 },
  2023: { jan: 112.2, dec: 117.9 },
  2024: { jan: 118.3, dec: 121.6 },
  2025: { jan: 122.0, dec: null },
};

// מס יסף thresholds (ILS)
const YESSEF = {
  2020: 647640, 2021: 647640, 2022: 663240,
  2023: 721560, 2024: 721560, 2025: 738120,
};

const ILS = (n) => `₪${Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const USD = (n) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function calcReport(trades, year, rate) {
  const yearTrades = trades.filter(
    t => t.pnl != null && t.date && String(t.date).startsWith(String(year))
  );
  if (!yearTrades.length) return null;

  const cpi = CPI[year] || { jan: null, dec: null };
  const yessefThreshold = YESSEF[year] || 721560;
  const hasCpi = cpi.jan && cpi.dec;
  const cpiRatio = hasCpi ? cpi.jan / cpi.dec : null; // <1 means inflation eroded gains

  let grossProfitUsd = 0, grossLossUsd = 0, totalCommUsd = 0;

  for (const t of yearTrades) {
    const pnl = parseFloat(t.pnl) || 0;
    const comm = parseFloat(t.commission) || 0;
    if (pnl > 0) grossProfitUsd += pnl;
    else grossLossUsd += pnl; // negative
    totalCommUsd += comm;
  }

  const netNominalUsd = grossProfitUsd + grossLossUsd - totalCommUsd;
  const netNominalIls = netNominalUsd * rate;

  // After loss offset
  const afterOffsetIls = netNominalIls; // losses already subtracted above

  // CPI adjustment: real gain = nominal × (jan_index / dec_index)
  const realGainIls = hasCpi ? afterOffsetIls * cpiRatio : afterOffsetIls;
  const inflationDeductionIls = afterOffsetIls - realGainIls;

  // Capital gains tax 25%
  const taxableBase = Math.max(realGainIls, 0);
  const capitalGainsTax = taxableBase * 0.25;

  // מס יסף 3%
  const yessefApplies = realGainIls > yessefThreshold;
  const yessefTax = yessefApplies ? realGainIls * 0.03 : 0;

  const totalTax = capitalGainsTax + yessefTax;

  return {
    year, rate, cpi, hasCpi, cpiRatio, yessefThreshold, yessefApplies,
    yearTrades,
    grossProfitUsd, grossLossUsd, totalCommUsd, netNominalUsd,
    grossProfitIls: grossProfitUsd * rate,
    grossLossIls: grossLossUsd * rate,
    totalCommIls: totalCommUsd * rate,
    netNominalIls, afterOffsetIls,
    realGainIls, inflationDeductionIls,
    taxableBase, capitalGainsTax, yessefTax, totalTax,
  };
}

function Row({ label, value, bold, color, border }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0',
      borderTop: border ? '1px solid var(--border)' : undefined,
      fontWeight: bold ? 700 : 400,
      color: color || 'var(--text)',
      fontSize: bold ? 15 : 14,
    }}>
      <span style={{ color: bold ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function TaxReport() {
  const { trades } = useTrades();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [usdToIls, setUsdToIls] = useState('3.7');

  const rate = parseFloat(usdToIls) || 3.7;
  const r = useMemo(() => calcReport(trades, taxYear, rate), [trades, taxYear, rate]);

  const noTrades = trades.filter(
    t => t.pnl != null && t.date && String(t.date).startsWith(String(taxYear))
  ).length === 0;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }} dir="rtl">

      {/* Controls */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '18px 22px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end',
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
            type="number" step="0.01" min="1" max="20"
            value={usdToIls}
            onChange={e => setUsdToIls(e.target.value)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: 8, padding: '8px 12px',
              fontSize: 14, width: 90, fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>עסקאות סגורות</label>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 600,
            color: noTrades ? 'var(--text-muted)' : 'var(--green)',
            minWidth: 50, textAlign: 'center',
          }}>
            {r ? r.yearTrades.length : 0}
          </div>
        </div>

        <button
          onClick={() => window.print()}
          disabled={!r}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: r ? 'var(--navy)' : 'var(--border)',
            color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: r ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          הדפס דוח
        </button>
      </div>

      {noTrades && (
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 32, textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 14,
        }}>
          אין עסקאות סגורות לשנת {taxYear}
        </div>
      )}

      {r && <>

        {/* 1. Trade summary */}
        <Section title="1. סיכום עסקאות">
          <Row label="סך רווחים ברוטו" value={<span style={{ color: 'var(--green)' }}>+{ILS(r.grossProfitIls)} ({USD(r.grossProfitUsd)})</span>} />
          <Row label="סך הפסדים" value={<span style={{ color: 'var(--red)' }}>−{ILS(Math.abs(r.grossLossIls))} ({USD(Math.abs(r.grossLossUsd))})</span>} />
          <Row label="סך עמלות" value={`−${ILS(r.totalCommIls)} (${USD(r.totalCommUsd)})`} />
          <Row label="רווח נומינלי נטו" value={
            <span style={{ color: r.netNominalIls >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {r.netNominalIls >= 0 ? '+' : '−'}{ILS(Math.abs(r.netNominalIls))}
            </span>
          } bold border />
        </Section>

        {/* 2. CPI adjustment */}
        <Section title="2. תיקון אינפלציוני (מדד)">
          {r.hasCpi ? <>
            <Row label={`מדד ינואר ${r.year}`} value={r.cpi.jan} />
            <Row label={`מדד דצמבר ${r.year}`} value={r.cpi.dec} />
            <Row label="יחס מדד (ינואר/דצמבר)" value={r.cpiRatio.toFixed(4)} />
            <Row label="ניכוי אינפלציוני" value={`−${ILS(Math.abs(r.inflationDeductionIls))}`} />
            <Row label="רווח ריאלי לאחר מדד" value={
              <span style={{ color: r.realGainIls >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {r.realGainIls >= 0 ? '+' : '−'}{ILS(Math.abs(r.realGainIls))}
              </span>
            } bold border />
          </> : <>
            <Row label="נתוני מדד" value="לא זמינים לשנה שוטפת" />
            <Row label="בסיס מס (נומינלי)" value={ILS(r.netNominalIls)} bold border />
          </>}
        </Section>

        {/* 3. Capital gains tax */}
        <Section title="3. מס רווחי הון">
          <Row label="בסיס המס" value={ILS(r.taxableBase)} />
          <Row label="שיעור מס" value="25%" />
          <Row label="מס רווחי הון לתשלום" value={<span style={{ color: 'var(--red)' }}>{ILS(r.capitalGainsTax)}</span>} bold border />
        </Section>

        {/* 4. מס יסף */}
        <Section title="4. מס יסף (3%)">
          <Row label={`סף מס יסף ${r.year}`} value={ILS(r.yessefThreshold)} />
          <Row label="רווח ריאלי" value={ILS(r.realGainIls)} />
          <Row label="חריגה מהסף" value={r.yessefApplies
            ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>כן — {ILS(r.realGainIls - r.yessefThreshold)} מעל הסף</span>
            : <span style={{ color: 'var(--green)', fontWeight: 600 }}>לא</span>
          } />
          {r.yessefApplies && (
            <Row label="מס יסף לתשלום" value={<span style={{ color: 'var(--red)' }}>{ILS(r.yessefTax)}</span>} bold border />
          )}
        </Section>

        {/* 5. Total */}
        <Section title="5. סיכום — טופס 1322">
          <Row label="רווח הון חייב במס" value={ILS(r.taxableBase)} />
          <Row label="מס רווחי הון (25%)" value={ILS(r.capitalGainsTax)} />
          {r.yessefApplies && <Row label="מס יסף (3%)" value={ILS(r.yessefTax)} />}
          <Row
            label="סה״כ מס לתשלום"
            value={<span style={{ color: 'var(--red)', fontSize: 16 }}>{ILS(r.totalTax)}</span>}
            bold border
          />
          <div style={{
            marginTop: 14, padding: '12px 16px', background: 'var(--bg-card)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8,
          }}>
            <strong style={{ color: 'var(--text)' }}>נתונים לטופס 1322:</strong><br />
            רווח הון חייב במס: {ILS(r.taxableBase)}<br />
            מס בשיעור 25%: {ILS(r.capitalGainsTax)}<br />
            {r.yessefApplies && <>מס יסף: {ILS(r.yessefTax)}<br /></>}
            סה״כ לתשלום: {ILS(r.totalTax)}
          </div>
        </Section>

        <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', paddingBottom: 8 }}>
          * הדוח מיועד לעזר בלבד ואינו תחליף לייעוץ מס מקצועי. מדד המחירים: הלמ״ס.
        </div>
      </>}
    </div>
  );
}
