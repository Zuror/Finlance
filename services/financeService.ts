import { Account, Reserve, Transaction, ForecastData, TransactionStatus, TransactionType, RecurringExpense, RecurringFrequency, RecurringTransfer, CategorizationRule, Reimbursement, ReimbursementStatus, Loan, AccountType, AppData, Profile } from '../types';
import { MONTH_NAMES_FR, initialCategories, defaultAppSettings } from '../constants';
import { defaultEntityIconNames } from '../components/Icons';

export const calculateAccountBalance = (
  account: Account,
  transactions: Transaction[],
  upToDate: Date
): number => {
  return transactions
    .filter(t => t.accountId === account.id && t.status === TransactionStatus.REAL && new Date(t.effectiveDate) <= upToDate && !t.isSimulation)
    .reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) return acc + t.amount;
      if (t.type === TransactionType.EXPENSE) return acc - t.amount;
      return acc;
    }, account.initialBalance);
};

export const calculateCurrentReserveBalance = (
  reserve: Reserve,
  transactions: Transaction[],
  upToDate: Date
): number => {
  return transactions
    .filter(t => t.reserveId === reserve.id && t.status === TransactionStatus.REAL && new Date(t.effectiveDate) <= upToDate && !t.isSimulation)
    .reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) return acc + t.amount;
      if (t.type === TransactionType.EXPENSE) return acc - t.amount;
      return acc;
    }, 0);
};

export const calculateReserveBalance = (
  reserve: Reserve,
  transactions: Transaction[],
  upToDate: Date
): number => {
  return transactions
    .filter(t => t.reserveId === reserve.id && new Date(t.effectiveDate) <= upToDate && !t.isSimulation) // Real and potential for forecast
    .reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) return acc + t.amount;
      if (t.type === TransactionType.EXPENSE) return acc - t.amount;
      return acc;
    }, 0);
};

export const generateForecast = (
  accounts: Account[],
  reserves: Reserve[],
  transactions: Transaction[]
): ForecastData[] => {
  const forecast: ForecastData[] = [];
  const today = new Date();
  today.setDate(1); // Start from the beginning of the current month

  let currentAccountBalances: Record<string, number> = {};
  accounts.forEach(acc => {
    currentAccountBalances[acc.id] = acc.initialBalance + transactions
      .filter(t => t.accountId === acc.id && t.status === TransactionStatus.REAL && new Date(t.effectiveDate) < today && !t.isSimulation)
      .reduce((balance, t) => {
        if (t.type === TransactionType.INCOME) return balance + t.amount;
        if (t.type === TransactionType.EXPENSE) return balance - t.amount;
        return balance;
      }, 0);
  });

  let currentReserveBalances: Record<string, number> = {};
  reserves.forEach(r => {
      currentReserveBalances[r.id] = transactions
      .filter(t => t.reserveId === r.id && t.status === TransactionStatus.REAL && new Date(t.effectiveDate) < today && !t.isSimulation)
      .reduce((balance, t) => {
        if (t.type === TransactionType.INCOME) return balance + t.amount;
        if (t.type === TransactionType.EXPENSE) return balance - t.amount;
        return balance;
      }, 0);
  });

  for (let i = 0; i < 12; i++) {
    const forecastMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);

    const monthTransactions = transactions.filter(t => {
      const effDate = new Date(t.effectiveDate);
      return effDate >= forecastMonth && effDate <= monthEnd && !t.isSimulation;
    });

    monthTransactions.forEach(t => {
      const amount = t.type === TransactionType.INCOME ? t.amount : -t.amount;
      if (currentAccountBalances[t.accountId] !== undefined) {
        currentAccountBalances[t.accountId] += amount;
      }
      if (t.reserveId && currentReserveBalances[t.reserveId] !== undefined) {
        currentReserveBalances[t.reserveId] += amount;
      }
    });
    
    const monthStr = `${MONTH_NAMES_FR[forecastMonth.getMonth()]} ${forecastMonth.getFullYear()}`;
    const totalBalance = Object.values(currentAccountBalances).reduce((sum, bal) => sum + bal, 0);
    
    forecast.push({
      month: monthStr,
      balances: { ...currentAccountBalances },
      reserveBalances: { ...currentReserveBalances },
      totalBalance,
    });
  }

  return forecast;
};

export const generateReserveForecast = (
  reserves: Reserve[],
  allTransactions: Transaction[],
  startDate: Date,
): { month: string, yearMonth: string, balances: Record<string, number> }[] => {
  const forecast: { month: string, yearMonth: string, balances: Record<string, number> }[] = [];
  const startOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  // Calculate initial balances for reserves up to the start date
  const initialBalances: Record<string, number> = {};
  reserves.forEach(r => {
    initialBalances[r.id] = allTransactions
      .filter(t => t.reserveId === r.id && t.status === TransactionStatus.REAL && new Date(t.effectiveDate) < startOfMonth && !t.isSimulation)
      .reduce((sum, t) => sum + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
  });

  let currentBalances = { ...initialBalances };

  for (let i = 0; i < 12; i++) {
    const forecastMonthDate = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + i, 1);
    const monthEnd = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + i + 1, 0);
    
    const yearMonth = `${forecastMonthDate.getFullYear()}-${String(forecastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const monthTransactions = allTransactions.filter(t => {
      if (!t.reserveId || t.isSimulation) return false;
      const effDate = new Date(t.effectiveDate);
      return effDate >= forecastMonthDate && effDate <= monthEnd;
    });

    monthTransactions.forEach(t => {
      if (t.reserveId && currentBalances[t.reserveId] !== undefined) {
        const amount = t.type === TransactionType.INCOME ? t.amount : -t.amount;
        currentBalances[t.reserveId] += amount;
      }
    });

    forecast.push({
      month: `${MONTH_NAMES_FR[forecastMonthDate.getMonth()]} ${forecastMonthDate.getFullYear()}`,
      yearMonth: yearMonth,
      balances: { ...currentBalances },
    });
  }

  return forecast;
};


export const generateTransactionsFromRecurring = (
  recurringExpenses: RecurringExpense[],
): Transaction[] => {
  const generatedTransactions: Transaction[] = [];
  const forecastEndDate = new Date();
  // Generate for 12 months ahead
  forecastEndDate.setMonth(forecastEndDate.getMonth() + 12);

  recurringExpenses.forEach(re => {
    let nextDate = new Date(re.startDate);
    const endDate = re.endDate ? new Date(re.endDate) : null;

    while (nextDate <= forecastEndDate) {
      if (endDate && nextDate > endDate) break;

      const yearMonthDay = nextDate.toISOString().split('T')[0];
      
      generatedTransactions.push({
        id: `rec-${re.id}-${yearMonthDay}`,
        description: re.description,
        amount: re.amount,
        date: yearMonthDay,
        effectiveDate: yearMonthDay,
        status: TransactionStatus.POTENTIAL,
        type: TransactionType.EXPENSE,
        accountId: re.accountId,
        categoryId: re.categoryId,
        recurringExpenseId: re.id,
      });

      switch (re.frequency) {
        case RecurringFrequency.WEEKLY:
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case RecurringFrequency.MONTHLY:
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case RecurringFrequency.ANNUAL:
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }
  });
  return generatedTransactions;
};

export const generateTransactionsFromRecurringTransfers = (
  recurringTransfers: RecurringTransfer[],
  accounts: Account[],
  reserves: Reserve[]
): Transaction[] => {
  const generatedTransactions: Transaction[] = [];
  const forecastEndDate = new Date();
  forecastEndDate.setMonth(forecastEndDate.getMonth() + 12);

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

  recurringTransfers.forEach(rt => {
    let nextDate = new Date(rt.startDate);
    const endDate = rt.endDate ? new Date(rt.endDate) : null;

    while (nextDate <= forecastEndDate) {
      if (endDate && nextDate > endDate) break;
      
      const yearMonthDay = nextDate.toISOString().split('T')[0];
      const transferIdForOccurrence = `rec-trsf-${rt.id}-${yearMonthDay}`;
      
      const source = getDetailsFromId(rt.sourceId);
      const destination = getDetailsFromId(rt.destinationId);

      if (!source.accountId || !destination.accountId) {
        // Skip if source or destination account can't be found
        nextDate.setMonth(nextDate.getMonth() + 1); // prevent infinite loop
        continue;
      }

      const expenseTx: Transaction = {
        id: `rect-exp-${rt.id}-${yearMonthDay}`,
        description: rt.description || `Virement vers ${destination.name}`,
        amount: rt.amount,
        date: yearMonthDay,
        effectiveDate: yearMonthDay,
        status: TransactionStatus.POTENTIAL,
        type: TransactionType.EXPENSE,
        accountId: source.accountId,
        reserveId: source.reserveId,
        recurringTransferId: rt.id,
        transferId: transferIdForOccurrence,
      };

      const incomeTx: Transaction = {
        id: `rect-inc-${rt.id}-${yearMonthDay}`,
        description: rt.description || `Virement de ${source.name}`,
        amount: rt.amount,
        date: yearMonthDay,
        effectiveDate: yearMonthDay,
        status: TransactionStatus.POTENTIAL,
        type: TransactionType.INCOME,
        accountId: destination.accountId,
        reserveId: destination.reserveId,
        recurringTransferId: rt.id,
        transferId: transferIdForOccurrence,
      };

      generatedTransactions.push(expenseTx, incomeTx);

      switch (rt.frequency) {
        case RecurringFrequency.WEEKLY:
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case RecurringFrequency.MONTHLY:
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case RecurringFrequency.ANNUAL:
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }
  });
  return generatedTransactions;
};

export const applyCategorizationRules = (
  description: string,
  rules: CategorizationRule[]
): string | undefined => {
  if (!description) return undefined;
  const lowerCaseDesc = description.toLowerCase();
  for (const rule of rules) {
    if (lowerCaseDesc.includes(rule.keyword.toLowerCase())) {
      return rule.categoryId;
    }
  }
  return undefined;
};

export const generateTransactionsFromReimbursements = (
  reimbursements: Reimbursement[],
  allTxsForContext: Transaction[]
): Transaction[] => {
  const generated: Transaction[] = [];
  reimbursements.forEach(r => {
    if (r.status === ReimbursementStatus.PENDING) {
      const originalTx = allTxsForContext.find(t => t.id === r.transactionId);
      if (originalTx) {
        generated.push({
          id: `reimb-pot-${r.id}`,
          description: `Remboursement attendu pour : ${originalTx.description}`,
          amount: r.expectedAmount,
          date: r.expectedDate,
          effectiveDate: r.expectedDate,
          status: TransactionStatus.POTENTIAL,
          type: TransactionType.INCOME,
          accountId: originalTx.accountId,
          categoryId: originalTx.categoryId, // Impute to original expense category
          reimbursementId: r.id,
        });
      }
    }
  });
  return generated;
};

// P = principal, r = monthly interest rate, n = number of months
export const calculateMonthlyPayment = (principal: number, annualRate: number, termInMonths: number): number => {
  if (annualRate === 0) return principal / termInMonths;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termInMonths;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) / (Math.pow(1 + monthlyRate, termInMonths) - 1);
  return payment;
};

export const calculateLoanRemainingBalance = (loan: Loan, transactions: Transaction[]): number => {
    const paymentsMadeSinceStart = transactions.filter(t => 
        t.recurringExpenseId === loan.linkedRecurringExpenseId &&
        t.status === TransactionStatus.REAL &&
        !t.isSimulation &&
        new Date(t.date) >= new Date(loan.startDate)
    ).length;

    const totalPaymentsMade = paymentsMadeSinceStart + (loan.paymentsMadeInitially || 0);

    if (totalPaymentsMade === 0) return loan.initialAmount;
    if (totalPaymentsMade >= loan.termInMonths) return 0;

    if (loan.interestRate === 0) {
        return loan.initialAmount - (totalPaymentsMade * loan.monthlyPayment);
    }

    const monthlyRate = loan.interestRate / 100 / 12;
    const p = loan.initialAmount;
    
    // Remaining Balance = P * ( (1+r)^n - (1+r)^p ) / ( (1+r)^n - 1 )
    // where n = total payments, p = payments made
    const n = loan.termInMonths;
    const r = monthlyRate;

    const remainingBalance = p * (Math.pow(1 + r, n) - Math.pow(1 + r, totalPaymentsMade)) / (Math.pow(1 + r, n) - 1);

    return remainingBalance > 0 ? remainingBalance : 0;
};

export const calculatePaymentsMadeFromRemainingBalance = (
  initialAmount: number,
  annualRate: number,
  termInMonths: number,
  remainingBalance: number
): number => {
  if (remainingBalance >= initialAmount) return 0;
  if (remainingBalance <= 0) return termInMonths;

  if (annualRate === 0) {
    const monthlyPayment = initialAmount / termInMonths;
    if (monthlyPayment <= 0) return 0;
    const amountPaid = initialAmount - remainingBalance;
    return Math.round(amountPaid / monthlyPayment);
  }

  const monthlyRate = annualRate / 100 / 12;
  const P = initialAmount;
  const n = termInMonths;
  const r = monthlyRate;
  const B = remainingBalance; // B is the remaining balance

  // From B = P * [((1+r)^n - (1+r)^p) / ((1+r)^n - 1)]
  // Solve for p:
  // (1+r)^p = (1+r)^n - (B/P) * ((1+r)^n - 1)
  const term = Math.pow(1 + r, n) - (B / P) * (Math.pow(1 + r, n) - 1);
  
  if (term <= 0) return n;
  
  const p = Math.log(term) / Math.log(1 + r);
  
  return Math.round(p);
};


export const generateDeferredDebitSummaryTransactions = (
  accounts: Account[],
  allTransactions: Transaction[],
  forecastMonths: number = 12
): Transaction[] => {
  const deferredAccounts = accounts.filter(a => a.type === AccountType.DEFERRED_DEBIT && a.linkedAccountId && a.debitDay);
  if (deferredAccounts.length === 0) return [];

  const generated: Transaction[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  deferredAccounts.forEach(acc => {
    let nextDebitDate = new Date(today.getFullYear(), today.getMonth(), acc.debitDay!);
    if (today.getTime() >= nextDebitDate.getTime()) {
      nextDebitDate.setMonth(nextDebitDate.getMonth() + 1);
    }

    for (let i = 0; i < forecastMonths; i++) {
      const debitDate = new Date(nextDebitDate.getFullYear(), nextDebitDate.getMonth() + i, acc.debitDay!);
      
      const cycleEndDate = new Date(debitDate);
      cycleEndDate.setDate(debitDate.getDate() - 1);
      const cycleStartDate = new Date(debitDate);
      cycleStartDate.setMonth(debitDate.getMonth() - 1);

      const cycleTxs = allTransactions.filter(t =>
        t.accountId === acc.id &&
        t.status === TransactionStatus.REAL &&
        t.type === TransactionType.EXPENSE &&
        new Date(t.effectiveDate) >= cycleStartDate &&
        new Date(t.effectiveDate) <= cycleEndDate
      );

      const totalAmount = cycleTxs.reduce((sum, tx) => sum + tx.amount, 0);

      if (totalAmount > 0) {
        const debitDateStr = debitDate.toISOString().split('T')[0];
        const realSummaryExists = allTransactions.some(t => 
          t.deferredDebitSourceAccountId === acc.id &&
          t.date === debitDateStr &&
          t.status === TransactionStatus.REAL
        );

        if (!realSummaryExists) {
          generated.push({
            id: `dd-sum-${acc.id}-${debitDateStr}`,
            description: `Prélèvement Carte ${acc.name}`,
            amount: totalAmount,
            date: debitDateStr,
            effectiveDate: debitDateStr,
            status: TransactionStatus.POTENTIAL,
            type: TransactionType.EXPENSE,
            accountId: acc.linkedAccountId!,
            deferredDebitSourceAccountId: acc.id,
          });
        }
      }
    }
  });

  return generated;
};

export const calculateCurrentDeferredDebitSpending = (
  account: Account,
  transactions: Transaction[]
): { total: number, nextDebitDate: Date } | null => {
  if (account.type !== AccountType.DEFERRED_DEBIT || !account.debitDay) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextDebitDate = new Date(today.getFullYear(), today.getMonth(), account.debitDay);
  if (today.getDate() >= account.debitDay) {
    nextDebitDate.setMonth(nextDebitDate.getMonth() + 1);
  }

  const cycleEndDate = new Date(nextDebitDate);
  cycleEndDate.setDate(cycleEndDate.getDate() - 1);
  const cycleStartDate = new Date(nextDebitDate);
  cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);

  const total = transactions
    .filter(t =>
      t.accountId === account.id &&
      t.status === TransactionStatus.REAL &&
      t.type === TransactionType.EXPENSE &&
      new Date(t.effectiveDate) >= cycleStartDate &&
      new Date(t.effectiveDate) <= new Date() // Only count up to today
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  return { total, nextDebitDate };
};

// --- DATA MIGRATION SERVICE ---

export const CURRENT_APP_VERSION = 2;

function migrateLegacyToV2(legacyData: any): AppData {
    console.log("Running migration from legacy backup to v2...");

    const newProfile: Profile = {
        id: `migrated-${Date.now()}`,
        name: legacyData.appSettings?.firstName || 'Principal (Migré)',
        icon: 'UserCircle',
        accentColor: (legacyData.appSettings as any)?.accentColor || '#3b82f6',
        accounts: legacyData.accounts || [],
        reserves: legacyData.reserves || [],
        categories: legacyData.categories || initialCategories,
        transactions: legacyData.transactions || [],
        recurringExpenses: legacyData.recurringExpenses || [],
        recurringTransfers: legacyData.recurringTransfers || [],
        reimbursements: legacyData.reimbursements || [],
        monthlyMiscellaneous: legacyData.monthlyMiscellaneous || [],
        mainAccountId: legacyData.mainAccountId || null,
        customFieldDefinitions: legacyData.customFieldDefinitions || [],
        importLogs: legacyData.importLogs || [],
        csvMappingPresets: legacyData.csvMappingPresets || [],
        categorizationRules: legacyData.categorizationRules || [],
        appSettings: { ...defaultAppSettings, ...(legacyData.appSettings || {}) },
        budgetLimits: legacyData.budgetLimits || [],
        loans: legacyData.loans || [],
        manualAssets: legacyData.manualAssets || [],
        transactionTemplates: legacyData.transactionTemplates || [],
    };

    const migratedAppData: AppData = {
        version: CURRENT_APP_VERSION,
        profiles: [newProfile],
        activeProfileId: newProfile.id,
        pendingTransfers: [],
        iconLibrary: legacyData.iconLibrary || defaultEntityIconNames,
        customIcons: legacyData.customIcons || {},
        lastUpdated: legacyData.lastUpdated || new Date().toISOString(),
    };

    return migratedAppData;
}

export function migrateData(data: any): AppData {
    const version = data.version;

    if (version === CURRENT_APP_VERSION) {
        console.log("Backup version matches current app version. No migration needed.");
        return data as AppData;
    }

    if (version > CURRENT_APP_VERSION) {
        throw new Error(`La version de la sauvegarde (${version}) est plus récente que celle de l'application (${CURRENT_APP_VERSION}). Veuillez mettre à jour l'application.`);
    }
    
    // Legacy backup (no version property)
    if (version === undefined && data.accounts && !data.profiles) {
        return migrateLegacyToV2(data);
    }
    
    // Future migration chain can be added here
    let migratedData = data;
    // if (migratedData.version < 2) {
    //     migratedData = migrateV1toV2(migratedData);
    // }
    
    if (migratedData.version === CURRENT_APP_VERSION) {
        return migratedData;
    }

    throw new Error("Le format de la sauvegarde est inconnu ou corrompu.");
}
