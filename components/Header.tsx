
import React, { useState } from 'react';
import { View, AppSettings, Profile, EntityID, TransactionTemplate } from '../types';
import { PlusIcon, BanknotesIcon, ChartPieIcon, AdjustmentsHorizontalIcon, BeakerIcon, HomeIcon, QuestionMarkCircleIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ChevronDownIcon, CloudIcon, CheckIcon, DynamicIcon, ScaleIcon, BookmarkIcon } from './Icons';

interface HeaderProps {
    activeView: View;
    onNavigate: (view: View) => void;
    onAction: (action: string, data?: any) => void;
    isSimulationMode: boolean;
    appSettings: AppSettings;
    onOpenGuide: () => void;
    onExport: () => void;
    onImport: () => void;
    // Google Sync props
    isLoggedIn: boolean;
    user: any;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'no_client_id';
    handleConnect: () => void;
    handleDisconnect: () => void;
    handleSync: () => void;
    // Profile props
    profiles: Profile[];
    activeProfile: Profile;
    onSwitchProfile: (profileId: EntityID) => void;
}

const navItems: { view: View; label: string; icon: React.FC<any>, feature?: keyof AppSettings['features'] }[] = [
    { view: 'DASHBOARD', label: 'Tableau de Bord', icon: HomeIcon },
    { view: 'TRANSACTIONS', label: 'Transactions', icon: BanknotesIcon },
    { view: 'PLANNING', label: 'Planification', icon: ChartPieIcon },
    { view: 'PATRIMOINE', label: 'Patrimoine', icon: ScaleIcon },
    { view: 'SETTINGS', label: 'Paramètres', icon: AdjustmentsHorizontalIcon },
];

export const Header: React.FC<HeaderProps> = (props) => {
    const { 
        activeView, onNavigate, onAction, isSimulationMode, appSettings, onOpenGuide, onExport, onImport,
        isLoggedIn, user, syncStatus, handleConnect, handleDisconnect, handleSync,
        profiles, activeProfile, onSwitchProfile
    } = props;
    
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const renderActionMenu = () => {
        const baseItemClass = "w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600";
        const menuItems = [];

        switch (activeView) {
            case 'DASHBOARD':
            case 'PLANNING':
                 menuItems.push(
                    <button key="add_expense" onClick={() => {onAction('add_expense'); setIsAddMenuOpen(false);}} className={baseItemClass}>Dépense</button>,
                    <button key="add_income" onClick={() => {onAction('add_income'); setIsAddMenuOpen(false);}} className={baseItemClass}>Revenu</button>,
                    <button key="add_transfer" onClick={() => {onAction('add_transfer'); setIsAddMenuOpen(false);}} className={baseItemClass}>Virement</button>
                );
                break;
            case 'TRANSACTIONS':
                menuItems.push(
                    <button key="add_expense" onClick={() => {onAction('add_expense'); setIsAddMenuOpen(false);}} className={baseItemClass}>Dépense</button>,
                    <button key="add_income" onClick={() => {onAction('add_income'); setIsAddMenuOpen(false);}} className={baseItemClass}>Revenu</button>,
                    <button key="add_transfer" onClick={() => {onAction('add_transfer'); setIsAddMenuOpen(false);}} className={baseItemClass}>Virement</button>,
                    <div key="divider" className="border-t my-1 dark:border-gray-600"></div>,
                    <button key="import_file" onClick={() => {onAction('import_file'); setIsAddMenuOpen(false);}} className={baseItemClass}>Importer un fichier</button>
                );
                break;
            case 'PATRIMOINE':
                 menuItems.push(
                    <button key="add_account" onClick={() => {onAction('add_account'); setIsAddMenuOpen(false);}} className={baseItemClass}>Ajouter un compte</button>,
                    <button key="add_loan" onClick={() => {onAction('add_loan'); setIsAddMenuOpen(false);}} className={baseItemClass}>Ajouter un emprunt</button>,
                    <button key="add_manual_asset" onClick={() => {onAction('add_manual_asset'); setIsAddMenuOpen(false);}} className={baseItemClass}>Ajouter un actif</button>,
                    <div key="divider" className="border-t my-1 dark:border-gray-600"></div>,
                    <button key="add_transfer" onClick={() => {onAction('add_transfer'); setIsAddMenuOpen(false);}} className={baseItemClass}>Effectuer un virement</button>
                 );
                 break;
        }

        const templates = activeProfile.transactionTemplates;
        if (templates && templates.length > 0 && ['DASHBOARD', 'PLANNING', 'TRANSACTIONS'].includes(activeView)) {
            menuItems.push(<div key="template_divider" className="border-t my-1 dark:border-gray-600"></div>);
            menuItems.push(<div key="template_header" className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Modèles</div>);
            templates.forEach(template => {
                menuItems.push(
                    <button key={template.id} onClick={() => { onAction('use_template', template); setIsAddMenuOpen(false); }} className={`${baseItemClass} flex items-center gap-2`}>
                        <BookmarkIcon className="w-4 h-4 text-gray-400" />
                        {template.name}
                    </button>
                );
            });
        }
        
        return menuItems.length > 0 ? menuItems : null;
    };

    const getSyncButton = () => {
        switch (syncStatus) {
            case 'syncing': return <button disabled className="w-full px-4 py-2 bg-accent text-white rounded-md opacity-75">Synchronisation...</button>;
            case 'success': return <button disabled className="w-full px-4 py-2 bg-green-600 text-white rounded-md">À jour</button>;
            case 'error': return <button onClick={handleSync} className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Réessayer</button>;
            default: return <button onClick={handleSync} className="w-full px-4 py-2 bg-accent text-white rounded-md hover:opacity-90">Synchroniser</button>;
        }
    };

    const menuItems = renderActionMenu();
    const visibleNavItems = navItems.filter(item => !item.feature || appSettings.features?.[item.feature]);

    return (
        <header className="hidden md:flex fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-50 h-16 items-center justify-between px-4 border-b dark:border-gray-700">
            {/* Desktop Navigation */}
            <nav className="flex items-center gap-2 h-full">
                {visibleNavItems.map(({ view, label, icon: Icon }) => (
                    <button 
                        key={view} 
                        onClick={() => onNavigate(view)}
                        className={`h-full px-3 inline-flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${activeView === view ? 'border-accent text-accent' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-500'}`}
                    >
                        <Icon className="w-5 h-5" />
                        {label}
                    </button>
                ))}
            </nav>
            
            <div className="flex items-center gap-3">
                {menuItems && (
                     <div className="relative">
                        <button 
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            onBlur={() => setTimeout(() => setIsAddMenuOpen(false), 200)}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow hover:opacity-90 transition-opacity"
                        >
                            <PlusIcon className="w-5 h-5"/>
                            <span className="hidden lg:inline">Ajouter</span>
                        </button>
                        {isAddMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                                <div className="py-1">{menuItems}</div>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="relative">
                    <button 
                        onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                        onBlur={() => setTimeout(() => setIsDataMenuOpen(false), 200)}
                        title="Données & Synchronisation"
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <CloudIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    {isDataMenuOpen && (
                        <div className="absolute right-0 mt-2 w-72 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 p-4">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Données & Synchronisation</h3>
                            {isLoggedIn ? (
                                <div className="space-y-3">
                                    <div className="text-xs">Connecté en tant que <span className="font-medium">{user?.email}</span></div>
                                    {getSyncButton()}
                                    <button onClick={handleDisconnect} className="w-full text-center text-xs text-red-500 hover:underline">Se déconnecter</button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Connectez-vous pour sauvegarder vos données sur Google Drive.</p>
                                    <button onClick={handleConnect} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <CloudIcon className="w-5 h-5 text-blue-500"/> Se connecter
                                    </button>
                                </div>
                            )}
                            <div className="border-t my-3 dark:border-gray-600"></div>
                            <div className="space-y-2">
                                <button onClick={onExport} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <ArrowDownTrayIcon className="w-5 h-5"/> Exporter une sauvegarde
                                </button>
                                <button onClick={onImport} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <ArrowUpTrayIcon className="w-5 h-5"/> Importer une sauvegarde
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} onBlur={() => setTimeout(() => setIsProfileMenuOpen(false), 200)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <DynamicIcon iconName={activeProfile.icon} className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                        <span className="font-semibold hidden lg:inline">{activeProfile.name}</span>
                        <ChevronDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-300"/>
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                           <div className="py-1">
                                <div className="py-1 border-b dark:border-gray-600">
                                    {profiles.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => { onSwitchProfile(p.id); setIsProfileMenuOpen(false); }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                                        >
                                            <span className="flex items-center gap-2">
                                                <DynamicIcon iconName={p.icon} className="w-5 h-5" />
                                                {p.name}
                                            </span>
                                            {p.id === activeProfile.id && <CheckIcon className="w-5 h-5 text-accent"/>}
                                        </button>
                                    ))}
                                </div>
                                <div className="py-1">
                                    <button onClick={() => { onNavigate('SETTINGS'); setIsProfileMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                        <AdjustmentsHorizontalIcon className="w-5 h-5" /> Gérer les profils
                                    </button>
                                    <button onClick={() => { onOpenGuide(); setIsProfileMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                        <QuestionMarkCircleIcon className="w-5 h-5" /> Guide
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
