import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, Clipboard } from 'lucide-react';

export default function TradeNotesModal({ trade, onSave, onClose }) {
  const [notes, setNotes] = useState(trade.notes || '');
  const [images, setImages] = useState(trade.chart_images || []);
  const [dragging, setDragging] = useState(false);
  const pasteZoneRef = useRef(null);

  const addImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImages(prev => [...prev, e.target.result]);
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
    const file = e.dataTransfer.files?.[0];
    addImage(file);
  }, [addImage]);

  const handleFileInput = (e) => {
    addImage(e.target.files?.[0]);
    e.target.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

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

        {/* Images grid */}
        {images.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {images.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img
                  src={src}
                  alt={`chart ${idx + 1}`}
                  style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain', background: '#000' }}
                />
                <button
                  onClick={() => removeImage(idx)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                    width: 28, height: 28, cursor: 'pointer', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
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
