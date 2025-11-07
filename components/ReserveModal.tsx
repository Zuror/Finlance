
import React, { useState, useEffect } from 'react';
import { Reserve, EntityID } from '../types';

interface ReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Reserve, 'id'> & { id?: EntityID }) => void;
  reserveToEdit?: Reserve | null;
  accountId: EntityID | null;
}

export const ReserveModal: React.FC<ReserveModalProps> = ({ isOpen, onClose, onSave, reserveToEdit, accountId }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(reserveToEdit?.name || '');
      setTargetAmount(reserveToEdit?.targetAmount?.toString() || '');
      setTargetDate(reserveToEdit?.targetDate || '');
    }
  }, [reserveToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && accountId) {
      onSave({
        id: reserveToEdit?.id,
        name: name.trim(),
        accountId: accountId,
        targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
        targetDate: targetDate || undefined,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {reserveToEdit ? 'Modifier la réserve' : 'Nouvelle Réserve'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="reserveName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom de la réserve</label>
              <input
                id="reserveName"
                type="text"
                placeholder="Ex: Épargne Vacances"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="border-t pt-4 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Objectif (Optionnel)</h3>
                <div>
                  <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Montant cible</label>
                  <input
                    id="targetAmount"
                    type="number"
                    placeholder="2000"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    step="0.01"
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                 <div className="mt-2">
                  <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date butoir</label>
                  <input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};