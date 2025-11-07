import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction, TransactionType, EntityID, TransactionStatus } from '../types';
import { ArrowLeftIcon } from './Icons';

interface ReconciliationViewProps {
  accounts: Account[];
  transactions: Transaction[];
  accountIdToReconcile: EntityID | null;
  onReconcile: (transactionIds: EntityID[]) => void;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ accounts, transactions, accountIdToReconcile, onReconcile, onClose }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<EntityID>(accountIdToReconcile || (accounts.length > 0 ? accounts[0].id : ''));
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setDate(lastMonth.getDate() - 1);
  const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [checkedTransactionIds, setCheckedTransactionIds] = useState<Set<EntityID>>(new Set());
  const [statementBalance, setStatementBalance] = useState('');

  useEffect(() => {
    if (accountIdToReconcile && accounts.some(a => a.id === accountIdToReconcile)) {
      setSelectedAccountId(accountIdToReconcile);
    } else if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accountIdToReconcile, accounts]);

  useEffect(() => {
      setCheckedTransactionIds(new Set());
      setStatementBalance('');
  }, [selectedAccountId, startDate, endDate]);

  const { transactionsToReconcile, startingBalance } = useMemo(() => {
    if (!selectedAccountId) return { transactionsToReconcile: [], startingBalance: 0 };
    
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return { transactionsToReconcile: [], startingBalance: 0 };
    
    const start = new Date(startDate);
    
    const balance = account.initialBalance + transactions
        .filter(t => 
            t.accountId === selectedAccountId &&
            t.status === TransactionStatus.REAL &&
            new Date(t.effectiveDate) < start
        )
        .reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);

    const filtered = transactions.filter(t =>
        t.accountId === selectedAccountId &&
        !t.isReconciled &&
        t.status === TransactionStatus.REAL &&
        new Date(t.effectiveDate) >= start &&
        new Date(t.effectiveDate) <= new Date(endDate)
    ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { transactionsToReconcile: filtered, startingBalance: balance };
  }, [selectedAccountId, startDate, endDate, transactions, accounts]);

  const { totalCheckedCredits, totalCheckedDebits } = useMemo(() => {
    let credits = 0;
    let debits = 0;
    transactionsToReconcile.forEach(t => {
        if (checkedTransactionIds.has(t.id)) {
            if (t.type === TransactionType.INCOME) credits += t.amount;
            else debits += t.amount;
        }
    });
    return { totalCheckedCredits: credits, totalCheckedDebits: debits };
  }, [checkedTransactionIds, transactionsToReconcile]);

  const calculatedBalance = startingBalance + totalCheckedCredits - totalCheckedDebits;
  const statementBalanceNum = parseFloat(statementBalance) || 0;
  const difference = calculatedBalance - statementBalanceNum;

  const handleCheck = (id: EntityID) => {
    const newSet = new Set(checkedTransactionIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCheckedTransactionIds(newSet);
  };
  
  const handleReconcile = () => {
      if (difference !== 0) {
          alert("La différence doit être de 0 pour valider le rapprochement.");
          return;
      }
      if (checkedTransactionIds.size === 0) {
          alert("Veuillez sélectionner au moins une transaction à rapprocher.");
          return;
      }
      if (window.confirm(`Vous êtes sur le point de rapprocher ${checkedTransactionIds.size} transaction(s). Cette action est irréversible. Continuer ?`)) {
        onReconcile(Array.from(checkedTransactionIds));
      }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center mb-6">
        <button onClick={onClose} className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Rapprochement Bancaire</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="account" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Compte</label>
            <select id="account" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de début</label>
            <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de fin</label>
            <input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <h2 className="text-xl p-4 font-semibold border-b dark:border-gray-700">Transactions à pointer</h2>
          {/* Desktop Table */}
          <div className="overflow-x-auto max-h-[60vh] hidden md:block">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                  <th className="px-4 py-3 w-12"></th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Débit</th>
                  <th className="px-4 py-3 text-right">Crédit</th>
                </tr>
              </thead>
              <tbody>
                {transactionsToReconcile.map(tx => (
                  <tr key={tx.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-4 py-2"><input type="checkbox" checked={checkedTransactionIds.has(tx.id)} onChange={() => handleCheck(tx.id)} className="rounded" /></td>
                    <td className="px-4 py-2">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{tx.description}</td>
                    <td className="px-4 py-2 text-right text-red-500">{tx.type === TransactionType.EXPENSE ? currencyFormatter.format(tx.amount) : ''}</td>
                    <td className="px-4 py-2 text-right text-green-500">{tx.type === TransactionType.INCOME ? currencyFormatter.format(tx.amount) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile List */}
          <div className="md:hidden max-h-[60vh] overflow-y-auto p-4 space-y-3">
            {transactionsToReconcile.map(tx => (
                <div key={tx.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-start gap-3">
                    <input type="checkbox" checked={checkedTransactionIds.has(tx.id)} onChange={() => handleCheck(tx.id)} className="rounded mt-1 h-5 w-5"/>
                    <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(tx.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="text-right">
                        {tx.type === TransactionType.EXPENSE ? 
                            <p className="font-bold text-red-500">{currencyFormatter.format(tx.amount)}</p> :
                            <p className="font-bold text-green-500">{currencyFormatter.format(tx.amount)}</p>
                        }
                    </div>
                </div>
            ))}
          </div>

          {transactionsToReconcile.length === 0 && <p className="p-6 text-center text-gray-500">Aucune transaction réelle à rapprocher pour cette période.</p>}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">Synthèse</h2>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Solde de départ au {new Date(startDate).toLocaleDateString('fr-FR')}:</span> <strong>{currencyFormatter.format(startingBalance)}</strong></div>
                <hr className="dark:border-gray-700"/>
                <div className="flex justify-between"><span>{checkedTransactionIds.size} Opération(s) pointée(s)</span></div>
                <div className="flex justify-between text-green-500"><span>Total Crédits:</span> <span>{currencyFormatter.format(totalCheckedCredits)}</span></div>
                <div className="flex justify-between text-red-500"><span>Total Débits:</span> <span>{currencyFormatter.format(totalCheckedDebits)}</span></div>
                <hr className="dark:border-gray-700"/>
                <div className="flex justify-between items-center text-base"><strong>Solde calculé:</strong> <strong className="text-lg">{currencyFormatter.format(calculatedBalance)}</strong></div>
                <hr className="dark:border-gray-700"/>
                <div>
                    <label htmlFor="statementBalance" className="block font-medium mb-1">Solde relevé bancaire:</label>
                    <input 
                        id="statementBalance" 
                        type="number" 
                        value={statementBalance}
                        onChange={e => setStatementBalance(e.target.value)}
                        placeholder="Entrez le solde final"
                        className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div className={`flex justify-between items-center text-lg p-2 rounded-md ${difference === 0 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                    <strong>Différence:</strong>
                    <strong>{currencyFormatter.format(difference)}</strong>
                </div>
            </div>
            <button 
                onClick={handleReconcile}
                disabled={difference !== 0 || statementBalance === ''}
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Valider le rapprochement
            </button>
        </div>
      </div>
    </div>
  );
};