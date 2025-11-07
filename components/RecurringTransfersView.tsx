
import React from 'react';
import { RecurringTransfer, Account, Reserve, EntityID, RecurringFrequency } from '../types';
import { PlusIcon } from './Icons';

interface RecurringTransfersViewProps {
  recurringTransfers: RecurringTransfer[];
  accounts: Account[];
  reserves: Reserve[];
  onAdd: () => void;
  onEdit: (transfer: RecurringTransfer) => void;
  onDelete: (id: EntityID) => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const frequencyLabels: Record<string, string> = {
  [RecurringFrequency.WEEKLY]: 'Hebdomadaire',
  [RecurringFrequency.MONTHLY]: 'Mensuel',
  [RecurringFrequency.ANNUAL]: 'Annuel',
};

export const RecurringTransfersView: React.FC<RecurringTransfersViewProps> = ({ recurringTransfers, accounts, reserves, onAdd, onEdit, onDelete }) => {
  
  const getNameFromId = (id: string) => {
    const [type, entityId] = id.split('_');
    if (type === 'acc') {
        return accounts.find(a => a.id === entityId)?.name || 'N/A';
    }
    const reserve = reserves.find(r => r.id === entityId);
    const account = accounts.find(a => a.id === reserve?.accountId);
    return `${account?.name} (${reserve?.name})` || 'N/A';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Virements Programmés</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow hover:opacity-90 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau virement
        </button>
      </div>
      
      {recurringTransfers.length === 0 ? (
        <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Aucun virement programmé.</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Automatisez votre épargne !</p>
        </div>
      ) : (
        <>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">Description</th>
                  <th scope="col" className="px-6 py-3">Montant</th>
                  <th scope="col" className="px-6 py-3">Fréquence</th>
                  <th scope="col" className="px-6 py-3">De</th>
                  <th scope="col" className="px-6 py-3">Vers</th>
                  <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {recurringTransfers.map(rt => (
                  <tr key={rt.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{rt.description}</td>
                    <td className="px-6 py-4 text-blue-500 font-bold">{currencyFormatter.format(rt.amount)}</td>
                    <td className="px-6 py-4">{frequencyLabels[rt.frequency]}</td>
                    <td className="px-6 py-4">{getNameFromId(rt.sourceId)}</td>
                    <td className="px-6 py-4">{getNameFromId(rt.destinationId)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => onEdit(rt)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Modifier</button>
                      <button onClick={() => onDelete(rt.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
            {recurringTransfers.map(rt => (
                <div key={rt.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-800 dark:text-gray-100 flex-1 mr-4">{rt.description}</p>
                        <p className="font-bold text-lg text-blue-500 whitespace-nowrap">{currencyFormatter.format(rt.amount)}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p><strong>Fréquence:</strong> {frequencyLabels[rt.frequency]}</p>
                        <p><strong>De:</strong> {getNameFromId(rt.sourceId)}</p>
                        <p><strong>Vers:</strong> {getNameFromId(rt.destinationId)}</p>
                    </div>
                    <div className="flex justify-end gap-4 mt-3 text-sm">
                        <button onClick={() => onEdit(rt)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Modifier</button>
                        <button onClick={() => onDelete(rt.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Supprimer</button>
                    </div>
                </div>
            ))}
        </div>
        </>
      )}
    </div>
  );
};