import React, { useState, useEffect, useMemo } from 'react';
import { Account, Category, RecurringExpense, RecurringFrequency, EntityID, TransactionType } from '../types';
import { DynamicIcon } from './Icons';

interface RecurringExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Omit<RecurringExpense, 'id'> & { id?: EntityID }) => void;
  accounts: Account[];
  categories: Category[];
  expenseToEdit?: RecurringExpense | null;
  mainAccountId: EntityID | null;
}

export const RecurringExpenseModal: React.FC<RecurringExpenseModalProps> = ({ isOpen, onClose, onSave, accounts, categories, expenseToEdit, mainAccountId }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<EntityID>('');
  const [categoryId, setCategoryId] = useState<EntityID>('');
  
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);
  
  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === categoryId);
  }, [categoryId, categories]);

  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(String(expenseToEdit.amount));
      setFrequency(expenseToEdit.frequency);
      setStartDate(expenseToEdit.startDate);
      setAccountId(expenseToEdit.accountId);
      setCategoryId(expenseToEdit.categoryId);
    } else {
      setDescription('');
      setAmount('');
      setFrequency(RecurringFrequency.MONTHLY);
      setStartDate(new Date().toISOString().split('T')[0]);
      setAccountId(mainAccountId || (accounts.length > 0 ? accounts[0].id : ''));
      setCategoryId('');
    }
  }, [expenseToEdit, isOpen, accounts, mainAccountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !accountId || !categoryId) return;
    onSave({
      id: expenseToEdit?.id,
      description,
      amount: parseFloat(amount),
      frequency,
      startDate,
      accountId,
      categoryId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {expenseToEdit ? 'Modifier la Dépense' : 'Ajouter une Dépense'} Récurrente
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input type="text" placeholder="Description (ex: Abonnement Netflix)" value={description} onChange={e => setDescription(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <input type="number" placeholder="Montant" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <select value={frequency} onChange={e => setFrequency(e.target.value as RecurringFrequency)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {Object.entries(RecurringFrequency).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
            </select>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de début / prochaine échéance</label>
              <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">-- Compte à débiter --</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
                {selectedCategory?.icon && (
                  <span className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                      <DynamicIcon iconName={selectedCategory.icon} className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                  </span>
                )}
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">-- Choisir une catégorie --</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};