import { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatILS, getCategoryLabel, EXPENSE_CATEGORIES } from '../../hooks/useFinance';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#ef4444','#14b8a6'];

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

export default function Stats({ transactions, cards, month, setMonth }) {
  // Pie: expenses by category this month
  const pieData = useMemo(() => {
    const monthTxns = transactions.filter((t) => t.date?.startsWith(month) && t.type === 'expense');
    const map = {};
    for (const t of monthTxns) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    }
    return Object.entries(map)
      .map(([cat, value]) => ({ name: getCategoryLabel(cat), value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, month]);

  // Bar: last 6 months expenses
  const barData = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(month + '-01');
      d.setMonth(d.getMonth() - i);
      const m = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('he-IL', { month: 'short' });
      const expenses = transactions
        .filter((t) => t.date?.startsWith(m) && t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);
      const income = transactions
        .filter((t) => t.date?.startsWith(m) && t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);
      result.push({ month: label, הוצאות: expenses, הכנסות: income });
    }
    return result;
  }, [transactions, month]);

  // Card breakdown
  const cardBreakdown = useMemo(() => {
    const monthTxns = transactions.filter((t) => t.date?.startsWith(month) && t.type === 'expense');
    const map = {};
    for (const t of monthTxns) {
      const key = t.cardId || '__none__';
      map[key] = (map[key] || 0) + Number(t.amount);
    }
    return Object.entries(map).map(([cardId, total]) => {
      const card = cards.find((c) => c.id === cardId);
      return { cardId, name: card ? card.name : 'ללא כרטיס', color: card?.color || '#94a3b8', total };
    }).sort((a, b) => b.total - a.total);
  }, [transactions, cards, month]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">סטטיסטיקות</h2>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      {/* Pie Chart */}
      <div className="panel">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">הוצאות לפי קטגוריה</h3>
        {pieData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">אין נתונים</p>
        ) : (
          <div className="flex flex-col gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatILS(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800 amount">{formatILS(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="panel">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">6 חודשים אחרונים</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₪${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
            <Tooltip formatter={(v) => formatILS(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="הכנסות" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Card Breakdown */}
      {cardBreakdown.length > 0 && (
        <div className="panel">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">הוצאות לפי כרטיס</h3>
          <div className="flex flex-col gap-2">
            {cardBreakdown.map((item) => (
              <div key={item.cardId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 amount">{formatILS(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
