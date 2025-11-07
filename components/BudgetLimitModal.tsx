import React from 'react';
import { BudgetLimit, Category, EntityID } from '../types';
import { BudgetLimitManager } from './BudgetLimitManager';

interface BudgetLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limits: BudgetLimit[];
  categories: Category[];
  onSave: (limit: BudgetLimit) => void;
  onDelete: (categoryId: EntityID) => void;
}

export const BudgetLimitModal: React.FC<BudgetLimitModalProps> = ({
  isOpen,
  onClose,
  limits,
  categories,
  onSave,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4 modal-content">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Gérer les budgets</h2>
        <BudgetLimitManager
          limits={limits}
          categories={categories}
          onSave={onSave}
          onDelete={onDelete}
        />
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
