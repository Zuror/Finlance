import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Transaction, Account, Reserve, TransactionStatus, TransactionType, Category, RecurringExpense, EntityID, CustomFieldDefinition, RecurringTransfer, Reimbursement, AppSettings, PendingTransfer, Profile } from '../types';
import { CheckBadgeIcon, PencilIcon, TrashIcon, BackwardIcon, ArrowLeftIcon, DynamicIcon, ArrowsRightLeftIcon, EllipsisVerticalIcon, CheckIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon, AdjustmentsHorizontalIcon, DocumentDuplicateIcon } from './Icons';
import { PendingTransactions } from './PendingTransactions';
import { RecurringExpensesView } from './RecurringExpensesView';
import { BulkEditModal } from './BulkEditModal';
import { MergeTransactionsModal } from './MergeTransactionsModal';
import { RecurringTransfersView } from './RecurringTransfersView';
import { ReimbursementsView } from './ReimbursementsView';
import { EmptyState } from './EmptyState';
import { NoTransactionsIllustration } from './Illustrations';

const ITEMS_PER_PAGE = 20;

type SortableKeys = keyof Pick<Transaction, 'date' | 'description' | 'amount' | 'categoryId' | 'accountId' | 'status'>;

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  reserves: Reserve[];
  categories: Category[];
  customFieldDefinitions: CustomFieldDefinition[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction) => void;
  onSave: (transaction: Transaction) => void;
  onStatusChange: (id: string, status: TransactionStatus) => void;
  onBulkUpdate: (ids: EntityID[], data: Partial<Transaction>) => void;
  onBulkDelete: (ids: EntityID[]) => void;
  onMergeTransactions: (mergedData: Partial<Transaction>, originalIds: [string, string]) => void;
  
  recurringExpenses: RecurringExpense[];
  onAddRecurring: () => void;
  onEditRecurring: (expense: RecurringExpense) => void;
  onDeleteRecurring: (id: EntityID) => void;
  
  recurringTransfers: RecurringTransfer[];
  onAddRecurringTransfer: () => void;
  onEditRecurringTransfer: (transfer: RecurringTransfer) => void;
  onDeleteRecurringTransfer: (id: EntityID) => void;

  reimbursements: Reimbursement[];
  onTrackReimbursement: (transaction: Transaction) => void;
  onMarkReimbursementAsReceived: (reimbursement: Reimbursement) => void;
  onEditReceivedReimbursement: (transactionId: EntityID) => void;

  pendingRecurringTransactions: Transaction[];
  onBulkValidateRecurring: () => void;
  
  pendingTransfers: PendingTransfer[];
  onAcceptTransfer: (transfer: PendingTransfer) => void;
  profiles: Profile[];

  // New drill-down props
  filteredAccountId: EntityID | null;
  filterByImportId: EntityID | null;
  onClearFilter: () => void;

  appSettings: AppSettings;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const QuickFilterButton: React.FC<{ label: string, onClick: () => void, isActive: boolean }> = ({ label, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
    >
        {label}
    </button>
);

const TransactionCard: React.FC<{
  tx: Transaction;
  reimbursements: Reimbursement[];
  categories: Category[];
  customFieldDefinitions: CustomFieldDefinition[];
  appSettings: AppSettings;
  selectedTxIds: Set<EntityID>;
  isSelectionMode: boolean;
  onToggleSelection: (id: EntityID, mode: 'toggle' | 'add') => void;
  onTrackReimbursement: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: EntityID) => void;
  getAccountName: (id: string) => string;
  getReserveName: (id?: string) => string | undefined;
}> = ({
  tx,
  reimbursements,
  categories,
  customFieldDefinitions,
  appSettings,
  selectedTxIds,
  isSelectionMode,
  onToggleSelection,
  onTrackReimbursement,
  onEdit,
  onDuplicate,
  onDelete,
  getAccountName,
  getReserveName,
}) => {
  const isExpense = tx.type === TransactionType.EXPENSE;
  const amountColor = isExpense ? 'text-red-500' : 'text-green-500';
  const isReimbursementTracked = reimbursements.some(r => r.transactionId === tx.id);
  const category = categories.find(c => c.id === tx.categoryId);
  const isSelected = selectedTxIds.has(tx.id);

  const customFields = customFieldDefinitions
      .map(def => ({ def, value: tx.customFields?.[def.id] }))
      .filter(field => field.value !== undefined && field.value !== null && field.value !== '');

  const longPressTimer = useRef<number | null>(null);
  const handleTouchStart = () => {
      longPressTimer.current = window.setTimeout(() => {
          onToggleSelection(tx.id, 'add');
      }, 500);
  };
  const handleTouchEnd = () => {
      if(longPressTimer.current) window.clearTimeout(longPressTimer.current);
  };
  const handleClick = () => {
      if (isSelectionMode) {
          onToggleSelection(tx.id, 'toggle');
      }
  };

  return (
      <div 
          key={tx.id} 
          className={`relative rounded-xl transition-all duration-200 ${isSelected ? 'ring-2 ring-accent bg-blue-50 dark:bg-blue-900/40' : 'bg-white dark:bg-gray-800 shadow-md'}`}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
      >
          {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center pointer-events-none">
                  <CheckIcon className="w-4 h-4 text-white" />
              </div>
          )}
          <div className={`p-4 flex gap-3 transition-opacity ${isSelectionMode ? 'opacity-70' : ''}`}>
              <div className="flex-shrink-0 pt-1">
              {category?.icon ? (
                  <DynamicIcon iconName={category.icon} className="w-6 h-6 text-gray-500" />
              ) : (
                  <div className="w-6 h-6"></div>
              )}
              </div>
              <div className="flex-1">
              <div className="flex justify-between items-start">
                  <p className="font-bold text-gray-800 dark:text-gray-100 flex-1 mr-4">{tx.description}</p>
                  <p className={`font-bold text-lg ${amountColor} whitespace-nowrap`}>{isExpense ? '-' : '+'} {currencyFormatter.format(tx.amount)}</p>
              </div>
              {appSettings.features?.enableTags && tx.tags && tx.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                  {tx.tags.map(tag => <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200">#{tag}</span>)}
                  </div>
              )}
              <div className="mt-2 pt-2 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p><strong>Date:</strong> {new Date(tx.date).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Compte:</strong> {getAccountName(tx.accountId)}</p>
                  {tx.categoryId && <p className="flex items-center gap-2"><strong>Catégorie:</strong> {category?.name}</p>}
                  {tx.reserveId && <p><strong>Réserve:</strong> {getReserveName(tx.reserveId)}</p>}
                  <div className="flex items-center gap-2">
                      <strong>Statut:</strong>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tx.status === TransactionStatus.REAL ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'}`}>
                          {tx.status}
                      </span>
                      {tx.isReconciled && <CheckBadgeIcon className="inline w-5 h-5 text-green-500" />}
                  </div>
              </div>
              {customFields.length > 0 && (
                  <div className="mt-2 pt-2 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {customFields.map(({ def, value }) => (
                          <p key={def.id}><strong>{def.name}:</strong> {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}</p>
                      ))}
                  </div>
              )}
              <div className={`flex justify-end gap-4 mt-3 text-sm ${isSelectionMode ? 'pointer-events-none' : ''}`}>
                  {isExpense && !isReimbursementTracked && (
                      <button onClick={(e) => { e.stopPropagation(); onTrackReimbursement(tx); }} disabled={isSelectionMode} title="Suivre un remboursement" className="font-medium text-green-600 flex items-center gap-1 disabled:text-gray-400">
                      <BackwardIcon className="w-4 h-4"/> Suivre
                      </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onDuplicate(tx); }} disabled={isSelectionMode} className="font-medium text-gray-600 dark:text-gray-400 hover:underline disabled:text-gray-400 transition-colors duration-200">Dupliquer</button>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(tx); }} disabled={tx.isReconciled || isSelectionMode} className="font-medium text-blue-600 dark:text-blue-500 hover:underline disabled:text-gray-400 transition-colors duration-200">Modifier</button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} disabled={tx.isReconciled || !!tx.recurringExpenseId || !!tx.recurringTransferId || isSelectionMode} className="font-medium text-red-600 dark:text-red-500 hover:underline disabled:text-gray-400 transition-colors duration-200">Supprimer</button>
              </div>
              </div>
          </div>
      </div>
  );
};

export const TransactionsList: React.FC<TransactionsPageProps> = (props) => {
  const { 
    transactions, accounts, reserves, categories, customFieldDefinitions, onDelete, onEdit, onDuplicate, onSave, onStatusChange, onBulkUpdate, onBulkDelete, onMergeTransactions,
    recurringExpenses, onAddRecurring, onEditRecurring, onDeleteRecurring,
    recurringTransfers, onAddRecurringTransfer, onEditRecurringTransfer, onDeleteRecurringTransfer,
    reimbursements, onTrackReimbursement, onMarkReimbursementAsReceived, onEditReceivedReimbursement,
    pendingRecurringTransactions, onBulkValidateRecurring,
    pendingTransfers, onAcceptTransfer, profiles,
    filteredAccountId, filterByImportId, onClearFilter,
    appSettings
  } = props;

  const [activeTab, setActiveTab] = useState<'transactions' | 'recurring' | 'reimbursements'>('transactions');
  const [recurringSubTab, setRecurringSubTab] = useState<'expenses' | 'transfers'>('expenses');
  
  // Local filters, only used when no global filter is applied
  const [localFilterAccountId, setLocalFilterAccountId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [filterTags, setFilterTags] = useState<string>('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedTxIds, setSelectedTxIds] = useState<Set<EntityID>>(new Set());
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [hoveredTxId, setHoveredTxId] = useState<EntityID | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({
    key: 'date',
    direction: 'descending',
  });
  
  // In-line editing state
  const [editingTxId, setEditingTxId] = useState<EntityID | null>(null);
  const [editedTx, setEditedTx] = useState<Partial<Transaction> | null>(null);
  
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const isSelectionMode = selectedTxIds.size > 0;
  const effectiveFilterAccountId = filteredAccountId || localFilterAccountId;

  const getAccountName = useCallback((id: string) => accounts.find(a => a.id === id)?.name || 'N/A', [accounts]);
  const getCategory = useCallback((id?: string) => categories.find(c => c.id === id), [categories]);
  const getReserveName = useCallback((id?: string) => id ? reserves.find(r => r.id === id)?.name : undefined, [reserves]);


  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      if (effectiveFilterAccountId && tx.accountId !== effectiveFilterAccountId) return false;
      if (filterStartDate && tx.date < filterStartDate) return false;
      if (filterEndDate && tx.date > filterEndDate) return false;
      if (filterCategoryId && tx.categoryId !== filterCategoryId) return false;
      if (filterStatus && tx.status !== filterStatus) return false;
      if (filterByImportId && tx.importId !== filterByImportId) return false;
      
      if (filterMinAmount) {
        const min = parseFloat(filterMinAmount);
        if (!isNaN(min) && tx.amount < min) return false;
      }
      if (filterMaxAmount) {
        const max = parseFloat(filterMaxAmount);
        if (!isNaN(max) && tx.amount > max) return false;
      }
      if (filterTags) {
        const requiredTags = filterTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        if (requiredTags.length > 0) {
          const txTags = tx.tags?.map(t => t.toLowerCase()) || [];
          if (!requiredTags.every(rt => txTags.includes(rt))) return false;
        }
      }
      
      return true;
    });

    if (sortConfig.key) {
        filtered.sort((a, b) => {
            let aValue: any = a[sortConfig.key!];
            let bValue: any = b[sortConfig.key!];

            if (sortConfig.key === 'categoryId') {
                aValue = getCategory(a.categoryId)?.name || '';
                bValue = getCategory(b.categoryId)?.name || '';
            } else if (sortConfig.key === 'accountId') {
                aValue = getAccountName(a.accountId) || '';
                bValue = getAccountName(b.accountId) || '';
            } else if (sortConfig.key === 'amount') {
                const signedA = a.type === TransactionType.EXPENSE ? -a.amount : a.amount;
                const signedB = b.type === TransactionType.EXPENSE ? -b.amount : b.amount;
                aValue = signedA;
                bValue = signedB;
            }

            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }
    
    return filtered;
  }, [transactions, effectiveFilterAccountId, filterStartDate, filterEndDate, filterCategoryId, filterStatus, filterByImportId, filterMinAmount, filterMaxAmount, filterTags, sortConfig, getCategory, getAccountName]);
  
  const advancedFiltersAreActive = useMemo(() => {
    return !!(localFilterAccountId || filterStartDate || filterEndDate || filterCategoryId || filterStatus || filterMinAmount || filterMaxAmount || filterTags);
  }, [localFilterAccountId, filterStartDate, filterEndDate, filterCategoryId, filterStatus, filterMinAmount, filterMaxAmount, filterTags]);

  useEffect(() => {
      setCurrentPage(1);
      setSelectedTxIds(new Set());
  }, [effectiveFilterAccountId, filterStartDate, filterEndDate, filterCategoryId, filterStatus, activeTab, filterByImportId, filterMinAmount, filterMaxAmount, filterTags]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAndSortedTransactions.slice(start, end);
  }, [filteredAndSortedTransactions, currentPage]);

  const selectedTransactionsForMerge = useMemo(() => {
    if (selectedTxIds.size !== 2) return null;
    const ids = Array.from(selectedTxIds);
    const txs = transactions.filter(t => ids.includes(t.id));
    return txs.length === 2 ? (txs as [Transaction, Transaction]) : null;
  }, [selectedTxIds, transactions]);

  const canMerge = selectedTransactionsForMerge && !selectedTransactionsForMerge.some(tx => tx.isReconciled);

  const handleResetFilters = () => {
    setLocalFilterAccountId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCategoryId('');
    setFilterStatus('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterTags('');
    setActiveQuickFilter(null);
  };

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / ITEMS_PER_PAGE);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key) {
        direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
        if (key === 'date' || key === 'amount') {
            direction = 'descending';
        }
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{
    label: string;
    sortKey: SortableKeys;
    className?: string;
  }> = ({ label, sortKey, className = "px-6 py-3" }) => {
      const isSorted = sortConfig.key === sortKey;
      const Icon = isSorted ? (sortConfig.direction === 'ascending' ? ChevronUpIcon : ChevronDownIcon) : ArrowsUpDownIcon;
      return (
          <th scope="col" className={className}>
              <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1 group whitespace-nowrap">
                  {label}
                  <Icon className={`w-4 h-4 transition-opacity ${isSorted ? 'opacity-100 text-accent' : 'opacity-20 text-gray-400 group-hover:opacity-100'}`} />
              </button>
          </th>
      );
  };

  const handleQuickFilter = (period: string) => {
    const today = new Date();
    let start = '', end = '';
    
    switch (period) {
        case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
        case 'lastMonth':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
            end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
            break;
        case 'thisYear':
            start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            end = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
            break;
        case 'lastYear':
            start = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
            end = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
            break;
    }
    
    setFilterStartDate(start);
    setFilterEndDate(end);
    setActiveQuickFilter(period);
  };
  
  useEffect(() => {
    if (filterStartDate || filterEndDate) {
      if(activeQuickFilter) {
          // Check if dates still match quick filter
          // This is a simplified check, a real implementation might need a library
      }
    } else {
        setActiveQuickFilter(null);
    }
  }, [filterStartDate, filterEndDate, activeQuickFilter]);

  const handleToggleSelection = (id: EntityID, mode: 'toggle' | 'add') => {
      setSelectedTxIds(prev => {
          const newSet = new Set(prev);
          if (mode === 'add') {
              newSet.add(id);
          } else { // toggle
              if (newSet.has(id)) newSet.delete(id);
              else newSet.add(id);
          }
          return newSet;
      });
  };
  
  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedTransactions.map(t => t.id);
      setSelectedTxIds(prev => new Set([...prev, ...pageIds]));
    } else {
      const pageIds = new Set(paginatedTransactions.map(t => t.id));
      setSelectedTxIds(prev => new Set([...prev].filter(id => !pageIds.has(id))));
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedTxIds.size} transaction(s) ?`)) {
        onBulkDelete(Array.from(selectedTxIds));
        setSelectedTxIds(new Set());
    }
  };

  // --- In-line Editing Handlers ---
  const handleEditStart = (tx: Transaction) => {
    if (tx.isReconciled) return;
    setEditingTxId(tx.id);
    setEditedTx({ ...tx });
  };

  const handleEditCancel = () => {
    setEditingTxId(null);
    setEditedTx(null);
  };

  const handleSaveEdit = () => {
    if (editedTx) {
      onSave(editedTx as Transaction);
    }
    handleEditCancel();
  };

  const handleEditChange = (field: keyof Transaction, value: any) => {
    if (editedTx) {
        setEditedTx(prev => ({ ...prev!, [field]: value }));
    }
  };

  const handleAmountTypeChange = (valueStr: string) => {
    if (editedTx) {
        const newAmount = parseFloat(valueStr);
        if (!isNaN(newAmount)) {
            const newType = newAmount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
            setEditedTx(prev => {
                if (!prev) return null;
                const categoryId = prev.type !== newType ? '' : prev.categoryId;
                return { ...prev, amount: Math.abs(newAmount), type: newType, categoryId };
            });
        }
    }
  };
  
  const renderTransactionRow = (tx: Transaction, index: number) => {
    const isEditing = editingTxId === tx.id;

    if (isEditing && editedTx) {
        const availableCategories = categories.filter(c => c.type === editedTx.type);
        return (
             <tr 
                key={tx.id} 
                className="bg-blue-50 dark:bg-blue-900/50 border-b dark:border-blue-800"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); }
                    if (e.key === 'Escape') handleEditCancel();
                }}
            >
                <td className="px-6 py-2"></td>
                <td className="px-4 py-2"><input type="date" value={editedTx.date || ''} onChange={(e) => handleEditChange('date', e.target.value)} className="w-full bg-white dark:bg-gray-700 p-1 border rounded text-sm"/></td>
                <td className="px-4 py-2"><input type="text" value={editedTx.description || ''} onChange={(e) => handleEditChange('description', e.target.value)} className="w-full bg-white dark:bg-gray-700 p-1 border rounded text-sm"/></td>
                <td className="px-4 py-2"><input type="number" step="0.01" value={editedTx.type === TransactionType.EXPENSE ? -(editedTx.amount || 0) : (editedTx.amount || 0)} onChange={(e) => handleAmountTypeChange(e.target.value)} className="w-full bg-white dark:bg-gray-700 p-1 border rounded text-sm text-right"/></td>
                <td className="px-4 py-2">
                    <select value={editedTx.categoryId || ''} onChange={(e) => handleEditChange('categoryId', e.target.value)} className="w-full bg-white dark:bg-gray-700 p-1 border rounded text-sm">
                        <option value="">-- Catégorie --</option>
                        {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </td>
                <td className="px-6 py-4 text-sm">{getAccountName(tx.accountId)}</td>
                <td className="px-4 py-2">
                    <select 
                        value={editedTx.status} 
                        onChange={(e) => handleEditChange('status', e.target.value as TransactionStatus)} 
                        className="w-full bg-white dark:bg-gray-700 p-1 border rounded text-sm"
                    >
                        <option value={TransactionStatus.REAL}>Réel</option>
                        <option value={TransactionStatus.POTENTIAL}>Potentiel</option>
                    </select>
                </td>
                <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={handleSaveEdit} title="Valider" className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-gray-700"><CheckIcon className="w-5 h-5" /></button>
                        <button onClick={handleEditCancel} title="Annuler" className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-gray-700"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                </td>
            </tr>
        );
    }

    const isExpense = tx.type === TransactionType.EXPENSE;
    const amountColor = isExpense ? 'text-red-500' : 'text-green-500';
    const isReimbursementTracked = reimbursements.some(r => r.transactionId === tx.id);
    const category = getCategory(tx.categoryId);
    const prevTx = index > 0 ? paginatedTransactions[index-1] : null;
    const isGroupedWithPrev = tx.transferId && prevTx && prevTx.transferId === tx.transferId;
    
    return (
        <tr 
            key={tx.id} 
            onMouseEnter={() => setHoveredTxId(tx.id)} 
            onMouseLeave={() => setHoveredTxId(null)}
            onDoubleClick={() => handleEditStart(tx)}
            className={`border-b dark:border-gray-700 transition-colors duration-150 ${isGroupedWithPrev ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'} ${selectedTxIds.has(tx.id) ? 'bg-blue-100 dark:bg-blue-900/50' : `hover:bg-gray-50 dark:hover:bg-gray-700 ${!tx.isReconciled ? 'cursor-pointer' : ''}`}`}
        >
            <td className="px-6 py-4">
              <input type="checkbox" checked={selectedTxIds.has(tx.id)} onChange={() => handleToggleSelection(tx.id, 'toggle')} className="rounded text-accent focus:ring-accent" />
            </td>
            <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                <div className="flex items-center gap-2">
                  {tx.transferId && <ArrowsRightLeftIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  {tx.description}
                </div>
              {appSettings.features?.enableTags && tx.tags && tx.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tx.tags.map(tag => <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200">#{tag}</span>)}
                </div>
              )}
            </td>
            <td className={`px-6 py-4 font-bold ${amountColor}`}>{isExpense ? '-' : '+'} {currencyFormatter.format(tx.amount)}</td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                {category?.icon && <DynamicIcon iconName={category.icon} className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                <span>{category?.name || 'N/A'}</span>
              </div>
            </td>
            <td className="px-6 py-4">{getAccountName(tx.accountId)}</td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.status === TransactionStatus.REAL ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'}`}>
                  {tx.status}
                </span>
                {tx.isReconciled && <CheckBadgeIcon className="inline w-5 h-5 ml-1 text-green-500" />}
            </td>
            <td className="px-4 py-2 text-right" style={{minWidth: '130px'}}>
                <div className={`flex items-center justify-end gap-1 transition-opacity duration-150 ${(hoveredTxId === tx.id || isSelectionMode) && !isEditing ? 'opacity-100' : 'opacity-0'}`}>
                    {isExpense && !isReimbursementTracked && (
                        <button onClick={() => onTrackReimbursement(tx)} title="Suivre un remboursement" className="p-2 rounded-full text-green-600 hover:bg-gray-200 dark:hover:bg-gray-700">
                            <BackwardIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => onDuplicate(tx)} title="Dupliquer" className="p-2 rounded-full text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(tx)} disabled={tx.isReconciled} title="Modifier" className="p-2 rounded-full text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:text-gray-400">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(tx.id)} disabled={tx.isReconciled || !!tx.recurringExpenseId || !!tx.recurringTransferId} title="Supprimer" className="p-2 rounded-full text-red-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:text-gray-400">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
  };
  
  const renderContent = () => {
    switch(activeTab) {
        case 'transactions':
            if (filteredAndSortedTransactions.length === 0) {
              return (
                <div className="mt-8">
                    <EmptyState
                        illustration={<NoTransactionsIllustration/>}
                        title="Aucune transaction trouvée"
                        message="Essayez d'ajuster vos filtres ou ajoutez une nouvelle opération."
                    />
                </div>
              )
            }
            return (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                      <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                      <input type="checkbox" onChange={handleSelectAllOnPage} checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedTxIds.has(t.id))} className="rounded text-accent focus:ring-accent"/>
                                    </th>
                                    <SortableHeader label="Date" sortKey="date" />
                                    <SortableHeader label="Description" sortKey="description" />
                                    <SortableHeader label="Montant" sortKey="amount" />
                                    <SortableHeader label="Catégorie" sortKey="categoryId" />
                                    <SortableHeader label="Compte" sortKey="accountId" />
                                    <SortableHeader label="Statut" sortKey="status" />
                                    <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransactions.map(renderTransactionRow)}
                            </tbody>
                         </table>
                      </div>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                      {paginatedTransactions.map(tx => (
                        <TransactionCard
                          key={tx.id}
                          tx={tx}
                          reimbursements={reimbursements}
                          categories={categories}
                          customFieldDefinitions={customFieldDefinitions}
                          appSettings={appSettings}
                          selectedTxIds={selectedTxIds}
                          isSelectionMode={isSelectionMode}
                          onToggleSelection={handleToggleSelection}
                          onTrackReimbursement={onTrackReimbursement}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          getAccountName={getAccountName}
                          getReserveName={getReserveName}
                        />
                      ))}
                  </div>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-6">
                        <span className="text-sm text-gray-700 dark:text-gray-400">
                            Page {currentPage} sur {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-50">Précédent</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-50">Suivant</button>
                        </div>
                    </div>
                  )}
                </>
            );
        case 'recurring':
            return (
                <div>
                   <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                      <button onClick={() => setRecurringSubTab('expenses')} className={`${recurringSubTab === 'expenses' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        Dépenses ({recurringExpenses.length})
                      </button>
                      <button onClick={() => setRecurringSubTab('transfers')} className={`${recurringSubTab === 'transfers' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        Virements ({recurringTransfers.length})
                      </button>
                    </nav>
                  </div>
                  {recurringSubTab === 'expenses' ? (
                    <RecurringExpensesView 
                      recurringExpenses={recurringExpenses} 
                      accounts={accounts} 
                      categories={categories}
                      onAdd={onAddRecurring}
                      onEdit={onEditRecurring}
                      onDelete={onDeleteRecurring}
                    />
                  ) : (
                    <RecurringTransfersView
                        recurringTransfers={recurringTransfers}
                        accounts={accounts}
                        reserves={reserves}
                        onAdd={onAddRecurringTransfer}
                        onEdit={onEditRecurringTransfer}
                        onDelete={onDeleteRecurringTransfer}
                    />
                  )}
                </div>
            );
        case 'reimbursements':
            return <ReimbursementsView
                reimbursements={reimbursements}
                transactions={transactions}
                onMarkAsReceived={onMarkReimbursementAsReceived}
                onEditReceivedReimbursement={onEditReceivedReimbursement}
            />
    }
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Transactions</h1>
      {(pendingRecurringTransactions.length > 0 || pendingTransfers.length > 0) && (
        <PendingTransactions
            recurringTransactions={pendingRecurringTransactions}
            pendingTransfers={pendingTransfers}
            profiles={profiles}
            onValidateRecurring={onStatusChange}
            onBulkValidateRecurring={onBulkValidateRecurring}
            onAcceptTransfer={onAcceptTransfer}
        />
      )}
      
      {filteredAccountId && (
         <div className="bg-blue-50 dark:bg-blue-900/50 p-3 rounded-lg mb-4 flex justify-between items-center">
            <p className="text-blue-800 dark:text-blue-200 font-semibold">
                Affichage des transactions pour : {accounts.find(a => a.id === filteredAccountId)?.name}
            </p>
            <button onClick={onClearFilter} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-300 hover:underline">
                <ArrowLeftIcon className="w-4 h-4"/> Retour à tous les comptes
            </button>
         </div>
      )}
      {filterByImportId && (
         <div className="bg-green-50 dark:bg-green-900/50 p-3 rounded-lg mb-4 flex justify-between items-center">
            <p className="text-green-800 dark:text-green-200 font-semibold">
                Affichage des transactions du dernier import.
            </p>
            <button onClick={onClearFilter} className="flex items-center gap-1 text-sm text-green-600 dark:text-green-300 hover:underline">
                <ArrowLeftIcon className="w-4 h-4"/> Voir toutes les transactions
            </button>
         </div>
      )}

      {/* New Sub-navigation */}
      <div className="flex justify-center mb-6">
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-xl shadow-inner max-w-full overflow-x-auto">
              <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${activeTab === 'transactions' ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
              >
                  Opérations <span className="text-xs opacity-75">({filteredAndSortedTransactions.length})</span>
              </button>
              <button
                  onClick={() => setActiveTab('recurring')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${activeTab === 'recurring' ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
              >
                  Opérations Récurrentes <span className="text-xs opacity-75">({recurringExpenses.length + recurringTransfers.length})</span>
              </button>
              <button
                  onClick={() => setActiveTab('reimbursements')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${activeTab === 'reimbursements' ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
              >
                  Remboursements <span className="text-xs opacity-75">({reimbursements.length})</span>
              </button>
          </div>
      </div>
      
      {activeTab === 'transactions' && (
        isSelectionMode ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 mb-6 flex items-center justify-between gap-4">
                <span className="text-sm font-semibold">{selectedTxIds.size} sélectionnée(s)</span>
                <div className="flex items-center gap-2">
                    {selectedTxIds.size === 2 && (
                        <button onClick={() => setIsMergeModalOpen(true)} disabled={!canMerge} title={!canMerge ? "Impossible de fusionner des transactions rapprochées." : ""} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed">Fusionner</button>
                    )}
                    <button onClick={() => setIsBulkEditModalOpen(true)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">Modifier</button>
                    <button onClick={handleBulkDeleteConfirm} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200">Supprimer</button>
                    <button onClick={() => setSelectedTxIds(new Set())} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200">Annuler</button>
                </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
                 <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex gap-2 flex-wrap">
                        <QuickFilterButton label="Ce mois-ci" onClick={() => handleQuickFilter('thisMonth')} isActive={activeQuickFilter === 'thisMonth'} />
                        <QuickFilterButton label="Le mois dernier" onClick={() => handleQuickFilter('lastMonth')} isActive={activeQuickFilter === 'lastMonth'} />
                        <QuickFilterButton label="Cette année" onClick={() => handleQuickFilter('thisYear')} isActive={activeQuickFilter === 'thisYear'} />
                        <QuickFilterButton label="Année dernière" onClick={() => handleQuickFilter('lastYear')} isActive={activeQuickFilter === 'lastYear'} />
                    </div>
                     <button onClick={() => setIsFilterPanelOpen(prev => !prev)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${advancedFiltersAreActive ? 'border-accent text-accent bg-accent/10' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <AdjustmentsHorizontalIcon className="w-5 h-5"/>
                        <span>Filtres</span>
                        {advancedFiltersAreActive && <span className="w-2 h-2 bg-accent rounded-full"></span>}
                    </button>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterPanelOpen ? 'max-h-[500px] pt-4 mt-4 border-t dark:border-gray-700' : 'max-h-0'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="filter-account" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Compte</label>
                            <select id="filter-account" value={localFilterAccountId} onChange={e => setLocalFilterAccountId(e.target.value)} disabled={!!filteredAccountId} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200 disabled:opacity-50">
                                <option value="">Tous les comptes</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catégorie</label>
                            <select id="filter-category" value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200">
                                <option value="">Toutes les catégories</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filter-start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de début</label>
                            <input id="filter-start-date" type="date" value={filterStartDate} onChange={e => {setFilterStartDate(e.target.value); setActiveQuickFilter(null);}} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="filter-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de fin</label>
                            <input id="filter-end-date" type="date" value={filterEndDate} onChange={e => {setFilterEndDate(e.target.value); setActiveQuickFilter(null);}} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fourchette de montant</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="number" value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} placeholder="Min" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" min="0" />
                                <span>à</span>
                                <input type="number" value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} placeholder="Max" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" min="0" />
                            </div>
                        </div>

                        {appSettings.features?.enableTags && (
                            <div className="lg:col-span-2">
                                <label htmlFor="filter-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                                <input id="filter-tags" type="text" value={filterTags} onChange={e => setFilterTags(e.target.value)} placeholder="vacances, projet_x (séparés par ,)" className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-4 pt-4 border-t dark:border-gray-700 gap-4">
                        <div className="w-full md:w-auto">
                            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Statut</label>
                            <select id="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200">
                                <option value="">Tous les statuts</option>
                                <option value={TransactionStatus.REAL}>Réel</option>
                                <option value={TransactionStatus.POTENTIAL}>Potentiel</option>
                            </select>
                        </div>
                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
                            Réinitialiser
                        </button>
                    </div>
                </div>
            </div>
        )
      )}

      {renderContent()}

      <BulkEditModal 
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        accounts={accounts}
        categories={categories}
        onSave={(data) => {
            onBulkUpdate(Array.from(selectedTxIds), data);
            setIsBulkEditModalOpen(false);
            setSelectedTxIds(new Set());
        }}
      />
      {isMergeModalOpen && selectedTransactionsForMerge && (
          <MergeTransactionsModal
              isOpen={isMergeModalOpen}
              onClose={() => setIsMergeModalOpen(false)}
              onMerge={(mergedData, originalIds) => {
                  onMergeTransactions(mergedData, originalIds);
                  setIsMergeModalOpen(false);
                  setSelectedTxIds(new Set());
              }}
              transactions={selectedTransactionsForMerge}
              accounts={accounts}
              categories={categories}
          />
      )}
    </div>
  );
};