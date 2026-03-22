import { useState, useRef } from 'react';

function parseIBKR(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const trades = [];

  // Find the Trades section header line
  let headerIdx = -1;
  let headers = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);

    // IBKR activity statement format: "Trades,Header,DataDiscriminator,..."
    if (cols[0] === 'Trades' && cols[1] === 'Header') {
      headers = cols.map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
      headerIdx = i;
      continue;
    }

    // Data rows
    if (headerIdx >= 0 && cols[0] === 'Trades' && cols[1] === 'Data') {
      const row = {};
      cols.forEach((v, i) => { row[headers[i]] = v.trim(); });

      const symbol = row['symbol'] || row['symbol_description'] || '';
      const assetCat = (row['asset_category'] || row['asset_cat_'] || '').toLowerCase();
      if (!symbol || (assetCat && !assetCat.includes('stock') && !assetCat.includes('stk'))) continue;

      const dateRaw = row['date_time'] || row['date'] || '';
      const date = dateRaw.split(',')[0].split(' ')[0].replace(/\//g, '-');
      const qty = parseFloat(row['quantity'] || '0');
      const price = parseFloat(row['t__price'] || row['price'] || row['t_price'] || '0');
      const proceeds = parseFloat(row['proceeds'] || '0');
      const comm = parseFloat(row['comm_fee'] || row['commission'] || '0');
      const realizedPL = parseFloat(row['realized_p_l'] || row['realized_pl'] || '0');
      const code = row['code'] || '';

      if (!symbol || !date || qty === 0) continue;

      trades.push({
        id: `ibkr-${symbol}-${date}-${qty}-${price}`.replace(/\s/g, ''),
        ticker: symbol.toUpperCase(),
        date,
        direction: qty > 0 ? 'L' : 'S',
        quantity: Math.abs(qty),
        entry: price || null,
        exit: null,
        stop: null,
        pnl: realizedPL || null,
        commission: comm || null,
        open_close: code.includes('O') ? 'Open' : code.includes('C') ? 'Close' : '',
        notes: 'IBKR import',
      });
    }
  }

  // Also handle simple CSV format (no "Trades,Data" prefix — Flex JSON converted to CSV)
  if (trades.length === 0) {
    const header = lines[0] ? parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')) : [];
    const symIdx = header.findIndex(h => h.includes('symbol'));
    if (symIdx >= 0) {
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const row = {};
        header.forEach((h, j) => { row[h] = (cols[j] || '').trim(); });
        const symbol = row['symbol'] || '';
        if (!symbol) continue;
        const dateRaw = row['date_time'] || row['datetime'] || row['date'] || '';
        const date = dateRaw.split(';')[0].split(' ')[0];
        const qty = parseFloat(row['quantity'] || '0');
        const price = parseFloat(row['tradeprice'] || row['price'] || '0');
        const pnl = parseFloat(row['netcash'] || row['realized_p_l'] || '0');
        if (!symbol || !date) continue;
        trades.push({
          id: `ibkr-${symbol}-${date}-${qty}-${price}`.replace(/\s/g, ''),
          ticker: symbol.toUpperCase(),
          date,
          direction: qty > 0 ? 'L' : 'S',
          quantity: Math.abs(qty),
          entry: price || null,
          exit: null,
          stop: null,
          pnl: pnl || null,
          notes: 'IBKR import',
        });
      }
    }
  }

  return trades;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

export default function ImportModal({ onImport, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const trades = parseIBKR(e.target.result);
        if (trades.length === 0) {
          setError('No trades found. Make sure you downloaded the Activity Statement CSV from IBKR.');
          return;
        }
        setPreview(trades);
        setError('');
      } catch (err) {
        setError('Could not parse file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Import from IBKR</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {!preview ? (
          <>
            {/* How to export */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>How to export from IBKR:</div>
              1. Go to <b>Account Management</b> → <b>Performance & Reports</b> → <b>Statements</b><br/>
              2. Choose <b>Activity</b> → set your date range → click <b>Run</b><br/>
              3. Click the <b>CSV</b> download icon (not PDF)
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border-light)'}`,
                borderRadius: 10,
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: dragging ? '#3b82f610' : 'transparent',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop your CSV file here</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>or click to browse</div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => processFile(e.target.files[0])} />
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#ef444420', border: '1px solid #ef444430', borderRadius: 8, fontSize: 12, color: '#ef4444' }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ background: '#22c55e18', border: '1px solid #22c55e33', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--green)' }}>
              ✓ Found <b>{preview.length} trades</b> — ready to import
            </div>

            {/* Preview table */}
            <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
              <table className="trade-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ticker</th>
                    <th>Dir</th>
                    <th>Qty</th>
                    <th>Entry</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.date}</td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.ticker}</td>
                      <td><span className={`badge ${t.direction === 'L' ? 'badge-green' : 'badge-red'}`}>{t.direction === 'L' ? 'L' : 'S'}</span></td>
                      <td style={{ fontFamily: 'monospace' }}>{t.quantity}</td>
                      <td style={{ fontFamily: 'monospace' }}>{t.entry ? `$${t.entry}` : '—'}</td>
                      <td style={{ fontFamily: 'monospace', color: t.pnl > 0 ? 'var(--green)' : t.pnl < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                        {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${parseFloat(t.pnl).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {preview.length > 20 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 11 }}>...and {preview.length - 20} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>Back</button>
              <button className="btn btn-primary" onClick={() => { onImport(preview); onClose(); }}>
                Import {preview.length} Trades
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
