import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { Icon } from './Icon';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationContainer: React.FC<{ notifications: Notification[]; onDismiss: (id: number) => void; }> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 w-full max-w-sm z-[9999] space-y-3">
      {notifications.map(notification => (
        <NotificationToast key={notification.id} notification={notification} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification = { ...notification, id: Date.now() };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 7000); // Auto-dismiss after 7 seconds
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
    </NotificationContext.Provider>
  );
};

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: number) => void;
}

const ICONS: Record<NotificationType, { name: 'check' | 'close' | 'lightbulb'; color: string }> = {
    success: { name: 'check', color: 'text-green-400' },
    error: { name: 'close', color: 'text-red-400' },
    info: { name: 'lightbulb', color: 'text-sky-400' },
};

const BORDER_COLORS: Record<NotificationType, string> = {
    success: 'border-green-500/50',
    error: 'border-red-500/50',
    info: 'border-sky-500/50',
};


const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  const icon = ICONS[notification.type];
  const borderColor = BORDER_COLORS[notification.type];

  return (
    <div className={`relative w-full bg-[var(--bg-secondary)] border ${borderColor} rounded-lg shadow-2xl p-4 flex items-start gap-4 animate-fade-in`}>
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--bg-tertiary)] ${icon.color}`}>
            <Icon name={icon.name} className="w-4 h-4" />
        </div>
        <div className="flex-1">
            <h4 className="font-bold text-sm text-[var(--text-primary)]">{notification.title}</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{notification.message}</p>
        </div>
        <button
            onClick={() => onDismiss(notification.id)}
            className="p-1 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] absolute top-2 right-2"
            title="Dismiss notification"
        >
            <Icon name="close" className="w-4 h-4" />
        </button>
    </div>
  );
};