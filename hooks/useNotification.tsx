import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationToast, NotificationType, NotificationAction } from '../components/Notification';

interface NotificationData {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    action?: NotificationAction;
}

interface NotificationOptions {
    type?: NotificationType;
    duration?: number;
    title?: string;
    action?: NotificationAction;
}

interface NotificationContextType {
    show: (message: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const show = useCallback((message: string, options: NotificationOptions = {}) => {
        const { type = 'info', duration = 5000, title, action } = options;
        const id = `${Date.now()}-${Math.random()}`;
        const notification: NotificationData = {
            id,
            type,
            title: title || (type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Information'),
            message,
            duration,
            action,
        };
        setNotifications(prev => [...prev, notification]);
    }, []);

    return (
        <NotificationContext.Provider value={{ show }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-2">
                {notifications.map(n => (
                    <NotificationToast
                        key={n.id}
                        id={n.id}
                        type={n.type}
                        title={n.title}
                        message={n.message}
                        duration={n.duration}
                        action={n.action}
                        onDismiss={removeNotification}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
