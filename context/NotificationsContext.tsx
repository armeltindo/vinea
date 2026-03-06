import { createContext, useContext } from 'react';
import { Notification } from '../types';

interface NotificationsContextType {
  addNotification: (notif: Notification) => void;
}

export const NotificationsContext = createContext<NotificationsContextType>({
  addNotification: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);
