
import React, { useState, useEffect, useRef } from 'react';
import { Profile, EntityID } from '../types';
import { DynamicIcon, TagIcon } from './Icons';

const ACCENT_COLORS = [
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Émeraude', value: '#10b981' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Rose', value: '#ec4899' },
    { name: 'Violet', value: '#8b5cf6' },
];

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
                <SelectedIconComponent className="w-6 h-6 text-gray-700 dark:text-gray-200" />
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


interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profileData: { id?: EntityID; name: string; icon: string; accentColor: string; }) => void;
    profileToEdit?: Profile | null;
    entityIconMap: { [key: string]: React.FC<any> };
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, profileToEdit, entityIconMap }) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('UserCircle');
    const [accentColor, setAccentColor] = useState('#3b82f6');

    useEffect(() => {
        if (isOpen) {
            if (profileToEdit) {
                setName(profileToEdit.name);
                setIcon(profileToEdit.icon);
                setAccentColor(profileToEdit.accentColor || '#3b82f6');
            } else {
                setName('');
                setIcon('UserCircle');
                setAccentColor('#3b82f6');
            }
        }
    }, [profileToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: profileToEdit?.id,
            name,
            icon,
            accentColor,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-backdrop">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    {profileToEdit ? 'Modifier le profil' : 'Nouveau profil'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du profil</label>
                            <input
                                id="profileName"
                                type="text"
                                placeholder="Ex: Commun, Perso..."
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icône</label>
                            <div className="mt-1">
                                <IconPicker selectedIcon={icon} onSelectIcon={setIcon} iconMap={entityIconMap} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Couleur d'accentuation</label>
                            <div className="flex gap-3 mt-2">
                                {ACCENT_COLORS.map(color => (
                                    <button key={color.value} type="button" onClick={() => setAccentColor(color.value)} className={`w-8 h-8 rounded-full ${accentColor === color.value ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-blue-500' : ''}`} style={{ backgroundColor: color.value }} title={color.name} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Annuler</button>
                        <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
