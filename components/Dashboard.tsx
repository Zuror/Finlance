import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Account, Reserve, Transaction, TransactionStatus, AppSettings, Category, TransactionType, BudgetLimit, Profile, PendingTransfer } from '../types';
import { calculateAccountBalance, generateForecast, calculateCurrentReserveBalance } from '../services/financeService';
import { PendingTransactions } from './PendingTransactions';
import AnimatedNumber from './AnimatedNumber';
import { ArrowPathIcon, BanknotesIcon, ChartPieIcon, CheckBadgeIcon, FlagIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';
import { TagsAnalysisView } from './TagsAnalysisView';

interface DashboardProps {
  accounts: Account[];
  reserves: Reserve[];
  transactions: Transaction[];
  categories: Category[];
  budgetLimits: BudgetLimit[];
  pendingTransactions: Transaction[];
  pendingTransfers: PendingTransfer[];
  profiles: Profile[];
  appSettings: AppSettings;
  onValidate: (id: string, status: TransactionStatus) => void;
  onBulkValidate: () => void;
  onAcceptTransfer: (transfer: PendingTransfer) => void;
  onSelectAccount: (accountId: string) => void;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-700 p-2 border border-gray-200 dark:border-gray-600 rounded shadow">
        <p className="font-bold">{label}</p>
        <p style={{ color: payload[0].stroke }}>
          {`Solde: ${currencyFormatter.format(payload[0].value as number)}`}
        </p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-700 p-2 border border-gray-200 dark:border-gray-600 rounded shadow">
        <p className="font-bold">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.fill }}>
          {`${currencyFormatter.format(payload[0].value)} (${(payload[0].percent * 100).toFixed(0)}%)`}
        </p>
      </div>
    );
  }
  return null;
};

const SavingsGoals: React.FC<{ reserves: Reserve[], transactions: Transaction[] }> = ({ reserves, transactions }) => {
    const goals = reserves.filter(r => r.targetAmount && r.targetAmount > 0);

    if (goals.length === 0) {
        return null;
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-accent mb-4">Objectifs d'épargne</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map(goal => {
                    const balance = calculateCurrentReserveBalance(goal, transactions, new Date());
                    const progress = Math.min((balance / goal.targetAmount!) * 100, 100);

                    const getMonthlySavingsNeeded = () => {
                        if (!goal.targetAmount || !goal.targetDate || balance >= goal.targetAmount) return null;
                        const today = new Date();
                        const targetDate = new Date(goal.targetDate);
                        if (targetDate <= today) return "Échéance dépassée";

                        const monthsRemaining = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
                        if (monthsRemaining <= 0) return "Dernier mois !";

                        const amountNeeded = goal.targetAmount - balance;
                        const monthlyAmount = amountNeeded / monthsRemaining;
                        return `~ ${currencyFormatter.format(monthlyAmount)} / mois`;
                    };
                    const monthlySavingsNeeded = getMonthlySavingsNeeded();

                    return (
                        <div key={goal.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-bold text-gray-800 dark:text-gray-100">{goal.name}</p>
                                <FlagIcon className="w-5 h-5 text-accent" />
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-1">
                                <div className="bg-accent h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{currencyFormatter.format(balance)}</span>
                                <span className="text-gray-500 dark:text-gray-400">sur {currencyFormatter.format(goal.targetAmount!)} ({progress.toFixed(0)}%)</span>
                            </div>
                            {monthlySavingsNeeded && <p className="text-xs text-right mt-1 text-blue-500 dark:text-blue-400 font-semibold">{monthlySavingsNeeded}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export const Dashboard: React.FC<DashboardProps> = (props) => {
    const { 
        accounts, reserves, transactions, categories, budgetLimits, 
        pendingTransactions, pendingTransfers, profiles,
        appSettings, onValidate, onBulkValidate, onAcceptTransfer, onSelectAccount
    } = props;

    const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'overview' | 'tags'>('overview');

    const toggleAccountExpansion = (accountId: string) => {
        setExpandedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountId)) {
                newSet.delete(accountId);
            } else {
                newSet.add(accountId);
            }
            return newSet;
        });
    };
    
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthTxs = transactions.filter(t => t.effectiveDate.startsWith(currentMonthStr) && t.status === TransactionStatus.REAL && !t.isSimulation);
    const lastMonthTxs = transactions.filter(t => t.effectiveDate.startsWith(lastMonthStr) && t.status === TransactionStatus.REAL && !t.isSimulation);

    // Savings Insight with user settings
    const { savingsCalculationSettings } = appSettings;
    const includedIncomes = savingsCalculationSettings?.includedIncomes || [];
    const excludedExpenses = savingsCalculationSettings?.excludedExpenses || [];

    const calculateSavings = (txs: Transaction[]) => {
        const totalIncome = txs
            .filter(t => t.type === TransactionType.INCOME && (includedIncomes.length === 0 || (t.categoryId && includedIncomes.includes(t.categoryId))))
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = txs
            .filter(t => t.type === TransactionType.EXPENSE && (!t.categoryId || !excludedExpenses.includes(t.categoryId)))
            .reduce((sum, t) => sum + t.amount, 0);

        return totalIncome - totalExpense;
    };

    const currentMonthSavings = calculateSavings(currentMonthTxs) as number;
    const lastMonthSavings = calculateSavings(lastMonthTxs) as number;
    const savingsDiff = currentMonthSavings - lastMonthSavings;

    // Expense Insight
    const expenseByCategory = currentMonthTxs
        .reduce((acc, tx) => {
            if (tx.categoryId) {
                const category = categories.find(c => c.id === tx.categoryId);
                if (category?.type === TransactionType.EXPENSE) {
                    const amount = tx.type === TransactionType.EXPENSE ? tx.amount : -tx.amount;
                    acc[tx.categoryId] = (acc[tx.categoryId] || 0) + amount;
                }
            }
            return acc;
        }, {} as Record<string, number>);
    
    const topExpense = Object.entries(expenseByCategory).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    const topExpenseCategory = topExpense ? categories.find(c => c.id === topExpense[0]) : null;
    
    // Budget Insight
    const budgetAlerts = budgetLimits
        .map(limit => {
            const spent = expenseByCategory[limit.categoryId] || 0;
            const percentage = limit.amount > 0 ? (spent / limit.amount) * 100 : 0;
            return {
                categoryId: limit.categoryId,
                percentage: Math.round(percentage),
            };
        })
        .filter(b => b.percentage > 80)
        .sort((a, b) => b.percentage - a.percentage);

    // Upcoming Insight
    const upcomingDate = new Date();
    upcomingDate.setDate(now.getDate() + 7);
    const upcomingTxs = transactions.filter(t => 
        t.status === TransactionStatus.POTENTIAL && 
        new Date(t.date) > now && new Date(t.date) <= upcomingDate
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
     .slice(0, appSettings.dashboardSettings.upcomingTransactionsCount || 3);
    
    // Pie Chart Data
    const expenseDataForChart = Object.entries(expenseByCategory)
        .map(([categoryId, amount]) => ({
            name: categories.find(c => c.id === categoryId)?.name || 'Inconnu',
            value: amount as number,
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8442ff', '#ff4284'];
    
    // Forecast Chart Data
    const forecastData = useMemo(() => {
        const includedAccountIds = appSettings.forecastChartSettings?.includedAccounts || [];
        const accountsToForecast = includedAccountIds.length > 0 
            ? accounts.filter(a => includedAccountIds.includes(a.id))
            : accounts;

        const forecast = generateForecast(accountsToForecast, reserves, transactions);
        
        return forecast.map(f => ({
            month: f.month.substring(0, 3),
            Solde: f.totalBalance
        }));
    }, [accounts, reserves, transactions, appSettings.forecastChartSettings]);

    const { dashboardSettings, firstName, features } = appSettings;

    return (
        <div className="space-y-6 p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Bonjour{firstName ? `, ${firstName}` : ''} !
            </h1>

            {features?.enableTags && (
                <div className="flex justify-center">
                    <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 ${activeTab === 'overview' ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
                        >
                            Vue d'ensemble
                        </button>
                        <button
                            onClick={() => setActiveTab('tags')}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 ${activeTab === 'tags' ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
                        >
                            Analyse par Tags
                        </button>
                    </div>
                </div>
            )}
            
            {activeTab === 'overview' ? (
                <div className="space-y-6">
                    {(dashboardSettings.showPendingTransactions ?? true) && (pendingTransactions.length > 0 || pendingTransfers.length > 0) && (
                        <PendingTransactions
                            recurringTransactions={pendingTransactions}
                            onValidateRecurring={onValidate}
                            onBulkValidateRecurring={onBulkValidate}
                            pendingTransfers={pendingTransfers}
                            profiles={profiles}
                            onAcceptTransfer={onAcceptTransfer}
                        />
                    )}

                    {/* Smart Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {dashboardSettings.showSavingsInsight && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                    <BanknotesIcon className="w-6 h-6 text-green-600 dark:text-green-400"/>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Épargne ce mois-ci</p>
                                    <p className="text-xl font-bold"><AnimatedNumber value={currentMonthSavings} /></p>
                                    <p className={`text-xs font-semibold ${savingsDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {savingsDiff >= 0 ? '▲' : '▼'} {currencyFormatter.format(Math.abs(savingsDiff))} vs mois dernier
                                    </p>
                                </div>
                            </div>
                        )}
                        {dashboardSettings.showExpenseInsight && topExpenseCategory && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                    <ChartPieIcon className="w-6 h-6 text-blue-600 dark:text-blue-400"/>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Top Dépense du mois</p>
                                    <p className="text-xl font-bold">{topExpenseCategory.name}</p>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{currencyFormatter.format(topExpense[1] as number)}</p>
                                </div>
                            </div>
                        )}
                        {dashboardSettings.showBudgetInsight && budgetAlerts.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                                    <CheckBadgeIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400"/>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Budget(s) à surveiller</p>
                                    <p className="text-base font-bold">{categories.find(c=>c.id === budgetAlerts[0].categoryId)?.name}</p>
                                    <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{budgetAlerts[0].percentage}% utilisé</p>
                                </div>
                            </div>
                        )}
                        {dashboardSettings.showUpcomingInsight && upcomingTxs.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <ArrowPathIcon className="w-6 h-6 text-purple-600 dark:text-purple-400"/>
                                </div>
                            <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Prochaine(s) échéance(s)</p>
                                    <p className="text-base font-bold">{upcomingTxs[0].description}</p>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{currencyFormatter.format(upcomingTxs[0].amount)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {features?.enableSavingsGoals && <SavingsGoals reserves={reserves} transactions={transactions} />}
                    
                    {dashboardSettings.showForecastChart && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-accent mb-4">Prévision de Trésorerie (12 mois)</h2>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <LineChart data={forecastData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
                                        <YAxis tickFormatter={(value) => currencyFormatter.format(value as number)} tick={{ fill: 'currentColor', fontSize: 12 }} width={80}/>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend />
                                        <Line type="monotone" dataKey="Solde" stroke="var(--accent-color)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {dashboardSettings.showAccountsOverview && (
                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                                <h2 className="text-xl font-semibold text-accent mb-4">
                                    Aperçu des Comptes
                                </h2>
                                <div className="space-y-2">
                                    {accounts.map(account => {
                                        const isExpanded = expandedAccounts.has(account.id);
                                        const accountReserves = reserves.filter(r => r.accountId === account.id);
                                        const totalReservesBalance = accountReserves.reduce((sum, r) => sum + calculateCurrentReserveBalance(r, transactions, now), 0);
                                        const currentBalance = calculateAccountBalance(account, transactions, now);
                                        const mainBalance = currentBalance - totalReservesBalance;

                                        return (
                                        <div key={account.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div 
                                                className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" 
                                                onClick={() => toggleAccountExpansion(account.id)}
                                            >
                                                <div className="flex-1" onClick={(e) => { e.stopPropagation(); onSelectAccount(account.id);}}>
                                                    <p className="font-semibold">{account.name}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-lg font-bold"><AnimatedNumber value={currentBalance as number} /></p>
                                                    <div className="w-5 h-5">
                                                        {accountReserves.length > 0 && (
                                                            isExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-500"/> : <ChevronDownIcon className="w-5 h-5 text-gray-500"/>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {isExpanded && accountReserves.length > 0 && (
                                                <div className="px-4 pb-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                    <ul className="space-y-2 text-sm">
                                                        <li className="flex justify-between items-center text-gray-800 dark:text-gray-200 font-semibold">
                                                            <span>Disponible</span>
                                                            <span>{currencyFormatter.format(mainBalance)}</span>
                                                        </li>
                                                        {accountReserves.map(reserve => (
                                                            <li key={reserve.id} className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                                                                <span>{reserve.name}</span>
                                                                <span>{currencyFormatter.format(calculateCurrentReserveBalance(reserve, transactions, now))}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )}
                        {dashboardSettings.showExpenseChart && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                                <h2 className="text-xl font-semibold text-accent mb-4">
                                    Dépenses du mois
                                </h2>
                                {expenseDataForChart.length > 0 ? (
                                    <div style={{ width: '100%', height: 250 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={expenseDataForChart}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {expenseDataForChart.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<PieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                                    <p>Aucune dépense enregistrée pour ce mois.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <TagsAnalysisView transactions={transactions} categories={categories} />
            )}
        </div>
    );
};