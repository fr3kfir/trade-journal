import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, Clipboard } from 'lucide-react';

const STAGES = [
  { key: 'setup', label: 'Setup',  color: '#6366f1' },
  { key: 'entry', label: 'Entry',  color: '#0ea5e9' },
  { key: 'add',   label: 'Add',    color: '#f59e0b' },
  { key: 'exit',  label: 'Exit',   color: '#ef4444' },
  { key: 'post',  label: 'Post',   color: '#8b5cf6' },
];

function normalizeImages(raw) {
  return (raw || []).map(img =>
    typeof img === 'string' ? { src: img, stage: 'setup' } : img
  );
}

export default function TradeNotesModal({ trade, onSave, onClose }) {
  const [notes, setNotes] = useState(trade.notes || '');
  const [images, setImages] = useState(() => normalizeImages(trade.chart_images));
  const [dragging, setDragging] = useState(false);
  const pasteZoneRef = useRef(null);

  const addImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImages(prev => [...prev, { src: e.target.result, stage: 'setup' }]);
    reader.readAsDataURL(file);
  }, []);

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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640, width: '95vw' }} onPaste={handlePaste}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {trade.ticker}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              {trade.date} · Notes & Charts
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

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

        {/* Paste / drop zone */}
        <div
          ref={pasteZoneRef}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? 'var(--navy)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '18px 16px',
            textAlign: 'center',
            background: dragging ? 'rgba(37,99,235,0.05)' : 'var(--bg-card)',
            transition: 'all 0.15s',
            marginBottom: 14,
            cursor: 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <Clipboard size={15} />
            <span>Ctrl+V להדבקת גרף · גרור תמונה לכאן</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <label style={{ color: 'var(--navy)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ImagePlus size={14} /> בחר קובץ
              <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Images */}
        {images.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {images.map((img, idx) => {
              const stage = STAGES.find(s => s.key === img.stage) || STAGES[0];
              return (
                <div key={idx} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                  {/* Stage selector bar */}
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
                      style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        color: 'var(--text-faint)', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', padding: 2,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Stage color strip */}
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
