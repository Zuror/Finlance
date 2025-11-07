
import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArchiveBoxIcon, ArrowPathIcon } from './Icons';

interface ArchiveBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    listArchives: () => Promise<{ id: string, name: string }[]>;
    onSelectArchive: (fileId: string) => void;
}

export const ArchiveBrowserModal: React.FC<ArchiveBrowserModalProps> = ({ isOpen, onClose, listArchives, onSelectArchive }) => {
    const [archives, setArchives] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchArchives = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const files = await listArchives();
            setArchives(files);
        } catch (e: any) {
            setError("Erreur lors de la récupération des archives. Assurez-vous d'être connecté à Google Drive.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchArchives();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 modal-backdrop" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col modal-content">
                <header className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Consulter une archive</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fermer">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Chargement des archives...</span>
                        </div>
                    ) : error ? (
                        <p className="text-center text-red-500">{error}</p>
                    ) : archives.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400">Aucune archive trouvée sur votre Google Drive.</p>
                    ) : (
                        <ul className="space-y-2">
                            {archives.map(archive => (
                                <li key={archive.id}>
                                    <button
                                        onClick={() => onSelectArchive(archive.id)}
                                        className="w-full text-left flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <ArchiveBoxIcon className="w-6 h-6 text-gray-500 flex-shrink-0" />
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{archive.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
