import React, { useState, useEffect } from 'react';
import { ManualAsset, EntityID } from '../types';
import { DynamicIcon, TagIcon } from './Icons';

interface ManualAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: Omit<ManualAsset, 'id'> & { id?: EntityID }) => void;
  assetToEdit?: ManualAsset | null;
  entityIconMap: { [key: string]: React.FC<any> };
}

export const ManualAssetModal: React.FC<ManualAssetModalProps> = ({ isOpen, onClose, onSave, assetToEdit, entityIconMap }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Home');

  useEffect(() => {
    if (assetToEdit) {
      setName(assetToEdit.name);
      setValue(String(assetToEdit.value));
      setSelectedIcon(assetToEdit.icon || 'Home');
    } else {
      setName('');
      setValue('');
      setSelectedIcon('Home');
    }
  }, [assetToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && value) {
      onSave({
        id: assetToEdit?.id,
        name,
        value: parseFloat(value) || 0,
        icon: selectedIcon,
      });
      onClose();
    }
  };

  if (!isOpen) return null;
  
  const IconComponent = entityIconMap[selectedIcon] || TagIcon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          {assetToEdit ? "Modifier l'actif" : 'Ajouter un actif'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="assetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom de l'actif</label>
              <input
                id="assetName"
                type="text"
                placeholder="Ex: Résidence principale"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="assetValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valeur estimée</label>
              <input
                id="assetValue"
                type="number"
                placeholder="300000"
                value={value}
                onChange={e => setValue(e.target.value)}
                required
                step="0.01"
                className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icône</label>
                 <div className="flex items-center gap-2 mt-1">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <IconComponent className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </div>
                    <select value={selectedIcon} onChange={e => setSelectedIcon(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        {Object.keys(entityIconMap).sort().map(iconName => (
                            <option key={iconName} value={iconName}>{iconName}</option>
                        ))}
                    </select>
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