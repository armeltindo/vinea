import { createContext, useContext } from 'react';
import { Notification } from '../types';

interface NotificationsContextType {
  addNotification: (notif: Notification) => void;
  refreshNotifications: () => void;
}

export const NotificationsContext = createContext<NotificationsContextType>({
  addNotification: () => {},
  refreshNotifications: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);
