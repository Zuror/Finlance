import React, { useMemo, useState } from 'react';
import { Transaction, Category, MonthlyMiscellaneous, TransactionType, Reserve, Account, AppSettings, BudgetLimit, EntityID, Reimbursement } from '../types';
import { MONTH_NAMES_FR, MISC_CATEGORY_ID } from '../constants';
import { generateReserveForecast } from '../services/financeService';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, PencilIcon, TrashIcon, PlusIcon, DynamicIcon } from './Icons';

interface PlanningViewProps {
  transactions: Transaction[];
  accounts: Account[];
  mainAccountId: EntityID | null;
  reserves: Reserve[];
  categories: Category[];
  monthlyMiscellaneous: MonthlyMiscellaneous[];
  setMonthlyMiscellaneous: (value: MonthlyMiscellaneous[]) => void;
  appSettings: AppSettings;
  budgetLimits: BudgetLimit[];
  reimbursements: Reimbursement[];
  onAddTransaction: (context: { yearMonth: string; categoryId: string }) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenBudgetLimitModal: () => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const ExpandedRow: React.FC<{
    transactions: Transaction[],
    accounts: Account[],
    onEdit: (tx: Transaction) => void,
    onDelete: (id: string) => void,
}> = ({ transactions, accounts, onEdit, onDelete }) => {
    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';
    
    return (
        <div className="bg-gray-50 dark:bg-gray-900 p-3 space-y-2">
            {transactions.length > 0 ? (
                transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center text-xs p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{tx.description}</p>
                            <p className="text-gray-500">{new Date(tx.date).toLocaleDateString('fr-FR')} - {getAccountName(tx.accountId)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`font-bold ${tx.type === 'DEPENSE' ? 'text-red-500' : 'text-green-500'}`}>{currencyFormatter.format(tx.amount)}</span>
                            <button onClick={() => onEdit(tx)}><PencilIcon className="w-4 h-4 text-blue-500"/></button>
                            <button onClick={() => onDelete(tx.id)}><TrashIcon className="w-4 h-4 text-red-500"/></button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-gray-500 text-xs italic py-2">Aucune transaction ce mois-ci.</p>
            )}
        </div>
    );
};


export const PlanningView: React.FC<PlanningViewProps> = (props) => {
    const { 
        transactions, accounts, mainAccountId, reserves, categories, monthlyMiscellaneous, 
        setMonthlyMiscellaneous, appSettings, budgetLimits, reimbursements,
        onAddTransaction, onEditTransaction, onDeleteTransaction, onOpenBudgetLimitModal
    } = props;
  
  const [activeTab, setActiveTab] = useState<'budget' | 'reserves'>('budget');
  const [miscInput, setMiscInput] = useState<Record<string, string>>({});
  const [displayDate, setDisplayDate] = useState(new Date());
  const [expandedRow, setExpandedRow] = useState<{ id: string, yearMonth: string, type: 'category' | 'reserve' } | null>(null);

  const months = useMemo(() => {
    const monthHeaders = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(displayDate.getFullYear(), displayDate.getMonth() + i, 1);
      monthHeaders.push({
        name: `${MONTH_NAMES_FR[d.getMonth()].slice(0,3)}. ${d.getFullYear()}`,
        yearMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      });
    }
    return monthHeaders;
  }, [displayDate]);

  const reserveForecastData = useMemo(() => {
    if (reserves.length === 0) return [];
    return generateReserveForecast(reserves, transactions, displayDate);
  }, [reserves, transactions, displayDate]);
  
  const reservesByAccount = useMemo(() => {
    const grouped: { [accountId: string]: Reserve[] } = {};
    reserves.forEach(reserve => {
        if (!grouped[reserve.accountId]) {
            grouped[reserve.accountId] = [];
        }
        grouped[reserve.accountId].push(reserve);
    });
    return grouped;
    }, [reserves]);


  const budgetData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    categories.forEach(cat => {
      data[cat.id] = {};
      months.forEach(m => data[cat.id][m.yearMonth] = 0);
    });

    transactions.forEach(tx => {
      if (tx.categoryId) {
        const yearMonth = tx.effectiveDate.slice(0, 7);
        if (data[tx.categoryId]?.[yearMonth] !== undefined) {
          const category = categories.find(c => c.id === tx.categoryId);
          const amount = tx.type === TransactionType.INCOME ? tx.amount : -tx.amount;

          // If it's an expense category, we sum up expenses (negative) and incomes (positive).
          // This naturally handles refunds.
          if(category?.type === TransactionType.EXPENSE) {
            data[tx.categoryId][yearMonth] -= amount;
          } else { // For income categories, we only sum up incomes.
            if(tx.type === TransactionType.INCOME) {
                data[tx.categoryId][yearMonth] += tx.amount;
            }
          }
        }
      }
    });

    monthlyMiscellaneous.forEach(misc => {
      if (data[MISC_CATEGORY_ID] && data[MISC_CATEGORY_ID][misc.yearMonth] !== undefined) {
        data[MISC_CATEGORY_ID][misc.yearMonth] += misc.amount;
      }
    });

    return data;
  }, [transactions, categories, months, monthlyMiscellaneous]);

  const cumulativeBalanceData = useMemo(() => {
    const mainAccount = accounts.find(a => a.id === mainAccountId);
    if (!mainAccount) return [];

    const startDate = new Date(months[0].yearMonth + '-01');
    let runningBalance = mainAccount.initialBalance + transactions
        .filter(t => t.accountId === mainAccount.id && t.status === 'REEL' && new Date(t.effectiveDate) < startDate && !t.isSimulation)
        .reduce((sum, t) => sum + (t.type === 'REVENU' ? t.amount : -t.amount), 0);

    return months.map(m => {
        const monthTxs = transactions.filter(t => t.accountId === mainAccount.id && t.effectiveDate.startsWith(m.yearMonth));
        const netChange = monthTxs.reduce((sum, t) => sum + (t.type === 'REVENU' ? t.amount : -t.amount), 0);
        runningBalance += netChange;
        return runningBalance;
    });
  }, [accounts, mainAccountId, transactions, months]);
  
  const handleMiscChange = (yearMonth: string, value: string) => {
      setMiscInput({...miscInput, [yearMonth]: value});
  };

  const handleMiscBlur = (yearMonth: string) => {
    const amount = parseFloat(miscInput[yearMonth] || '0');
    const existing = monthlyMiscellaneous.find(m => m.yearMonth === yearMonth);
    if (existing) {
        if (amount > 0) {
            setMonthlyMiscellaneous(monthlyMiscellaneous.map(m => m.yearMonth === yearMonth ? { ...m, amount } : m));
        } else {
            setMonthlyMiscellaneous(monthlyMiscellaneous.filter(m => m.yearMonth !== yearMonth));
        }
    } else if (amount > 0) {
        setMonthlyMiscellaneous([...monthlyMiscellaneous, { yearMonth, amount }]);
    }
  };

  const changeMonth = (offset: number) => {
    setDisplayDate(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

  const calculateTotals = (categoryList: Category[]) => {
      const totals: Record<string, number> = {};
      months.forEach(m => totals[m.yearMonth] = 0);
      categoryList.forEach(cat => {
          months.forEach(m => {
              totals[m.yearMonth] += budgetData[cat.id]?.[m.yearMonth] || 0;
          });
      });
      return totals;
  }

  const incomeTotals = calculateTotals(incomeCategories);
  const expenseTotals = calculateTotals(expenseCategories);
  
  const handleCellClick = (id: string, yearMonth: string, type: 'category' | 'reserve') => {
    if (expandedRow?.id === id && expandedRow?.yearMonth === yearMonth && expandedRow?.type === type) {
        setExpandedRow(null);
    } else {
        setExpandedRow({ id, yearMonth, type });
    }
  };

  const renderCell = (catId: string, yearMonth: string, isExpense: boolean) => {
    const amount = budgetData[catId]?.[yearMonth] || 0;
    const limit = isExpense && appSettings.useBudgetEnvelopes ? budgetLimits.find(l => l.categoryId === catId)?.amount : undefined;
    const percentage = limit && limit > 0 ? (amount / limit) * 100 : 0;
    
    let progressBarColor = 'bg-green-500';
    if (percentage > 90) progressBarColor = 'bg-red-500';
    else if (percentage > 75) progressBarColor = 'bg-yellow-500';

    const isSelected = expandedRow?.id === catId && expandedRow?.yearMonth === yearMonth && expandedRow?.type === 'category';

    const cellContent = (
      <div className="w-full h-full text-right p-1 rounded disabled:pointer-events-none">
        {amount === 0 ? <span className="text-gray-400">-</span> : currencyFormatter.format(amount)}
      </div>
    );

    return (
        <td 
            key={yearMonth} 
            className={`px-2 py-1 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${isSelected ? 'bg-blue-100 dark:bg-blue-800/50 ring-1 ring-blue-400' : ''}`}
            onClick={() => handleCellClick(catId, yearMonth, 'category')}
        >
            <div className="flex flex-col items-end h-full justify-between">
                {cellContent}
                {limit && limit > 0 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                        <div className={`${progressBarColor} h-1.5 rounded-full`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                    </div>
                )}
            </div>
        </td>
    );
  }

  const renderCategoryRow = (cat: Category, isExpense: boolean) => {
    const isExpanded = expandedRow?.id === cat.id && expandedRow?.type === 'category';
    const limit = isExpense && appSettings.useBudgetEnvelopes ? budgetLimits.find(l => l.categoryId === cat.id)?.amount : undefined;

    return (
        <React.Fragment key={cat.id}>
            <tr className={`border-b dark:border-gray-700 ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/60' : 'bg-white dark:bg-gray-800'}`}>
              <td className={`px-4 py-2 font-medium text-gray-900 dark:text-white sticky left-0 z-20 transition-colors duration-200 ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/60' : 'bg-white dark:bg-gray-800'}`}>
                  <div className="flex items-center gap-3">
                      {cat.icon && <DynamicIcon iconName={cat.icon} className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                      <div className="flex-grow">
                        <div>{cat.name}</div>
                        {limit && <div className="text-xs text-gray-400">Budget: {currencyFormatter.format(limit)}</div>}
                      </div>
                  </div>
              </td>
              {months.map(m => renderCell(cat.id, m.yearMonth, isExpense))}
            </tr>
            {isExpanded && (
                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                    <td colSpan={13} className="p-0">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900">
                             <h4 className="font-semibold mb-2">Détail pour {cat.name} - {months.find(m => m.yearMonth === expandedRow.yearMonth)?.name}</h4>
                             <ExpandedRow
                                 transactions={transactions.filter(t => t.categoryId === expandedRow.id && t.effectiveDate.startsWith(expandedRow.yearMonth))}
                                 accounts={accounts}
                                 onEdit={onEditTransaction}
                                 onDelete={onDeleteTransaction}
                             />
                             <button onClick={() => onAddTransaction({categoryId: expandedRow.id, yearMonth: expandedRow.yearMonth})} className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                 <PlusIcon className="w-3 h-3"/> Ajouter une opération
                             </button>
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
       <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Planification</h1>
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-md">
            {/* Onglets */}
            <div className="flex-shrink-0">
                <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-xl shadow-inner w-full sm:w-auto">
                    <button onClick={() => setActiveTab('budget')} className={`w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${activeTab === 'budget' ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}>
                        Par catégories
                    </button>
                    <button onClick={() => setActiveTab('reserves')} className={`w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${activeTab === 'reserves' ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}>
                        Par réserves
                    </button>
                </div>
            </div>

            {/* Sélecteur de date */}
            <div className="flex-grow flex justify-center items-center gap-1">
                <button onClick={() => changeMonth(-12)} className="hidden sm:block p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" title="Année précédente"><ChevronDoubleLeftIcon className="w-5 h-5"/></button>
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" title="Mois précédent"><ChevronLeftIcon className="w-5 h-5"/></button>
                <span className="font-semibold text-lg text-center w-36">{MONTH_NAMES_FR[displayDate.getMonth()]} {displayDate.getFullYear()}</span>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" title="Mois suivant"><ChevronRightIcon className="w-5 h-5"/></button>
                <button onClick={() => changeMonth(12)} className="hidden sm:block p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" title="Année suivante"><ChevronDoubleRightIcon className="w-5 h-5"/></button>
                <button onClick={() => setDisplayDate(new Date())} className="ml-2 px-3 py-1.5 text-xs sm:text-sm bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200">Aujourd'hui</button>
            </div>

            {/* Bouton Gérer */}
            <div className="flex-shrink-0 flex justify-end min-w-[150px]">
                {appSettings.useBudgetEnvelopes && activeTab === 'budget' && (
                    <button 
                        onClick={onOpenBudgetLimitModal}
                        className="px-4 py-2 border border-accent text-accent rounded-lg hover:bg-accent/10 transition-colors text-sm font-semibold whitespace-nowrap"
                    >
                        Gérer les budgets
                    </button>
                )}
            </div>
        </div>

      {activeTab === 'budget' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                    <tr>
                    <th scope="col" className="px-6 py-3 whitespace-nowrap min-w-[200px] sticky left-0 bg-gray-50 dark:bg-gray-700 z-30">Catégorie</th>
                    {months.map(m => <th key={m.yearMonth} scope="col" className="px-2 py-3 text-right whitespace-nowrap">{m.name}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr className="bg-gray-100 dark:bg-gray-700"><td colSpan={13} className="px-6 py-2 font-semibold text-gray-800 dark:text-gray-200 sticky left-0 bg-gray-100 dark:bg-gray-700 z-20">Revenus</td></tr>
                    {incomeCategories.map(cat => renderCategoryRow(cat, false))}
                    <tr className="bg-gray-50 dark:bg-gray-700 font-bold text-gray-900 dark:text-white">
                        <td className="px-6 py-3 sticky left-0 bg-gray-50 dark:bg-gray-700 z-20">Total Revenus</td>
                        {months.map(m => <td key={m.yearMonth} className="px-2 py-3 text-right">{currencyFormatter.format(incomeTotals[m.yearMonth])}</td>)}
                    </tr>

                    <tr className="bg-gray-100 dark:bg-gray-700"><td colSpan={13} className="px-6 py-2 font-semibold text-gray-800 dark:text-gray-200 sticky left-0 bg-gray-100 dark:bg-gray-700 z-20">Dépenses</td></tr>
                    {expenseCategories.map(cat => renderCategoryRow(cat, true))}
                    <tr className="bg-gray-50 dark:bg-gray-700 font-bold text-gray-900 dark:text-white">
                        <td className="px-6 py-3 sticky left-0 bg-gray-50 dark:bg-gray-700 z-20">Total Dépenses</td>
                        {months.map(m => <td key={m.yearMonth} className="px-2 py-3 text-right">{currencyFormatter.format(expenseTotals[m.yearMonth])}</td>)}
                    </tr>
                </tbody>
                <tfoot className="bg-blue-50 dark:bg-blue-900/50 font-bold text-blue-800 dark:text-blue-200 sticky bottom-0 pb-16 md:pb-0 z-10">
                    <tr>
                        <td className="px-6 py-4 sticky left-0 bg-blue-50 dark:bg-blue-900/50 z-20">Solde mensuel</td>
                        {months.map(m => {
                            const balance = incomeTotals[m.yearMonth] - expenseTotals[m.yearMonth];
                            const balanceColor = balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                            return (
                                <td key={m.yearMonth} className={`px-2 py-4 text-right ${balanceColor}`}>
                                    {currencyFormatter.format(balance)}
                                </td>
                            )
                        })}
                    </tr>
                    {mainAccountId && (
                        <tr className="border-t border-blue-200 dark:border-blue-800">
                            <td className="px-6 py-4 sticky left-0 bg-blue-50 dark:bg-blue-900/50 z-20">Solde cumulé (Principal)</td>
                            {cumulativeBalanceData.map((balance, index) => (
                                <td key={months[index].yearMonth} className={`px-2 py-4 text-right ${balance >= 0 ? '' : 'text-red-500'}`}>
                                    {currencyFormatter.format(balance)}
                                </td>
                            ))}
                        </tr>
                    )}
                </tfoot>
                </table>
            </div>
            </div>
      )}
      
      {activeTab === 'reserves' && (
        reserves.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-6 py-3 whitespace-nowrap min-w-[200px] sticky left-0 bg-gray-50 dark:bg-gray-700 z-20">Réserve</th>
                                {reserveForecastData.map(m => <th key={m.yearMonth} scope="col" className="px-2 py-3 text-right whitespace-nowrap">{m.month.slice(0,3)}. {m.month.split(' ')[1]}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(reservesByAccount).map(accountId => {
                                const account = accounts.find(a => a.id === accountId);
                                const accountReserves = reservesByAccount[accountId];
                                return (
                                    <React.Fragment key={accountId}>
                                        <tr className="bg-gray-100 dark:bg-gray-700/50">
                                            <td colSpan={13} className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 sticky left-0 bg-gray-100 dark:bg-gray-700/50 z-20">
                                                {account?.name || 'Compte inconnu'}
                                            </td>
                                        </tr>
                                        {accountReserves.map(reserve => {
                                            const isRowExpanded = expandedRow?.id === reserve.id && expandedRow?.type === 'reserve';
                                            return (
                                            <React.Fragment key={reserve.id}>
                                                <tr className={`bg-white dark:bg-gray-800 border-b dark:border-gray-700 ${isRowExpanded ? 'bg-blue-50 dark:bg-blue-900/60' : ''}`}>
                                                    <td className={`pl-10 pr-6 py-4 font-medium text-gray-900 dark:text-white sticky left-0 transition-colors duration-200 ${isRowExpanded ? 'bg-blue-50 dark:bg-blue-900/60' : 'bg-white dark:bg-gray-800'}`}>{reserve.name}</td>
                                                    {reserveForecastData.map(m => {
                                                        const isCellSelected = isRowExpanded && expandedRow.yearMonth === m.yearMonth;
                                                        return (
                                                            <td 
                                                                key={m.yearMonth} 
                                                                className={`px-2 py-4 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${isCellSelected ? 'bg-blue-100 dark:bg-blue-800/50 ring-1 ring-blue-400' : ''}`}
                                                                onClick={() => handleCellClick(reserve.id, m.yearMonth, 'reserve')}
                                                            >
                                                                {currencyFormatter.format(m.balances[reserve.id] || 0)}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                                {isRowExpanded && (
                                                    <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                                        <td colSpan={13} className="p-0">
                                                            <div className="p-4 bg-gray-50 dark:bg-gray-900">
                                                                <h4 className="font-semibold mb-2">Détail pour {reserve.name} - {months.find(m => m.yearMonth === expandedRow.yearMonth)?.name}</h4>
                                                                <ExpandedRow
                                                                    transactions={transactions.filter(t => t.reserveId === expandedRow.id && t.effectiveDate.startsWith(expandedRow.yearMonth))}
                                                                    accounts={accounts}
                                                                    onEdit={onEditTransaction}
                                                                    onDelete={onDeleteTransaction}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )})}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="text-center py-12 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <p className="text-gray-500 dark:text-gray-400">Aucune réserve n'a été créée.</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Allez dans l'onglet "Patrimoine" pour ajouter des réserves à vos comptes.</p>
            </div>
        )
      )}
    </div>
  );
};
