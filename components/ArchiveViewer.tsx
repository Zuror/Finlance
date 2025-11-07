
import React from 'react';
import { ArchiveFile, Transaction, TransactionType } from '../types';
import { XMarkIcon, DynamicIcon } from './Icons';

interface ArchiveViewerProps {
    archive: ArchiveFile;
    onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
});

export const ArchiveViewer: React.FC<ArchiveViewerProps> = ({ archive, onClose }) => {
    
    const getAccountName = (id: string) => archive.accounts.find(a => a.id === id)?.name || 'N/A';
    const getCategory = (id?: string) => archive.categories.find(c => c.id === id);

    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col">
            <header className="bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 p-4 shadow-md flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Consultation d'Archive</h1>
                    <p className="text-sm">
                        Données archivées le {new Date(archive.archivedAt).toLocaleDateString('fr-FR')} (Transactions jusqu'au {new Date(archive.archivedUntil).toLocaleDateString('fr-FR')})
                    </p>
                </div>
                <button onClick={onClose} className="px-4 py-2 bg-white/30 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-2">
                    <XMarkIcon className="w-5 h-5"/> Quitter
                </button>
            </header>
            
            <div className="flex-grow p-4 md:p-6 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-6 py-3">Montant</th>
                                    <th scope="col" className="px-6 py-3">Catégorie</th>
                                    <th scope="col" className="px-6 py-3">Compte</th>
                                </tr>
                            </thead>
                            <tbody>
                                {archive.transactions.map((tx: Transaction) => {
                                    const isExpense = tx.type === TransactionType.EXPENSE;
                                    const amountColor = isExpense ? 'text-red-500' : 'text-green-500';
                                    const category = getCategory(tx.categoryId);
                                    return (
                                        <tr key={tx.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                            <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tx.description}</td>
                                            <td className={`px-6 py-4 font-bold ${amountColor}`}>{isExpense ? '-' : '+'} {currencyFormatter.format(tx.amount)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {category?.icon && <DynamicIcon iconName={category.icon} className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                                                    <span>{category?.name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{getAccountName(tx.accountId)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
