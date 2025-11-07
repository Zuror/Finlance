
import React, { useState, useMemo, useEffect } from 'react';
import { Account, CsvMappingPreset, EntityID, ImportLog, Transaction, TransactionType, Category, CategorizationRule } from '../types';
import { ArrowLeftIcon, TrashIcon, ExclamationTriangleIcon, PlusIcon } from './Icons';
import { applyCategorizationRules } from '../services/financeService';

interface ImportViewProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  categorizationRules: CategorizationRule[];
  importLogs: ImportLog[];
  csvMappingPresets: CsvMappingPreset[];
  onRunImport: (
    transactionsToImport: Omit<Transaction, 'id' | 'isReconciled' | 'status'>[], 
    fileName: string, 
    accountId: EntityID, 
    presetName: string,
    summary: { duplicates: number }
) => void;
  onSavePreset: (preset: Omit<CsvMappingPreset, 'id'> & { id?: EntityID }) => void;
  onDeletePreset: (id: EntityID) => void;
  onBack: () => void;
}

type ParsedTransaction = {
    data: Partial<Transaction>;
    isDuplicate: boolean;
    error?: string;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// Simple CSV parser
const parseCSV = (content: string, delimiter: string): { headers: string[], data: Record<string, string>[] } => {
  const lines = content.replace(/\r/g, '').split('\n').filter(Boolean);
  if (lines.length < 1) return { headers: [], data: [] };
  
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  
  const data = lines.slice(1).map(line => {
    // Basic split, doesn't handle quotes perfectly but works for most bank CSVs
    const values = line.split(delimiter).map(v => v.trim().replace(/^"(.*)"$/, '$1'));
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {} as Record<string, string>);
  });
  return { headers, data };
};

// More robust date parser
const parseDate = (dateStr: string, format: string): string | null => {
    if (!dateStr || !format) return null;
    try {
        const formatParts = format.toUpperCase().split(/[^A-Z]/);
        const datePartsStr = dateStr.split(/[^0-9]/);
        const dateParts = datePartsStr.map(p => parseInt(p, 10));

        const yearIndex = formatParts.indexOf('YYYY');
        const monthIndex = formatParts.indexOf('MM');
        const dayIndex = formatParts.indexOf('DD');

        if (yearIndex === -1 || monthIndex === -1 || dayIndex === -1) return null;
        
        let year = dateParts[yearIndex];
        let month = dateParts[monthIndex];
        let day = dateParts[dayIndex];
        
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        if (year < 100) year += 2000;
        
        const d = new Date(Date.UTC(year, month - 1, day));
        if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
            return null; // Invalid date (e.g., month 13)
        }
        return d.toISOString().split('T')[0];
    } catch(e) {
        console.error("Date parsing failed for:", dateStr, "with format:", format, e);
        return null;
    }
}

export const ImportView: React.FC<ImportViewProps> = (props) => {
  const { accounts, transactions, categories, categorizationRules, importLogs, csvMappingPresets, onRunImport, onSavePreset, onDeletePreset, onBack } = props;

  const [step, setStep] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState<EntityID>(accounts.length > 0 ? accounts[0].id : '');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [parsedData, setParsedData] = useState<{ headers: string[], data: Record<string, string>[] }>({ headers: [], data: [] });

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [hasCreditDebit, setHasCreditDebit] = useState(false);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [delimiter, setDelimiter] = useState(';');
  const [decimalSeparator, setDecimalSeparator] = useState(',');
  
  const [presetId, setPresetId] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  
  const [transactionsToImport, setTransactionsToImport] = useState<ParsedTransaction[]>([]);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setFileContent(content);
        setStep(2);
      };
      reader.readAsText(f, 'UTF-8');
    }
  };
  
  useEffect(() => {
    if (fileContent) {
      const result = parseCSV(fileContent, delimiter);
      setParsedData(result);
      // Auto-detect mapping
      const newMapping: Record<string, string> = {};
      const headers = result.headers.map(h => h.toLowerCase());
      const dateHeader = result.headers.find(h => h.toLowerCase().includes('date'));
      const descHeader = result.headers.find(h => h.toLowerCase().includes('libell') || h.toLowerCase().includes('description'));
      const amountHeader = result.headers.find(h => h.toLowerCase().includes('montant'));
      const debitHeader = result.headers.find(h => h.toLowerCase().includes('debit') || h.toLowerCase().includes('débit'));
      const creditHeader = result.headers.find(h => h.toLowerCase().includes('credit') || h.toLowerCase().includes('crédit'));

      if (dateHeader) newMapping.date = dateHeader;
      if (descHeader) newMapping.description = descHeader;
      if (debitHeader && creditHeader) {
          newMapping.debit = debitHeader;
          newMapping.credit = creditHeader;
          setHasCreditDebit(true);
      } else if (amountHeader) {
          newMapping.amount = amountHeader;
          setHasCreditDebit(false);
      }
      setMapping(newMapping);
    }
  }, [fileContent, delimiter]);
  
  const handlePresetLoad = (id: string) => {
    const preset = csvMappingPresets.find(p => p.id === id);
    if (preset) {
        setPresetId(id);
        setMapping(preset.mapping);
        setHasCreditDebit(preset.hasCreditDebit);
        setDateFormat(preset.dateFormat);
        setDelimiter(preset.delimiter);
    } else {
        setPresetId('');
    }
  }

  const handleDeleteCurrentPreset = () => {
    if (presetId && window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) {
        onDeletePreset(presetId);
        setPresetId('');
        setMapping({});
    }
  };
  
  const handlePreview = () => {
    const finalTransactions: ParsedTransaction[] = parsedData.data.map(row => {
        const description = row[mapping.description] || '';
        let amount = 0;
        let type = TransactionType.EXPENSE;
        let error = '';

        try {
            const amountRaw = row[mapping.amount] || '0';
            const creditRaw = row[mapping.credit] || '0';
            const debitRaw = row[mapping.debit] || '0';
            
            const parseAmount = (raw: string) => parseFloat(raw.replace(/\s/g, '').replace(decimalSeparator, '.'));

            if(hasCreditDebit){
              const credit = parseAmount(creditRaw);
              const debit = parseAmount(debitRaw);
              if(!isNaN(credit) && credit > 0){
                amount = credit;
                type = TransactionType.INCOME;
              } else if (!isNaN(debit)) {
                amount = Math.abs(debit);
                type = TransactionType.EXPENSE;
              } else {
                 error += 'Montant Débit/Crédit invalide. ';
              }
            } else {
              amount = parseAmount(amountRaw);
              if (isNaN(amount)) {
                  error += 'Montant invalide. ';
              }
              if(amount >= 0) type = TransactionType.INCOME
              else {
                amount = -amount;
                type = TransactionType.EXPENSE
              }
            }
        } catch (e) {
            error += 'Erreur de lecture du montant. ';
        }
        
        const date = parseDate(row[mapping.date], dateFormat);
        if (!date) {
            error += `Format de date invalide (attendu: ${dateFormat}). `;
        }
        const categoryId = applyCategorizationRules(description, categorizationRules);
        
        return {
            data: {
                description,
                amount,
                type,
                date,
                effectiveDate: date,
                accountId: selectedAccountId,
                categoryId: categoryId || '',
            },
            isDuplicate: false, // will be checked next
            error: error || undefined,
        };
    });

    // Duplicate check
    const accountTransactions = transactions.filter(t => t.accountId === selectedAccountId);
    const enrichedTransactions = finalTransactions.map(t => {
        if (t.error || !t.data.date) return t;
        const isDuplicate = accountTransactions.some(existing => 
            existing.date === t.data.date && 
            Math.abs(existing.amount - (t.data.amount || 0)) < 0.01 &&
            existing.description.toLowerCase().trim() === t.data.description?.toLowerCase().trim()
        );
        return { ...t, isDuplicate };
    });
    
    setTransactionsToImport(enrichedTransactions);
    setSelection(new Set(enrichedTransactions.map((_, i) => i).filter(i => !enrichedTransactions[i].isDuplicate && !enrichedTransactions[i].error)));
    setStep(3);
  };
  
  const handleFieldChange = (index: number, field: keyof Transaction, value: any) => {
    setTransactionsToImport(prev => {
        const newTxs = [...prev];
        const oldTx = newTxs[index];
        newTxs[index] = { ...oldTx, data: { ...oldTx.data, [field]: value } };
        return newTxs;
    });
  };

  const handleBulkCategorize = (categoryId: string) => {
    setTransactionsToImport(prev => {
        const newTxs = [...prev];
        selection.forEach(index => {
            const tx = newTxs[index];
            if (tx) {
                const category = categories.find(c => c.id === categoryId);
                if (category && category.type === tx.data.type) {
                    tx.data.categoryId = categoryId;
                }
            }
        });
        return newTxs;
    });
    setIsBulkCategoryModalOpen(false);
  };

  const handleRunImportClick = () => {
    const selectedTxs = transactionsToImport
        .filter((_, i) => selection.has(i))
        .map(t => t.data as Omit<Transaction, 'id' | 'isReconciled' | 'status'>);
        
    const duplicateCount = transactionsToImport.filter((t, i) => t.isDuplicate && !selection.has(i)).length;
    
    onRunImport(selectedTxs, file?.name || 'import.csv', selectedAccountId, csvMappingPresets.find(p=>p.id === presetId)?.name || 'Manuel', { duplicates: duplicateCount });
    setStep(1);
    setFile(null);
  };

  const renderStep = () => {
    switch(step) {
      case 1: // Upload
        const accountImportLogs = importLogs.filter(log => log.accountId === selectedAccountId);
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Étape 1: Téléverser un fichier</h2>
            <div className="space-y-4">
                <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                <input type="file" accept=".csv" onChange={handleFileChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <h3 className="text-lg font-semibold mt-8 mb-2">Historique des imports pour ce compte</h3>
            {accountImportLogs.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border rounded-md dark:border-gray-600 divide-y dark:divide-gray-700">
                {accountImportLogs.map(log => (
                    <div key={log.id} className="p-3">
                        <div className="flex justify-between items-center text-sm">
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{log.fileName}</p>
                            <p className="text-gray-500 dark:text-gray-400">{new Date(log.date).toLocaleString('fr-FR')}</p>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 space-y-1">
                            <p><strong>{log.importedCount}</strong> opérations importées via le modèle <strong>"{log.presetName}"</strong>.</p>
                            {log.lastTransactionDate && (
                                <p className="bg-gray-100 dark:bg-gray-900 p-2 rounded-md">
                                    <strong>Dernière transaction :</strong> {new Date(log.lastTransactionDate).toLocaleDateString('fr-FR')} - <em>{log.lastTransactionDescription}</em>
                                </p>
                            )}
                        </div>
                    </div>
                ))}
                </div>
            ) : (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">Aucun import pour ce compte.</p>
            )}
          </div>
        );

      case 2: // Map
        const requiredFields = hasCreditDebit ? ['date', 'description', 'credit', 'debit'] : ['date', 'description', 'amount'];
        const isMappingComplete = requiredFields.every(field => mapping[field]);
        const previewRows = parsedData.data.slice(0, 3);
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Étape 2: Mapper les colonnes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Charger un modèle</label>
                <div className="flex gap-2">
                    <select value={presetId} onChange={e => handlePresetLoad(e.target.value)} className="flex-grow p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="">-- Manuel --</option>
                      {csvMappingPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {presetId && <button onClick={handleDeleteCurrentPreset} className="p-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"><TrashIcon className="w-5 h-5"/></button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Délimiteur CSV</label>
                  <select value={delimiter} onChange={e => setDelimiter(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value=";">;</option>
                    <option value=",">,</option>
                  </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Séparateur décimal</label>
                    <select value={decimalSeparator} onChange={e => setDecimalSeparator(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value=",">,</option>
                        <option value=".">.</option>
                    </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Format de date</label>
                <select value={dateFormat} onChange={e => setDateFormat(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                  <option>MM/DD/YYYY</option>
                </select>
              </div>
              <div className="flex items-center pt-5">
                <input type="checkbox" id="creditDebit" checked={hasCreditDebit} onChange={e => setHasCreditDebit(e.target.checked)} className="h-4 w-4 rounded accent-checkbox" />
                <label htmlFor="creditDebit" className="ml-2 text-sm">Utiliser Débit/Crédit séparés</label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {requiredFields.map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{field}</label>
                  <select value={mapping[field] || ''} onChange={e => setMapping({...mapping, [field]: e.target.value})} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">-- Choisir --</option>
                    {parsedData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {previewRows.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-sm font-semibold mb-1">Aperçu :</h3>
                    <div className="text-xs p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
                        <pre>{previewRows.map(row => JSON.stringify(row)).join('\n')}</pre>
                    </div>
                </div>
            )}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label htmlFor="newPresetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sauvegarder ce mappage</label>
                <div className="flex gap-2 mt-1">
                    <input type="text" id="newPresetName" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} placeholder="Nom du modèle (ex: Ma Banque)" className="flex-grow p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                    <button onClick={() => { onSavePreset({name: newPresetName, mapping, hasCreditDebit, dateFormat, delimiter }); alert("Modèle sauvegardé !"); setNewPresetName('');}} disabled={!newPresetName || !isMappingComplete} className="px-4 py-2 bg-green-600 text-white rounded-md disabled:bg-gray-400">Sauvegarder</button>
                </div>
            </div>
            <button onClick={handlePreview} disabled={!isMappingComplete} className="mt-6 w-full px-4 py-2 bg-accent text-white rounded-lg disabled:bg-gray-400">Prévisualiser les données</button>
          </div>
        );

      case 3: // Preview
        const selectedCount = selection.size;
        const duplicateCount = transactionsToImport.filter(t => t.isDuplicate).length;
        const errorCount = transactionsToImport.filter(t => t.error).length;
        return (
          <div>
            <h2 className="text-xl font-semibold mb-2">Étape 3: Valider et corriger</h2>
            <p className="text-sm mb-4">{selectedCount} opération(s) à importer. {duplicateCount} doublon(s) et {errorCount} erreur(s) détecté(s).</p>
            {selectedCount > 0 && (
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setIsBulkCategoryModalOpen(true)} className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200">Assigner une catégorie</button>
                </div>
            )}
            <div className="max-h-96 overflow-y-auto border rounded-lg dark:border-gray-600">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 text-xs uppercase z-10"><tr>
                  <th className="p-2"><input type="checkbox" checked={selection.size === transactionsToImport.length && transactionsToImport.length > 0} onChange={e => setSelection(e.target.checked ? new Set(transactionsToImport.map((_, i) => i)) : new Set())} /></th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-left">Catégorie</th>
                  <th className="p-2 text-right">Montant</th>
                </tr></thead>
                <tbody>{transactionsToImport.map((tx, i) => (
                  <tr key={i} className={`border-t dark:border-gray-700 ${tx.error ? 'bg-red-100 dark:bg-red-900/50' : (tx.isDuplicate ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50')}`}>
                    <td className="p-2"><input type="checkbox" checked={selection.has(i)} onChange={() => { const s = new Set(selection); s.has(i) ? s.delete(i) : s.add(i); setSelection(s);}} /></td>
                    <td className="p-2"><input type="date" value={tx.data.date || ''} onChange={e => handleFieldChange(i, 'date', e.target.value)} className="w-32 bg-transparent rounded border-gray-300 dark:border-gray-600 text-sm"/></td>
                    <td className="p-2"><input type="text" value={tx.data.description || ''} onChange={e => handleFieldChange(i, 'description', e.target.value)} className="w-full bg-transparent rounded border-gray-300 dark:border-gray-600 text-sm"/></td>
                    <td className="p-2">
                        <select value={tx.data.categoryId} onChange={(e) => handleFieldChange(i, 'categoryId', e.target.value)} className="w-full p-1 text-xs border rounded bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                            <option value="">-- Catégorie --</option>
                            {categories.filter(c => c.type === tx.data.type).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </td>
                    <td className={`p-2 text-right font-bold ${tx.data.type === TransactionType.INCOME ? 'text-green-500':'text-red-500'}`}>{currencyFormatter.format(tx.data.amount || 0)}</td>
                    {(tx.error || tx.isDuplicate) && (
                        <td className="px-2" title={tx.error || 'Doublon potentiel détecté'}>
                            <ExclamationTriangleIcon className={`w-5 h-5 ${tx.error ? 'text-red-500' : 'text-yellow-500'}`}/>
                        </td>
                    )}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button onClick={handleRunImportClick} disabled={selectedCount === 0} className="mt-6 w-full px-4 py-2 bg-accent text-white rounded-lg disabled:bg-gray-400">Importer {selectedCount} Opération(s)</button>
             {isBulkCategoryModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl">
                        <h3 className="font-semibold mb-2">Assigner une catégorie</h3>
                        <p className="text-sm mb-3">Sera appliquée aux transactions sélectionnées du même type.</p>
                        <select onChange={e => handleBulkCategorize(e.target.value)} className="w-full p-2 border rounded">
                            <option>Choisir...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => setIsBulkCategoryModalOpen(false)} className="mt-4 w-full text-sm p-2 bg-gray-200 rounded">Fermer</button>
                    </div>
                </div>
            )}
          </div>
        )
      default: return null;
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center mb-6">
        <button onClick={step > 1 ? () => setStep(step - 1) : onBack} className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Importer des Transactions</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        {renderStep()}
      </div>
    </div>
  );
};
