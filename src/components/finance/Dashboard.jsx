import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatILS, getCategoryLabel, EXPENSE_CATEGORIES } from '../../hooks/useFinance';
import CardBadge from './CardBadge';

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

export default function Dashboard({ transactions, cards, budgets, month, setMonth }) {
  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date?.startsWith(month)),
    [transactions, month]
  );

  const totalIncome = useMemo(
    () => monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    [monthTxns]
  );
  const totalExpenses = useMemo(
    () => monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    [monthTxns]
  );
  const balance = totalIncome - totalExpenses;

  // Budget progress per category
  const budgetProgress = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const budget = budgets.find((b) => b.month === month && b.category === cat.value);
      const spent = monthTxns
        .filter((t) => t.type === 'expense' && t.category === cat.value)
        .reduce((s, t) => s + Number(t.amount), 0);
      return { ...cat, budget: budget?.limit || 0, spent };
    }).filter((c) => c.budget > 0 || c.spent > 0);
  }, [monthTxns, budgets, month]);

  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">דשבורד</h2>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card flex flex-col gap-1">
          <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
            <TrendingUp size={14} /> הכנסות
          </div>
          <div className="text-lg font-bold text-green-600 amount">{formatILS(totalIncome)}</div>
        </div>
        <div className="stat-card flex flex-col gap-1">
          <div className="flex items-center gap-1 text-red-500 text-xs font-semibold">
            <TrendingDown size={14} /> הוצאות
          </div>
          <div className="text-lg font-bold text-red-500 amount">{formatILS(totalExpenses)}</div>
        </div>
        <div className="stat-card flex flex-col gap-1">
          <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold">
            <Wallet size={14} /> יתרה
          </div>
          <div className={`text-lg font-bold amount ${balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {formatILS(balance)}
          </div>
        </div>
      </div>

      {/* Budget Progress */}
      {budgetProgress.length > 0 && (
        <div className="panel">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">תקציב לפי קטגוריה</h3>
          <div className="flex flex-col gap-3">
            {budgetProgress.map((cat) => {
              const pct = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
              const over = cat.budget > 0 && cat.spent > cat.budget;
              return (
                <div key={cat.value}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{cat.label}</span>
                    <span className={over ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                      <span className="amount">{formatILS(cat.spent)}</span>
                      {cat.budget > 0 && <> / <span className="amount">{formatILS(cat.budget)}</span></>}
                    </span>
                  </div>
                  {cat.budget > 0 && (
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="panel">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">עסקאות אחרונות</h3>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">אין עסקאות עדיין</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {recent.map((t) => {
              const card = cards.find((c) => c.id === t.cardId);
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {t.description || getCategoryLabel(t.category)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{t.date}</span>
                      {card && <CardBadge card={card} />}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold amount flex-shrink-0 ${
                      t.type === 'income' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}{formatILS(Math.abs(t.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
