import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Account, Reserve, Transaction, TransactionType, TransactionStatus, EntityID, Category, CustomFieldDefinition, CustomFieldType, CategorizationRule, Reimbursement, RecurringFrequency, AccountType, AppSettings, RecurringTransfer, Profile, PendingTransfer, TransactionTemplate } from '../types';
import { applyCategorizationRules } from '../services/financeService';
import { DynamicIcon } from './Icons';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { transactionData?: any, recurringData?: any, pendingTransfer?: Omit<PendingTransfer, 'id'>, templateData?: { name: string } }, isEdit: boolean, idToSettle?: EntityID) => void;
  onSwitchToRecurringTransfer: (data: Partial<RecurringTransfer>) => void;
  accounts: Account[];
  reserves: Reserve[];
  categories: Category[];
  customFieldDefinitions: CustomFieldDefinition[];
  categorizationRules: CategorizationRule[];
  transactionToEdit?: Transaction | null;
  transactionToDuplicate?: Transaction | null;
  mainAccountId: EntityID | null;
  context?: { yearMonth: string; categoryId: EntityID } | null;
  reimbursementToSettle?: Reimbursement | null;
  reimbursementContext?: { originalCategoryId?: EntityID } | null;
  isSimulationMode?: boolean;
  initialType?: TransactionType | 'TRANSFER' | null;
  appSettings: AppSettings;
  allTags: string[];
  profiles: Profile[];
  activeProfileId: EntityID;
  pendingTransferToAccept?: PendingTransfer | null;
  // New props for duplicate and template
  templateToUse?: TransactionTemplate | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ 
    isOpen, onClose, onSave, onSwitchToRecurringTransfer, accounts, reserves, categories, customFieldDefinitions, 
    categorizationRules, transactionToEdit, transactionToDuplicate, mainAccountId, context, 
    reimbursementToSettle, reimbursementContext, isSimulationMode, initialType,
    appSettings, allTags, profiles, activeProfileId, pendingTransferToAccept,
    templateToUse
}) => {
  const isEditMode = !!transactionToEdit;
  
  const [type, setType] = useState<TransactionType | 'TRANSFER'>(initialType || TransactionType.EXPENSE);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.REAL);
  
  const [accountId, setAccountId] = useState<EntityID>('');
  const [reserveId, setReserveId] = useState<EntityID>('');
  const [categoryId, setCategoryId] = useState<EntityID>('');
  const [tags, setTags] = useState('');

  const [fromTarget, setFromTarget] = useState<string>('');
  const [toTarget, setToTarget] = useState<string>('');

  const [customFieldValues, setCustomFieldValues] = useState<Record<EntityID, any>>({});

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  
  // Inter-profile transfer state
  const [isInterProfileTransfer, setIsInterProfileTransfer] = useState(false);
  const [toProfileId, setToProfileId] = useState<EntityID>('');

  // Tag suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);
  
  // Template state
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  const otherProfiles = useMemo(() => profiles.filter(p => p.id !== activeProfileId), [profiles, activeProfileId]);

  const mainAccountTarget = mainAccountId ? `acc_${mainAccountId}` : (accounts.length > 0 ? `acc_${accounts[0].id}` : '');
  
  const resetForm = () => {
      setType(initialType || TransactionType.EXPENSE);
      setDescription('');
      setAmount('');
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setEffectiveDate(today);
      setStatus(isSimulationMode ? TransactionStatus.POTENTIAL : TransactionStatus.REAL);
      setAccountId(mainAccountId || (accounts.length > 0 ? accounts[0].id : ''));
      setFromTarget(mainAccountTarget);
      setToTarget('');
      setReserveId('');
      setCategoryId('');
      setTags('');
      setCustomFieldValues({});
      setIsRecurring(false);
      setFrequency(RecurringFrequency.MONTHLY);
      setRecurringEndDate('');
      setIsInterProfileTransfer(false);
      setToProfileId(otherProfiles.length > 0 ? otherProfiles[0].id : '');
      setSaveAsTemplate(false);
      setTemplateName('');
  }

  const populateForm = (data: Partial<Transaction>) => {
      setType(data.transferId ? 'TRANSFER' : data.type || TransactionType.EXPENSE);
      setDescription(data.description || '');
      setAmount(String(data.amount || ''));
      setDate(data.date || new Date().toISOString().split('T')[0]);
      setEffectiveDate(data.effectiveDate || new Date().toISOString().split('T')[0]);
      setStatus(data.status || TransactionStatus.REAL);
      setAccountId(data.accountId || mainAccountId || '');
      setReserveId(data.reserveId || '');
      setCategoryId(data.categoryId || '');
      setTags(data.tags?.join(', ') || '');
      setCustomFieldValues(data.customFields || {});
  }

  useEffect(() => {
    if (isOpen) {
        resetForm(); // Always reset first
        const today = new Date().toISOString().split('T')[0];

        if (transactionToEdit) { // Edit mode
            populateForm(transactionToEdit);
        } else if (transactionToDuplicate) { // Duplicate mode
            populateForm(transactionToDuplicate);
            setDate(today);
            setEffectiveDate(today);
        } else if (templateToUse) { // Template mode
            populateForm(templateToUse.transactionData);
            setDate(today);
            setEffectiveDate(today);
        } else if (pendingTransferToAccept) {
            setType(TransactionType.INCOME);
            const fromProfile = profiles.find(p => p.id === pendingTransferToAccept.fromProfileId);
            setDescription(pendingTransferToAccept.description || `Virement de ${fromProfile?.name}`);
            setAmount(String(pendingTransferToAccept.amount));
            setDate(pendingTransferToAccept.date);
            setEffectiveDate(pendingTransferToAccept.date);
        } else if (initialType) {
            setType(initialType);
        }
        else if (context) { // Add mode with context from budget
            const category = categories.find(c => c.id === context.categoryId);
            if (category) {
                setType(category.type);
            }
            setCategoryId(context.categoryId);
            const [year, month] = context.yearMonth.split('-');
            const newDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 15).toISOString().split('T')[0];
            setDate(newDate);
            setEffectiveDate(newDate);
        } else if (reimbursementToSettle) {
            setType(TransactionType.INCOME);
            setAmount(String(reimbursementToSettle.expectedAmount));
            setDate(today);
            setDescription(`Remboursement reçu`);
            setCategoryId(reimbursementContext?.originalCategoryId || '');
        }
    }
  }, [isOpen, transactionToEdit, transactionToDuplicate, templateToUse, pendingTransferToAccept, initialType, context, reimbursementToSettle]);

  // Apply categorization rules
  useEffect(() => {
      if (!isEditMode && description) {
          const suggestedCategoryId = applyCategorizationRules(description, categorizationRules);
          if (suggestedCategoryId) {
              const category = categories.find(c => c.id === suggestedCategoryId);
              if (category && category.type === type) {
                  setCategoryId(suggestedCategoryId);
              }
          }
      }
  }, [description, type, isEditMode, categorizationRules, categories]);
  
  const availableReserves = reserves.filter(b => b.accountId === accountId);
  const availableCategories = useMemo(() => {
    if (reimbursementToSettle || pendingTransferToAccept) {
        return categories;
    }
    if (isInterProfileTransfer) {
        return categories.filter(c => c.type === TransactionType.EXPENSE);
    }
    return categories.filter(c => c.type === type);
  }, [categories, type, reimbursementToSettle, pendingTransferToAccept, isInterProfileTransfer]);
  
  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === categoryId);
  }, [categoryId, categories]);

  const transferOptions = useMemo(() => {
    return accounts.flatMap(acc => {
        const accountReserves = reserves.filter(r => r.accountId === acc.id);
        if ((acc.type ?? AccountType.CURRENT) === AccountType.DEFERRED_DEBIT) return [];
        return [
          { label: `${acc.name} (Compte)`, value: `acc_${acc.id}` },
          ...accountReserves.map(res => ({
            label: `${acc.name} - ${res.name}`,
            value: `res_${res.id}`,
          }))
        ];
      });
  }, [accounts, reserves]);


  const handleCustomFieldChange = (id: EntityID, value: any, type: CustomFieldType) => {
    let finalValue = value;
    if (type === CustomFieldType.BOOLEAN) {
        finalValue = (value as React.ChangeEvent<HTMLInputElement>).target.checked;
    }
    setCustomFieldValues(prev => ({ ...prev, [id]: finalValue }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTags(value);

    const lastCommaIndex = value.lastIndexOf(',');
    const currentTagFragment = value.substring(lastCommaIndex + 1).trim().toLowerCase();

    if (currentTagFragment) {
        const existingTags = value.substring(0, lastCommaIndex).split(',').map(t => t.trim().toLowerCase());
        const filteredSuggestions = allTags.filter(
            tag => tag.toLowerCase().startsWith(currentTagFragment) && !existingTags.includes(tag.toLowerCase())
        );
        setSuggestions(filteredSuggestions);
    } else {
        setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
      const lastCommaIndex = tags.lastIndexOf(',');
      const prefix = tags.substring(0, lastCommaIndex + 1);
      
      const newTags = prefix.trim() 
          ? prefix.trim() + ' ' + suggestion + ', ' 
          : suggestion + ', ';

      setTags(newTags);
      setSuggestions([]);
      tagInputRef.current?.focus();
  };
  
  const getDetailsFromIdForModal = (id: string): { accountId: string, reserveId?: string } | null => {
    if (!id) return null;
    const [type, entityId] = id.split('_');
    if (type === 'acc') {
      return { accountId: entityId };
    }
    const reserve = reserves.find(r => r.id === entityId);
    if (reserve) {
      return { accountId: reserve.accountId, reserveId: reserve.id };
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let data: any = {};
    
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const commonData = { description, amount: parseFloat(amount), date, effectiveDate, status, customFieldValues, isSimulation: isSimulationMode, tags: parsedTags };

    if (saveAsTemplate && templateName) {
        const templateTransactionData: Omit<Partial<Transaction>, 'id' | 'date' | 'effectiveDate'> = {
            description,
            amount: parseFloat(amount),
            type: type === 'TRANSFER' ? undefined : type,
            accountId: type !== 'TRANSFER' ? accountId : undefined,
            reserveId: type !== 'TRANSFER' ? reserveId || undefined : undefined,
            categoryId: categoryId || undefined,
            tags: parsedTags,
            customFields: customFieldValues,
        };
        data.templateData = { name: templateName, transactionData: templateTransactionData };
    }
    
    if (isRecurring) {
        if (type === 'TRANSFER') {
            if (fromTarget === toTarget || !fromTarget || !toTarget) {
                alert("Pour un virement récurrent, les comptes de départ et d'arrivée doivent être différents et sélectionnés.");
                return;
            }
            onSwitchToRecurringTransfer({ description: description || `Virement récurrent`, amount: parseFloat(amount), frequency, startDate: date, endDate: recurringEndDate || undefined, sourceId: fromTarget, destinationId: toTarget });
            onClose();
            return;
        }
        
        data.recurringData = { type: 'expense', description, amount: parseFloat(amount), frequency, startDate: date, endDate: recurringEndDate || undefined, accountId, categoryId };
        onSave(data, false);
    } else { // Not recurring
        if (type === 'TRANSFER') {
            if (isInterProfileTransfer) {
                const fromDetails = getDetailsFromIdForModal(fromTarget);
                if (!fromDetails) return;
                
                data.transactionData = { ...commonData, type: TransactionType.EXPENSE, accountId: fromDetails.accountId, reserveId: fromDetails.reserveId, categoryId: categoryId || undefined };
                data.pendingTransfer = { fromProfileId: activeProfileId, toProfileId, amount: parseFloat(amount), description: description || `Virement de ${profiles.find(p=>p.id === activeProfileId)?.name}`, date };
            } else {
                if (fromTarget === toTarget) {
                    alert("Les comptes de départ et d'arrivée doivent être différents.");
                    return;
                }
                data.transactionData = { ...commonData, type: 'TRANSFER', fromTarget, toTarget };
            }
        } else {
            data.transactionData = { ...commonData, type, accountId, reserveId: reserveId || undefined, categoryId: categoryId || undefined };
        }
        
        if(isEditMode) {
            onSave({ ...data, transactionData: { ...transactionToEdit, ...data.transactionData } }, true);
        } else {
            onSave(data, false, reimbursementToSettle?.id || pendingTransferToAccept?.id);
        }
    }
    
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto modal-content">
        <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                {isEditMode ? "Modifier l'Opération" : (transactionToDuplicate ? "Dupliquer l'Opération" : (templateToUse ? `Depuis: ${templateToUse.name}` : (pendingTransferToAccept ? "Accepter le virement" : 'Nouvelle Opération')))}
            </h2>
            {isSimulationMode && <span className="text-sm font-bold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-3 py-1 rounded-full">Mode Simulation</span>}
        </div>
        <form onSubmit={handleSubmit}>
          {!isEditMode && !initialType && !reimbursementToSettle && !pendingTransferToAccept && (
            <div className="mb-4">
                <div className="flex rounded-md shadow-sm">
                    <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`px-4 py-2 text-sm font-medium ${type === TransactionType.EXPENSE ? 'bg-accent text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-l-md transition-colors duration-200`}>Dépense</button>
                    <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`px-4 py-2 text-sm font-medium ${type === TransactionType.INCOME ? 'bg-accent text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'} transition-colors duration-200`}>Revenu</button>
                    <button type="button" onClick={() => setType('TRANSFER')} className={`px-4 py-2 text-sm font-medium ${type === 'TRANSFER' ? 'bg-accent text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-r-md transition-colors duration-200`}>Virement</button>
                </div>
            </div>
          )}
          
          <div className="space-y-4">
            <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <input type="number" placeholder="Montant" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            
            {type !== 'TRANSFER' ? (
                <>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                    {availableCategories.length > 0 && (
                      <div className="flex items-center gap-2">
                        {selectedCategory?.icon && (
                          <span className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                              <DynamicIcon iconName={selectedCategory.icon} className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                          </span>
                        )}
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <option value="">-- Choisir une catégorie --</option>
                          {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                    {availableReserves.length > 0 && (
                      <select value={reserveId} onChange={e => setReserveId(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <option value="">Compte principal (sans réserve)</option>
                          {availableReserves.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    {!isEditMode && !isSimulationMode && otherProfiles.length > 0 && (
                        <div className="flex items-center">
                            <input id="is-inter-profile" type="checkbox" checked={isInterProfileTransfer} onChange={e => setIsInterProfileTransfer(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-checkbox focus:ring-accent" />
                            <label htmlFor="is-inter-profile" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Virement à un autre profil</label>
                        </div>
                    )}
                    <select value={fromTarget} onChange={e => setFromTarget(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="" disabled>De</option>
                        {transferOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {isInterProfileTransfer ? (
                        <select value={toProfileId} onChange={e => setToProfileId(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="" disabled>Vers le profil</option>
                            {otherProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    ) : (
                        <select value={toTarget} onChange={e => setToTarget(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="" disabled>Vers</option>
                            {transferOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    )}
                    {isInterProfileTransfer && availableCategories.length > 0 && (
                        <div className="flex items-center gap-2">
                        {selectedCategory?.icon && (
                          <span className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                              <DynamicIcon iconName={selectedCategory.icon} className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                          </span>
                        )}
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <option value="">-- Catégoriser la dépense (optionnel) --</option>
                          {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="transaction-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Date de l'opération
                    </label>
                    <input 
                        id="transaction-date"
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        required 
                        className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                    <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Date d'effet (valeur)
                    </label>
                    <input 
                        id="effective-date"
                        type="date" 
                        value={effectiveDate} 
                        onChange={e => setEffectiveDate(e.target.value)} 
                        required 
                        className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
            </div>
            {!isRecurring && !isSimulationMode && (
                <select value={status} onChange={e => setStatus(e.target.value as TransactionStatus)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value={TransactionStatus.REAL}>Réel</option>
                    <option value={TransactionStatus.POTENTIAL}>Potentiel</option>
                </select>
            )}
            {appSettings.features?.enableTags && (
              <div className="relative">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                <input
                  id="tags"
                  ref={tagInputRef}
                  type="text"
                  placeholder="ex: vacances, cadeau, projet_cuisine"
                  value={tags}
                  onChange={handleTagsChange}
                  autoComplete="off"
                  className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                 {suggestions.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                        {suggestions.map((suggestion) => (
                            <li
                                key={suggestion}
                                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                 )}
                 <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Séparés par une virgule.</p>
              </div>
            )}
          </div>

          {!isEditMode && !isSimulationMode && !isInterProfileTransfer && (
            <div className="mt-4 pt-4 border-t dark:border-gray-600 space-y-4">
                <div className="flex items-center">
                    <input id="is-recurring" type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-checkbox focus:ring-accent" />
                    <label htmlFor="is-recurring" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Rendre cette opération récurrente</label>
                </div>
                {isRecurring && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                        <select value={frequency} onChange={e => setFrequency(e.target.value as RecurringFrequency)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {Object.values(RecurringFrequency).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400">La première occurrence sera le {new Date(date).toLocaleDateString('fr-FR')}.</p>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Date de fin (optionnel)</label>
                            <input type="date" value={recurringEndDate} onChange={e => setRecurringEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                )}
            </div>
          )}

            {!isEditMode && !isRecurring && (
                 <div className="mt-4 pt-4 border-t dark:border-gray-600">
                    <div className="flex items-center">
                        <input id="save-as-template" type="checkbox" checked={saveAsTemplate} onChange={e => setSaveAsTemplate(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-checkbox focus:ring-accent" />
                        <label htmlFor="save-as-template" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Enregistrer comme modèle</label>
                    </div>
                    {saveAsTemplate && (
                        <div className="mt-2">
                             <input type="text" placeholder="Nom du modèle" value={templateName} onChange={e => setTemplateName(e.target.value)} required={saveAsTemplate} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    )}
                </div>
            )}


          {customFieldDefinitions.length > 0 && (type !== 'TRANSFER') && (
            <div className="mt-4 pt-4 border-t dark:border-gray-600 space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Champs personnalisés</h3>
              {customFieldDefinitions.map(field => {
                const value = customFieldValues[field.id] ?? '';
                switch(field.type) {
                  case CustomFieldType.TEXT:
                    return <input key={field.id} type="text" placeholder={field.name} value={value} onChange={e => handleCustomFieldChange(field.id, e.target.value, field.type)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />;
                  case CustomFieldType.NUMBER:
                    return <input key={field.id} type="number" placeholder={field.name} value={value} onChange={e => handleCustomFieldChange(field.id, e.target.value, field.type)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />;
                  case CustomFieldType.DATE:
                    return <input key={field.id} type="date" value={value} onChange={e => handleCustomFieldChange(field.id, e.target.value, field.type)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />;
                  case CustomFieldType.BOOLEAN:
                    return (
                        <div key={field.id} className="flex items-center">
                            <input id={`cf-${field.id}`} type="checkbox" checked={!!value} onChange={e => handleCustomFieldChange(field.id, e, field.type)} className="h-4 w-4 rounded border-gray-300 accent-checkbox focus:ring-accent" />
                            <label htmlFor={`cf-${field.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{field.name}</label>
                        </div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors duration-200 hover:bg-gray-400 dark:hover:bg-gray-500">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md transition-colors duration-200 hover:opacity-90">
                {pendingTransferToAccept ? "Accepter et Enregistrer" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};