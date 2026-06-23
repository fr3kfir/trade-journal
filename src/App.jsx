import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useTransactions, useCards, useBudgets, currentMonth } from './hooks/useFinance';
import LoginScreen from './components/finance/LoginScreen';
import Dashboard from './components/finance/Dashboard';
import AddTransaction from './components/finance/AddTransaction';
import TransactionsList from './components/finance/TransactionsList';
import Stats from './components/finance/Stats';
import Settings from './components/finance/Settings';
import { Home, PlusCircle, List, BarChart2, Settings as SettingsIcon } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'דשבורד', Icon: Home },
  { id: 'add', label: 'הוספה', Icon: PlusCircle },
  { id: 'transactions', label: 'עסקאות', Icon: List },
  { id: 'stats', label: 'סטטיסטיקות', Icon: BarChart2 },
  { id: 'settings', label: 'הגדרות', Icon: SettingsIcon },
];

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [tab, setTab] = useState('dashboard');
  const [month, setMonth] = useState(currentMonth());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const { transactions, loading: txLoading, addTransaction, deleteTransaction } = useTransactions();
  const { cards, loading: cardsLoading, addCard, updateCard, deleteCard } = useCards();
  const { budgets, loading: budgetsLoading, setBudget, deleteBudget } = useBudgets();

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  function renderTab() {
    switch (tab) {
      case 'dashboard':
        return (
          <Dashboard
            transactions={transactions}
            cards={cards}
            budgets={budgets}
            month={month}
            setMonth={setMonth}
          />
        );
      case 'add':
        return <AddTransaction addTransaction={addTransaction} cards={cards} />;
      case 'transactions':
        return (
          <TransactionsList
            transactions={transactions}
            cards={cards}
            deleteTransaction={deleteTransaction}
            month={month}
            setMonth={setMonth}
          />
        );
      case 'stats':
        return <Stats transactions={transactions} cards={cards} month={month} setMonth={setMonth} />;
      case 'settings':
        return (
          <Settings
            cards={cards}
            budgets={budgets}
            addCard={addCard}
            updateCard={updateCard}
            deleteCard={deleteCard}
            setBudget={setBudget}
            deleteBudget={deleteBudget}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Desktop top nav */}
      <header className="hidden md:flex sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4">
        <div className="max-w-4xl mx-auto w-full flex items-center gap-1 py-1">
          <div className="flex items-center gap-2 ml-4">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">₪</span>
            </div>
            <span className="font-bold text-gray-800 text-sm">ניהול כספים</span>
          </div>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`nav-tab flex items-center gap-1.5 px-3 ${tab === id ? 'active' : ''}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        {renderTab()}
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`bottom-nav-item ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
