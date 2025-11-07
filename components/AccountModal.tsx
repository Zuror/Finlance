import React, { useState, useEffect } from 'react';
import { Account, EntityID, AccountType } from '../types';
import { DynamicIcon } from './Icons';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountData: { id?: EntityID; name: string; initialBalance: number; icon?: string; color?: string; type?: AccountType; linkedAccountId?: EntityID; debitDay?: number; }) => void;
  accountToEdit?: Account | null;
  accounts: Account[];
  entityIconMap: { [key: string]: React.FC<any> };
}

const colors = [
    '#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'
];

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, accountToEdit, accounts, entityIconMap }) => {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('CreditCard');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [type, setType] = useState<AccountType>(AccountType.CURRENT);
  const [linkedAccountId, setLinkedAccountId] = useState<EntityID>('');
  const [debitDay, setDebitDay] = useState('');

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setInitialBalance(String(accountToEdit.initialBalance));
      setSelectedIcon(accountToEdit.icon || 'CreditCard');
      setSelectedColor(accountToEdit.color || '#3b82f6');
      setType(accountToEdit.type || AccountType.CURRENT);
      setLinkedAccountId(accountToEdit.linkedAccountId || '');
      setDebitDay(String(accountToEdit.debitDay || ''));
    } else {
      setName('');
      setInitialBalance('');
      setSelectedIcon('CreditCard');
      setSelectedColor('#3b82f6');
      setType(AccountType.CURRENT);
      setLinkedAccountId('');
      setDebitDay('');
    }
  }, [accountToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: accountToEdit?.id,
      name,
      initialBalance: parseFloat(initialBalance) || 0,
      icon: selectedIcon,
      color: selectedColor,
      type,
      linkedAccountId: type === AccountType.DEFERRED_DEBIT ? linkedAccountId : undefined,
      debitDay: type === AccountType.DEFERRED_DEBIT && debitDay ? parseInt(debitDay, 10) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {accountToEdit ? 'Modifier le compte' : 'Ajouter un compte'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du compte</label>
              <input
                id="accountName"
                type="text"
                placeholder="Ex: Compte Courant"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type de compte</label>
              <select id="accountType" value={type} onChange={e => setType(e.target.value as AccountType)} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value={AccountType.CURRENT}>Compte Courant</option>
                <option value={AccountType.SAVINGS}>Compte Épargne</option>
                <option value={AccountType.DEFERRED_DEBIT}>Carte à Débit Différé</option>
              </select>
            </div>
            <div>
              <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {type === AccountType.DEFERRED_DEBIT ? 'Solde initial (généralement 0)' : 'Solde initial'}
              </label>
              <input
                id="initialBalance"
                type="number"
                placeholder="1000"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                required
                step="0.01"
                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            {type === AccountType.DEFERRED_DEBIT && (
              <>
                <div>
                  <label htmlFor="linkedAccountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Compte de prélèvement</label>
                  <select id="linkedAccountId" value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} required className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">-- Choisir un compte --</option>
                    {accounts.filter(a => (a.type ?? AccountType.CURRENT) === AccountType.CURRENT).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="debitDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jour du prélèvement</label>
                  <input id="debitDay" type="number" placeholder="Ex: 5" value={debitDay} onChange={e => setDebitDay(e.target.value)} required min="1" max="31" className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                </div>
              </>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icône</label>
                <div className="grid grid-cols-6 gap-2 mt-2 p-2 rounded-md border dark:border-gray-600 max-h-48 overflow-y-auto">
                    {Object.keys(entityIconMap).map(iconName => (
                        <button key={iconName} type="button" onClick={() => setSelectedIcon(iconName)} className={`p-2 rounded-lg flex justify-center items-center ${selectedIcon === iconName ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                           <DynamicIcon iconName={iconName} className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                        </button>
                    ))}
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Couleur</label>
                <div className="flex gap-2 mt-2">
                    {colors.map(color => (
                        <button key={color} type="button" onClick={() => setSelectedColor(color)} className={`w-8 h-8 rounded-full ${selectedColor === color ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-blue-500' : ''}`} style={{ backgroundColor: color }} />
                    ))}
                </div>
            </div>
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