
import React from 'react';
import { View, AppSettings, Profile } from '../types';
import { BanknotesIcon, CreditCardIcon, ChartPieIcon, AdjustmentsHorizontalIcon, BuildingLibraryIcon, HomeIcon, TrendingUpIcon } from './Icons';

interface BottomNavBarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  appSettings: AppSettings;
  profiles: Profile[];
  activeProfile: Profile;
  onSwitchProfile: (profileId: string) => void;
}

const navItems: { view: View; label: string; icon: React.FC<any>, feature?: keyof AppSettings['features'] }[] = [
    { view: 'DASHBOARD', label: 'Accueil', icon: HomeIcon },
    { view: 'TRANSACTIONS', label: 'Transactions', icon: BanknotesIcon },
    { view: 'PLANNING', label: 'Planification', icon: ChartPieIcon },
    { view: 'PATRIMOINE', label: 'Patrimoine', icon: TrendingUpIcon },
    { view: 'SETTINGS', label: 'Paramètres', icon: AdjustmentsHorizontalIcon },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, onNavigate, appSettings, profiles, activeProfile, onSwitchProfile }) => {
  const visibleNavItems = navItems.filter(item => !item.feature || appSettings.features?.[item.feature]);
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg-top z-50 border-t dark:border-gray-700">
      <div className="flex justify-around">
        {visibleNavItems.map(({ view, label, icon: Icon }) => (
          <button 
            key={view} 
            onClick={() => onNavigate(view)}
            className={`flex flex-col items-center justify-center p-2 w-full transition-colors duration-200 ${activeView === view ? 'text-accent' : 'text-gray-500 dark:text-gray-400 hover:text-accent'}`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs mt-1">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
