import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, Clipboard, TrendingUp, Loader } from 'lucide-react';
import TradingViewChart from './TradingViewChart';
import { STAGES } from './constants';

function normalizeImages(raw) {
  return (raw || []).map(img =>
    typeof img === 'string' ? { src: img, stage: 'setup' } : img
  );
}

function TabBtn({ k, label, icon: Icon, current, onChange }) {
  return (
    <button
      onClick={() => onChange(k)}
      style={{
        fontSize: 12, fontWeight: current === k ? 600 : 400, padding: '6px 14px',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: 'none', color: current === k ? 'var(--navy)' : 'var(--text-faint)',
        borderBottom: `2px solid ${current === k ? 'var(--navy)' : 'transparent'}`,
        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.12s',
      }}
    >
      {Icon && <Icon size={13} />} {label}
    </button>
  );
}

export default function TradeNotesModal({ trade, onSave, onClose }) {
  const [tab, setTab] = useState('notes'); // 'notes' | 'chart'
  const [notes, setNotes] = useState(trade.notes || '');
  const [images, setImages] = useState(() => normalizeImages(trade.chart_images));
  const [dragging, setDragging] = useState(false);
  const [pendingStage, setPendingStage] = useState('setup');
  const [autoCapturing, setAutoCapturing] = useState(false);
  const pasteZoneRef = useRef(null);

  const handleAutoCapture = useCallback(async () => {
    if (autoCapturing) return;
    setAutoCapturing(true);
    try {
      const res = await fetch(`/api/tv-screenshot?ticker=${encodeURIComponent(trade.ticker)}&tf=D`);
      const data = await res.json();
      if (data.src) {
        setImages(prev => [...prev, { src: data.src, stage: pendingStage }]);
      }
    } catch { /* screenshot service unavailable */ }
    setAutoCapturing(false);
  }, [trade.ticker, pendingStage, autoCapturing]);

  const addImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImages(prev => [...prev, { src: e.target.result, stage: pendingStage }]);
    reader.readAsDataURL(file);
  }, [pendingStage]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        addImage(item.getAsFile());
        return;
      }
    }
  }, [addImage]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addImage(e.dataTransfer.files?.[0]);
  }, [addImage]);

  const handleFileInput = (e) => {
    addImage(e.target.files?.[0]);
    e.target.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));
  const setStage = (idx, stage) => setImages(prev => prev.map((img, i) => i === idx ? { ...img, stage } : img));

  const handleSave = () => {
    onSave({ notes, chart_images: images });
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      onPaste={tab === 'notes' ? handlePaste : undefined}
    >
      <div
        className="modal"
        style={{ maxWidth: tab === 'chart' ? 900 : 640, width: '95vw', transition: 'max-width 0.2s' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{trade.ticker}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{trade.date}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 18, marginTop: 12 }}>
          <TabBtn k="notes"  label="Notes & Charts" current={tab} onChange={setTab} />
          <TabBtn k="chart"  label="TradingView" icon={TrendingUp} current={tab} onChange={setTab} />
        </div>

        {/* ── TAB: Notes & Charts ── */}
        {tab === 'notes' && (
          <>
            {/* Notes textarea */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Notes / Psychology
              </label>
              <textarea
                className="input"
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Mental state, mistakes, observations, what you'd do differently..."
                style={{ resize: 'vertical', width: '100%' }}
              />
            </div>

            {/* Stage selector for next paste */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>שלב לתמונה הבאה:</span>
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setPendingStage(s.key)}
                  style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                    background: pendingStage === s.key ? s.color : 'var(--bg-card)',
                    color: pendingStage === s.key ? '#fff' : 'var(--text-faint)',
                    transition: 'all 0.1s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Paste / drop zone */}
            <div
              ref={pasteZoneRef}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragging ? 'var(--navy)' : 'var(--border)'}`,
                borderRadius: 10, padding: '16px', textAlign: 'center',
                background: dragging ? 'rgba(37,99,235,0.05)' : 'var(--bg-card)',
                transition: 'all 0.15s', marginBottom: 14, cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, flexWrap: 'wrap' }}>
                <Clipboard size={15} />
                <span>Ctrl+V להדבקה</span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span>גרור תמונה</span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <label style={{ color: 'var(--navy)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ImagePlus size={14} /> בחר קובץ
                  <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
                </label>
                <button
                  onClick={() => setTab('chart')}
                  style={{ color: 'var(--navy)', cursor: 'pointer', fontWeight: 500, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <TrendingUp size={14} /> פתח TradingView
                </button>
                <button
                  onClick={handleAutoCapture}
                  disabled={autoCapturing}
                  style={{
                    color: autoCapturing ? 'var(--text-faint)' : '#7c3aed', cursor: autoCapturing ? 'default' : 'pointer',
                    fontWeight: 500, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {autoCapturing
                    ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> מצלם...</>
                    : <><TrendingUp size={14} /> צלם TV אוטו</>}
                </button>
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              </div>
            </div>

            {/* Images list */}
            {images.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {images.map((img, idx) => {
                  const stage = STAGES.find(s => s.key === img.stage) || STAGES[0];
                  return (
                    <div key={idx} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
                      }}>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>שלב:</span>
                        {STAGES.map(s => (
                          <button
                            key={s.key}
                            onClick={() => setStage(idx, s.key)}
                            style={{
                              fontSize: 10, padding: '2px 9px', borderRadius: 10, border: 'none',
                              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                              background: img.stage === s.key ? s.color : 'var(--bg-panel)',
                              color: img.stage === s.key ? '#fff' : 'var(--text-faint)',
                              transition: 'all 0.1s',
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                        <button
                          onClick={() => removeImage(idx)}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div style={{ height: 2, background: stage.color }} />
                      <img
                        src={img.src}
                        alt={`chart ${idx + 1}`}
                        style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain', background: '#000' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: TradingView ── */}
        {tab === 'chart' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onPaste={handlePaste}>
            {/* Instruction banner */}
            <div style={{
              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--navy)', lineHeight: 1.6,
            }}>
              <strong>איך לשמור גרף:</strong> לחץ על 📷 (Camera) בתוך הגרף ← "Take a snapshot" ← הגרף יועתק.
              חזור לטאב "Notes & Charts" ולחץ <strong>Ctrl+V</strong> להדבקה — הוא יישמר אוטומטית עם שלב {STAGES.find(s => s.key === pendingStage)?.label}.
            </div>

            {/* Stage selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>שלב לשמירה:</span>
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setPendingStage(s.key)}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                    background: pendingStage === s.key ? s.color : 'var(--bg-card)',
                    color: pendingStage === s.key ? '#fff' : 'var(--text-faint)',
                    transition: 'all 0.1s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* TradingView widget */}
            <TradingViewChart ticker={trade.ticker} date={trade.date} />

            {/* Quick paste zone — visible on chart tab too */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragging ? 'var(--navy)' : 'var(--border)'}`,
                borderRadius: 8, padding: '12px', textAlign: 'center',
                background: dragging ? 'rgba(37,99,235,0.05)' : 'var(--bg-card)',
                transition: 'all 0.15s', cursor: 'default', fontSize: 12, color: 'var(--text-faint)',
              }}
            >
              <Clipboard size={13} style={{ marginBottom: 4, display: 'inline-block' }} />
              {' '}Ctrl+V כאן להדבקה · {images.length > 0 ? `${images.length} גרפים שמורים` : 'אין גרפים עדיין'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save {images.length > 0 ? `(${images.length} charts)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
