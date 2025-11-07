
import { Category, TransactionType, AppSettings } from './types';

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MISC_CATEGORY_ID = 'cat-misc';

export const initialCategories: Category[] = [
  // Revenus
  { id: 'cat-inc-1', name: 'Salaire', type: TransactionType.INCOME, icon: 'Briefcase' },
  { id: 'cat-inc-2', name: 'Aides & Allocations', type: TransactionType.INCOME, icon: 'Heart' },
  { id: 'cat-inc-3', name: 'Revenus locatifs', type: TransactionType.INCOME, icon: 'HomeModern' },
  { id: 'cat-inc-4', name: 'Remboursements', type: TransactionType.INCOME, icon: 'ReceiptRefund' },
  { id: 'cat-inc-other', name: 'Autres revenus', type: TransactionType.INCOME, icon: 'Sparkles' },
  
  // Dépenses
  { id: 'cat-exp-1', name: 'Logement (Loyer, Crédit)', type: TransactionType.EXPENSE, icon: 'Key' },
  { id: 'cat-exp-2', name: 'Courses alimentaires', type: TransactionType.EXPENSE, icon: 'ShoppingCart' },
  { id: 'cat-exp-3', name: 'Transports & Véhicule', type: TransactionType.EXPENSE, icon: 'Truck' },
  { id: 'cat-exp-4', name: 'Factures (Énergie, Eau)', type: TransactionType.EXPENSE, icon: 'LightBulb' },
  { id: 'cat-exp-5', name: 'Téléphone & Internet', type: TransactionType.EXPENSE, icon: 'Phone' },
  { id: 'cat-exp-6', name: 'Assurances', type: TransactionType.EXPENSE, icon: 'ShieldCheck' },
  { id: 'cat-exp-7', name: 'Santé', type: TransactionType.EXPENSE, icon: 'Heart' },
  { id: 'cat-exp-8', name: 'Loisirs & Sorties', type: TransactionType.EXPENSE, icon: 'Ticket' },
  { id: 'cat-exp-9', name: 'Shopping & Habillement', type: TransactionType.EXPENSE, icon: 'ShoppingBag' },
  { id: 'cat-exp-10', name: 'Enfants & Famille', type: TransactionType.EXPENSE, icon: 'UserGroup' },
  { id: 'cat-exp-11', name: 'Épargne & Investissements', type: TransactionType.EXPENSE, icon: 'PiggyBank' },
  { id: 'cat-exp-12', name: 'Voyages', type: TransactionType.EXPENSE, icon: 'MapPin' },
  { id: 'cat-exp-13', name: 'Impôts & Taxes', type: TransactionType.EXPENSE, icon: 'Calculator' },
  { id: MISC_CATEGORY_ID, name: 'Divers', type: TransactionType.EXPENSE, icon: 'QuestionMarkCircle' },
];

export const defaultAppSettings: AppSettings = {
    useBudgetEnvelopes: false,
    enableDeferredDebit: false,
    dashboardSettings: {
        showSavingsInsight: true,
        showExpenseInsight: true,
        showBudgetInsight: true,
        showUpcomingInsight: true,
        showForecastChart: true,
        showAccountsOverview: true,
        showExpenseChart: true,
        showPendingTransactions: true,
        upcomingTransactionsCount: 3,
    },
    savingsCalculationSettings: {
        includedIncomes: [],
        excludedExpenses: [],
    },
    forecastChartSettings: {
        includedAccounts: [],
    },
    features: {
        enableTags: false,
        enableSavingsGoals: false,
        enableNetWorth: false,
    },
    netWorthSettings: {
        showLiquidAssets: true,
        showManualAssets: true,
        showLiabilities: true,
    }
};
