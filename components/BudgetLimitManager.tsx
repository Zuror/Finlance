import React, { useState } from 'react';
import { BudgetLimit, Category, EntityID, TransactionType } from '../types';
import { MISC_CATEGORY_ID } from '../constants';
import { PlusIcon, TrashIcon } from './Icons';

interface BudgetLimitManagerProps {
    limits: BudgetLimit[],
    categories: Category[],
    onSave: (limit: BudgetLimit) => void,
    onDelete: (categoryId: EntityID) => void,
}

export const BudgetLimitManager: React.FC<BudgetLimitManagerProps> = ({ limits, categories, onSave, onDelete }) => {
    
    const [newLimitCategoryId, setNewLimitCategoryId] = useState('');
    const [newLimitAmount, setNewLimitAmount] = useState('');

    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE && c.id !== MISC_CATEGORY_ID);
    const availableCategories = expenseCategories.filter(c => !limits.some(l => l.categoryId === c.id));
    
    const handleAdd = () => {
        if (newLimitCategoryId && newLimitAmount) {
            onSave({ categoryId: newLimitCategoryId, amount: parseFloat(newLimitAmount) });
            setNewLimitCategoryId('');
            setNewLimitAmount('');
        }
    };
    
    return (
        <>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                {limits.map(limit => {
                    const category = categories.find(c => c.id === limit.categoryId);
                    if (!category) return null;
                    return (
                        <div key={limit.categoryId} className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700/50">
                            <span>{category.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(limit.amount)}</span>
                                <button onClick={() => onDelete(limit.categoryId)} className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    );
                })}
                 {limits.length === 0 && <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">Aucune limite définie.</p>}
            </div>
            <div className="flex gap-2 items-center border-t pt-4 dark:border-gray-600">
                <select 
                    value={newLimitCategoryId} 
                    onChange={e => setNewLimitCategoryId(e.target.value)}
                    className="flex-grow p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="">-- Choisir une catégorie --</option>
                    {availableCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <input
                    type="number"
                    value={newLimitAmount}
                    onChange={e => setNewLimitAmount(e.target.value)}
                    placeholder="Montant"
                    className="w-32 p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button onClick={handleAdd} className="p-2 bg-accent text-white rounded-md hover:opacity-90 transition-opacity duration-200">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
        </>
    );
};
