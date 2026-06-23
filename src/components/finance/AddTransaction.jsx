import { useState, useRef } from 'react';
import { PlusCircle, Upload, CheckCircle } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../../hooks/useFinance';

export default function AddTransaction({ addTransaction, cards }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    amount: '',
    type: 'expense',
    category: 'food',
    description: '',
    cardId: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [csvMsg, setCsvMsg] = useState('');
  const fileRef = useRef();

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Reset category when switching type
      if (field === 'type') {
        next.category = value === 'expense' ? 'food' : 'salary';
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || isNaN(form.amount)) return;
    setSaving(true);
    try {
      await addTransaction({
        date: form.date,
        amount: Number(form.amount),
        type: form.type,
        category: form.category,
        description: form.description.trim(),
        cardId: form.cardId,
      });
      setSuccess(true);
      setForm({ date: today, amount: '', type: 'expense', category: 'food', description: '', cardId: '' });
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) { setCsvMsg('קובץ ריק'); return; }
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
      const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('תאריך'));
      const descIdx = header.findIndex((h) => h.includes('desc') || h.includes('תיאור') || h.includes('פירוט'));
      const amtIdx = header.findIndex((h) => h.includes('amount') || h.includes('סכום') || h.includes('חיוב'));

      if (dateIdx === -1 || amtIdx === -1) {
        setCsvMsg('לא נמצאו עמודות תאריך/סכום בקובץ');
        return;
      }

      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
        const rawDate = cols[dateIdx] || '';
        const rawAmt = cols[amtIdx] || '';
        const desc = descIdx >= 0 ? cols[descIdx] : '';
        const amt = parseFloat(rawAmt.replace(/[^\d.-]/g, ''));
        if (!amt || isNaN(amt)) continue;

        // Try to parse date
        let date = rawDate;
        // Handle DD/MM/YYYY
        const dm = rawDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dm) {
          const y = dm[3].length === 2 ? '20' + dm[3] : dm[3];
          date = `${y}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
        }

        await addTransaction({
          date,
          amount: Math.abs(amt),
          type: amt < 0 ? 'expense' : 'expense',
          category: 'other_expense',
          description: desc,
          cardId: form.cardId || '',
        });
        count++;
      }
      setCsvMsg(`יובאו ${count} עסקאות`);
      fileRef.current.value = '';
      setTimeout(() => setCsvMsg(''), 3000);
    };
    reader.readAsText(file, 'UTF-8');
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-gray-800">הוספת עסקה</h2>

      <div className="panel">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => set('type', 'expense')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                form.type === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              הוצאה
            </button>
            <button
              type="button"
              onClick={() => set('type', 'income')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                form.type === 'income'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              הכנסה
            </button>
          </div>

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">תאריך</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">סכום (₪)</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
                dir="ltr"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">קטגוריה</label>
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">תיאור (אופציונלי)</label>
            <input
              type="text"
              className="input"
              placeholder="תיאור העסקה..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Card */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">כרטיס אשראי</label>
            <select className="input" value={form.cardId} onChange={(e) => set('cardId', e.target.value)}>
              <option value="">ללא כרטיס</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.lastFour ? ` (****${c.lastFour})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`btn w-full justify-center py-3 text-base rounded-xl font-semibold transition-all ${
              success
                ? 'bg-green-500 text-white'
                : 'btn-primary'
            }`}
          >
            {success ? (
              <><CheckCircle size={18} /> נשמר!</>
            ) : saving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><PlusCircle size={18} /> הוסף עסקה</>
            )}
          </button>
        </form>
      </div>

      {/* CSV Import */}
      <div className="panel">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">יבוא מ-CSV</h3>
        <p className="text-xs text-gray-400 mb-3">
          העלה קובץ CSV מהבנק. נדרשות עמודות: date/תאריך, amount/סכום, ואופציונלית description/תיאור.
        </p>
        <label className="btn btn-ghost cursor-pointer gap-2">
          <Upload size={16} />
          בחר קובץ CSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSV}
          />
        </label>
        {csvMsg && (
          <p className="text-sm text-blue-600 mt-2 font-medium">{csvMsg}</p>
        )}
      </div>
    </div>
  );
}
