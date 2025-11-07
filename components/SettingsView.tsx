

import React, { useState, useRef, useEffect } from 'react';
import { Category, TransactionType, EntityID, Transaction, RecurringExpense, Account, CustomFieldDefinition, CustomFieldType, AppDataBackup, CategorizationRule, AppSettings, BudgetLimit, ManualAsset, RecurringTransfer, Reimbursement, MonthlyMiscellaneous, ImportLog, CsvMappingPreset, Loan, Reserve, AppData, Profile, ArchiveFile } from '../types';
import { MISC_CATEGORY_ID } from '../constants';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, allEntityIcons, DynamicIcon, TagIcon, CloudIcon, ArrowPathIcon, ArrowsRightLeftIcon, ArchiveBoxIcon } from './Icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ProfileModal } from './ProfileModal';

interface CloudSyncManagerProps {
    isLoggedIn: boolean;
    user: any;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'no_client_id';
    lastSync: string | null;
    handleConnect: () => void;
    handleDisconnect: () => void;
    handleSync: () => void;
    handleForceUpload: () => void;
    handleForceDownload: () => void;
}

const CloudSyncManager: React.FC<CloudSyncManagerProps> = ({ 
    isLoggedIn, user, syncStatus, lastSync, handleConnect, handleDisconnect, handleSync, handleForceUpload, handleForceDownload
}) => {
    
    if (syncStatus === 'no_client_id') {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mt-6">
                <h2 className="text-xl font-semibold text-red-500 mb-2">Configuration requise pour Google Drive</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pour activer la synchronisation, vous devez d'abord configurer votre propre ID client OAuth 2.0.
                </p>
                <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 mt-3 space-y-1">
                    <li>Rendez-vous sur la <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a>.</li>
                    <li>Créez un "ID client OAuth 2.0" de type "Application web".</li>
                    <li>Dans "Origines JavaScript autorisées", ajoutez l'URL de cette application (visible dans la barre d'adresse de votre navigateur).</li>
                    <li>Copiez l'ID client et collez-le dans le code source (hook `useGoogleDriveSync.ts`).</li>
                </ol>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mt-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Synchronisation Google Drive</h2>
            {isLoggedIn && user ? (
                <div>
                    <div className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-900/50 rounded-lg mb-4">
                        {user.picture && <img src={user.picture} alt="Avatar de l'utilisateur" className="w-12 h-12 rounded-full" />}
                        <div>
                            <p className="font-semibold text-green-800 dark:text-green-200">{user.name}</p>
                            <p className="text-sm text-green-700 dark:text-green-300">{user.email}</p>
                        </div>
                    </div>
                    {lastSync && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Dernière synchro réussie: {new Date(lastSync).toLocaleString('fr-FR')}</p>}
                     <div className="space-y-3 mt-4">
                        <button
                            onClick={handleSync}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:opacity-90 transition-colors"
                            disabled={syncStatus === 'syncing'}
                        >
                            <ArrowPathIcon className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                            Synchronisation auto
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={handleForceUpload}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                                disabled={syncStatus === 'syncing'}
                                title="Écrase la sauvegarde sur Google Drive avec vos données locales."
                            >
                                <ArrowUpTrayIcon className="w-5 h-5" /> Envoyer
                            </button>
                            <button
                                onClick={handleForceDownload}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                                disabled={syncStatus === 'syncing'}
                                title="Écrase vos données locales avec la sauvegarde de Google Drive."
                            >
                                <ArrowDownTrayIcon className="w-5 h-5" /> Récupérer
                            </button>
                        </div>
                         {syncStatus === 'error' && <p className="text-xs text-red-500 text-center">La dernière synchronisation a échoué.</p>}
                         {syncStatus === 'success' && <p className="text-xs text-green-500 text-center">Synchronisation réussie !</p>}
                    </div>
                    <div className="text-center mt-4">
                        <button onClick={handleDisconnect} className="text-sm text-gray-500 hover:underline">Se déconnecter</button>
                    </div>
                </div>
            ) : (
                 <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Connectez votre compte Google pour sauvegarder et synchroniser vos données sur plusieurs appareils.</p>
                    <button onClick={handleConnect} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        <CloudIcon className="w-5 h-5" /> Se connecter avec Google
                    </button>
                </div>
            )}
        </div>
    );
};

interface SettingsViewProps extends CloudSyncManagerProps {
  accounts: Account[];
  mainAccountId: EntityID | null;
  setMainAccountId: (id: EntityID | null) => void;
  categories: Category[];
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  recurringTransfers: RecurringTransfer[];
  reimbursements: Reimbursement[];
  monthlyMiscellaneous: MonthlyMiscellaneous[];
  importLogs: ImportLog[];
  csvMappingPresets: CsvMappingPreset[];
  loans: Loan[];
  manualAssets: ManualAsset[];
  customFieldDefinitions: CustomFieldDefinition[];
  categorizationRules: CategorizationRule[];
  onAddCategory: (name: string, type: TransactionType, icon: string) => void;
  onUpdateCategory: (id: EntityID, newName: string, icon: string) => void;
  onDeleteCategory: (id: EntityID) => void;
  onSaveCustomField: (data: Omit<CustomFieldDefinition, 'id'> & { id?: EntityID }) => void;
  onDeleteCustomField: (id: EntityID) => void;
  onSaveCategorizationRule: (data: Omit<CategorizationRule, 'id'> & { id?: EntityID }) => void;
  onDeleteCategorizationRule: (id: EntityID) => void;
  onExportData: () => void;
  onImportData: (backup: AppData) => void;
  appSettings: AppSettings;
  onSaveAppSettings: (settings: AppSettings) => void;
  budgetLimits: BudgetLimit[];
  onSaveBudgetLimit: (limit: BudgetLimit) => void;
  onDeleteBudgetLimit: (categoryId: EntityID) => void;
  iconLibrary: string[];
  setIconLibrary: (value: string[] | ((val: string[]) => string[])) => void;
  onDeleteIcon: (iconName: string) => void;
  allEntityIcons: { [key: string]: React.FC<any> };
  entityIconMap: { [key: string]: React.FC<any> };
  onSaveCustomIcon: (name: string, svgString: string) => void;
  reserves: Reserve[];
  profiles: Profile[];
  activeProfileId: EntityID;
  onAddProfile: () => void;
  onUpdateProfile: (profile: Profile) => void;
  onDeleteProfile: (id: EntityID) => void;
  onSwitchProfile: (id: EntityID) => void;
  onArchiveTransactions: (years: number) => void;
  onOpenArchiveBrowser: () => void;
}

const ProfileManager: React.FC<{
    profiles: Profile[];
    activeProfileId: EntityID;
    onAdd: () => void;
    onEdit: (profile: Profile) => void;
    onDelete: (id: EntityID) => void;
    onSwitch: (id: EntityID) => void;
}> = ({ profiles, activeProfileId, onAdd, onEdit, onDelete, onSwitch }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Gestion des Profils</h2>
            <ul className="space-y-2 mb-4">
                {profiles.map(p => (
                    <li key={p.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="flex items-center gap-3">
                            <DynamicIcon iconName={p.icon} className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{p.name}</span>
                            {p.id === activeProfileId && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent text-white">Actif</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {p.id !== activeProfileId && (
                                <button onClick={() => onSwitch(p.id)} className="p-1 text-green-600 hover:text-green-800 transition-colors duration-200" title="Activer ce profil">
                                    <ArrowsRightLeftIcon className="w-5 h-5"/>
                                </button>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(p)} className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200" title="Modifier">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                {profiles.length > 1 && (
                                    <button onClick={() => onDelete(p.id)} className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200" title="Supprimer">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            <button onClick={onAdd} className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors">
                <PlusIcon className="w-5 h-5"/> Ajouter un profil
            </button>
        </div>
    );
};


const Switch: React.FC<{ checked: boolean, onChange: (checked: boolean) => void, label: string, description: string }> = ({ checked, onChange, label, description }) => {
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-200">{label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <button
                type="button"
                className={`${checked ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-accent-focus`}
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
            >
                <span
                    aria-hidden="true"
                    className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
        </div>
    );
};

const IconPicker: React.FC<{ 
    selectedIcon: string; 
    onSelectIcon: (iconName: string) => void;
    iconMap: { [key: string]: React.FC<any> };
}> = ({ selectedIcon, onSelectIcon, iconMap }) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const SelectedIconComponent = iconMap[selectedIcon] || TagIcon;
  
    return (
      <div className="relative" ref={pickerRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-md bg-gray-100 dark:bg-gray-700">
          <SelectedIconComponent className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-2 w-72 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 p-2">
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {Object.keys(iconMap).sort().map(iconName => {
                const IconComponent = iconMap[iconName] || TagIcon;
                return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => { onSelectIcon(iconName); setIsOpen(false); }}
                      className={`p-2 rounded-lg flex justify-center items-center ${selectedIcon === iconName ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                      <IconComponent className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  

const CategoryManager: React.FC<{
    title: string;
    categories: Category[];
    type: TransactionType;
    isCategoryUsed: (id: EntityID) => boolean;
    onAdd: (name: string, type: TransactionType, icon: string) => void;
    onUpdate: (id: EntityID, newName: string, icon: string) => void;
    onDelete: (id: EntityID) => void;
    entityIconMap: { [key: string]: React.FC<any> };
}> = ({ title, categories, type, isCategoryUsed, onAdd, onUpdate, onDelete, entityIconMap }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');
    const [editingCategoryId, setEditingCategoryId] = useState<EntityID | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [editingCategoryIcon, setEditingCategoryIcon] = useState('Tag');

    const handleAdd = () => {
        if (newCategoryName.trim()) {
            onAdd(newCategoryName.trim(), type, newCategoryIcon);
            setNewCategoryName('');
            setNewCategoryIcon('Tag');
        }
    };

    const handleEditStart = (category: Category) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
        setEditingCategoryIcon(category.icon || 'Tag');
    };

    const handleEditCancel = () => {
        setEditingCategoryId(null);
        setEditingCategoryName('');
        setEditingCategoryIcon('Tag');
    };

    const handleEditSave = () => {
        if (editingCategoryId && editingCategoryName.trim()) {
            onUpdate(editingCategoryId, editingCategoryName.trim(), editingCategoryIcon);
            handleEditCancel();
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
            <div className="flex gap-2 mb-4">
                <IconPicker selectedIcon={newCategoryIcon} onSelectIcon={setNewCategoryIcon} iconMap={entityIconMap} />
                <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={`Nouvelle catégorie de ${type === TransactionType.INCOME ? 'revenu' : 'dépense'}`}
                    className="flex-grow p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button onClick={handleAdd} className="p-2 bg-accent text-white rounded-md hover:opacity-90 flex items-center transition-opacity duration-200">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            <ul className="space-y-2">
                {categories.map(cat => {
                    const CatIcon = entityIconMap[cat.icon || 'Tag'] || TagIcon;
                    return (
                        <li key={cat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            {editingCategoryId === cat.id ? (
                                <div className="flex-grow flex items-center gap-2">
                                    <IconPicker selectedIcon={editingCategoryIcon} onSelectIcon={setEditingCategoryIcon} iconMap={entityIconMap} />
                                    <input
                                        type="text"
                                        value={editingCategoryName}
                                        onChange={(e) => setEditingCategoryName(e.target.value)}
                                        className="flex-grow p-1 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CatIcon className="w-5 h-5 text-gray-500"/>
                                    <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                                </div>
                            )}
                            {cat.id === MISC_CATEGORY_ID ? (
                                <span className="text-xs text-gray-400 italic">Système</span>
                            ) : (
                                <div className="flex items-center gap-1">
                                    {editingCategoryId === cat.id ? (
                                        <>
                                            <button onClick={handleEditSave} className="p-1 text-green-500 hover:text-green-700 transition-colors duration-200"><CheckIcon className="w-5 h-5"/></button>
                                            <button onClick={handleEditCancel} className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"><XMarkIcon className="w-5 h-5"/></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEditStart(cat)} className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"><PencilIcon className="w-5 h-5"/></button>
                                            <button 
                                                onClick={() => onDelete(cat.id)}
                                                disabled={isCategoryUsed(cat.id)}
                                                className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                                                title={isCategoryUsed(cat.id) ? "Cette catégorie est utilisée et ne peut être supprimée." : "Supprimer"}
                                            >
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const CustomFieldManager: React.FC<{
    customFieldDefinitions: CustomFieldDefinition[];
    onSave: (data: Omit<CustomFieldDefinition, 'id'> & { id?: EntityID }) => void;
    onDelete: (id: EntityID) => void;
    isFieldUsed: (id: EntityID) => boolean;
}> = ({ customFieldDefinitions, onSave, onDelete, isFieldUsed }) => {
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<CustomFieldType>(CustomFieldType.TEXT);
    const [editingFieldId, setEditingFieldId] = useState<EntityID | null>(null);
    const [editingFieldName, setEditingFieldName] = useState('');

    const handleAdd = () => {
        if (newFieldName.trim()) {
            onSave({ name: newFieldName.trim(), type: newFieldType });
            setNewFieldName('');
            setNewFieldType(CustomFieldType.TEXT);
        }
    };
    
    const handleEditStart = (field: CustomFieldDefinition) => {
        setEditingFieldId(field.id);
        setEditingFieldName(field.name);
    };

    const handleEditCancel = () => {
        setEditingFieldId(null);
        setEditingFieldName('');
    };
    
    const handleEditSave = () => {
        if (editingFieldId && editingFieldName.trim()) {
            const field = customFieldDefinitions.find(f => f.id === editingFieldId);
            if(field) {
                onSave({ id: editingFieldId, name: editingFieldName.trim(), type: field.type });
                handleEditCancel();
            }
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Champs personnalisés</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Ajoutez des champs personnalisés à une transaction.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Nom du champ (ex: N° Facture)"
                    className="md:col-span-2 flex-grow p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select 
                    value={newFieldType} 
                    onChange={e => setNewFieldType(e.target.value as CustomFieldType)}
                    className="p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    {Object.values(CustomFieldType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            <button onClick={handleAdd} className="w-full mb-4 px-4 py-2 bg-accent text-white rounded-md hover:opacity-90 flex items-center justify-center gap-2 transition-opacity duration-200">
                <PlusIcon className="w-5 h-5" /> Ajouter le champ
            </button>
            <ul className="space-y-2">
                {customFieldDefinitions.map(field => (
                    <li key={field.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {editingFieldId === field.id ? (
                             <input type="text" value={editingFieldName} onChange={(e) => setEditingFieldName(e.target.value)} className="flex-grow p-1 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500" />
                        ) : (
                            <div>
                                <span className="text-gray-700 dark:text-gray-300">{field.name}</span>
                                <span className="ml-2 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{field.type}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            {editingFieldId === field.id ? (
                                <>
                                    <button onClick={handleEditSave} className="p-1 text-green-500 hover:text-green-700 transition-colors duration-200"><CheckIcon className="w-5 h-5"/></button>
                                    <button onClick={handleEditCancel} className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"><XMarkIcon className="w-5 h-5"/></button>
                                </>
                            ) : (
                                 <>
                                    <button onClick={() => handleEditStart(field)} className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"><PencilIcon className="w-5 h-5"/></button>
                                    <button onClick={() => onDelete(field.id)} disabled={isFieldUsed(field.id)} className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200" title={isFieldUsed(field.id) ? "Ce champ est utilisé et ne peut être supprimé." : "Supprimer"}><TrashIcon className="w-5 h-5"/></button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const CategorizationRuleManager: React.FC<{
    rules: CategorizationRule[];
    categories: Category[];
    onSave: (data: Omit<CategorizationRule, 'id'> & { id?: EntityID }) => void;
    onDelete: (id: EntityID) => void;
}> = ({ rules, categories, onSave, onDelete }) => {
    const [keyword, setKeyword] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const handleAdd = () => {
        if (keyword.trim() && categoryId) {
            onSave({ keyword: keyword.trim(), categoryId });
            setKeyword('');
            setCategoryId('');
        }
    };

    const getCategoryName = (id: EntityID) => categories.find(c => c.id === id)?.name || 'N/A';
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Automatisation</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Si la description d'une transaction contient le mot-clé, la catégorie sera automatiquement assignée.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Mot-clé (ex: Netflix)"
                    className="md:col-span-1 flex-grow p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select 
                    value={categoryId} 
                    onChange={e => setCategoryId(e.target.value)}
                    className="md:col-span-2 p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="">-- Assigner la catégorie --</option>
                    {categories.filter(c => c.id !== MISC_CATEGORY_ID).map(cat => <option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>)}
                </select>
            </div>
            <button onClick={handleAdd} className="w-full mb-4 px-4 py-2 bg-accent text-white rounded-md hover:opacity-90 flex items-center justify-center gap-2 transition-opacity duration-200">
                <PlusIcon className="w-5 h-5" /> Ajouter la règle
            </button>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {rules.map(rule => (
                    <li key={rule.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div>
                            <span className="font-mono bg-gray-100 dark:bg-gray-700 p-1 rounded text-sm">"{rule.keyword}"</span>
                            <span className="mx-2 text-gray-400">&rarr;</span>
                            <span className="text-gray-700 dark:text-gray-300 font-semibold">{getCategoryName(rule.categoryId)}</span>
                        </div>
                        <button onClick={() => onDelete(rule.id)} className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"><TrashIcon className="w-5 h-5"/></button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const CheckboxGroup: React.FC<{
    label: string,
    items: { id: EntityID, name: string }[],
    selectedIds: EntityID[],
    onChange: (id: EntityID, checked: boolean) => void,
}> = ({ label, items, selectedIds, onChange }) => {
    return (
        <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">{label}</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border dark:border-gray-600">
                {items.map(item => (
                    <div key={item.id} className="flex items-center">
                        <input
                            id={`checkbox-${label}-${item.id}`}
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => onChange(item.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent accent-checkbox"
                        />
                        <label htmlFor={`checkbox-${label}-${item.id}`} className="ml-3 block text-sm text-gray-700 dark:text-gray-300">
                            {item.name}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AddIconModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onAdd: (icons: string[]) => void,
    availableIcons: string[],
    allIconsMap: { [key: string]: React.FC<any> }
}> = ({ isOpen, onClose, onAdd, availableIcons, allIconsMap }) => {
    const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const toggleIcon = (iconName: string) => {
        setSelectedIcons(prev => {
            const newSet = new Set(prev);
            if (newSet.has(iconName)) {
                newSet.delete(iconName);
            } else {
                newSet.add(iconName);
            }
            return newSet;
        });
    };
    
    const handleAdd = () => {
        onAdd(Array.from(selectedIcons));
        onClose();
        setSelectedIcons(new Set());
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
                <h2 className="text-2xl font-bold mb-4">Ajouter des icônes</h2>
                <div className="grid grid-cols-8 gap-2 my-4 p-2 rounded-md border dark:border-gray-600 max-h-64 overflow-y-auto">
                    {availableIcons.map(iconName => {
                        const Icon = allIconsMap[iconName];
                        if (!Icon) return null;
                        return (
                            <button key={iconName} type="button" onClick={() => toggleIcon(iconName)} className={`p-2 rounded-lg flex justify-center items-center ${selectedIcons.has(iconName) ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                               <Icon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                            </button>
                        );
                    })}
                </div>
                 <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Annuler</button>
                    <button onClick={handleAdd} disabled={selectedIcons.size === 0} className="px-4 py-2 bg-accent text-white rounded-md disabled:bg-gray-400">Ajouter ({selectedIcons.size})</button>
                </div>
            </div>
        </div>
    )
}

const IconManager: React.FC<{
    iconLibrary: string[],
    onDelete: (iconName: string) => void,
    onAdd: () => void,
    onImport: () => void,
    entityIconMap: { [key: string]: React.FC<any> };
}> = ({ iconLibrary, onDelete, onAdd, onImport, entityIconMap }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Gestion des Icônes</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Pour garder une cohérence visuelle, n'ajoutez que des icônes de style "outline" (traits fins) sur fond transparent, au format SVG.</p>
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1 p-2 rounded-md border dark:border-gray-600 max-h-64 overflow-y-auto">
                {iconLibrary.map(iconName => {
                    const Icon = entityIconMap[iconName] || TagIcon;
                    return (
                        <div key={iconName} className="group relative aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-md p-1">
                            <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <button
                                type="button" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(iconName);
                                }}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                aria-label={`Supprimer l'icône ${iconName}`}
                            >
                                <XMarkIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-2 mt-4">
                 <button onClick={onAdd} className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors">
                    <PlusIcon className="w-5 h-5"/> Ajouter
                </button>
                <button onClick={onImport} className="w-full px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900 flex items-center justify-center gap-2 transition-colors">
                    <ArrowUpTrayIcon className="w-5 h-5"/> Importer une icône
                </button>
            </div>
        </div>
    );
};


export const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const { 
        accounts, mainAccountId, setMainAccountId, categories, transactions, recurringExpenses, manualAssets,
        onAddCategory, onUpdateCategory, onDeleteCategory, customFieldDefinitions, 
        onSaveCustomField, onDeleteCustomField, categorizationRules, onSaveCategorizationRule, onDeleteCategorizationRule,
        onExportData, onImportData, appSettings, onSaveAppSettings, budgetLimits, onSaveBudgetLimit, onDeleteBudgetLimit,
        iconLibrary, setIconLibrary, onDeleteIcon, allEntityIcons, entityIconMap, onSaveCustomIcon,
        profiles, activeProfileId, onAddProfile, onUpdateProfile, onDeleteProfile, onSwitchProfile,
        onArchiveTransactions, onOpenArchiveBrowser, isLoggedIn,
    } = props;

    const [activeTab, setActiveTab] = useState<'general' | 'dashboard' | 'categorization' | 'data' | 'personnalisation'>('general');
    const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAddIconModalOpen, setIsAddIconModalOpen] = useState(false);
    const importIconFileInputRef = useRef<HTMLInputElement>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileToEdit, setProfileToEdit] = useState<Profile | null>(null);
    const [archiveYears, setArchiveYears] = useState(3);

    const isCategoryUsed = (id: EntityID): boolean => {
      return transactions.some(tx => tx.categoryId === id) || recurringExpenses.some(re => re.categoryId === id);
    };

    const isCustomFieldUsed = (id: EntityID): boolean => {
        return transactions.some(t => t.customFields && t.customFields[id] != null);
    };
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const data = JSON.parse(content);
                    if (window.confirm("Êtes-vous sûr de vouloir importer ces données ? Toutes les données actuelles (tous profils confondus) seront écrasées.")) {
                        onImportData(data);
                    }
                } catch (error) {
                    alert("Erreur lors de la lecture ou de l'analyse du fichier.");
                    console.error("Import error:", error);
                }
            };
            reader.readAsText(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleIncludedIncomesChange = (categoryId: EntityID, checked: boolean) => {
        const currentIds = appSettings.savingsCalculationSettings?.includedIncomes || [];
        const newIds = checked ? [...currentIds, categoryId] : currentIds.filter(id => id !== categoryId);
        onSaveAppSettings({
            ...appSettings,
            savingsCalculationSettings: { ...(appSettings.savingsCalculationSettings ?? { includedIncomes: [], excludedExpenses: [] }), includedIncomes: newIds }
        });
    };

    const handleExcludedExpensesChange = (categoryId: EntityID, checked: boolean) => {
        const currentIds = appSettings.savingsCalculationSettings?.excludedExpenses || [];
        const newIds = checked ? [...currentIds, categoryId] : currentIds.filter(id => id !== categoryId);
        onSaveAppSettings({
            ...appSettings,
            savingsCalculationSettings: { ...(appSettings.savingsCalculationSettings ?? { includedIncomes: [], excludedExpenses: [] }), excludedExpenses: newIds }
        });
    };

    const handleForecastAccountsChange = (accountId: EntityID, checked: boolean) => {
        const currentIds = appSettings.forecastChartSettings?.includedAccounts || [];
        const newIds = checked ? [...currentIds, accountId] : currentIds.filter(id => id !== accountId);
        onSaveAppSettings({
            ...appSettings,
            forecastChartSettings: { ...appSettings.forecastChartSettings, includedAccounts: newIds }
        });
    };

    const handleIconDelete = (iconName: string) => {
        if (iconName === 'Tag') {
            alert("L'icône par défaut ne peut pas être supprimée.");
            return;
        }
        const isUsed = accounts.some(a => a.icon === iconName) || categories.some(c => c.icon === iconName) || manualAssets.some(a => a.icon === iconName);
        if (isUsed) {
            alert("Cette icône est actuellement utilisée par un compte, une catégorie ou un actif et ne peut pas être supprimée.");
        } else {
            if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'icône "${iconName}" ?`)) {
                onDeleteIcon(iconName);
            }
        }
    };

    const handleIconFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'image/svg+xml') {
            alert('Le fichier doit être au format SVG.');
            return;
        }
        if (file.size > 10 * 1024) { // 10KB
            alert('Le fichier SVG doit être inférieur à 10 Ko.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const sanitizedName = file.name.replace(/\.svg$/, '').replace(/[^a-zA-Z0-9]/g, '_');
            if (iconLibrary.includes(sanitizedName) || allEntityIcons[sanitizedName]) {
                alert(`Une icône nommée "${sanitizedName}" existe déjà.`);
                return;
            }
            onSaveCustomIcon(sanitizedName, content);
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset for re-upload
    };

    const handleFeatureToggle = (feature: keyof AppSettings['features'], checked: boolean) => {
        onSaveAppSettings({
            ...appSettings,
            features: {
                ...appSettings.features,
                [feature]: checked,
            },
        });
    };
    
    const handleNetWorthSettingsToggle = (setting: keyof AppSettings['netWorthSettings'], checked: boolean) => {
        onSaveAppSettings({
            ...appSettings,
            netWorthSettings: {
                ...(appSettings.netWorthSettings ?? { showLiquidAssets: true, showManualAssets: true, showLiabilities: true }),
                [setting]: checked,
            }
        })
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <ProfileManager
                            profiles={profiles}
                            activeProfileId={activeProfileId}
                            onAdd={() => onAddProfile()}
                            onEdit={(p) => onUpdateProfile(p)}
                            onDelete={onDeleteProfile}
                            onSwitch={onSwitchProfile}
                        />
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Compte Principal</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Sélectionnez le compte utilisé pour la majorité de vos transactions quotidiennes. Il sera pré-sélectionné dans les formulaires.
                            </p>
                            <select
                                value={mainAccountId || ''}
                                onChange={(e) => setMainAccountId(e.target.value || null)}
                                className="w-full max-w-sm p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Fonctionnalités Avancées</h2>
                            <div className="divide-y dark:divide-gray-700">
                                <Switch 
                                    label="Activer la gestion des cartes à débit différé" 
                                    description="Gérez les dépenses et prélèvements de vos cartes à débit différé."
                                    checked={appSettings.enableDeferredDebit ?? false} 
                                    onChange={(checked) => onSaveAppSettings({ ...appSettings, enableDeferredDebit: checked })} 
                                />
                                <Switch 
                                    label="Activer le budget par enveloppes" 
                                    description="Définissez des limites de dépenses mensuelles pour chaque catégorie."
                                    checked={appSettings.useBudgetEnvelopes} onChange={(checked) => onSaveAppSettings({ ...appSettings, useBudgetEnvelopes: checked })} 
                                />
                                <Switch 
                                    label="Activer le suivi par mots-clés (Tags)" 
                                    description="Ajoutez des #tags à vos transactions pour une analyse plus fine (Bêta)."
                                    checked={appSettings.features?.enableTags ?? false} 
                                    onChange={(checked) => handleFeatureToggle('enableTags', checked)} 
                                />
                                <Switch 
                                    label="Afficher les autres actifs (Vue Patrimoine)" 
                                    description="Affiche le bloc des actifs manuels (immobilier, voiture...)."
                                    checked={appSettings.netWorthSettings?.showManualAssets ?? true} 
                                    onChange={(c) => handleNetWorthSettingsToggle('showManualAssets', c)}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'dashboard':
                return (
                    <div className="space-y-6">
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Affichage des Composants</h2>
                             <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Choisissez les éléments à afficher sur votre tableau de bord.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <Switch 
                                    label="Transactions en attente" 
                                    description="Affiche le bloc pour valider les opérations passées."
                                    checked={appSettings.dashboardSettings.showPendingTransactions ?? true} 
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showPendingTransactions: c}})}
                                />
                                <Switch 
                                    label="Bloc: Objectifs d'épargne"
                                    description="Affiche le bloc de suivi de vos objectifs."
                                    checked={appSettings.features?.enableSavingsGoals ?? false}
                                    onChange={(checked) => handleFeatureToggle('enableSavingsGoals', checked)}
                                />
                               <Switch 
                                    label="Aperçu de l'épargne" 
                                    description="Compare votre épargne mensuelle."
                                    checked={appSettings.dashboardSettings.showSavingsInsight}
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showSavingsInsight: c}})}
                                />
                                <Switch 
                                    label="Aperçu des dépenses" 
                                    description="Affiche votre plus gros poste de dépense."
                                    checked={appSettings.dashboardSettings.showExpenseInsight}
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showExpenseInsight: c}})}
                                />
                                 <Switch 
                                    label="Alerte budget" 
                                    description="Vous prévient si vous approchez d'une limite."
                                    checked={appSettings.dashboardSettings.showBudgetInsight}
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showBudgetInsight: c}})}
                                />
                                 <Switch 
                                    label="Échéances à venir" 
                                    description="Affiche les prochaines opérations potentielles."
                                    checked={appSettings.dashboardSettings.showUpcomingInsight}
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showUpcomingInsight: c}})}
                                />
                                <Switch 
                                    label="Graphique: Prévision de Trésorerie" 
                                    description="Affiche la courbe d'évolution de votre solde."
                                    checked={appSettings.dashboardSettings.showForecastChart}
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showForecastChart: c}})}
                                />
                                <Switch 
                                    label="Bloc: Aperçu des Comptes" 
                                    description="Affiche la liste de vos comptes et soldes."
                                    checked={appSettings.dashboardSettings.showAccountsOverview}
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showAccountsOverview: c}})}
                                />
                                <Switch 
                                    label="Graphique: Dépenses du mois" 
                                    description="Affiche le camembert de répartition des dépenses."
                                    checked={appSettings.dashboardSettings.showExpenseChart}
                                    onChange={c => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, showExpenseChart: c}})}
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Paramètres des Composants</h2>
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="upcomingCount" className="block font-medium text-gray-700 dark:text-gray-200">Indicateur "Échéances à venir"</label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Nombre d'échéances à afficher.</p>
                                    <input 
                                        id="upcomingCount" 
                                        type="number" 
                                        value={appSettings.dashboardSettings.upcomingTransactionsCount || 3}
                                        onChange={e => onSaveAppSettings({...appSettings, dashboardSettings: {...appSettings.dashboardSettings, upcomingTransactionsCount: parseInt(e.target.value, 10) || 3}})}
                                        className="w-full max-w-xs p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        min="1"
                                        max="10"
                                    />
                                </div>

                                <div className="border-t dark:border-gray-700 pt-6">
                                    <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-4">Calcul de l'Épargne Personnalisé</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Affinez comment votre capacité d'épargne est calculée. C'est utile pour exclure des dépenses qui sont en réalité de l'épargne (ex: virement vers Livret A).
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <CheckboxGroup
                                            label="Revenus à inclure"
                                            items={incomeCategories}
                                            selectedIds={appSettings.savingsCalculationSettings?.includedIncomes || []}
                                            onChange={handleIncludedIncomesChange}
                                        />
                                        <CheckboxGroup
                                            label="Dépenses à exclure"
                                            items={expenseCategories}
                                            selectedIds={appSettings.savingsCalculationSettings?.excludedExpenses || []}
                                            onChange={handleExcludedExpensesChange}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Si aucun revenu n'est sélectionné, tous seront inclus.</p>
                                </div>

                                <div className="border-t dark:border-gray-700 pt-6">
                                    <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-4">Graphique "Prévision de Trésorerie"</h3>
                                    <CheckboxGroup
                                        label="Comptes à inclure dans le calcul du solde total"
                                        items={accounts}
                                        selectedIds={appSettings.forecastChartSettings?.includedAccounts || []}
                                        onChange={handleForecastAccountsChange}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Si aucun compte n'est sélectionné, tous seront inclus.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'categorization':
                return (
                     <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                             <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Gestion des catégories</h2>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <CategoryManager
                                    title="Revenus"
                                    categories={incomeCategories}
                                    type={TransactionType.INCOME}
                                    isCategoryUsed={isCategoryUsed}
                                    onAdd={onAddCategory}
                                    onUpdate={onUpdateCategory}
                                    onDelete={onDeleteCategory}
                                    entityIconMap={entityIconMap}
                                />
                                <CategoryManager
                                    title="Dépenses"
                                    categories={expenseCategories}
                                    type={TransactionType.EXPENSE}
                                    isCategoryUsed={isCategoryUsed}
                                    onAdd={onAddCategory}
                                    onUpdate={onUpdateCategory}
                                    onDelete={onDeleteCategory}
                                    entityIconMap={entityIconMap}
                                />
                            </div>
                        </div>
                        <CategorizationRuleManager 
                            rules={categorizationRules}
                            categories={categories}
                            onSave={onSaveCategorizationRule}
                            onDelete={onDeleteCategorizationRule}
                        />
                    </div>
                );
            case 'data':
                return (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Gestion des données</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Sauvegardez vos données ou restaurez une sauvegarde. L'import écrasera toutes les données actuelles.
                            </p>
                            <div className="flex gap-4">
                                <button onClick={onExportData} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:opacity-90 transition-opacity duration-200">
                                    <ArrowDownTrayIcon className="w-5 h-5" /> Exporter les données
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200">
                                    <ArrowUpTrayIcon className="w-5 h-5" /> Importer les données
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Archivage des Données</h2>
                             {isLoggedIn ? (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Pour améliorer les performances, vous pouvez archiver les anciennes transactions. Elles seront sauvegardées sur votre Google Drive et retirées de l'application active.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex-grow">
                                            <label htmlFor="archive-period" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Archiver les transactions de plus de :</label>
                                            <select id="archive-period" value={archiveYears} onChange={(e) => setArchiveYears(Number(e.target.value))} className="mt-1 w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                                <option value={3}>3 ans</option>
                                                <option value={4}>4 ans</option>
                                                <option value={5}>5 ans</option>
                                            </select>
                                        </div>
                                        <button onClick={() => onArchiveTransactions(archiveYears)} className="w-full sm:w-auto self-end flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                                            <ArchiveBoxIcon className="w-5 h-5" /> Archiver
                                        </button>
                                    </div>
                                    <div className="mt-4">
                                        <button onClick={onOpenArchiveBrowser} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                            Consulter une archive
                                        </button>
                                    </div>
                                </>
                             ) : (
                                 <p className="text-sm text-gray-500 dark:text-gray-400">Veuillez vous connecter à Google Drive pour activer la fonction d'archivage.</p>
                             )}
                        </div>
                        
                        <CloudSyncManager {...props} />
                    </div>
                );
            case 'personnalisation':
                return (
                    <div className="space-y-6">
                       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Profil</h2>
                             <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Votre prénom</label>
                                <input
                                    id="firstName"
                                    type="text"
                                    placeholder="Pour un accueil personnalisé"
                                    value={appSettings.firstName || ''}
                                    onChange={e => onSaveAppSettings({...appSettings, firstName: e.target.value})}
                                    className="mt-1 w-full max-w-sm p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                        <input type="file" ref={importIconFileInputRef} onChange={handleIconFileImport} accept="image/svg+xml" className="hidden" />
                        <IconManager
                            iconLibrary={iconLibrary}
                            onDelete={handleIconDelete}
                            onAdd={() => setIsAddIconModalOpen(true)}
                            onImport={() => importIconFileInputRef.current?.click()}
                            entityIconMap={entityIconMap}
                        />
                         <AddIconModal
                            isOpen={isAddIconModalOpen}
                            onClose={() => setIsAddIconModalOpen(false)}
                            onAdd={(icons) => setIconLibrary(prev => [...new Set([...prev, ...icons])].sort())}
                            availableIcons={Object.keys(allEntityIcons).filter(name => !iconLibrary.includes(name)).sort()}
                            allIconsMap={allEntityIcons}
                        />
                        <CustomFieldManager
                            customFieldDefinitions={customFieldDefinitions}
                            onSave={onSaveCustomField}
                            onDelete={onDeleteCustomField}
                            isFieldUsed={isCustomFieldUsed}
                        />
                    </div>
                );
        }
    };
    
    const tabs = [
        { id: 'general', label: 'Général' },
        { id: 'dashboard', label: 'Tableau de Bord' },
        { id: 'categorization', label: 'Catégorisation' },
        { id: 'data', label: 'Données' },
        { id: 'personnalisation', label: 'Personnalisation' },
    ];

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Paramètres</h1>
            <div className="flex justify-center mb-6">
                <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-xl shadow-inner max-w-full overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {renderTabContent()}
        </div>
    );
};
