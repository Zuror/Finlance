import React, { useState } from 'react';
import { Account, Transaction, EntityID, Reserve, AccountType, Loan, ManualAsset, AppSettings } from '../types';
import { calculateAccountBalance, calculateCurrentReserveBalance, calculateCurrentDeferredDebitSpending, calculateLoanRemainingBalance } from '../services/financeService';
import { PlusIcon, PencilIcon, TrashIcon, EllipsisVerticalIcon, DynamicIcon } from './Icons';
import { EmptyState } from './EmptyState';
import { NoAccountsIllustration } from './Illustrations';
import AnimatedNumber from './AnimatedNumber';

interface PatrimoineViewProps {
  accounts: Account[];
  transactions: Transaction[];
  reserves: Reserve[];
  mainAccountId: EntityID | null;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (id: EntityID) => void;
  onStartReconciliation: (id: EntityID) => void;
  onAddReserve: (accountId: EntityID) => void;
  onEditReserve: (reserve: Reserve) => void;
  onDeleteReserve: (id: EntityID) => void;
  onSelectAccount: (accountId: EntityID) => void;
  loans: Loan[];
  onAddLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (id: EntityID) => void;
  manualAssets: ManualAsset[];
  onAddAsset: () => void;
  onEditAsset: (asset: ManualAsset) => void;
  onDeleteAsset: (id: EntityID) => void;
  appSettings: AppSettings;
  onAddAccount: () => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const ReserveItem: React.FC<{
  reserve: Reserve;
  balance: number;
  onEdit: (reserve: Reserve) => void;
  onDelete: (id: EntityID) => void;
}> = ({ reserve, balance, onEdit, onDelete }) => {
  const progress = reserve.targetAmount ? (balance / reserve.targetAmount) * 100 : 0;

  return (
    <li className="text-gray-500 dark:text-gray-400 group py-1">
        <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{reserve.name}</span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-base text-gray-700 dark:text-gray-200"><AnimatedNumber value={balance} /></span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEdit(reserve); }} className="p-1 hover:text-blue-500"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(reserve.id);}} className="p-1 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
              </div>
            </div>
        </div>
        {reserve.targetAmount && (
          <div className="mt-1">
            <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-400">Objectif: {currencyFormatter.format(reserve.targetAmount)}</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
          </div>
        )}
    </li>
  );
};

export const PatrimoineView: React.FC<PatrimoineViewProps> = (props) => {
    const { 
        accounts, transactions, reserves, mainAccountId, 
        onEditAccount, onDeleteAccount, onStartReconciliation,
        onAddReserve, onEditReserve, onDeleteReserve, onSelectAccount,
        loans, onAddLoan, onEditLoan, onDeleteLoan,
        manualAssets, onAddAsset, onEditAsset, onDeleteAsset,
        appSettings, onAddAccount
    } = props;
    const [openMenuId, setOpenMenuId] = useState<EntityID | null>(null);

    const liquidAssets = accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc, transactions, new Date()), 0);
    const otherAssets = manualAssets.reduce((sum, asset) => sum + asset.value, 0);
    const totalAssets = liquidAssets + otherAssets;
    const totalLiabilities = loans.reduce((sum, loan) => sum + calculateLoanRemainingBalance(loan, transactions), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    const { showManualAssets } = appSettings.netWorthSettings ?? { showManualAssets: true };

    const sortedAccounts = [...accounts].sort((a, b) => {
        if (a.id === mainAccountId) return -1;
        if (b.id === mainAccountId) return 1;
        return a.name.localeCompare(b.name);
    });
    
    const NetWorthVisual: React.FC<{ assets: number, liabilities: number }> = ({ assets, liabilities }) => {
        const total = assets > 0 || liabilities > 0 ? assets + liabilities : 1;
        const assetsPercent = (assets / total) * 100;
        const liabilitiesPercent = (liabilities / total) * 100;
        return (
            <div className="flex w-full h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <div className="bg-green-500" style={{ width: `${assetsPercent}%` }} title={`Actifs: ${currencyFormatter.format(assets)}`}></div>
                <div className="bg-red-500" style={{ width: `${liabilitiesPercent}%` }} title={`Passifs: ${currencyFormatter.format(liabilities)}`}></div>
            </div>
        );
    };
  
    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Patrimoine</h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">Votre Patrimoine Net Actuel</p>
                <p className="text-4xl font-extrabold text-accent my-2 text-center">
                    <AnimatedNumber value={netWorth} />
                </p>
                <div className="max-w-md mx-auto mt-4">
                    <NetWorthVisual assets={totalAssets} liabilities={totalLiabilities} />
                    <div className="flex justify-between text-xs mt-1">
                        <span className="text-green-600 dark:text-green-400">Actifs: {currencyFormatter.format(totalAssets)}</span>
                        <span className="text-red-600 dark:text-red-400">Passifs: {currencyFormatter.format(totalLiabilities)}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Comptes ({currencyFormatter.format(liquidAssets)})</h2>
                             <button onClick={onAddAccount} className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                                <PlusIcon className="w-4 h-4"/> Ajouter
                            </button>
                        </div>
                        {accounts.length === 0 ? (
                            <EmptyState 
                                illustration={<NoAccountsIllustration />}
                                title="Commencez par ajouter un compte"
                                message="Utilisez le bouton `+ Ajouter` pour créer votre premier compte bancaire ou livret d'épargne."
                            />
                        ) : (
                            <div className="space-y-4">
                                {sortedAccounts.map(account => {
                                    const isDeferredDebit = account.type === AccountType.DEFERRED_DEBIT;
                                    const currentBalance = calculateAccountBalance(account, transactions, new Date());
                                    const accountReserves = reserves.filter(r => r.accountId === account.id);
                                    const spendingData = isDeferredDebit ? calculateCurrentDeferredDebitSpending(account, transactions) : null;
                        
                                    return (
                                        <div key={account.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border-l-4" style={{ borderColor: account.color || 'transparent' }}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => onSelectAccount(account.id)}>
                                                    <div className="p-2 rounded-lg" style={{backgroundColor: `${account.color}1A`, color: account.color || '#3b82f6'}}>
                                                        <DynamicIcon iconName={account.icon || 'CreditCard'} className="w-5 h-5" />
                                                    </div>
                                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate">
                                                        {account.name}
                                                    </h3>
                                                </div>
                                                <div className="flex-shrink-0 relative">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === account.id ? null : account.id); }} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                        <EllipsisVerticalIcon className="w-5 h-5"/>
                                                    </button>
                                                    {openMenuId === account.id && (
                                                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                                            <div className="py-1">
                                                                <button onClick={(e)=>{e.stopPropagation(); onEditAccount(account); setOpenMenuId(null);}} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">Modifier</button>
                                                                <button onClick={(e)=>{e.stopPropagation(); onDeleteAccount(account.id); setOpenMenuId(null);}} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600">Supprimer</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {account.id === mainAccountId && <span className="mt-2 inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Principal</span>}
                                            {isDeferredDebit ? (
                                                <div className="mt-2 cursor-pointer" onClick={() => onSelectAccount(account.id)}>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Dépenses en cours</p>
                                                    <p className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1"><AnimatedNumber value={spendingData?.total || 0} /></p>
                                                    {spendingData && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Prochain prélèvement le {spendingData.nextDebitDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>}
                                                </div>
                                            ) : (
                                                <div className="cursor-pointer" onClick={() => onSelectAccount(account.id)}>
                                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2"><AnimatedNumber value={currentBalance} /></p>
                                                    {accountReserves.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                        <ul className="space-y-1">
                                                            {accountReserves.map(reserve => (
                                                            <ReserveItem key={reserve.id} reserve={reserve} balance={calculateCurrentReserveBalance(reserve, transactions, new Date())} onEdit={onEditReserve} onDelete={onDeleteReserve} />
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex justify-end items-center gap-4 mt-3">
                                                <button onClick={(e) => {e.stopPropagation(); onAddReserve(account.id);}} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Ajouter une réserve</button>
                                                {!isDeferredDebit && <button onClick={(e) => { e.stopPropagation(); onStartReconciliation(account.id); }} className="text-xs font-medium px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Rapprocher</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Emprunts ({currencyFormatter.format(totalLiabilities)})</h2>
                            <button onClick={onAddLoan} className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                                <PlusIcon className="w-4 h-4"/> Ajouter
                            </button>
                        </div>
                        {loans.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">Aucun emprunt en cours.</p>
                        ) : (
                            <div className="space-y-4">
                            {loans.map(loan => {
                                const remainingBalance = calculateLoanRemainingBalance(loan, transactions);
                                const progress = ((loan.initialAmount - remainingBalance) / loan.initialAmount) * 100;
                                const paymentsMadeSinceStart = transactions.filter(t => t.recurringExpenseId === loan.linkedRecurringExpenseId && t.status === 'REEL').length;
                                const totalPaymentsMade = paymentsMadeSinceStart + (loan.paymentsMadeInitially || 0);

                                return (
                                <div key={loan.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{loan.name}</h3>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-2"><AnimatedNumber value={remainingBalance} /></p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">sur {currencyFormatter.format(loan.initialAmount)} initial</p>
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1 text-gray-600 dark:text-gray-400">
                                        <span>Remboursé</span>
                                        <span>{progress.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-accent h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                        <p><strong>Échéances payées :</strong> {totalPaymentsMade} / {loan.termInMonths}</p>
                                    </div>
                                    <div className="flex justify-end gap-4 mt-3 text-xs">
                                    <button onClick={() => onEditLoan(loan)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">Modifier</button>
                                    <button onClick={() => onDeleteLoan(loan.id)} className="font-medium text-red-600 dark:text-red-400 hover:underline">Supprimer</button>
                                    </div>
                                </div>
                                );
                            })}
                            </div>
                        )}
                    </div>

                    {showManualAssets && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Autres Actifs ({currencyFormatter.format(otherAssets)})</h3>
                                <button onClick={onAddAsset} className="flex items-center gap-1 text-sm text-accent hover:underline">
                                    <PlusIcon className="w-4 h-4"/> Ajouter
                                </button>
                            </div>
                            {manualAssets.length > 0 ? (
                                <div className="space-y-2">
                                    {manualAssets.map(asset => (
                                        <div key={asset.id} className="group flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                {asset.icon && <DynamicIcon iconName={asset.icon} className="w-5 h-5 text-gray-500"/>}
                                                <span>{asset.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{currencyFormatter.format(asset.value)}</span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onEditAsset(asset)} className="p-1 hover:text-blue-500"><PencilIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => onDeleteAsset(asset.id)} className="p-1 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Aucun actif manuel (immobilier, voiture...).</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};