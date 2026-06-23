import { useMemo, useState } from 'react';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatILS, getCategoryLabel, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../hooks/useFinance';
import CardBadge from './CardBadge';

const ALL_CATEGORIES = [
  { value: '', label: 'כל הקטגוריות' },
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];

function MonthSelector({ month, onChange }) {
  function prev() {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - 1);
    onChange(d.toISOString().slice(0, 7));
  }
  function next() {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + 1);
    onChange(d.toISOString().slice(0, 7));
  }
  const label = new Date(month + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  return (
    <div className="flex items-center gap-2">
      <button onClick={next} className="btn btn-ghost p-1"><ChevronLeft size={16} /></button>
      <span className="text-sm font-semibold text-gray-700 min-w-[110px] text-center">{label}</span>
      <button onClick={prev} className="btn btn-ghost p-1"><ChevronRight size={16} /></button>
    </div>
  );
}

export default function TransactionsList({ transactions, cards, deleteTransaction, month, setMonth }) {
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCard, setFilterCard] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.date?.startsWith(month))
      .filter((t) => !filterCategory || t.category === filterCategory)
      .filter((t) => !filterCard || t.cardId === filterCard);
  }, [transactions, month, filterCategory, filterCard]);

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    for (const t of filtered) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  async function handleDelete(id) {
    await deleteTransaction(id);
    setConfirmDelete(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">עסקאות</h2>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          className="input flex-1 min-w-[130px]"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {ALL_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          className="input flex-1 min-w-[130px]"
          value={filterCard}
          onChange={(e) => setFilterCard(e.target.value)}
        >
          <option value="">כל הכרטיסים</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Transactions */}
      {grouped.length === 0 ? (
        <div className="panel text-center text-gray-400 py-10">
          אין עסקאות בחודש זה
        </div>
      ) : (
        grouped.map(([date, txns]) => {
          const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('he-IL', {
            weekday: 'short', day: 'numeric', month: 'long',
          });
          return (
            <div key={date}>
              <div className="text-xs font-semibold text-gray-500 mb-2 px-1">{dateLabel}</div>
              <div className="panel !p-0 overflow-hidden">
                {txns.map((t, idx) => {
                  const card = cards.find((c) => c.id === t.cardId);
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 px-4 py-3 ${idx < txns.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {t.description || getCategoryLabel(t.category)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{getCategoryLabel(t.category)}</span>
                          {card && <CardBadge card={card} />}
                        </div>
                      </div>
                      <span
                        className={`text-sm font-bold flex-shrink-0 amount ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}{formatILS(Math.abs(t.amount))}
                      </span>
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal max-w-xs" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 mb-2">מחיקת עסקה</h3>
            <p className="text-sm text-gray-500 mb-5">האם למחוק עסקה זו? הפעולה אינה הפיכה.</p>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>מחק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
