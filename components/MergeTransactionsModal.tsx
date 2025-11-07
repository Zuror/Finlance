
import React, { useState } from 'react';
import { Transaction, TransactionType, Account, Category } from '../types';

interface MergeTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (mergedData: Partial<Transaction>, originalIds: [string, string]) => void;
  transactions: [Transaction, Transaction];
  accounts: Account[];
  categories: Category[];
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export const MergeTransactionsModal: React.FC<MergeTransactionsModalProps> = ({ isOpen, onClose, onMerge, transactions, accounts, categories }) => {
  const [tx1, tx2] = transactions;

  const [dateSource, setDateSource] = useState(tx1.id);
  const [descriptionSource, setDescriptionSource] = useState(tx1.id);
  const [categorySource, setCategorySource] = useState(tx1.id);
  const [accountSource, setAccountSource] = useState(tx1.id);
  const [tagsSource, setTagsSource] = useState(tx1.id);

  if (!isOpen) return null;

  const tx1Amount = tx1.type === TransactionType.EXPENSE ? -tx1.amount : tx1.amount;
  const tx2Amount = tx2.type === TransactionType.EXPENSE ? -tx2.amount : tx2.amount;
  const mergedAmount = tx1Amount + tx2Amount;

  const handleMerge = () => {
    const chosenDate = dateSource === tx1.id ? tx1.date : tx2.date;
    const chosenDesc = descriptionSource === tx1.id ? tx1.description : tx2.description;
    const chosenCategory = categorySource === tx1.id ? tx1.categoryId : tx2.categoryId;
    const chosenAccount = accountSource === tx1.id ? tx1.accountId : tx2.accountId;
    const chosenTags = tagsSource === tx1.id ? tx1.tags : tx2.tags;

    const mergedData: Partial<Transaction> = {
      description: chosenDesc,
      amount: Math.abs(mergedAmount),
      date: chosenDate,
      effectiveDate: chosenDate, // Assume same for simplicity
      type: mergedAmount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
      accountId: chosenAccount,
      categoryId: chosenCategory,
      tags: chosenTags,
    };

    onMerge(mergedData, [tx1.id, tx2.id]);
  };
  
  const RadioGroup: React.FC<{ label: string; value1: string; value2: string; source: string; setSource: (id: string) => void }> = ({ label, value1, value2, source, setSource }) => (
    <div>
        <h3 className="font-semibold mb-1 text-gray-800 dark:text-gray-200">{label}</h3>
        <div className="space-y-1 text-sm">
            <label className="flex items-center p-2 rounded-md bg-gray-100 dark:bg-gray-700/50 has-[:checked]:bg-blue-100 dark:has-[:checked]:bg-blue-900/50 has-[:checked]:ring-1 ring-blue-500 cursor-pointer">
                <input type="radio" name={label} value={tx1.id} checked={source === tx1.id} onChange={(e) => setSource(e.target.value)} className="h-4 w-4 accent-checkbox"/>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{value1}</span>
            </label>
             <label className="flex items-center p-2 rounded-md bg-gray-100 dark:bg-gray-700/50 has-[:checked]:bg-blue-100 dark:has-[:checked]:bg-blue-900/50 has-[:checked]:ring-1 ring-blue-500 cursor-pointer">
                <input type="radio" name={label} value={tx2.id} checked={source === tx2.id} onChange={(e) => setSource(e.target.value)} className="h-4 w-4 accent-checkbox"/>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{value2}</span>
            </label>
        </div>
    </div>
  );

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';
  const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || 'N/A';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 modal-content max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Fusionner les transactions</h2>
        <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-center">
                <p className="text-sm text-blue-800 dark:text-blue-200">Montant fusionné :</p>
                <p className={`text-2xl font-bold ${mergedAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currencyFormatter.format(mergedAmount)}</p>
            </div>
            
            <RadioGroup label="Description" value1={tx1.description} value2={tx2.description} source={descriptionSource} setSource={setDescriptionSource} />
            <RadioGroup label="Date" value1={new Date(tx1.date).toLocaleDateString('fr-FR')} value2={new Date(tx2.date).toLocaleDateString('fr-FR')} source={dateSource} setSource={setDateSource} />
            <RadioGroup label="Compte" value1={getAccountName(tx1.accountId)} value2={getAccountName(tx2.accountId)} source={accountSource} setSource={setAccountSource} />
            <RadioGroup label="Catégorie" value1={getCategoryName(tx1.categoryId)} value2={getCategoryName(tx2.categoryId)} source={categorySource} setSource={setCategorySource} />
            <RadioGroup label="Tags" value1={tx1.tags?.join(', ') || 'Aucun'} value2={tx2.tags?.join(', ') || 'Aucun'} source={tagsSource} setSource={setTagsSource} />

        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Annuler</button>
          <button type="button" onClick={handleMerge} className="px-4 py-2 bg-accent text-white rounded-md">Fusionner</button>
        </div>
      </div>
    </div>
  );
};
