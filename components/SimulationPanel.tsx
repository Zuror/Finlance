
import React from 'react';
import { Transaction } from '../types';
import { XMarkIcon, CheckIcon, TrashIcon } from './Icons';

interface SimulationPanelProps {
  simulationTransactions: Transaction[];
  onApply: () => void;
  onCancel: () => void;
  onDeleteSimulationTransaction: (id: string) => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ simulationTransactions, onApply, onCancel, onDeleteSimulationTransaction }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-purple-100 dark:bg-purple-900/80 backdrop-blur-sm border-t-2 border-purple-500 z-40 p-4 shadow-2xl-top">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200">Mode Simulation</h3>
          <div className="flex gap-2">
            <button onClick={onApply} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
              <CheckIcon className="w-5 h-5"/> Appliquer
            </button>
            <button onClick={onCancel} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
              <XMarkIcon className="w-5 h-5"/> Annuler
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto pr-2">
            {simulationTransactions.length === 0 ? (
                <p className="text-center text-sm text-purple-700 dark:text-purple-300">Ajoutez des opérations pour voir leur impact sur vos prévisions.</p>
            ) : (
                <ul className="space-y-2 text-sm">
                {simulationTransactions.map(tx => (
                    <li key={tx.id} className="flex justify-between items-center bg-white/50 dark:bg-purple-800/50 p-2 rounded-md">
                        <div>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{tx.description}</span>
                            <span className="text-gray-600 dark:text-gray-400 ml-2">({new Date(tx.date).toLocaleDateString('fr-FR')})</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`font-bold ${tx.type === 'DEPENSE' ? 'text-red-500' : 'text-green-500'}`}>
                                {currencyFormatter.format(tx.amount)}
                            </span>
                             <button onClick={() => onDeleteSimulationTransaction(tx.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    </li>
                ))}
                </ul>
            )}
        </div>
      </div>
    </div>
  );
};