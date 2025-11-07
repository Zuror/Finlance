import React, { useState, useEffect } from 'react';
import { Loan, EntityID } from '../types';
import { calculateMonthlyPayment, calculatePaymentsMadeFromRemainingBalance } from '../services/financeService';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loanData: Omit<Loan, 'id' | 'linkedRecurringExpenseId' | 'monthlyPayment'> & { id?: EntityID; paymentsMadeInitially?: number }) => void;
  loanToEdit?: Loan | null;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, onSave, loanToEdit }) => {
  const [name, setName] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termInYears, setTermInYears] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentsMadeInitially, setPaymentsMadeInitially] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState(0);

  const [inputMode, setInputMode] = useState<'payments' | 'balance'>('payments');
  const [remainingBalance, setRemainingBalance] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (loanToEdit) {
            setName(loanToEdit.name);
            setInitialAmount(String(loanToEdit.initialAmount));
            setInterestRate(String(loanToEdit.interestRate));
            setTermInYears(String(loanToEdit.termInMonths / 12));
            setStartDate(loanToEdit.startDate);
            setPaymentsMadeInitially(String(loanToEdit.paymentsMadeInitially || ''));
            setInputMode('payments');
            setRemainingBalance('');
        } else {
            setName('');
            setInitialAmount('');
            setInterestRate('');
            setTermInYears('');
            setStartDate(new Date().toISOString().split('T')[0]);
            setPaymentsMadeInitially('');
            setInputMode('payments');
            setRemainingBalance('');
        }
    }
  }, [loanToEdit, isOpen]);

  useEffect(() => {
    const amount = parseFloat(initialAmount);
    const rate = parseFloat(interestRate);
    const term = parseInt(termInYears, 10) * 12;

    if (amount > 0 && rate >= 0 && term > 0) {
      const payment = calculateMonthlyPayment(amount, rate, term);
      setMonthlyPayment(payment);
    } else {
      setMonthlyPayment(0);
    }
  }, [initialAmount, interestRate, termInYears]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && monthlyPayment > 0) {
      let finalPaymentsMade = 0;

      if (inputMode === 'payments') {
        finalPaymentsMade = parseInt(paymentsMadeInitially, 10) || 0;
      } else {
        finalPaymentsMade = calculatePaymentsMadeFromRemainingBalance(
          parseFloat(initialAmount),
          parseFloat(interestRate),
          parseInt(termInYears, 10) * 12,
          parseFloat(remainingBalance)
        );
      }
      
      const loanData = {
        id: loanToEdit?.id,
        name,
        initialAmount: parseFloat(initialAmount),
        interestRate: parseFloat(interestRate),
        termInMonths: parseInt(termInYears, 10) * 12,
        startDate,
        paymentsMadeInitially: finalPaymentsMade,
      };
      
      onSave(loanData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 modal-content">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {loanToEdit ? 'Modifier le prêt' : 'Ajouter un prêt'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input type="text" placeholder="Nom du prêt (ex: Prêt Immobilier)" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Montant initial" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required min="0.01" step="0.01" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="number" placeholder="Taux d'intérêt annuel (%)" value={interestRate} onChange={e => setInterestRate(e.target.value)} required min="0" step="0.01" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="Durée (en années)" value={termInYears} onChange={e => setTermInYears(e.target.value)} required min="1" step="1" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>

            <div className="pt-4 border-t dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pour un prêt déjà en cours
              </label>
              <div className="mt-2 flex rounded-md shadow-sm">
                <button type="button" onClick={() => setInputMode('payments')} className={`px-4 py-2 text-sm font-medium ${inputMode === 'payments' ? 'bg-accent text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-l-md transition-colors duration-200`}>Par Mensualités</button>
                <button type="button" onClick={() => setInputMode('balance')} className={`px-4 py-2 text-sm font-medium ${inputMode === 'balance' ? 'bg-accent text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-r-md transition-colors duration-200`}>Par Capital Restant</button>
              </div>
              
              <div className="mt-4">
                {inputMode === 'payments' ? (
                  <div>
                    <label htmlFor="paymentsMadeInitially" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mensualités déjà payées</label>
                    <input
                      id="paymentsMadeInitially"
                      type="number"
                      placeholder="0"
                      value={paymentsMadeInitially}
                      onChange={e => setPaymentsMadeInitially(e.target.value)}
                      min="0"
                      step="1"
                      className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="remainingBalance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capital restant dû</label>
                    <input
                      id="remainingBalance"
                      type="number"
                      placeholder="Ex: 150000"
                      value={remainingBalance}
                      onChange={e => setRemainingBalance(e.target.value)}
                      min="0"
                      step="0.01"
                      className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {monthlyPayment > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-md text-center">
                <p className="text-sm text-blue-800 dark:text-blue-200">Échéance mensuelle calculée :</p>
                <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(monthlyPayment)}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};