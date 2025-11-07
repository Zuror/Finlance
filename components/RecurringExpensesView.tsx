import React from 'react';
import { RecurringExpense, Account, Category, EntityID, RecurringFrequency } from '../types';
import { PlusIcon, DynamicIcon } from './Icons';
import { EmptyState } from './EmptyState';
import { NoRecurringExpensesIllustration } from './Illustrations';

interface RecurringExpensesViewProps {
  recurringExpenses: RecurringExpense[];
  accounts: Account[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (expense: RecurringExpense) => void;
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

export const RecurringExpensesView: React.FC<RecurringExpensesViewProps> = ({ recurringExpenses, accounts, categories, onAdd, onEdit, onDelete }) => {
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';
  const getCategory = (id?: string) => categories.find(c => c.id === id);
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Dépenses Récurrentes</h1>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow hover:opacity-90 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Ajouter une dépense
        </button>
      </div>
      
      {recurringExpenses.length === 0 ? (
         <EmptyState
            illustration={<NoRecurringExpensesIllustration />}
            title="Aucune dépense récurrente"
            message="Ajoutez vos abonnements, factures et autres frais fixes pour mieux anticiper votre budget."
        />
      ) : (
        <>
        {/* Desktop Table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">Description</th>
                  <th scope="col" className="px-6 py-3">Montant</th>
                  <th scope="col" className="px-6 py-3">Fréquence</th>
                  <th scope="col" className="px-6 py-3">Date de début</th>
                  <th scope="col" className="px-6 py-3">Compte</th>
                  <th scope="col" className="px-6 py-3">Catégorie</th>
                  <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {recurringExpenses.map(re => {
                  const category = getCategory(re.categoryId);
                  return (
                    <tr key={re.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{re.description}</td>
                      <td className="px-6 py-4 text-red-500 font-bold">{currencyFormatter.format(re.amount)}</td>
                      <td className="px-6 py-4">{frequencyLabels[re.frequency] || re.frequency}</td>
                      <td className="px-6 py-4">{new Date(re.startDate).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-4">{getAccountName(re.accountId)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           {category?.icon && <DynamicIcon iconName={category.icon} className="w-5 h-5 text-gray-500" />}
                           <span>{category?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => onEdit(re)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Modifier</button>
                        <button onClick={() => onDelete(re.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Supprimer</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
            {recurringExpenses.map(re => {
              const category = getCategory(re.categoryId);
              return (
                <div key={re.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-800 dark:text-gray-100 flex-1 mr-4">{re.description}</p>
                        <p className="font-bold text-lg text-red-500 whitespace-nowrap">{currencyFormatter.format(re.amount)}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p><strong>Fréquence:</strong> {frequencyLabels[re.frequency] || re.frequency}</p>
                        <p><strong>Début:</strong> {new Date(re.startDate).toLocaleDateString('fr-FR')}</p>
                        <p><strong>Compte:</strong> {getAccountName(re.accountId)}</p>
                        <p className="flex items-center gap-2"><strong>Catégorie:</strong> {category?.icon && <DynamicIcon iconName={category.icon} className="w-4 h-4"/>} {category?.name}</p>
                    </div>
                    <div className="flex justify-end gap-4 mt-3 text-sm">
                        <button onClick={() => onEdit(re)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Modifier</button>
                        <button onClick={() => onDelete(re.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Supprimer</button>
                    </div>
                </div>
            )})}
        </div>
        </>
      )}
    </div>
  );
};