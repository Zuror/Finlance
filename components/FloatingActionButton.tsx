
import React, { useState } from 'react';
import { Profile, View } from '../types';
import { PlusIcon, XMarkIcon, BookmarkIcon } from './Icons';

interface FloatingActionButtonProps {
    activeView: View;
    onAction: (action: string, data?: any) => void;
    isSimulationMode: boolean;
    activeProfile: Profile;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ activeView, onAction, activeProfile }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleActionClick = (action: string, data?: any) => {
        onAction(action, data);
        setIsOpen(false);
    };

    const renderActionMenu = () => {
        const baseItemClass = "w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600";
        const menuItems = [];

        switch (activeView) {
            case 'DASHBOARD':
                menuItems.push(
                    <button key="add_expense" onClick={() => handleActionClick('add_expense')} className={baseItemClass}>Dépense</button>,
                    <button key="add_income" onClick={() => handleActionClick('add_income')} className={baseItemClass}>Revenu</button>
                );
                break;
            case 'TRANSACTIONS':
                menuItems.push(
                    <button key="add_expense" onClick={() => handleActionClick('add_expense')} className={baseItemClass}>Dépense</button>,
                    <button key="add_income" onClick={() => handleActionClick('add_income')} className={baseItemClass}>Revenu</button>,
                    <button key="add_transfer" onClick={() => handleActionClick('add_transfer')} className={baseItemClass}>Virement</button>,
                    <div key="divider" className="border-t my-1 dark:border-gray-600"></div>,
                    <button key="import_file" onClick={() => handleActionClick('import_file')} className={baseItemClass}>Importer un fichier</button>
                );
                break;
            case 'PATRIMOINE':
                menuItems.push(
                    <button key="add_account" onClick={() => handleActionClick('add_account')} className={baseItemClass}>Ajouter un compte</button>,
                    <button key="add_loan" onClick={() => handleActionClick('add_loan')} className={baseItemClass}>Ajouter un emprunt</button>,
                    <button key="add_manual_asset" onClick={() => handleActionClick('add_manual_asset')} className={baseItemClass}>Ajouter un actif</button>
                );
                break;
            case 'PLANNING':
                 menuItems.push(
                    <button key="add_expense" onClick={() => handleActionClick('add_expense')} className={baseItemClass}>Dépense</button>,
                    <button key="add_income" onClick={() => handleActionClick('add_income')} className={baseItemClass}>Revenu</button>,
                    <button key="add_transfer" onClick={() => handleActionClick('add_transfer')} className={baseItemClass}>Virement</button>,
                    <div key="divider" className="border-t my-1 dark:border-gray-600"></div>,
                    <button key="export_budget" onClick={() => handleActionClick('export_budget')} className={baseItemClass}>Exporter</button>
                );
                 break;
        }

        const templates = activeProfile.transactionTemplates;
        if (templates && templates.length > 0 && ['DASHBOARD', 'PLANNING', 'TRANSACTIONS'].includes(activeView)) {
            menuItems.push(<div key="template_divider" className="border-t my-1 dark:border-gray-600"></div>);
            menuItems.push(<div key="template_header" className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Modèles</div>);
            templates.forEach(template => {
                menuItems.push(
                    <button key={template.id} onClick={() => handleActionClick('use_template', template)} className={`${baseItemClass} flex items-center gap-2`}>
                        <BookmarkIcon className="w-4 h-4 text-gray-400" />
                        {template.name}
                    </button>
                );
            });
        }

        return menuItems.length > 0 ? menuItems : null;
    };

    const menuItems = renderActionMenu();

    if (!menuItems) {
        return null;
    }

    return (
        <div className="md:hidden fixed bottom-20 right-4 z-50">
            {isOpen && (
                 <div className="absolute right-0 bottom-14 mb-2 w-56 origin-bottom-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1 flex flex-col">{menuItems}</div>
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-transform transform hover:scale-105"
                aria-label="Ajouter"
            >
                {isOpen ? <XMarkIcon className="w-7 h-7" /> : <PlusIcon className="w-7 h-7" />}
            </button>
        </div>
    );
};
