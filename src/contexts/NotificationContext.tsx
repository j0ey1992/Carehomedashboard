import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert, Snackbar, AlertTitle, useTheme } from '@mui/material';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  Timestamp,
  writeBatch,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  notify: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  notify: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  dismiss: async () => {},
  clearAll: async () => {}
});

export const useNotifications = () => useContext(NotificationContext);

interface Props {
  children: React.ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'right' | 'center';
  };
}

// Helper function to get timestamp value in milliseconds
const getTimestampMs = (timestamp: Date | Timestamp): number => {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  return timestamp.toMillis();
};

export const NotificationProvider: React.FC<Props> = ({
  children,
  maxNotifications = 5,
  defaultDuration = 5000,
  position = { vertical: 'bottom', horizontal: 'right' }
}) => {
  const theme = useTheme();
  const { currentUser, userData, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [currentSnackbar, setCurrentSnackbar] = useState<Notification | null>(null);

  // Load notifications from Firebase
  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      let notificationData: Notification[] = [];

      if (isAdmin) {
        // Admin can see all notifications
        const q = query(
          collection(db, 'notifications'),
          where('deleted', '==', false),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        notificationData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
      } else if (userData?.role === 'manager' && userData.sites) {
        // Manager can see notifications for their sites and personal notifications
        const siteQuery = query(
          collection(db, 'notifications'),
          where('deleted', '==', false),
          where('site', 'in', userData.sites),
          orderBy('timestamp', 'desc')
        );
        const personalQuery = query(
          collection(db, 'notifications'),
          where('deleted', '==', false),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );

        const [siteSnapshot, personalSnapshot] = await Promise.all([
          getDocs(siteQuery),
          getDocs(personalQuery)
        ]);

        const siteNotifications = siteSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];

        const personalNotifications = personalSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];

        // Combine and deduplicate notifications
        const notificationMap = new Map();
        [...siteNotifications, ...personalNotifications].forEach(notification => {
          notificationMap.set(notification.id, notification);
        });
        notificationData = Array.from(notificationMap.values());
        notificationData.sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp));
      } else {
        // Staff can only see notifications for their site and personal notifications
        const siteQuery = query(
          collection(db, 'notifications'),
          where('deleted', '==', false),
          where('site', '==', userData?.site || ''),
          orderBy('timestamp', 'desc')
        );
        const personalQuery = query(
          collection(db, 'notifications'),
          where('deleted', '==', false),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );

        const [siteSnapshot, personalSnapshot] = await Promise.all([
          getDocs(siteQuery),
          getDocs(personalQuery)
        ]);

        const siteNotifications = siteSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];

        const personalNotifications = personalSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];

        // Combine and deduplicate notifications
        const notificationMap = new Map();
        [...siteNotifications, ...personalNotifications].forEach(notification => {
          notificationMap.set(notification.id, notification);
        });
        notificationData = Array.from(notificationMap.values());
        notificationData.sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp));
      }

      setNotifications(notificationData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [currentUser, userData, isAdmin]);

  // Create new notification
  const notify = useCallback(async (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => {
    if (!currentUser) return;

    const notificationsRef = collection(db, 'notifications');
    const newNotification: Omit<Notification, 'id'> = {
      ...notification,
      userId: currentUser.uid,
      timestamp: Timestamp.now(),
      read: false,
      site: userData?.site || '',
      deleted: false
    };

    const docRef = await addDoc(notificationsRef, newNotification);
    const createdNotification = { ...newNotification, id: docRef.id } as Notification;

    setNotifications(prev => [createdNotification, ...prev]);
    
    // Show snackbar for new notification
    setCurrentSnackbar(createdNotification);
    setSnackbarOpen(true);
  }, [currentUser, userData]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser) return;

    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });

    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  }, [currentUser]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;

    const batch = writeBatch(db);
    notifications.forEach(notification => {
      if (!notification.read) {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      }
    });
    await batch.commit();

    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, [currentUser, notifications]);

  // Dismiss notification
  const dismiss = useCallback(async (notificationId: string) => {
    if (!currentUser) return;

    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { deleted: true });

    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  }, [currentUser]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!currentUser) return;

    const batch = writeBatch(db);
    notifications.forEach(notification => {
      const notificationRef = doc(db, 'notifications', notification.id);
      batch.update(notificationRef, { deleted: true });
    });
    await batch.commit();

    setNotifications([]);
  }, [currentUser, notifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load initial notifications
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser, loadNotifications]);

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setCurrentSnackbar(null);
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'training':
        return theme.palette.info.main;
      case 'supervision':
        return theme.palette.warning.main;
      case 'task':
        return theme.palette.success.main;
      case 'system':
        return theme.palette.error.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const value = {
    notifications,
    unreadCount,
    notify,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {currentSnackbar && (
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={defaultDuration}
          onClose={handleSnackbarClose}
          anchorOrigin={position}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity="info"
            sx={{
              width: '100%',
              bgcolor: theme.palette.background.paper,
              color: getNotificationColor(currentSnackbar.type),
              '& .MuiAlert-icon': {
                color: getNotificationColor(currentSnackbar.type)
              }
            }}
          >
            <AlertTitle>{currentSnackbar.title}</AlertTitle>
            {currentSnackbar.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
}
