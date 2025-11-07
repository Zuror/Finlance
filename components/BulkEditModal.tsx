
import React, { useState } from 'react';
import { Account, Category, Transaction, TransactionStatus, EntityID } from '../types';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onSave: (data: Partial<Transaction>) => void;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, accounts, categories, onSave }) => {
  const [fieldToEdit, setFieldToEdit] = useState<'categoryId' | 'accountId' | 'status'>('categoryId');
  const [value, setValue] = useState<EntityID | TransactionStatus>('');

  const handleSubmit = () => {
    if (!value) {
        alert("Veuillez sélectionner une valeur.");
        return;
    }
    onSave({ [fieldToEdit]: value });
  };
  
  if (!isOpen) return null;

  const renderValueInput = () => {
    switch (fieldToEdit) {
      case 'categoryId':
        return (
          <select value={value} onChange={e => setValue(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">-- Choisir une catégorie --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
        );
      case 'accountId':
        return (
          <select value={value} onChange={e => setValue(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">-- Choisir un compte --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        );
      case 'status':
        return (
          <select value={value} onChange={e => setValue(e.target.value as TransactionStatus)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">-- Choisir un statut --</option>
            <option value={TransactionStatus.REAL}>Réel</option>
            <option value={TransactionStatus.POTENTIAL}>Potentiel</option>
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          Modification en Masse
        </h2>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Champ à modifier</label>
                <select value={fieldToEdit} onChange={e => { setFieldToEdit(e.target.value as any); setValue(''); }} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="categoryId">Catégorie</option>
                    <option value="accountId">Compte</option>
                    <option value="status">Statut</option>
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nouvelle valeur</label>
                {renderValueInput()}
            </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200">Annuler</button>
          <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">Appliquer</button>
        </div>
      </div>
    </div>
  );
};
