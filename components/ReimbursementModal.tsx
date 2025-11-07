
import React, { useState, useEffect } from 'react';
import { Transaction, EntityID } from '../types';

interface ReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { transactionId: EntityID, expectedAmount: number, expectedDate: string }) => void;
  transaction: Transaction | null;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export const ReimbursementModal: React.FC<ReimbursementModalProps> = ({ isOpen, onClose, onSave, transaction }) => {
  const [expectedAmount, setExpectedAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  useEffect(() => {
    if (isOpen && transaction) {
      setExpectedAmount(String(transaction.amount));
      setExpectedDate(new Date().toISOString().split('T')[0]);
    } else {
        setExpectedAmount('');
        setExpectedDate('');
    }
  }, [isOpen, transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transaction && expectedAmount && expectedDate) {
      onSave({
        transactionId: transaction.id,
        expectedAmount: parseFloat(expectedAmount),
        expectedDate,
      });
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 modal-content">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Suivre un remboursement</h2>
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Dépense initiale :</p>
            <p className="font-semibold">{transaction.description} ({currencyFormatter.format(transaction.amount)})</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="expectedAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Montant attendu</label>
              <input
                id="expectedAmount"
                type="number"
                value={expectedAmount}
                onChange={e => setExpectedAmount(e.target.value)}
                required
                min="0.01" step="0.01"
                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="expectedDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de réception prévue</label>
              <input
                id="expectedDate"
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                required
                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Suivre</button>
          </div>
        </form>
      </div>
    </div>
  );
};