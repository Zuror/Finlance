import React, { useState, useMemo } from 'react';
import { Transaction, Category, TransactionType } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChevronDownIcon, ChevronUpIcon, TagIcon } from './Icons';

interface TagsAnalysisViewProps {
    transactions: Transaction[];
    categories: Category[];
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8442ff', '#ff4284', '#a2d6f9', '#f4a261', '#e76f51', '#2a9d8f'];

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

export const TagsAnalysisView: React.FC<TagsAnalysisViewProps> = ({ transactions, categories }) => {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const tagsData = useMemo(() => {
        const stats: { [tag: string]: { count: number; income: number; expense: number } } = {};
        transactions.forEach(tx => {
            tx.tags?.forEach(tag => {
                if (!stats[tag]) {
                    stats[tag] = { count: 0, income: 0, expense: 0 };
                }
                stats[tag].count++;
                if (tx.type === TransactionType.INCOME) {
                    stats[tag].income += tx.amount;
                } else {
                    stats[tag].expense += tx.amount;
                }
            });
        });
        return Object.entries(stats)
            .map(([name, data]) => ({ name, ...data, balance: data.income - data.expense }))
            .sort((a, b) => b.count - a.count);
    }, [transactions]);
    
    const selectedTagDetails = useMemo(() => {
        if (!selectedTag) return null;
        
        const txs = transactions.filter(tx => tx.tags?.includes(selectedTag)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const income = txs.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const expense = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

        const expenseByCategory = txs
            .filter(t => t.type === TransactionType.EXPENSE && t.categoryId)
            .reduce((acc, tx) => {
                const categoryName = categories.find(c => c.id === tx.categoryId)?.name || 'Inconnu';
                acc[categoryName] = (acc[categoryName] || 0) + tx.amount;
                return acc;
            }, {} as Record<string, number>);
            
        const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => (b.value as number) - (a.value as number));
        
        return { txs, income, expense, pieData };
    }, [selectedTag, transactions, categories]);

    if (tagsData.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
                <p className="text-gray-500 dark:text-gray-400">Aucun tag n'a été utilisé pour le moment.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Ajoutez des tags à vos transactions pour les analyser ici.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-accent mb-4">Analyse par Tags</h2>
                <div className="space-y-2">
                    {tagsData.map(tag => (
                        <div key={tag.name} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex justify-between items-center cursor-pointer p-3" onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}>
                                <div className="flex items-center gap-2">
                                    <TagIcon className="w-5 h-5 text-gray-500" />
                                    <p className="font-bold text-gray-800 dark:text-gray-100">#{tag.name}</p>
                                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{tag.count} op.</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className={`font-bold ${tag.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currencyFormatter.format(tag.balance)}</p>
                                    {selectedTag === tag.name ? <ChevronUpIcon className="w-5 h-5 text-gray-400"/> : <ChevronDownIcon className="w-5 h-5 text-gray-400"/>}
                                </div>
                            </div>

                            {selectedTag === tag.name && selectedTagDetails && (
                                <div className="mt-2 p-4 border-t dark:border-gray-600 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-3 bg-green-50 dark:bg-green-900/50 rounded-lg text-center">
                                            <p className="text-sm text-green-700 dark:text-green-300">Total Revenus</p>
                                            <p className="font-bold text-lg text-green-800 dark:text-green-200">{currencyFormatter.format(selectedTagDetails.income)}</p>
                                        </div>
                                        <div className="p-3 bg-red-50 dark:bg-red-900/50 rounded-lg text-center">
                                            <p className="text-sm text-red-700 dark:text-red-300">Total Dépenses</p>
                                            <p className="font-bold text-lg text-red-800 dark:text-red-200">{currencyFormatter.format(selectedTagDetails.expense)}</p>
                                        </div>
                                        {selectedTagDetails.pieData.length > 0 && (
                                            <div className="md:col-span-1 h-48">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={selectedTagDetails.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8">
                                                            {selectedTagDetails.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip content={<PieTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Transactions associées</h4>
                                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                        {selectedTagDetails.txs.map(tx => (
                                            <div key={tx.id} className="flex justify-between items-center text-sm p-2 rounded bg-white dark:bg-gray-800">
                                                <div>
                                                    <p className="font-semibold">{tx.description}</p>
                                                    <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                                <p className={`font-bold ${tx.type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'}`}>
                                                    {tx.type === TransactionType.EXPENSE ? '-' : '+'} {currencyFormatter.format(tx.amount)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};