import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import {
  PlusCircle, Trash2, LogOut, CreditCard, PiggyBank, Pencil, Check, X,
} from 'lucide-react';
import { CARD_COLORS, EXPENSE_CATEGORIES, formatILS, currentMonth } from '../../hooks/useFinance';

function CardRow({ card, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(card.name);
  const [lastFour, setLastFour] = useState(card.lastFour || '');
  const [color, setColor] = useState(card.color || CARD_COLORS[0]);

  async function save() {
    await onUpdate(card.id, { name: name.trim(), lastFour: lastFour.trim(), color });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 flex flex-col gap-2">
        <input className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="שם כרטיס" />
        <input className="input text-sm" value={lastFour} onChange={(e) => setLastFour(e.target.value)} placeholder="4 ספרות אחרונות" maxLength={4} dir="ltr" />
        <div className="flex gap-1 flex-wrap">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1 justify-center py-1.5 text-sm" onClick={save}><Check size={14} /> שמור</button>
          <button className="btn btn-ghost flex-1 justify-center py-1.5 text-sm" onClick={() => setEditing(false)}><X size={14} /> ביטול</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: card.color || '#6366f1' }} />
      <span className="flex-1 text-sm font-medium text-gray-800">
        {card.name}{card.lastFour ? ` ****${card.lastFour}` : ''}
      </span>
      <button className="text-gray-400 hover:text-blue-500 transition-colors" onClick={() => setEditing(true)}>
        <Pencil size={14} />
      </button>
      <button className="text-gray-300 hover:text-red-500 transition-colors" onClick={() => onDelete(card.id)}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function Settings({ cards, budgets, addCard, updateCard, deleteCard, setBudget, deleteBudget }) {
  const [newCardName, setNewCardName] = useState('');
  const [newCardLast4, setNewCardLast4] = useState('');
  const [newCardColor, setNewCardColor] = useState(CARD_COLORS[0]);
  const [addingCard, setAddingCard] = useState(false);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(null);

  const mon = currentMonth();

  async function handleAddCard() {
    if (!newCardName.trim()) return;
    await addCard({ name: newCardName.trim(), lastFour: newCardLast4.trim(), color: newCardColor });
    setNewCardName('');
    setNewCardLast4('');
    setNewCardColor(CARD_COLORS[0]);
    setAddingCard(false);
  }

  async function handleDeleteCard(id) {
    await deleteCard(id);
    setConfirmDeleteCard(null);
  }

  async function handleBudgetChange(category, value) {
    const num = parseFloat(value);
    if (!value || isNaN(num)) return;
    await setBudget(mon, category, num);
  }

  function getBudget(category) {
    return budgets.find((b) => b.month === mon && b.category === category)?.limit || '';
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-gray-800">הגדרות</h2>

      {/* Cards */}
      <div className="panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <CreditCard size={15} /> כרטיסי אשראי
          </h3>
          <button className="btn btn-ghost text-xs py-1 px-2" onClick={() => setAddingCard(true)}>
            <PlusCircle size={14} /> הוסף
          </button>
        </div>

        {addingCard && (
          <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 flex flex-col gap-2 mb-3">
            <input
              className="input text-sm"
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              placeholder="שם הכרטיס (למשל: ויזה של שרה)"
            />
            <input
              className="input text-sm"
              value={newCardLast4}
              onChange={(e) => setNewCardLast4(e.target.value)}
              placeholder="4 ספרות אחרונות"
              maxLength={4}
              dir="ltr"
            />
            <div className="flex gap-1 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCardColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${newCardColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1 justify-center py-1.5 text-sm" onClick={handleAddCard}>
                <Check size={14} /> הוסף
              </button>
              <button className="btn btn-ghost flex-1 justify-center py-1.5 text-sm" onClick={() => setAddingCard(false)}>
                <X size={14} /> ביטול
              </button>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-3">אין כרטיסים</p>
        ) : (
          cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onUpdate={updateCard}
              onDelete={(id) => setConfirmDeleteCard(id)}
            />
          ))
        )}
      </div>

      {/* Budgets */}
      <div className="panel">
        <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
          <PiggyBank size={15} /> תקציב חודשי
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          הגדר תקציב לכל קטגוריה לחודש הנוכחי ({mon})
        </p>
        <div className="flex flex-col gap-3">
          {EXPENSE_CATEGORIES.map((cat) => (
            <div key={cat.value} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 flex-1">{cat.label}</span>
              <div className="flex items-center gap-1 w-36">
                <span className="text-gray-400 text-sm">₪</span>
                <input
                  type="number"
                  className="input text-sm py-1.5"
                  placeholder="0"
                  min="0"
                  defaultValue={getBudget(cat.value)}
                  onBlur={(e) => handleBudgetChange(cat.value, e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        className="btn btn-danger w-full justify-center py-3 text-base rounded-xl"
        onClick={() => signOut(auth)}
      >
        <LogOut size={18} /> יציאה
      </button>

      {/* Delete card confirm */}
      {confirmDeleteCard && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteCard(null)}>
          <div className="modal max-w-xs" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 mb-2">מחיקת כרטיס</h3>
            <p className="text-sm text-gray-500 mb-5">האם למחוק כרטיס זה?</p>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteCard(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={() => handleDeleteCard(confirmDeleteCard)}>מחק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
