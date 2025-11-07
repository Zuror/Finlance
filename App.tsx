import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useGoogleDriveSync } from './hooks/useGoogleDriveSync';
import { Account, Reserve, Transaction, TransactionType, TransactionStatus, View, Category, MonthlyMiscellaneous, EntityID, RecurringExpense, RecurringFrequency, ImportLog, CsvMappingPreset, CustomFieldDefinition, AppDataBackup, RecurringTransfer, CategorizationRule, Reimbursement, ReimbursementStatus, AppSettings, BudgetLimit, Loan, AccountType, ManualAsset, AppData, Profile, PendingTransfer, ArchiveFile, TransactionTemplate } from './types';
import { generateTransactionsFromRecurring, generateTransactionsFromRecurringTransfers, generateTransactionsFromReimbursements, calculateMonthlyPayment, generateDeferredDebitSummaryTransactions, migrateData } from './services/financeService';
import { initialCategories, MISC_CATEGORY_ID, defaultAppSettings } from './constants';
import { allEntityIcons, defaultEntityIconNames, CheckBadgeIcon, ArrowLeftIcon } from './components/Icons';
import { TransactionsList } from './components/TransactionsList';
import { TransactionModal } from './components/TransactionModal';
import { PlanningView } from './components/BudgetView';
import { AccountModal } from './components/AccountModal';
import { RecurringExpenseModal } from './components/RecurringExpenseModal';
import { ReconciliationView } from './components/ReconciliationView';
import { SettingsView } from './components/SettingsView';
import { ReserveModal } from './components/ReserveModal';
import { RecurringTransferModal } from './components/RecurringTransferModal';
import { ReimbursementModal } from './components/ReimbursementModal';
import { LoanModal } from './components/LoanModal';
import { SimulationPanel } from './components/SimulationPanel';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { ImportView } from './components/ImportView';
import { ExportModal } from './components/ExportModal';
import { FloatingActionButton } from './components/FloatingActionButton';
import { Dashboard } from './components/Dashboard';
import { PatrimoineView } from './components/PatrimoineView';
import { ManualAssetModal } from './components/ManualAssetModal';
import { GuideModal } from './components/GuideModal';
import { ProfileModal } from './components/ProfileModal';
import { BudgetLimitModal } from './components/BudgetLimitModal';
import { ArchiveViewer } from './components/ArchiveViewer';
import { ArchiveBrowserModal } from './components/ArchiveBrowserModal';
import { NotificationProvider, useNotification } from './hooks/useNotification';


// Initial sample data for first-time users
const initialAccounts: Account[] = [
  { id: 'acc1', name: 'Compte Principal Caisse Epargne', initialBalance: 1500, color: '#3b82f6', icon: 'CreditCard', type: AccountType.CURRENT },
  { id: 'acc2', name: 'Livret A', initialBalance: 5000, color: '#10b981', icon: 'PiggyBank', type: AccountType.SAVINGS },
];

const initialReserves: Reserve[] = [
    { id: 'res1', name: 'Vacances', accountId: 'acc2', targetAmount: 2000, targetDate: '2025-07-01' },
    { id: 'res2', name: 'Épargne de précaution', accountId: 'acc2' },
];

const initialTransactions: Transaction[] = [
  { id: 't1', description: 'Salaire', amount: 2500, date: '2024-07-01', effectiveDate: '2024-07-01', status: TransactionStatus.REAL, type: TransactionType.INCOME, accountId: 'acc1', categoryId: 'cat-inc-1', isReconciled: false },
  { id: 't2', description: 'Loyer', amount: 800, date: '2024-07-05', effectiveDate: '2024-07-05', status: TransactionStatus.REAL, type: TransactionType.EXPENSE, accountId: 'acc1', categoryId: 'cat-exp-1', isReconciled: false },
];

const initialRecurringExpenses: RecurringExpense[] = [
    { id: 're1', description: 'Facture électricité', amount: 60, frequency: RecurringFrequency.MONTHLY, startDate: '2024-07-20', accountId: 'acc1', categoryId: 'cat-exp-4' },
];

const generateUniqueId = (prefix: string = 't') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const createNewProfile = (id: EntityID, name: string, icon: string = 'UserCircle', accentColor: string = '#3b82f6'): Profile => ({
    id,
    name,
    icon,
    accentColor,
    accounts: [],
    reserves: [],
    categories: initialCategories,
    transactions: [],
    recurringExpenses: [],
    recurringTransfers: [],
    reimbursements: [],
    monthlyMiscellaneous: [],
    mainAccountId: null,
    customFieldDefinitions: [],
    importLogs: [],
    csvMappingPresets: [],
    categorizationRules: [],
    appSettings: defaultAppSettings,
    budgetLimits: [],
    loans: [],
    manualAssets: [],
    transactionTemplates: [],
});

const createInitialProfile = (id: EntityID, name: string): Profile => ({
    ...createNewProfile(id, name),
    accounts: initialAccounts,
    reserves: initialReserves,
    transactions: initialTransactions,
    recurringExpenses: initialRecurringExpenses,
    mainAccountId: initialAccounts.length > 0 ? initialAccounts[0].id : null,
});

const defaultProfileId = 'default-profile';
const initialAppData: AppData = {
    version: 2,
    profiles: [createInitialProfile(defaultProfileId, 'Principal')],
    activeProfileId: defaultProfileId,
    pendingTransfers: [],
    iconLibrary: defaultEntityIconNames,
    customIcons: {},
    lastUpdated: new Date().toISOString(),
};


function AppContent() {
    const [appData, setAppData] = useLocalStorage<AppData>('finances_app_data', initialAppData);
    const notification = useNotification();
    
    // Navigation State
    const [activeView, setActiveView] = useState<View>('DASHBOARD');
    const [filteredAccountId, setFilteredAccountId] = useState<EntityID | null>(null);
    const [showImportView, setShowImportView] = useState(false);
    
    // Modal States
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDuplicate, setTransactionToDuplicate] = useState<Transaction | null>(null);
    const [transactionModalContext, setTransactionModalContext] = useState<{yearMonth: string; categoryId: EntityID} | null>(null);
    const [initialTransactionType, setInitialTransactionType] = useState<TransactionType | 'TRANSFER' | null>(null);

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

    const [isRecurringExpenseModalOpen, setIsRecurringExpenseModalOpen] = useState(false);
    const [recurringExpenseToEdit, setRecurringExpenseToEdit] = useState<RecurringExpense | null>(null);

    const [isRecurringTransferModalOpen, setIsRecurringTransferModalOpen] = useState(false);
    const [recurringTransferToEdit, setRecurringTransferToEdit] = useState<Partial<RecurringTransfer> | null>(null);

    const [reconciliationContext, setReconciliationContext] = useState<{ open: boolean, accountId: EntityID | null }>({ open: false, accountId: null});

    const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
    const [reserveToEdit, setReserveToEdit] = useState<Reserve | null>(null);
    const [accountForReserveModal, setAccountForReserveModal] = useState<EntityID | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);

    const [isManualAssetModalOpen, setIsManualAssetModalOpen] = useState(false);
    const [assetToEdit, setAssetToEdit] = useState<ManualAsset | null>(null);
    
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileToEdit, setProfileToEdit] = useState<Profile | null>(null);
    const [isBudgetLimitModalOpen, setIsBudgetLimitModalOpen] = useState(false);

    // Reimbursement state
    const [isReimbursementModalOpen, setIsReimbursementModalOpen] = useState(false);
    const [transactionForReimbursement, setTransactionForReimbursement] = useState<Transaction | null>(null);
    const [reimbursementToSettle, setReimbursementToSettle] = useState<Reimbursement | null>(null);
    const [reimbursementContext, setReimbursementContext] = useState<{originalCategoryId?: EntityID} | null>(null);
    const [pendingTransferToAccept, setPendingTransferToAccept] = useState<PendingTransfer | null>(null);

    const [isDirty, setIsDirty] = useState(false);

    // Import/Export State
    const [filterByImportId, setFilterByImportId] = useState<EntityID | null>(null);
    
    // Archive State
    const [archiveToView, setArchiveToView] = useState<ArchiveFile | null>(null);
    const [isArchiveBrowserOpen, setIsArchiveBrowserOpen] = useState(false);


    // Migration from single profile to multi-profile
    useEffect(() => {
        const legacyDataExists = localStorage.getItem('accounts');
        if (legacyDataExists && !localStorage.getItem('finances_app_data')) {
            console.log("Legacy data found, starting migration...");
            const legacyKeys = [ 'accounts', 'reserves', 'categories', 'transactions', 'recurringExpenses', 'recurringTransfers', 'reimbursements', 'monthlyMiscellaneous', 'mainAccountId', 'appSettings', 'budgetLimits', 'loans', 'manualAssets', 'customFieldDefinitions', 'categorizationRules', 'importLogs', 'csvMappingPresets', 'iconLibrary', 'customIcons', ];
            const backup: any = {};
            legacyKeys.forEach(key => {
                const item = localStorage.getItem(key);
                if (item) {
                    try {
                        backup[key] = JSON.parse(item);
                    } catch (e) { console.error(`Could not parse legacy key ${key}`, e); }
                }
            });

            const { accentColor, ...restOfSettings } = backup.appSettings || {};

            const migratedProfile: Profile = {
                id: generateUniqueId('prof'),
                name: backup.appSettings?.firstName || 'Principal',
                icon: 'UserCircle',
                accentColor: accentColor || '#3b82f6',
                accounts: backup.accounts || [],
                reserves: backup.reserves || [],
                categories: backup.categories || initialCategories,
                transactions: backup.transactions || [],
                recurringExpenses: backup.recurringExpenses || [],
                recurringTransfers: backup.recurringTransfers || [],
                reimbursements: backup.reimbursements || [],
                monthlyMiscellaneous: backup.monthlyMiscellaneous || [],
                mainAccountId: backup.mainAccountId || null,
                customFieldDefinitions: backup.customFieldDefinitions || [],
                importLogs: backup.importLogs || [],
                csvMappingPresets: backup.csvMappingPresets || [],
                categorizationRules: backup.categorizationRules || [],
                appSettings: { ...defaultAppSettings, ...restOfSettings },
                budgetLimits: backup.budgetLimits || [],
                loans: backup.loans || [],
                manualAssets: backup.manualAssets || [],
                transactionTemplates: backup.transactionTemplates || [],
            };

            const migratedAppData: AppData = {
                version: 2,
                profiles: [migratedProfile],
                activeProfileId: migratedProfile.id,
                pendingTransfers: [],
                iconLibrary: backup.iconLibrary || defaultEntityIconNames,
                customIcons: backup.customIcons || {},
                lastUpdated: new Date().toISOString(),
            };

            setAppData(migratedAppData);
            legacyKeys.forEach(key => localStorage.removeItem(key));
            console.log("Migration complete.");
        }
    }, []);
    
    const activeProfile = useMemo(() => {
        const profile = appData.profiles.find(p => p.id === appData.activeProfileId);
        if (profile) return profile;
        if (appData.profiles.length > 0) {
            setAppData(d => ({ ...d, activeProfileId: d.profiles[0].id }));
            return appData.profiles[0];
        }
        // This case should not happen if migration/initialization is correct
        const newProfile = createInitialProfile('fallback-profile', 'Principal');
        setAppData(d => ({...d, profiles: [newProfile], activeProfileId: newProfile.id}));
        return newProfile;
    }, [appData.profiles, appData.activeProfileId]);
    
    const { 
        accounts, reserves, categories, transactions, recurringExpenses, recurringTransfers, reimbursements, 
        monthlyMiscellaneous, mainAccountId, customFieldDefinitions, categorizationRules, importLogs, csvMappingPresets, 
        appSettings, budgetLimits, loans, manualAssets 
    } = activeProfile;
    const { iconLibrary, customIcons, pendingTransfers } = appData;

    const updateActiveProfile = (updater: (profile: Profile) => Profile) => {
        setAppData(prevData => {
            const newProfiles = prevData.profiles.map(p =>
                p.id === prevData.activeProfileId ? updater(p) : p
            );
            return {
                ...prevData,
                profiles: newProfiles,
                lastUpdated: new Date().toISOString(),
            };
        });
        setIsDirty(true);
    };

    const setTransactions = (value: React.SetStateAction<Transaction[]>) => updateActiveProfile(p => ({ ...p, transactions: typeof value === 'function' ? value(p.transactions) : value }));
    const setAccounts = (value: React.SetStateAction<Account[]>) => updateActiveProfile(p => ({ ...p, accounts: typeof value === 'function' ? value(p.accounts) : value }));
    const setReserves = (value: React.SetStateAction<Reserve[]>) => updateActiveProfile(p => ({ ...p, reserves: typeof value === 'function' ? value(p.reserves) : value }));
    const setCategories = (value: React.SetStateAction<Category[]>) => updateActiveProfile(p => ({ ...p, categories: typeof value === 'function' ? value(p.categories) : value }));
    const setRecurringExpenses = (value: React.SetStateAction<RecurringExpense[]>) => updateActiveProfile(p => ({ ...p, recurringExpenses: typeof value === 'function' ? value(p.recurringExpenses) : value }));
    const setRecurringTransfers = (value: React.SetStateAction<RecurringTransfer[]>) => updateActiveProfile(p => ({ ...p, recurringTransfers: typeof value === 'function' ? value(p.recurringTransfers) : value }));
    const setReimbursements = (value: React.SetStateAction<Reimbursement[]>) => updateActiveProfile(p => ({ ...p, reimbursements: typeof value === 'function' ? value(p.reimbursements) : value }));
    const setMonthlyMiscellaneous = (value: React.SetStateAction<MonthlyMiscellaneous[]>) => updateActiveProfile(p => ({ ...p, monthlyMiscellaneous: typeof value === 'function' ? value(p.monthlyMiscellaneous) : value }));
    const setMainAccountId = (value: React.SetStateAction<EntityID | null>) => updateActiveProfile(p => ({ ...p, mainAccountId: typeof value === 'function' ? value(p.mainAccountId) : value }));
    const setAppSettings = (value: React.SetStateAction<AppSettings>) => updateActiveProfile(p => ({ ...p, appSettings: typeof value === 'function' ? value(p.appSettings) : value }));
    const setBudgetLimits = (value: React.SetStateAction<BudgetLimit[]>) => updateActiveProfile(p => ({ ...p, budgetLimits: typeof value === 'function' ? value(p.budgetLimits) : value }));
    const setLoans = (value: React.SetStateAction<Loan[]>) => updateActiveProfile(p => ({ ...p, loans: typeof value === 'function' ? value(p.loans) : value }));
    const setManualAssets = (value: React.SetStateAction<ManualAsset[]>) => updateActiveProfile(p => ({ ...p, manualAssets: typeof value === 'function' ? value(p.manualAssets) : value }));
    const setCustomFieldDefinitions = (value: React.SetStateAction<CustomFieldDefinition[]>) => updateActiveProfile(p => ({ ...p, customFieldDefinitions: typeof value === 'function' ? value(p.customFieldDefinitions) : value }));
    const setCategorizationRules = (value: React.SetStateAction<CategorizationRule[]>) => updateActiveProfile(p => ({ ...p, categorizationRules: typeof value === 'function' ? value(p.categorizationRules) : value }));
    const setImportLogs = (value: React.SetStateAction<ImportLog[]>) => updateActiveProfile(p => ({ ...p, importLogs: typeof value === 'function' ? value(p.importLogs) : value }));
    const setCsvMappingPresets = (value: React.SetStateAction<CsvMappingPreset[]>) => updateActiveProfile(p => ({ ...p, csvMappingPresets: typeof value === 'function' ? value(p.csvMappingPresets) : value }));
    
    const setIconLibrary = (value: React.SetStateAction<string[]>) => { setAppData(d => ({ ...d, iconLibrary: typeof value === 'function' ? value(d.iconLibrary) : value })); setIsDirty(true); };
    const setCustomIcons = (value: React.SetStateAction<Record<string, string>>) => { setAppData(d => ({ ...d, customIcons: typeof value === 'function' ? value(d.customIcons) : value })); setIsDirty(true); };
    const setPendingTransfers = (value: React.SetStateAction<PendingTransfer[]>) => { setAppData(d => ({ ...d, pendingTransfers: typeof value === 'function' ? value(d.pendingTransfers) : value })); setIsDirty(true); };

    const importHeaderFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setAppSettings(prevSettings => {
            const mergedSettings = {
                ...defaultAppSettings,
                ...prevSettings,
                dashboardSettings: {
                    ...defaultAppSettings.dashboardSettings,
                    ...(prevSettings?.dashboardSettings || {}),
                },
                savingsCalculationSettings: {
                    ...defaultAppSettings.savingsCalculationSettings,
                    ...(prevSettings?.savingsCalculationSettings || {}),
                },
                forecastChartSettings: {
                    ...defaultAppSettings.forecastChartSettings,
                    ...(prevSettings?.forecastChartSettings || {}),
                },
                features: {
                    ...defaultAppSettings.features,
                    ...(prevSettings?.features || {}),
                },
                netWorthSettings: {
                    ...defaultAppSettings.netWorthSettings,
                    ...(prevSettings?.netWorthSettings || {}),
                },
            };

            if (JSON.stringify(mergedSettings) !== JSON.stringify(prevSettings)) {
                return mergedSettings;
            }
            return prevSettings;
        });
    }, [activeProfile.id]);

    const entityIconMap = useMemo(() => {
        const map: { [key: string]: React.FC<any> } = {};
        
        iconLibrary.forEach(name => {
            if (allEntityIcons[name]) {
                map[name] = allEntityIcons[name];
            }
        });

        Object.keys(customIcons).forEach(name => {
            const contentString = customIcons[name];
            
            if (contentString.startsWith('data:image/')) { // C'est une data URL (ex: pour un PNG)
                 map[name] = ({ className }) => (
                    <img src={contentString} alt={name} className={className} />
                );
            } else { // C'est une chaîne SVG
                const sanitizedSvg = contentString
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/ on\w+="[^"]*"/g, '');

                map[name] = ({ className }) => (
                    <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedSvg }} />
                );
            }
        });
        return map;
    }, [iconLibrary, customIcons]);
    
    const handleSaveCustomIcon = (name: string, contentString: string) => {
        setCustomIcons(prev => ({ ...prev, [name]: contentString }));
        if (!iconLibrary.includes(name)) {
            setIconLibrary(prev => [...prev, name].sort());
        }
        setIsDirty(true);
    };

    const handleDeleteIcon = (iconName: string) => {
        setIconLibrary(prev => prev.filter(name => name !== iconName));
        if (customIcons[iconName]) {
            setCustomIcons(prev => {
                const newCustomIcons = { ...prev };
                delete newCustomIcons[iconName];
                return newCustomIcons;
            });
        }
        setIsDirty(true);
    };
    
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    useEffect(() => {
        if (mainAccountId && !accounts.find(acc => acc.id === mainAccountId)) {
            setMainAccountId(accounts.length > 0 ? accounts[0].id : null);
        }
    }, [accounts, mainAccountId, setMainAccountId]);

    useEffect(() => {
        const accentColor = activeProfile.accentColor || '#3b82f6';
        const styleId = 'accent-color-styles';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = `
            :root {
                --accent-color: ${accentColor};
            }
            .bg-accent {
                background-color: var(--accent-color);
            }
            .text-accent {
                color: var(--accent-color);
            }
            .border-accent {
                border-color: var(--accent-color);
            }
            .ring-accent {
                --tw-ring-color: var(--accent-color);
            }
            .accent-checkbox:checked {
                background-color: var(--accent-color);
                border-color: var(--accent-color);
            }
            input[type="checkbox"]:checked, input[type="radio"]:checked {
                 background-color: var(--accent-color);
                 border-color: var(--accent-color);
            }
            .ring-accent-focus:focus-within {
                --tw-ring-color: ${accentColor};
            }
            .focus\\:ring-accent:focus {
                --tw-ring-color: ${accentColor};
            }
        `;
    }, [activeProfile.accentColor]);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        transactions.forEach(tx => {
            tx.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [transactions]);

    const [isSimulationMode, setIsSimulationMode] = useState(false);
    const [simulationTransactions, setSimulationTransactions] = useState<Transaction[]>([]);

    const allTransactions = useMemo(() => {
        const baseTxs = [...transactions];
        const generatedExpenseTxs = generateTransactionsFromRecurring(recurringExpenses);
        const generatedTransferTxs = generateTransactionsFromRecurringTransfers(recurringTransfers, accounts, reserves);
        
        const transactionContextForReimbursement = [...baseTxs, ...generatedExpenseTxs, ...generatedTransferTxs];
        const generatedReimbursementTxs = generateTransactionsFromReimbursements(reimbursements, transactionContextForReimbursement);
        
        const existingRecurringExpenseDates = new Set(baseTxs.filter(t => t.recurringExpenseId).map(t => `${t.recurringExpenseId}-${t.date}`));
        const uniqueGeneratedExpenseTxs = generatedExpenseTxs.filter(genTx => !existingRecurringExpenseDates.has(`${genTx.recurringExpenseId}-${genTx.date}`));
        
        const existingRecurringTransferDates = new Set(baseTxs.filter(t => t.recurringTransferId).map(t => `${t.recurringTransferId}-${t.date}`));
        const uniqueGeneratedTransferTxs = generatedTransferTxs.filter(genTx => !existingRecurringTransferDates.has(`${genTx.recurringTransferId}-${genTx.date}`));

        let finalTxs = [...baseTxs, ...uniqueGeneratedExpenseTxs, ...uniqueGeneratedTransferTxs, ...generatedReimbursementTxs];
        
        if (isSimulationMode) {
            finalTxs = [...finalTxs, ...simulationTransactions];
        }

        return finalTxs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, recurringExpenses, recurringTransfers, reimbursements, accounts, reserves, isSimulationMode, simulationTransactions]);

    const transactionsForForecast = useMemo(() => {
        if (!appSettings.enableDeferredDebit) {
            return allTransactions;
        }
        
        const deferredDebitAccountIds = new Set(accounts.filter(a => a.type === AccountType.DEFERRED_DEBIT).map(a => a.id));
        
        const cashFlowTxs = allTransactions.filter(t => !deferredDebitAccountIds.has(t.accountId));
        
        const summaryTxs = generateDeferredDebitSummaryTransactions(accounts, allTransactions);

        const realSummaryKeys = new Set(transactions.filter(t => t.deferredDebitSourceAccountId && t.status === TransactionStatus.REAL).map(t => `${t.deferredDebitSourceAccountId}-${t.date}`));
        const uniqueSummaryTxs = summaryTxs.filter(t => !realSummaryKeys.has(`${t.deferredDebitSourceAccountId}-${t.date}`));

        return [...cashFlowTxs, ...uniqueSummaryTxs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, accounts, appSettings.enableDeferredDebit, transactions]);
    
    const pendingRecurringTransactions = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return allTransactions
            .filter(tx => tx.status === TransactionStatus.POTENTIAL && tx.date < today && !tx.isSimulation)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [allTransactions]);
    
    const incomingPendingTransfers = useMemo(() => {
        return pendingTransfers.filter(pt => pt.toProfileId === activeProfile.id);
    }, [pendingTransfers, activeProfile.id]);

    const getDetailsFromId = (id: string) => {
        const [type, entityId] = id.split('_');
        if (type === 'acc') {
            const account = accounts.find(a => a.id === entityId);
            return { accountId: account?.id, reserveId: undefined, name: account?.name };
        }
        const reserve = reserves.find(r => r.id === entityId);
        const account = accounts.find(a => a.id === reserve?.accountId);
        return { accountId: account?.id, reserveId: reserve?.id, name: `${account?.name} (${reserve?.name})` };
    };
    
    const handleSaveRecurringExpense = (data: Omit<RecurringExpense, 'id'> & { id?: EntityID }) => {
        if (data.id) {
            setRecurringExpenses(prev => prev.map(re => re.id === data.id ? { ...re, ...data } : re));
        } else {
            setRecurringExpenses(prev => [...prev, { ...data, id: generateUniqueId('re') }]);
        }
        setIsRecurringExpenseModalOpen(false);
        setIsDirty(true);
    };

    const handleSaveRecurringTransfer = (data: Omit<RecurringTransfer, 'id'> & { id?: EntityID }) => {
        if (data.id) {
            setRecurringTransfers(prev => prev.map(rt => rt.id === data.id ? { ...rt, ...data } : rt));
        } else {
            setRecurringTransfers(prev => [...prev, { ...data, id: generateUniqueId('rt') }]);
        }
        setIsRecurringTransferModalOpen(false);
        setIsDirty(true);
    };

    const handleSaveTransaction = (data: { transactionData?: any, recurringData?: any, pendingTransfer?: Omit<PendingTransfer, 'id'>, templateData?: { name: string, transactionData: Partial<Transaction> } }, isEdit: boolean, idToSettle?: EntityID) => {
        if (data.recurringData) {
            if (data.recurringData.type === 'transfer') {
                const { type, ...transferData } = data.recurringData;
                handleSaveRecurringTransfer(transferData);
            } else { // 'expense' or other types
                const { type, ...expenseData } = data.recurringData;
                handleSaveRecurringExpense(expenseData);
            }
            return;
        }
    
        if (data.templateData) {
            const newTemplate: TransactionTemplate = {
                id: generateUniqueId('tt'),
                name: data.templateData.name,
                transactionData: data.templateData.transactionData,
            };
            updateActiveProfile(p => ({ ...p, transactionTemplates: [...(p.transactionTemplates || []), newTemplate] }));
        }

        const { transactionData, pendingTransfer } = data;
        if (!transactionData) return;
    
        if (isSimulationMode) {
            setSimulationTransactions(prev => [...prev, { ...transactionData, id: generateUniqueId('sim') }]);
            return;
        }
    
        if (pendingTransfer) {
            setPendingTransfers(prev => [...prev, { ...pendingTransfer, id: generateUniqueId('pt') }]);
            // The expense for the sender is in transactionData, handle it like a normal transaction
            const newTransaction = { ...transactionData, id: generateUniqueId('tx') };
            setTransactions(prev => [...prev, newTransaction]);

        } else if (transactionData.type === 'TRANSFER') {
            const transferId = transactionToEdit?.transferId || generateUniqueId('trsf');
            const { fromTarget, toTarget, ...restOfData } = transactionData;
            const fromDetails = getDetailsFromId(fromTarget);
            const toDetails = getDetailsFromId(toTarget);
            
            if (!fromDetails.accountId || !toDetails.accountId) return;

            const existing = transactions.filter(t => t.transferId === transferId);
            
            const expenseTxData = {
                ...restOfData,
                description: transactionData.description || `Virement vers ${toDetails.name}`,
                type: TransactionType.EXPENSE,
                accountId: fromDetails.accountId,
                reserveId: fromDetails.reserveId,
                transferId: transferId,
            };
            const incomeTxData = {
                ...restOfData,
                description: transactionData.description || `Virement de ${fromDetails.name}`,
                type: TransactionType.INCOME,
                accountId: toDetails.accountId,
                reserveId: toDetails.reserveId,
                transferId: transferId,
            };

            if(isEdit && existing.length === 2) {
                setTransactions(prev => prev.map(t => {
                    if (t.id === existing.find(tx => tx.type === TransactionType.EXPENSE)?.id) return {...t, ...expenseTxData};
                    if (t.id === existing.find(tx => tx.type === TransactionType.INCOME)?.id) return {...t, ...incomeTxData};
                    return t;
                }));
            } else {
                setTransactions(prev => [...prev, 
                    {...expenseTxData, id: generateUniqueId('tx')}, 
                    {...incomeTxData, id: generateUniqueId('tx')}
                ]);
            }
        } else {
            let newTransaction: Transaction | null = null;
            if (isEdit) {
                 const txToUpdate = { ...transactionToEdit, ...transactionData };
                if (transactionToEdit?.status === TransactionStatus.POTENTIAL && !transactions.find(t => t.id === transactionToEdit.id)) {
                    const newTx = {
                        ...txToUpdate,
                        id: generateUniqueId(), 
                        recurringExpenseId: transactionToEdit.recurringExpenseId,
                        recurringTransferId: transactionToEdit.recurringTransferId,
                    };
                    setTransactions(prev => [...prev, newTx]);
                    newTransaction = newTx;
                } else {
                    setTransactions(prev => prev.map(t => t.id === txToUpdate.id ? txToUpdate : t));
                    newTransaction = txToUpdate as Transaction;
                }
            } else {
                newTransaction = { ...transactionData, id: generateUniqueId() };
                setTransactions(prev => [...prev, newTransaction]);
            }
    
            if (idToSettle) {
                if (reimbursements.some(r => r.id === idToSettle) && newTransaction) {
                    const finalTx = newTransaction;
                    setReimbursements(prev => prev.map(r => r.id === idToSettle ? {
                        ...r,
                        status: ReimbursementStatus.RECEIVED,
                        receivedAmount: finalTx.amount,
                        receivedDate: finalTx.date,
                        receivedTransactionId: finalTx.id
                    } : r));
                }
                if (pendingTransfers.some(pt => pt.id === idToSettle)) {
                    setPendingTransfers(prev => prev.filter(pt => pt.id !== idToSettle));
                }
            }
        }
        setIsDirty(true);
    };

    const handleUpdateTransaction = (updatedTx: Transaction) => {
        updateActiveProfile(p => ({
            ...p,
            transactions: p.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
        }));
        setIsDirty(true);
    };

    const handleStatusChange = (id: string, status: TransactionStatus) => {
        const txToValidate = allTransactions.find(t => t.id === id);
        if (txToValidate && status === TransactionStatus.REAL && txToValidate.status === TransactionStatus.POTENTIAL) {
            let newRealTxs: Transaction[] = [];
            if (txToValidate.recurringTransferId && txToValidate.transferId) {
                const partnerTx = allTransactions.find(t => t.transferId === txToValidate.transferId && t.id !== txToValidate.id);
                if (partnerTx) {
                    newRealTxs.push({ ...txToValidate, id: generateUniqueId(), status: TransactionStatus.REAL });
                    newRealTxs.push({ ...partnerTx, id: generateUniqueId(), status: TransactionStatus.REAL });
                }
            } else {
                newRealTxs.push({ ...txToValidate, id: generateUniqueId(), status: TransactionStatus.REAL });
            }
            if(newRealTxs.length > 0) {
                 setTransactions(prev => [...prev, ...newRealTxs]);
                 setIsDirty(true);
            }
        }
    };
    
    const handleBulkValidatePastTransactions = () => {
        const txsToUpdate = [...pendingRecurringTransactions];
        const newRealTransactions: Transaction[] = [];
        const processedTransferIds = new Set<string>();

        txsToUpdate.forEach(tx => {
            if (tx.transferId && processedTransferIds.has(tx.transferId)) {
                return; // Partner tx already processed
            }
            
            if (tx.recurringTransferId && tx.transferId) {
                const partnerTx = allTransactions.find(t => t.transferId === tx.transferId && t.id !== tx.id);
                if (partnerTx) {
                    newRealTransactions.push({ ...tx, id: generateUniqueId(), status: TransactionStatus.REAL });
                    newRealTransactions.push({ ...partnerTx, id: generateUniqueId(), status: TransactionStatus.REAL });
                    processedTransferIds.add(tx.transferId);
                }
            } else {
                newRealTransactions.push({ ...tx, id: generateUniqueId(), status: TransactionStatus.REAL });
            }
        });
    
        if (newRealTransactions.length > 0) {
            setTransactions(prev => [...prev, ...newRealTransactions]);
            setIsDirty(true);
        }
    };
    
    const handleDeleteTransaction = (id: string) => {
        const txToDelete = allTransactions.find(t => t.id === id);
        if (txToDelete?.isReconciled) {
          // FIX: Correctly pass title and message to notification.show
          notification.show("Veuillez les déplacer ou les supprimer d'abord.", { type: 'error', title: "Impossible de supprimer une transaction rapprochée." });
          return;
        }
        if (txToDelete?.isSimulation) {
            setSimulationTransactions(prev => prev.filter(t => t.id !== id));
        } else if (txToDelete?.transferId) {
             if (window.confirm("Cette opération fait partie d'un virement. Voulez-vous supprimer les deux opérations (débit et crédit) ?")) {
                setTransactions(prev => prev.filter(t => t.transferId !== txToDelete.transferId));
                setIsDirty(true);
             }
        }
        else {
            setTransactions(prev => prev.filter(t => t.id !== id));
            setIsDirty(true);
        }
    };

    const handleBulkUpdate = (ids: EntityID[], data: Partial<Transaction>) => {
        setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...data } : t));
        setIsDirty(true);
    };

    const handleBulkDelete = (ids: EntityID[]) => {
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
        setIsDirty(true);
    };

    const handleMergeTransactions = (mergedData: Partial<Transaction>, originalIds: [string, string]) => {
        const newTransaction: Transaction = {
          ...mergedData,
          id: generateUniqueId('tx'),
          status: TransactionStatus.REAL, // Merged transactions are considered real
          isReconciled: false,
        } as Transaction;
    
        setTransactions(prev => [...prev.filter(t => !originalIds.includes(t.id)), newTransaction]);
        notification.show("Transactions fusionnées avec succès.", { type: 'success' });
        setIsDirty(true);
    };
    
    const handleSaveAccount = (data: Omit<Account, 'id'> & { id?: EntityID; type?: AccountType; linkedAccountId?: EntityID; debitDay?: number; }) => {
        if (data.id) {
            setAccounts(prev => prev.map(acc => acc.id === data.id ? { ...acc, ...data } : acc));
        } else {
            const newAccount = { ...data, id: generateUniqueId('acc') };
            setAccounts(prev => [...prev, newAccount]);
            if (!mainAccountId) {
                setMainAccountId(newAccount.id);
            }
        }
        setIsAccountModalOpen(false);
        setIsDirty(true);
    };
    
    const handleDeleteAccount = (id: EntityID) => {
        if (transactions.some(t => t.accountId === id) || reserves.some(r => r.accountId === id)) {
            // FIX: Correctly pass title and message to notification.show
            notification.show("Veuillez les déplacer ou les supprimer d'abord.", { type: 'error', title: "Impossible de supprimer un compte avec des transactions ou des réserves." });
            return;
        }
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible.")) {
            setAccounts(prev => prev.filter(acc => acc.id !== id));
            setIsDirty(true);
        }
    };

    const handleSaveReserve = (data: Omit<Reserve, 'id'> & { id?: EntityID }) => {
        if (data.id) {
            setReserves(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r));
        } else {
            setReserves(prev => [...prev, { ...data, id: generateUniqueId('res') }]);
        }
        setIsReserveModalOpen(false);
        setIsDirty(true);
    };

    const handleDeleteReserve = (id: EntityID) => {
        if (allTransactions.some(t => t.reserveId === id)) {
            // FIX: Correctly pass title and message to notification.show for an unreported error
            notification.show("Veuillez les déplacer ou les supprimer d'abord.", { type: 'error', title: "Impossible de supprimer une réserve avec des transactions." });
            return;
        }
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette réserve ?")) {
            setReserves(prev => prev.filter(r => r.id !== id));
            setIsDirty(true);
        }
    };

    const handleDeleteRecurringExpense = (id: EntityID) => {
        if (window.confirm("Êtes-vous sûr ? Cela ne supprimera pas les transactions déjà générées.")) {
            setRecurringExpenses(prev => prev.filter(re => re.id !== id));
            setIsDirty(true);
        }
    };

    const handleDeleteRecurringTransfer = (id: EntityID) => {
        if (window.confirm("Êtes-vous sûr ? Cela ne supprimera pas les transactions déjà générées.")) {
            setRecurringTransfers(prev => prev.filter(rt => rt.id !== id));
            setIsDirty(true);
        }
    };

    const handleSaveReimbursement = (data: { transactionId: EntityID, expectedAmount: number, expectedDate: string }) => {
        const newReimbursement: Reimbursement = {
            ...data,
            id: generateUniqueId('reimb'),
            status: ReimbursementStatus.PENDING,
        };
        setReimbursements(prev => [...prev, newReimbursement]);
        setIsReimbursementModalOpen(false);
        setIsDirty(true);
    };

    const handleMarkReimbursementAsReceived = (reimbursement: Reimbursement) => {
        const originalTx = allTransactions.find(t => t.id === reimbursement.transactionId);
        setReimbursementContext({ originalCategoryId: originalTx?.categoryId });
        setReimbursementToSettle(reimbursement);
        setIsTransactionModalOpen(true);
    };
    
    const handleEditReceivedReimbursement = (transactionId: EntityID) => {
        const tx = transactions.find(t => t.id === transactionId);
        if (tx) {
            setTransactionToEdit(tx);
            setIsTransactionModalOpen(true);
        }
    };
    
    const handleAcceptTransfer = (transfer: PendingTransfer) => {
        setPendingTransferToAccept(transfer);
        setIsTransactionModalOpen(true);
    };

    const handleReconcileTransactions = (transactionIds: EntityID[]) => {
        setTransactions(prev => prev.map(t => transactionIds.includes(t.id) ? { ...t, isReconciled: true } : t));
        setReconciliationContext({ open: false, accountId: null });
        setIsDirty(true);
    };
    
    const handleExportData = () => {
        const dataToExport: AppData = {
            ...appData,
            lastUpdated: new Date().toISOString(),
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `backup-finances-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        setIsDirty(false);
    };

    const handleExportBudget = (startDate: string, endDate: string) => {
        const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || '';
        const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || '';
    
        const filtered = transactions.filter(tx => tx.date >= startDate && tx.date <= endDate && !tx.isSimulation);
    
        const headers = ['Date', 'Description', 'Montant', 'Type', 'Catégorie', 'Compte', 'Statut'];
        
        const escapeCsvCell = (cell: string | number) => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        };
        
        const csvRows = [headers.join(',')];
        filtered.forEach(tx => {
            const row = [
                tx.date,
                tx.description,
                tx.type === TransactionType.EXPENSE ? -tx.amount : tx.amount,
                tx.type,
                getCategoryName(tx.categoryId),
                getAccountName(tx.accountId),
                tx.status
            ].map(escapeCsvCell);
            csvRows.push(row.join(','));
        });
    
        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_transactions_${startDate}_au_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportModalOpen(false);
      };
    
    const handleRunImport = (
        transactionsToImport: Omit<Transaction, 'id' | 'isReconciled' | 'status'>[],
        fileName: string,
        accountId: EntityID,
        presetName: string,
        summary: { duplicates: number }
    ) => {
        const importId = generateUniqueId('imp');
        const newTransactions: Transaction[] = transactionsToImport.map(t => ({
            ...t,
            id: generateUniqueId('tx'),
            isReconciled: false,
            status: TransactionStatus.REAL,
            importId: importId,
        }));

        setTransactions(prev => [...prev, ...newTransactions]);

        const latestTransaction = newTransactions.length > 0
            ? [...newTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            : null;

        const newLog: ImportLog = {
            id: importId,
            date: new Date().toISOString(),
            fileName,
            accountId,
            importedCount: newTransactions.length,
            presetName,
            lastTransactionDate: latestTransaction?.date,
            lastTransactionDescription: latestTransaction?.description,
        };
        setImportLogs(prev => [newLog, ...prev.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())]);
        
        notification.show(
            `${newTransactions.length} transaction(s) importée(s). ${summary.duplicates} doublon(s) ignoré(s).`,
            {
                type: 'success',
                title: 'Importation Réussie !',
                action: {
                    label: 'Voir',
                    onClick: () => {
                        setFilterByImportId(importId);
                        setActiveView('TRANSACTIONS');
                    }
                }
            }
        );

        setIsDirty(true);
        setShowImportView(false);
    };

    const handleSavePreset = (preset: Omit<CsvMappingPreset, 'id'> & { id?: EntityID }) => {
        if (preset.id) {
            setCsvMappingPresets(prev => prev.map(p => p.id === preset.id ? { ...p, ...preset } : p));
        } else {
            setCsvMappingPresets(prev => [...prev, { ...preset, id: generateUniqueId('preset') }]);
        }
        setIsDirty(true);
    };

    const handleDeletePreset = (id: EntityID) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) {
            setCsvMappingPresets(prev => prev.filter(p => p.id !== id));
            setIsDirty(true);
        }
    };
    
    const handleImportData = (backup: any) => {
        try {
            const migratedData = migrateData(backup);
            setAppData(migratedData);
            notification.show("Données importées avec succès !", { type: 'success' });
            setIsDirty(false);
        } catch (error: any) {
            notification.show(`Erreur lors de l'importation : ${error.message}`, { type: 'error' });
            console.error("Import error:", error);
        }
    };

    const handleHeaderFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const data = JSON.parse(content);
                    if (window.confirm("Êtes-vous sûr de vouloir importer ces données ? Toutes les données actuelles (tous profils confondus) seront écrasées.")) {
                        handleImportData(data);
                    }
                } catch (error) {
                    notification.show("Erreur lors de la lecture ou de l'analyse du fichier.", { type: 'error' });
                    console.error("Import error:", error);
                }
            };
            reader.readAsText(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };
    
    const triggerHeaderImport = () => {
        importHeaderFileRef.current?.click();
    };

    const handleSaveCustomField = (data: Omit<CustomFieldDefinition, 'id'> & { id?: EntityID }) => {
        if (data.id) {
            setCustomFieldDefinitions(prev => prev.map(f => f.id === data.id ? { ...f, name: data.name } : f));
        } else {
            setCustomFieldDefinitions(prev => [...prev, { ...data, id: generateUniqueId('cf') }]);
        }
        setIsDirty(true);
    };

    const handleDeleteCustomField = (id: EntityID) => {
        setCustomFieldDefinitions(prev => prev.filter(f => f.id !== id));
        setIsDirty(true);
    };

    const handleSaveCategorizationRule = (data: Omit<CategorizationRule, 'id'> & { id?: EntityID }) => {
        if (data.id) {
            setCategorizationRules(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r));
        } else {
            setCategorizationRules(prev => [...prev, { ...data, id: generateUniqueId('cr') }]);
        }
        setIsDirty(true);
    };

    const handleDeleteCategorizationRule = (id: EntityID) => {
        setCategorizationRules(prev => prev.filter(r => r.id !== id));
        setIsDirty(true);
    };

    const handleSaveAppSettings = (settings: AppSettings) => {
        setAppSettings(settings);
        setIsDirty(true);
    };

    const handleSaveBudgetLimit = (limit: BudgetLimit) => {
        setBudgetLimits(prev => {
            const existing = prev.find(l => l.categoryId === limit.categoryId);
            if (existing) {
                return prev.map(l => l.categoryId === limit.categoryId ? limit : l);
            }
            return [...prev, limit];
        });
        setIsDirty(true);
    };

    const handleDeleteBudgetLimit = (categoryId: EntityID) => {
        setBudgetLimits(prev => prev.filter(l => l.categoryId !== categoryId));
        setIsDirty(true);
    }

    const handleSaveLoan = (data: Omit<Loan, 'id' | 'linkedRecurringExpenseId' | 'monthlyPayment'> & { id?: EntityID }) => {
        if (!mainAccountId) {
            notification.show("Veuillez définir un compte principal avant d'ajouter un prêt.", { type: 'error' });
            return;
        }

        const monthlyPayment = calculateMonthlyPayment(data.initialAmount, data.interestRate, data.termInMonths);
        
        if (data.id) { // Edit mode
            const existingLoan = loans.find(l => l.id === data.id);
            if (!existingLoan) return;

            const updatedLoan: Loan = {
                ...existingLoan,
                ...data,
                monthlyPayment,
            };
            setLoans(prev => prev.map(l => l.id === data.id ? updatedLoan : l));
            
            // Update linked recurring expense
            setRecurringExpenses(prev => prev.map(re => re.id === existingLoan.linkedRecurringExpenseId ? {
                ...re,
                description: `Remboursement prêt: ${data.name}`,
                amount: monthlyPayment,
                startDate: data.startDate,
            } : re));

        } else { // Create mode
            const recurringExpenseId = generateUniqueId('re');
            const newRecurringExpense: RecurringExpense = {
                id: recurringExpenseId,
                description: `Remboursement prêt: ${data.name}`,
                amount: monthlyPayment,
                frequency: RecurringFrequency.MONTHLY,
                startDate: data.startDate,
                accountId: mainAccountId,
                categoryId: categories.find(c => c.name.toLowerCase().includes('logement'))?.id || MISC_CATEGORY_ID,
            };
            const newLoan: Loan = {
                ...data,
                id: generateUniqueId('loan'),
                linkedRecurringExpenseId: recurringExpenseId,
                monthlyPayment: monthlyPayment,
            };
            
            setRecurringExpenses(prev => [...prev, newRecurringExpense]);
            setLoans(prev => [...prev, newLoan]);
        }
        setIsDirty(true);
        setIsLoanModalOpen(false);
    };

    const handleDeleteLoan = (id: EntityID) => {
        const loanToDelete = loans.find(l => l.id === id);
        if (!loanToDelete) return;
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce prêt ? La dépense récurrente associée sera également supprimée.")) {
            setLoans(prev => prev.filter(l => l.id !== id));
            setRecurringExpenses(prev => prev.filter(re => re.id !== loanToDelete.linkedRecurringExpenseId));
            setIsDirty(true);
        }
    };

    const handleSaveManualAsset = (asset: Omit<ManualAsset, 'id'> & { id?: EntityID }) => {
        if (asset.id) {
            setManualAssets(prev => prev.map(a => a.id === asset.id ? { ...a, ...asset } : a));
        } else {
            setManualAssets(prev => [...prev, { ...asset, id: generateUniqueId('asset') }]);
        }
        setIsDirty(true);
    };

    const handleDeleteManualAsset = (id: EntityID) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet actif ?")) {
            setManualAssets(prev => prev.filter(a => a.id !== id));
            setIsDirty(true);
        }
    };
    
    // Profile Management Handlers
    const handleSaveProfile = (data: { id?: EntityID; name: string; icon: string; accentColor: string; }) => {
        if (data.id) { // Update
            setAppData(prev => ({ ...prev, profiles: prev.profiles.map(p => p.id === data.id ? { ...p, name: data.name, icon: data.icon, accentColor: data.accentColor } : p), lastUpdated: new Date().toISOString() }));
        } else { // Add
            const newProfile = createNewProfile(generateUniqueId('prof'), data.name, data.icon, data.accentColor);
            setAppData(prev => ({ ...prev, profiles: [...prev.profiles, newProfile], lastUpdated: new Date().toISOString() }));
        }
        setIsDirty(true);
        setIsProfileModalOpen(false);
    };

    const handleDeleteProfile = (id: EntityID) => {
        if (appData.profiles.length <= 1) {
            notification.show("Vous ne pouvez pas supprimer le dernier profil.", { type: 'error' });
            return;
        }
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce profil ? Toutes les données associées seront définitivement perdues.")) {
            setAppData(prev => {
                const newProfiles = prev.profiles.filter(p => p.id !== id);
                return {
                    ...prev,
                    profiles: newProfiles,
                    activeProfileId: prev.activeProfileId === id ? newProfiles[0].id : prev.activeProfileId,
                    lastUpdated: new Date().toISOString(),
                };
            });
            setIsDirty(true);
        }
    };

    const handleSwitchProfile = (id: EntityID) => {
        setAppData(prev => ({ ...prev, activeProfileId: id }));
        // Reset view-specific states
        setFilteredAccountId(null);
        setShowImportView(false);
        setActiveView('DASHBOARD');
    };

    const handleToggleSimulation = () => {
        setIsSimulationMode(prev => !prev);
    };

    const handleApplySimulation = () => {
        const newPotentialTransactions = simulationTransactions.map(t => ({ ...t, status: TransactionStatus.POTENTIAL, isSimulation: false }));
        setTransactions(prev => [...prev, ...newPotentialTransactions]);
        setSimulationTransactions([]);
        setIsSimulationMode(false);
        setIsDirty(true);
    };

    const handleCancelSimulation = () => {
        setSimulationTransactions([]);
        setIsSimulationMode(false);
    };
    
    // Navigation Handlers
    const handleNavigate = (view: View) => {
        setActiveView(view);
        setShowImportView(false);
        setFilteredAccountId(null);
        setFilterByImportId(null);
    };

    const handleSelectAccount = (accountId: EntityID) => {
        setActiveView('TRANSACTIONS');
        setFilteredAccountId(accountId);
        setFilterByImportId(null);
    };

    const handleClearTransactionFilter = () => {
        setFilteredAccountId(null);
        setFilterByImportId(null);
    };

    const handleSwitchToRecurringTransfer = (data: Partial<RecurringTransfer>) => {
        setRecurringTransferToEdit(data);
        setIsRecurringTransferModalOpen(true);
    };
    
    const handleDuplicateTransaction = (transaction: Transaction) => {
        setTransactionToEdit(null);
        setTransactionToDuplicate(transaction);
        setIsTransactionModalOpen(true);
    };
    
    // Action Hub Handlers
    const handleAction = (action: string, data?: any) => {
        setIsTransactionModalOpen(false);
        setTransactionToEdit(null);
        setTransactionToDuplicate(null);
        setTransactionModalContext(null);
        setReimbursementToSettle(null);
        setInitialTransactionType(null);
        
        switch (action) {
            case 'add_account':
                setAccountToEdit(null);
                setIsAccountModalOpen(true);
                break;
            case 'add_expense':
                setInitialTransactionType(TransactionType.EXPENSE);
                setIsTransactionModalOpen(true);
                break;
            case 'add_income':
                setInitialTransactionType(TransactionType.INCOME);
                setIsTransactionModalOpen(true);
                break;
            case 'add_transfer':
                setInitialTransactionType('TRANSFER');
                setIsTransactionModalOpen(true);
                break;
            case 'use_template':
                // Will be handled by TransactionModal opening
                break;
            case 'import_file':
                setActiveView('TRANSACTIONS');
                setShowImportView(true);
                break;
            case 'add_loan':
                setLoanToEdit(null);
                setIsLoanModalOpen(true);
                break;
            case 'add_manual_asset':
                setAssetToEdit(null);
                setIsManualAssetModalOpen(true);
                break;
            case 'export_budget':
                setIsExportModalOpen(true);
                break;
            case 'toggle_simulation':
                handleToggleSimulation();
                break;
        }
    };
    
    // GDrive Sync Hook
    const { 
        isLoggedIn, user, syncStatus, lastSync, handleConnect, handleDisconnect, handleSync, handleForceUpload, handleForceDownload,
        uploadArchive, listArchives, downloadArchive
    } = useGoogleDriveSync({ onImportData: handleImportData, appData });

    // Archive Handlers
    const handleArchiveTransactions = async (years: number) => {
        if (!isLoggedIn) {
            notification.show("Veuillez vous connecter à Google Drive pour archiver vos données.", { type: 'error' });
            return;
        }

        const archiveUntilDate = new Date();
        archiveUntilDate.setFullYear(archiveUntilDate.getFullYear() - years);

        const transactionsToArchive = transactions.filter(t => new Date(t.date) < archiveUntilDate);
        if (transactionsToArchive.length === 0) {
            notification.show(`Aucune transaction à archiver de plus de ${years} ans.`, { type: 'info' });
            return;
        }

        if (!window.confirm(`Vous êtes sur le point d'archiver ${transactionsToArchive.length} transaction(s).\nCette action est IRREVERSIBLE.\nLes transactions seront sauvegardées sur Google Drive et retirées de l'application. Le solde initial de vos comptes sera ajusté.\nVoulez-vous continuer ?`)) {
            return;
        }
        
        try {
            const updatedAccounts = [...accounts];
            const accountBalanceAdjustments: Record<EntityID, number> = {};

            transactionsToArchive.forEach(tx => {
                if (!accountBalanceAdjustments[tx.accountId]) {
                    accountBalanceAdjustments[tx.accountId] = 0;
                }
                const amount = tx.type === TransactionType.INCOME ? tx.amount : -tx.amount;
                accountBalanceAdjustments[tx.accountId] += amount;
            });

            updatedAccounts.forEach(acc => {
                if (accountBalanceAdjustments[acc.id]) {
                    acc.initialBalance += accountBalanceAdjustments[acc.id];
                }
            });
            
            const archiveFile: ArchiveFile = {
                archivedAt: new Date().toISOString(),
                archivedUntil: archiveUntilDate.toISOString().split('T')[0],
                profileId: activeProfile.id,
                transactions: transactionsToArchive,
                accounts: JSON.parse(JSON.stringify(accounts)), // Snapshot
                categories: JSON.parse(JSON.stringify(categories)), // Snapshot
            };
            
            const fileName = `archive-finances-${new Date().toISOString().split('T')[0]}.json`;
            await uploadArchive(archiveFile, fileName);
            
            updateActiveProfile(p => ({
                ...p,
                transactions: p.transactions.filter(t => new Date(t.date) >= archiveUntilDate),
                accounts: updatedAccounts,
            }));
            
            notification.show(`${transactionsToArchive.length} transactions archivées avec succès !`, { type: 'success' });

        } catch(e) {
            console.error("Archive error:", e);
            notification.show("Une erreur est survenue lors de l'archivage.", { type: 'error' });
        }
    };

    const handleViewArchive = async (fileId: string) => {
        try {
            const archiveContent = await downloadArchive(fileId);
            setArchiveToView(archiveContent);
            setIsArchiveBrowserOpen(false);
        } catch(e) {
            console.error("Error viewing archive:", e);
            notification.show("Impossible de charger l'archive.", { type: 'error' });
        }
    };

    const renderView = () => {
        if (archiveToView) {
            return <ArchiveViewer archive={archiveToView} onClose={() => setArchiveToView(null)} />;
        }
        if (showImportView) {
            return <ImportView 
                accounts={accounts}
                transactions={transactions}
                categories={categories}
                categorizationRules={categorizationRules}
                importLogs={importLogs}
                csvMappingPresets={csvMappingPresets}
                onRunImport={handleRunImport}
                onSavePreset={handleSavePreset}
                onDeletePreset={handleDeletePreset}
                onBack={() => setShowImportView(false)}
            />;
        }
        if (reconciliationContext.open) {
            return <ReconciliationView
                accounts={accounts}
                transactions={transactions}
                accountIdToReconcile={reconciliationContext.accountId}
                onReconcile={handleReconcileTransactions}
                onClose={() => setReconciliationContext({ open: false, accountId: null})}
            />;
        }
        switch (activeView) {
            case 'DASHBOARD':
                return <Dashboard
                    accounts={accounts}
                    reserves={reserves}
                    transactions={transactionsForForecast}
                    categories={categories}
                    budgetLimits={budgetLimits}
                    pendingTransactions={pendingRecurringTransactions}
                    pendingTransfers={incomingPendingTransfers}
                    profiles={appData.profiles}
                    appSettings={appSettings}
                    onValidate={handleStatusChange}
                    onBulkValidate={handleBulkValidatePastTransactions}
                    onAcceptTransfer={handleAcceptTransfer}
                    onSelectAccount={handleSelectAccount}
                />;
            case 'TRANSACTIONS':
                return <TransactionsList 
                    transactions={allTransactions}
                    accounts={accounts}
                    reserves={reserves}
                    categories={categories}
                    customFieldDefinitions={customFieldDefinitions}
                    onDelete={handleDeleteTransaction}
                    onEdit={(tx) => { setTransactionToEdit(tx); setIsTransactionModalOpen(true); }}
                    onDuplicate={handleDuplicateTransaction}
                    onSave={handleUpdateTransaction}
                    onStatusChange={handleStatusChange}
                    onBulkUpdate={handleBulkUpdate}
                    onBulkDelete={handleBulkDelete}
                    onMergeTransactions={handleMergeTransactions}
                    recurringExpenses={recurringExpenses}
                    onAddRecurring={() => { setRecurringExpenseToEdit(null); setIsRecurringExpenseModalOpen(true); }}
                    onEditRecurring={(re) => { setRecurringExpenseToEdit(re); setIsRecurringExpenseModalOpen(true); }}
                    onDeleteRecurring={handleDeleteRecurringExpense}
                    recurringTransfers={recurringTransfers}
                    onAddRecurringTransfer={() => { setRecurringTransferToEdit(null); setIsRecurringTransferModalOpen(true); }}
                    onEditRecurringTransfer={(rt) => { setRecurringTransferToEdit(rt); setIsRecurringTransferModalOpen(true); }}
                    onDeleteRecurringTransfer={handleDeleteRecurringTransfer}
                    reimbursements={reimbursements}
                    onTrackReimbursement={(tx) => {setTransactionForReimbursement(tx); setIsReimbursementModalOpen(true);}}
                    onMarkReimbursementAsReceived={handleMarkReimbursementAsReceived}
                    onEditReceivedReimbursement={handleEditReceivedReimbursement}
                    pendingRecurringTransactions={pendingRecurringTransactions}
                    onBulkValidateRecurring={handleBulkValidatePastTransactions}
                    pendingTransfers={incomingPendingTransfers}
                    onAcceptTransfer={handleAcceptTransfer}
                    profiles={appData.profiles}
                    filteredAccountId={filteredAccountId}
                    filterByImportId={filterByImportId}
                    onClearFilter={handleClearTransactionFilter}
                    appSettings={appSettings}
                />;
            case 'PATRIMOINE':
                return <PatrimoineView
                    accounts={accounts}
                    transactions={allTransactions}
                    reserves={reserves}
                    mainAccountId={mainAccountId}
                    onEditAccount={(acc) => { setAccountToEdit(acc); setIsAccountModalOpen(true); }}
                    onDeleteAccount={handleDeleteAccount}
                    onStartReconciliation={(id) => setReconciliationContext({ open: true, accountId: id })}
                    onAddReserve={(accId) => { setAccountForReserveModal(accId); setReserveToEdit(null); setIsReserveModalOpen(true); }}
                    onEditReserve={(res) => { setAccountForReserveModal(res.accountId); setReserveToEdit(res); setIsReserveModalOpen(true); }}
                    onDeleteReserve={handleDeleteReserve}
                    onSelectAccount={handleSelectAccount}
                    loans={loans}
                    onAddLoan={() => { setLoanToEdit(null); setIsLoanModalOpen(true); }}
                    onEditLoan={(loan) => { setLoanToEdit(loan); setIsLoanModalOpen(true); }}
                    onDeleteLoan={handleDeleteLoan}
                    manualAssets={manualAssets}
                    onAddAsset={() => { setAssetToEdit(null); setIsManualAssetModalOpen(true); }}
                    onEditAsset={(asset) => { setAssetToEdit(asset); setIsManualAssetModalOpen(true); }}
                    onDeleteAsset={handleDeleteManualAsset}
                    appSettings={appSettings}
                    onAddAccount={() => { setAccountToEdit(null); setIsAccountModalOpen(true); }}
                />;
            case 'PLANNING':
                return <PlanningView
                    transactions={transactionsForForecast}
                    accounts={accounts}
                    mainAccountId={mainAccountId}
                    reserves={reserves}
                    categories={categories}
                    monthlyMiscellaneous={monthlyMiscellaneous}
                    setMonthlyMiscellaneous={setMonthlyMiscellaneous}
                    appSettings={appSettings}
                    budgetLimits={budgetLimits}
                    reimbursements={reimbursements}
                    onAddTransaction={(ctx) => { setTransactionModalContext(ctx); setIsTransactionModalOpen(true); }}
                    onEditTransaction={(tx) => { setTransactionToEdit(tx); setIsTransactionModalOpen(true); }}
                    onDeleteTransaction={handleDeleteTransaction}
                    onOpenBudgetLimitModal={() => setIsBudgetLimitModalOpen(true)}
                />;
            case 'SETTINGS':
                return <SettingsView 
                    accounts={accounts}
                    mainAccountId={mainAccountId}
                    setMainAccountId={setMainAccountId}
                    categories={categories}
                    transactions={transactions}
                    recurringExpenses={recurringExpenses}
                    recurringTransfers={recurringTransfers}
                    reimbursements={reimbursements}
                    monthlyMiscellaneous={monthlyMiscellaneous}
                    importLogs={importLogs}
                    csvMappingPresets={csvMappingPresets}
                    loans={loans}
                    manualAssets={manualAssets}
                    customFieldDefinitions={customFieldDefinitions}
                    categorizationRules={categorizationRules}
                    onAddCategory={(name, type, icon) => setCategories(prev => [...prev, {id: generateUniqueId('cat'), name, type, icon}])}
                    onUpdateCategory={(id, newName, icon) => setCategories(prev => prev.map(c => c.id === id ? {...c, name: newName, icon} : c))}
                    onDeleteCategory={(id) => setCategories(prev => prev.filter(c => c.id !== id))}
                    onSaveCustomField={handleSaveCustomField}
                    onDeleteCustomField={handleDeleteCustomField}
                    onSaveCategorizationRule={handleSaveCategorizationRule}
                    onDeleteCategorizationRule={handleDeleteCategorizationRule}
                    onExportData={handleExportData}
                    onImportData={handleImportData}
                    appSettings={appSettings}
                    onSaveAppSettings={handleSaveAppSettings}
                    budgetLimits={budgetLimits}
                    onSaveBudgetLimit={handleSaveBudgetLimit}
                    onDeleteBudgetLimit={handleDeleteBudgetLimit}
                    iconLibrary={iconLibrary}
                    setIconLibrary={setIconLibrary}
                    onDeleteIcon={handleDeleteIcon}
                    allEntityIcons={allEntityIcons}
                    entityIconMap={entityIconMap}
                    onSaveCustomIcon={handleSaveCustomIcon}
                    reserves={reserves}
                    profiles={appData.profiles}
                    activeProfileId={activeProfile.id}
                    onAddProfile={() => { setProfileToEdit(null); setIsProfileModalOpen(true); }}
                    onUpdateProfile={(p) => { setProfileToEdit(p); setIsProfileModalOpen(true); }}
                    onDeleteProfile={handleDeleteProfile}
                    onSwitchProfile={handleSwitchProfile}
                    onArchiveTransactions={handleArchiveTransactions}
                    onOpenArchiveBrowser={() => setIsArchiveBrowserOpen(true)}
                    // GDrive props
                    isLoggedIn={isLoggedIn}
                    user={user}
                    syncStatus={syncStatus}
                    lastSync={lastSync}
                    handleConnect={handleConnect}
                    handleDisconnect={handleDisconnect}
                    handleSync={handleSync}
                    handleForceUpload={handleForceUpload}
                    handleForceDownload={handleForceDownload}
                />;
            default:
                return null;
        }
    };

    return (
        <div className={`min-h-screen text-gray-900 dark:text-gray-100 ${isSimulationMode ? 'pb-40' : 'pb-16 md:pb-0'}`}>
            <Header 
                activeView={activeView} 
                onNavigate={handleNavigate}
                onAction={handleAction}
                isSimulationMode={isSimulationMode}
                appSettings={appSettings}
                onOpenGuide={() => setIsGuideModalOpen(true)}
                onExport={handleExportData}
                onImport={triggerHeaderImport}
                isLoggedIn={isLoggedIn}
                user={user}
                syncStatus={syncStatus}
                handleConnect={handleConnect}
                handleDisconnect={handleDisconnect}
                handleSync={handleSync}
                profiles={appData.profiles}
                activeProfile={activeProfile}
                onSwitchProfile={handleSwitchProfile}
            />
            <main className="md:pt-16">
                {renderView()}
            </main>
            <BottomNavBar 
                activeView={activeView} 
                onNavigate={handleNavigate}
                appSettings={appSettings}
                profiles={appData.profiles}
                activeProfile={activeProfile}
                onSwitchProfile={handleSwitchProfile}
            />
            <FloatingActionButton
                activeView={activeView}
                onAction={handleAction}
                isSimulationMode={isSimulationMode}
                activeProfile={activeProfile}
            />
            <TransactionModal 
                isOpen={isTransactionModalOpen}
                onClose={() => {setIsTransactionModalOpen(false); setTransactionToEdit(null); setTransactionToDuplicate(null); setTransactionModalContext(null); setReimbursementToSettle(null); setInitialTransactionType(null); setPendingTransferToAccept(null);}}
                onSave={handleSaveTransaction}
                onSwitchToRecurringTransfer={handleSwitchToRecurringTransfer}
                accounts={accounts}
                reserves={reserves}
                categories={categories}
                customFieldDefinitions={customFieldDefinitions}
                categorizationRules={categorizationRules}
                transactionToEdit={transactionToEdit}
                transactionToDuplicate={transactionToDuplicate}
                mainAccountId={mainAccountId}
                context={transactionModalContext}
                reimbursementToSettle={reimbursementToSettle}
                reimbursementContext={reimbursementContext}
                isSimulationMode={isSimulationMode}
                initialType={initialTransactionType}
                appSettings={appSettings}
                allTags={allTags}
                profiles={appData.profiles}
                activeProfileId={activeProfile.id}
                pendingTransferToAccept={pendingTransferToAccept}
            />
            <AccountModal 
                isOpen={isAccountModalOpen} 
                onClose={() => setIsAccountModalOpen(false)}
                onSave={handleSaveAccount}
                accountToEdit={accountToEdit}
                accounts={accounts}
                entityIconMap={entityIconMap}
            />
            <RecurringExpenseModal
                isOpen={isRecurringExpenseModalOpen}
                onClose={() => setIsRecurringExpenseModalOpen(false)}
                onSave={handleSaveRecurringExpense}
                accounts={accounts}
                categories={categories}
                expenseToEdit={recurringExpenseToEdit}
                mainAccountId={mainAccountId}
            />
            <RecurringTransferModal
                isOpen={isRecurringTransferModalOpen}
                onClose={() => setIsRecurringTransferModalOpen(false)}
                onSave={handleSaveRecurringTransfer}
                accounts={accounts}
                reserves={reserves}
                transferToEdit={recurringTransferToEdit}
            />
            <ReserveModal
                isOpen={isReserveModalOpen}
                onClose={() => { setIsReserveModalOpen(false); setAccountForReserveModal(null); }}
                onSave={handleSaveReserve}
                reserveToEdit={reserveToEdit}
                accountId={accountForReserveModal}
            />
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExportBudget}
            />
            <ReimbursementModal 
                isOpen={isReimbursementModalOpen}
                onClose={() => setIsReimbursementModalOpen(false)}
                transaction={transactionForReimbursement}
                onSave={handleSaveReimbursement}
            />
            <LoanModal 
                isOpen={isLoanModalOpen}
                onClose={() => setIsLoanModalOpen(false)}
                onSave={handleSaveLoan}
                loanToEdit={loanToEdit}
            />
            <ManualAssetModal
                isOpen={isManualAssetModalOpen}
                onClose={() => setIsManualAssetModalOpen(false)}
                onSave={handleSaveManualAsset}
                assetToEdit={assetToEdit}
                entityIconMap={entityIconMap}
            />
            <GuideModal
                isOpen={isGuideModalOpen}
                onClose={() => setIsGuideModalOpen(false)}
            />
             <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                onSave={handleSaveProfile}
                profileToEdit={profileToEdit}
                entityIconMap={entityIconMap}
            />
             <BudgetLimitModal
                isOpen={isBudgetLimitModalOpen}
                onClose={() => setIsBudgetLimitModalOpen(false)}
                limits={budgetLimits}
                categories={categories}
                onSave={handleSaveBudgetLimit}
                onDelete={handleDeleteBudgetLimit}
            />
             <ArchiveBrowserModal
                isOpen={isArchiveBrowserOpen}
                onClose={() => setIsArchiveBrowserOpen(false)}
                listArchives={listArchives}
                onSelectArchive={handleViewArchive}
            />
            {isSimulationMode && <SimulationPanel 
                simulationTransactions={simulationTransactions}
                onApply={handleApplySimulation}
                onCancel={handleCancelSimulation}
                onDeleteSimulationTransaction={(id) => setSimulationTransactions(prev => prev.filter(t => t.id !== id))}
            />}
            <input type="file" ref={importHeaderFileRef} onChange={handleHeaderFileImport} accept=".json" className="hidden" />
        </div>
    );
}

function App() {
    return (
        <NotificationProvider>
            <AppContent />
        </NotificationProvider>
    );
}

export default App;