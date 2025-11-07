
import React, { useState } from 'react';
import { Transaction, TransactionStatus, PendingTransfer, Profile } from '../types';
import { ChevronDownIcon, ChevronUpIcon, ArrowsRightLeftIcon } from './Icons';
import { EmptyState } from './EmptyState';
import { AllCaughtUpIllustration } from './Illustrations';

interface PendingTransactionsProps {
  recurringTransactions: Transaction[];
  pendingTransfers: PendingTransfer[];
  profiles: Profile[];
  onValidateRecurring: (id: string, status: TransactionStatus) => void;
  onBulkValidateRecurring: () => void;
  onAcceptTransfer: (transfer: PendingTransfer) => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export const PendingTransactions: React.FC<PendingTransactionsProps> = ({ 
    recurringTransactions, pendingTransfers, profiles, 
    onValidateRecurring, onBulkValidateRecurring, onAcceptTransfer 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const totalPending = recurringTransactions.length + pendingTransfers.length;

  if (totalPending === 0) {
    return (
        <div className="bg-green-50 dark:bg-green-900/50 border-l-4 border-green-400 p-4 rounded-r-lg shadow-md mb-6">
            <div className="flex items-center gap-3">
                 <div className="mx-auto w-10 h-10 text-green-400 dark:text-green-500">
                    <AllCaughtUpIllustration />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-200">Tout est à jour !</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">Aucune opération en attente de validation.</p>
                </div>
            </div>
        </div>
    );
  }

  const getProfileName = (id: string) => profiles.find(p => p.id === id)?.name || 'Profil inconnu';

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-md mb-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">Opérations en attente de validation</h3>
            <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">{totalPending}</span>
        </div>
        <button className="p-1 rounded-full hover:bg-yellow-200/50 dark:hover:bg-yellow-800/50">
            {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-yellow-700 dark:text-yellow-300" /> : <ChevronDownIcon className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-4">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 max-w-prose">
                    {totalPending} opération(s) potentielle(s) passée(s) nécessite(nt) votre attention.
                </p>
                {recurringTransactions.length > 0 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onBulkValidateRecurring(); }}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-semibold whitespace-nowrap ml-4"
                    >
                        Tout Valider ({recurringTransactions.length})
                    </button>
                )}
            </div>
            <div className="max-h-60 overflow-y-auto pr-2">
                <ul className="space-y-2">
                {pendingTransfers.map(pt => (
                    <li key={pt.id} className="flex items-center justify-between p-2 bg-blue-100/50 dark:bg-blue-800/30 rounded-md text-sm">
                        <div className="flex items-center gap-2">
                          <ArrowsRightLeftIcon className="w-5 h-5 text-blue-500"/>
                          <div>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">Virement reçu de {getProfileName(pt.fromProfileId)}</span>
                            <span className="text-gray-600 dark:text-gray-400 ml-2">({new Date(pt.date).toLocaleDateString('fr-FR')})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-green-500">{currencyFormatter.format(pt.amount)}</span>
                            <button
                            onClick={(e) => { e.stopPropagation(); onAcceptTransfer(pt); }}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-xs"
                            >
                            Accepter
                            </button>
                        </div>
                    </li>
                ))}
                {recurringTransactions.map(tx => (
                    <li key={tx.id} className="flex items-center justify-between p-2 bg-yellow-100/50 dark:bg-yellow-800/30 rounded-md text-sm">
                    <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{tx.description}</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">({new Date(tx.date).toLocaleDateString('fr-FR')})</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-red-500">{currencyFormatter.format(tx.amount)}</span>
                        <button
                        onClick={(e) => { e.stopPropagation(); onValidateRecurring(tx.id, TransactionStatus.REAL); }}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        >
                        Valider
                        </button>
                    </div>
                    </li>
                ))}
                </ul>
            </div>
        </div>
      )}
    </div>
  );
};
