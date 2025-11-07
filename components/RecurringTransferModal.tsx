import React, { useState, useEffect } from 'react';
import { Account, Reserve, RecurringTransfer, RecurringFrequency, EntityID } from '../types';

interface RecurringTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transferData: Omit<RecurringTransfer, 'id'> & { id?: EntityID }) => void;
  accounts: Account[];
  reserves: Reserve[];
  transferToEdit?: Partial<RecurringTransfer> | null;
}

export const RecurringTransferModal: React.FC<RecurringTransferModalProps> = ({ isOpen, onClose, onSave, accounts, reserves, transferToEdit }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (transferToEdit) {
            setDescription(transferToEdit.description || '');
            setAmount(String(transferToEdit.amount || ''));
            setFrequency(transferToEdit.frequency || RecurringFrequency.MONTHLY);
            setStartDate(transferToEdit.startDate || new Date().toISOString().split('T')[0]);
            setSourceId(transferToEdit.sourceId || '');
            setDestinationId(transferToEdit.destinationId || '');
        } else {
            setDescription('');
            setAmount('');
            setFrequency(RecurringFrequency.MONTHLY);
            setStartDate(new Date().toISOString().split('T')[0]);
            setSourceId('');
            setDestinationId('');
        }
    }
  }, [transferToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !sourceId || !destinationId || sourceId === destinationId) {
        alert("Veuillez remplir tous les champs. La source et la destination doivent être différentes.");
        return;
    }
    onSave({
      id: transferToEdit?.id,
      description,
      amount: parseFloat(amount),
      frequency,
      startDate,
      sourceId,
      destinationId,
    });
  };

  if (!isOpen) return null;

  const options = accounts.flatMap(acc => {
    const accountReserves = reserves.filter(r => r.accountId === acc.id);
    return [
      { label: `${acc.name} (Compte)`, value: `acc_${acc.id}` },
      ...accountReserves.map(res => ({
        label: `${acc.name} - ${res.name}`,
        value: `res_${res.id}`
      }))
    ];
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 modal-content">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {transferToEdit?.id ? 'Modifier le virement' : 'Nouveau virement'} récurrent
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input type="text" placeholder="Description (ex: Épargne Livret A)" value={description} onChange={e => setDescription(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <input type="number" placeholder="Montant" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <select value={frequency} onChange={e => setFrequency(e.target.value as RecurringFrequency)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {Object.entries(RecurringFrequency).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
            </select>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de début / prochaine échéance</label>
              <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <select value={sourceId} onChange={e => setSourceId(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="" disabled>-- Source --</option>
              {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select value={destinationId} onChange={e => setDestinationId(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="" disabled>-- Destination --</option>
              {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
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