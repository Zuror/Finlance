import React, { useState, useEffect } from 'react';
import { CheckBadgeIcon, ExclamationTriangleIcon, XMarkIcon } from './Icons';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationAction {
    label: string;
    onClick: () => void;
}

export interface NotificationProps {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    action?: NotificationAction;
    onDismiss: (id: string) => void;
}

const icons: Record<NotificationType, React.FC<{className: string}>> = {
    success: CheckBadgeIcon,
    error: ExclamationTriangleIcon,
    info: CheckBadgeIcon,
};

const colors: Record<NotificationType, { bg: string, text: string, progress: string }> = {
    success: { bg: 'bg-green-50 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', progress: 'bg-green-400' },
    error: { bg: 'bg-red-50 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', progress: 'bg-red-400' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', progress: 'bg-blue-400' },
};


export const NotificationToast: React.FC<NotificationProps> = ({ id, type, title, message, duration = 5000, action, onDismiss }) => {
    const [exiting, setExiting] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (duration > 0) {
            const interval = setInterval(() => {
                setProgress(prev => Math.max(0, prev - (100 / (duration / 100))));
            }, 100);

            const timeout = setTimeout(() => {
                handleDismiss();
            }, duration);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [duration]);

    const handleDismiss = () => {
        setExiting(true);
        setTimeout(() => onDismiss(id), 500); // Wait for animation to finish
    };
    
    const Icon = icons[type];
    const colorScheme = colors[type];

    return (
        <div className={`w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 mb-4 ${colorScheme.bg} ${exiting ? 'animate-fade-out' : 'animate-slide-in-right'}`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <Icon className={`h-6 w-6 ${colorScheme.text}`} />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className={`text-sm font-bold ${colorScheme.text}`}>{title}</p>
                        {message && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>}
                        {action && (
                             <div className="mt-3 flex">
                                <button
                                    onClick={() => { action.onClick(); handleDismiss(); }}
                                    className="rounded-md bg-white/0 px-2 py-1.5 text-sm font-medium text-accent hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-accent"
                                >
                                    {action.label}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="ml-4 flex flex-shrink-0">
                        <button
                            type="button"
                            className="inline-flex rounded-md p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                            onClick={handleDismiss}
                        >
                            <span className="sr-only">Fermer</span>
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
            <div className={`h-1 w-full ${colorScheme.progress} origin-left`} style={{ transform: `scaleX(${progress / 100})`, transition: 'transform 100ms linear' }} />
        </div>
    );
};
