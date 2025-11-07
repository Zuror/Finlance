
export type EntityID = string;

export enum TransactionType {
  INCOME = 'REVENU',
  EXPENSE = 'DEPENSE',
}

export enum TransactionStatus {
  POTENTIAL = 'POTENTIE...',
  REAL = 'REEL',
}

export enum RecurringFrequency {
  WEEKLY = 'HEBDOMADAIRE',
  MONTHLY = 'MENSUEL',
  ANNUAL = 'ANNUEL',
}

export enum CustomFieldType {
  TEXT = 'TEXTE',
  NUMBER = 'NOMBRE',
  DATE = 'DATE',
  BOOLEAN = 'OUI/NON',
}

export enum ReimbursementStatus {
  PENDING = 'EN_ATTENTE',
  RECEIVED = 'RECU',
}

export interface Reimbursement {
  id: EntityID;
  transactionId: EntityID; // The original expense
  expectedAmount: number;
  expectedDate: string; // 'YYYY-MM-DD'
  status: ReimbursementStatus;
  receivedAmount?: number;
  receivedDate?: string; // 'YYYY-MM-DD'
  receivedTransactionId?: EntityID; // The income transaction
}

export interface CustomFieldDefinition {
  id: EntityID;
  name: string;
  type: CustomFieldType;
}

export interface RecurringExpense {
  id: EntityID;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  startDate: string; // 'YYYY-MM-DD'
  endDate?: string; // 'YYYY-MM-DD'
  accountId: EntityID;
  categoryId: EntityID;
}

export interface RecurringTransfer {
  id: EntityID;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  startDate: string; // 'YYYY-MM-DD'
  endDate?: string; // 'YYYY-MM-DD'
  sourceId: string; // 'acc_ID' or 'res_ID'
  destinationId: string; // 'acc_ID' or 'res_ID'
}

export interface Category {
  id: EntityID;
  name: string;
  type: TransactionType;
  icon?: string;
}

export interface MonthlyMiscellaneous {
  yearMonth: string; // 'YYYY-MM'
  amount: number;
}

export interface Transaction {
  id: EntityID;
  description: string;
  amount: number; // always positive
  date: string; // 'YYYY-MM-DD'
  effectiveDate: string; // 'YYYY-MM-DD', when it impacts balance
  status: TransactionStatus;
  type: TransactionType;
  accountId: EntityID;
  reserveId?: EntityID;
  categoryId?: EntityID;
  transferId?: EntityID; // Links two transactions for a transfer
  recurringExpenseId?: EntityID; // Link to the recurring expense rule
  recurringTransferId?: EntityID; // Link to the recurring transfer rule
  reimbursementId?: EntityID; // Link to a reimbursement for potential income
  isReconciled?: boolean;
  importId?: EntityID; // Link to the import batch
  customFields?: Record<EntityID, string | number | boolean | null>;
  isSimulation?: boolean; // For "what if" scenarios
  deferredDebitSourceAccountId?: EntityID;
  tags?: string[];
}

export interface CsvMappingPreset {
  id: EntityID;
  name: string;
  mapping: Record<string, string>; // csvHeader -> transactionField ('description', 'date', 'amount', 'debit', 'credit')
  hasCreditDebit: boolean;
  dateFormat: string; // 'YYYY-MM-DD', 'DD/MM/YYYY', etc.
  delimiter: string; // ',', ';', etc.
}

export interface ImportLog {
  id: EntityID;
  date: string; // ISO String
  fileName: string;
  accountId: EntityID;
  importedCount: number;
  presetName: string;
  lastTransactionDate?: string;
  lastTransactionDescription?: string;
}


export interface Reserve {
  id: EntityID;
  name: string;
  accountId: EntityID;
  targetAmount?: number;
  targetDate?: string; // 'YYYY-MM-DD'
}

export enum AccountType {
  CURRENT = 'COURANT',
  SAVINGS = 'EPARGNE',
  DEFERRED_DEBIT = 'DEBIT_DIFFERE',
}

export interface Account {
  id: EntityID;
  name:string;
  initialBalance: number;
  icon?: string;
  color?: string;
  type?: AccountType;
  linkedAccountId?: EntityID;
  debitDay?: number;
}

export type View = 'DASHBOARD' | 'TRANSACTIONS' | 'PATRIMOINE' | 'PLANNING' | 'SETTINGS';

export interface ForecastData {
  month: string;
  balances: Record<EntityID, number>;
  reserveBalances: Record<EntityID, number>;
  totalBalance: number;
}

export interface CategorizationRule {
  id: EntityID;
  keyword: string;
  categoryId: EntityID;
}

export interface AppSettings {
  firstName?: string;
  useBudgetEnvelopes: boolean;
  enableDeferredDebit?: boolean;
  dashboardSettings: {
    showSavingsInsight: boolean;
    showExpenseInsight: boolean;
    showBudgetInsight: boolean;
    showUpcomingInsight: boolean;
    showForecastChart: boolean;
    showAccountsOverview: boolean;
    showExpenseChart: boolean;
    showPendingTransactions: boolean;
    upcomingTransactionsCount: number;
  };
  savingsCalculationSettings?: {
    includedIncomes: EntityID[];
    excludedExpenses: EntityID[];
  };
  forecastChartSettings?: {
    includedAccounts: EntityID[];
  };
  features?: {
    enableTags: boolean;
    enableSavingsGoals: boolean;
    enableNetWorth: boolean;
  };
  netWorthSettings?: {
    showLiquidAssets: boolean;
    showManualAssets: boolean;
    showLiabilities: boolean;
  };
}

export interface BudgetLimit {
  categoryId: EntityID;
  amount: number;
}

export interface Loan {
  id: EntityID;
  name: string;
  initialAmount: number;
  interestRate: number; // annual percentage, e.g., 3.5 for 3.5%
  termInMonths: number;
  startDate: string; // 'YYYY-MM-DD'
  monthlyPayment: number;
  linkedRecurringExpenseId: EntityID;
  paymentsMadeInitially?: number;
}

export interface ManualAsset {
  id: EntityID;
  name: string;
  value: number;
  icon?: string;
}

// --- New Multi-Profile Structures ---

export interface TransactionTemplate {
  id: EntityID;
  name: string;
  transactionData: Omit<Partial<Transaction>, 'id' | 'date' | 'effectiveDate' | 'isReconciled' | 'status'>;
}

export interface Profile {
  id: EntityID;
  name: string;
  icon: string;
  accentColor?: string;
  // Profile-specific data
  accounts: Account[];
  reserves: Reserve[];
  categories: Category[];
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  recurringTransfers: RecurringTransfer[];
  reimbursements: Reimbursement[];
  monthlyMiscellaneous: MonthlyMiscellaneous[];
  mainAccountId: EntityID | null;
  customFieldDefinitions: CustomFieldDefinition[];
  importLogs: ImportLog[];
  csvMappingPresets: CsvMappingPreset[];
  categorizationRules: CategorizationRule[];
  appSettings: AppSettings;
  budgetLimits: BudgetLimit[];
  loans: Loan[];
  manualAssets: ManualAsset[];
  transactionTemplates: TransactionTemplate[];
}

export interface PendingTransfer {
  id: EntityID;
  fromProfileId: EntityID;
  toProfileId: EntityID;
  amount: number;
  description: string;
  date: string; // 'YYYY-MM-DD'
}

export interface AppData {
  version: number;
  profiles: Profile[];
  activeProfileId: EntityID;
  pendingTransfers: PendingTransfer[];
  // Global settings (not profile-specific)
  iconLibrary: string[];
  customIcons: Record<string, string>;
  lastUpdated: string;
}

export interface ArchiveFile {
  archivedAt: string;
  archivedUntil: string;
  profileId: EntityID;
  transactions: Transaction[];
  accounts: Account[]; // Snapshot of accounts at time of archive
  categories: Category[]; // Snapshot of categories
}


// Legacy type for migration
export type AppDataBackup = Omit<Profile, 'id'|'name'|'icon'> & { lastUpdated?: string };
