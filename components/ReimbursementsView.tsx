

import React, { useState } from 'react';
import { Reimbursement, Transaction, ReimbursementStatus, EntityID } from '../types';

interface ReimbursementsViewProps {
  reimbursements: Reimbursement[];
  transactions: Transaction[]; // The original transactions list
  onMarkAsReceived: (reimbursement: Reimbursement) => void;
  onEditReceivedReimbursement: (transactionId: EntityID) => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export const ReimbursementsView: React.FC<ReimbursementsViewProps> = ({ reimbursements, transactions, onMarkAsReceived, onEditReceivedReimbursement }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'received'>('pending');

  const getTransactionDescription = (transactionId: string) => {
    return transactions.find(t => t.id === transactionId)?.description || 'Dépense originale non trouvée';
  };
  
  const pendingReimbursements = reimbursements.filter(r => r.status === ReimbursementStatus.PENDING).sort((a,b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
  const receivedReimbursements = reimbursements.filter(r => r.status === ReimbursementStatus.RECEIVED).sort((a,b) => new Date(b.receivedDate!).getTime() - new Date(a.receivedDate!).getTime());

  const renderList = (list: Reimbursement[]) => {
    if (list.length === 0) {
      return <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucun remboursement dans cette catégorie.</p>;
    }

    return (
      <div className="space-y-4">
        {list.map(r => (
          <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">
                  Remboursement pour "{getTransactionDescription(r.transactionId)}"
                </p>
                {r.status === ReimbursementStatus.PENDING ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Attendu le {new Date(r.expectedDate).toLocaleDateString('fr-FR')}
                    </p>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Reçu le {new Date(r.receivedDate!).toLocaleDateString('fr-FR')}
                    </p>
                )}
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${r.status === ReimbursementStatus.PENDING ? 'text-yellow-600' : 'text-green-600'}`}>
                    {currencyFormatter.format(r.expectedAmount)}
                </p>
                {r.status === ReimbursementStatus.RECEIVED && r.receivedAmount && r.receivedAmount !== r.expectedAmount && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        (Montant reçu: {currencyFormatter.format(r.receivedAmount)})
                    </p>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-3">
              {r.status === ReimbursementStatus.PENDING && (
                  <button 
                      onClick={() => onMarkAsReceived(r)}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                      Marquer comme reçu
                  </button>
              )}
               {r.status === ReimbursementStatus.RECEIVED && r.receivedTransactionId && (
                  <button
                    onClick={() => onEditReceivedReimbursement(r.receivedTransactionId!)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Modifier la transaction
                  </button>
               )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <button onClick={() => setActiveTab('pending')} className={`${activeTab === 'pending' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                En attente ({pendingReimbursements.length})
            </button>
            <button onClick={() => setActiveTab('received')} className={`${activeTab === 'received' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                Reçus ({receivedReimbursements.length})
            </button>
            </nav>
        </div>
        {activeTab === 'pending' ? renderList(pendingReimbursements) : renderList(receivedReimbursements)}
    </div>
  );
};
