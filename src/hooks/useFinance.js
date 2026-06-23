import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addTransaction = useCallback(async (data) => {
    await addDoc(collection(db, 'transactions'), {
      ...data,
      userId: auth.currentUser?.uid || '',
      createdAt: serverTimestamp(),
    });
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    await deleteDoc(doc(db, 'transactions', id));
  }, []);

  const updateTransaction = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'transactions', id), data);
  }, []);

  return { transactions, loading, addTransaction, deleteTransaction, updateTransaction };
}

export function useCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cards'), (snap) => {
      setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addCard = useCallback(async (data) => {
    await addDoc(collection(db, 'cards'), data);
  }, []);

  const updateCard = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'cards', id), data);
  }, []);

  const deleteCard = useCallback(async (id) => {
    await deleteDoc(doc(db, 'cards', id));
  }, []);

  return { cards, loading, addCard, updateCard, deleteCard };
}

export function useBudgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'budgets'), (snap) => {
      setBudgets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const setBudget = useCallback(async (month, category, limit) => {
    // Check if budget already exists for this month+category
    const existing = budgets.find((b) => b.month === month && b.category === category);
    if (existing) {
      await updateDoc(doc(db, 'budgets', existing.id), { limit });
    } else {
      await addDoc(collection(db, 'budgets'), { month, category, limit });
    }
  }, [budgets]);

  const deleteBudget = useCallback(async (id) => {
    await deleteDoc(doc(db, 'budgets', id));
  }, []);

  return { budgets, loading, setBudget, deleteBudget };
}

// Helper: format currency in ILS
export function formatILS(amount) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper: get current month as YYYY-MM
export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: '🛒 מזון' },
  { value: 'transport', label: '🚗 תחבורה' },
  { value: 'housing', label: '🏠 דיור' },
  { value: 'shopping', label: '👕 קניות' },
  { value: 'entertainment', label: '🎬 בידור' },
  { value: 'health', label: '🏥 בריאות' },
  { value: 'education', label: '📚 חינוך' },
  { value: 'travel', label: '✈️ נסיעות' },
  { value: 'bills', label: '💡 חשבונות' },
  { value: 'other_expense', label: '📦 אחר' },
];

export const INCOME_CATEGORIES = [
  { value: 'salary', label: '💼 משכורת' },
  { value: 'bonus', label: '💰 בונוס' },
  { value: 'gift', label: '🎁 מתנה' },
  { value: 'investments', label: '📈 השקעות' },
  { value: 'other_income', label: '📦 אחר' },
];

export function getCategoryLabel(value) {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.value === value)?.label || value;
}

export const CARD_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
  '#ef4444', '#14b8a6',
];
