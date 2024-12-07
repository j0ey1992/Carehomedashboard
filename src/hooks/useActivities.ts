import { useState, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export interface Activity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface UseActivitiesReturn {
  logActivity: (type: string, description: string, metadata?: Record<string, any>) => Promise<void>;
  getRecentActivities: (count?: number) => Promise<Activity[]>;
  getUserActivities: (userId: string, count?: number) => Promise<Activity[]>;
  loading: boolean;
  error: Error | null;
}

const useActivities = (): UseActivitiesReturn => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const logActivity = useCallback(
    async (type: string, description: string, metadata?: Record<string, any>) => {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      setLoading(true);
      setError(null);

      try {
        await addDoc(collection(db, 'activities'), {
          userId: currentUser.uid,
          type,
          description,
          metadata,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error logging activity:', err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  const getRecentActivities = useCallback(
    async (count: number = 10): Promise<Activity[]> => {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(count)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        })) as Activity[];
      } catch (err) {
        console.error('Error fetching recent activities:', err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  const getUserActivities = useCallback(
    async (userId: string, count: number = 10): Promise<Activity[]> => {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'activities'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(count)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        })) as Activity[];
      } catch (err) {
        console.error('Error fetching user activities:', err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  return {
    logActivity,
    getRecentActivities,
    getUserActivities,
    loading,
    error,
  };
};

// Activity type constants
export const ActivityTypes = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  DELETE_TASK: 'delete_task',
  CREATE_TRAINING: 'create_training',
  UPDATE_TRAINING: 'update_training',
  DELETE_TRAINING: 'delete_training',
  CREATE_DOLS: 'create_dols',
  UPDATE_DOLS: 'update_dols',
  DELETE_DOLS: 'delete_dols',
  CREATE_SUPERVISION: 'create_supervision',
  UPDATE_SUPERVISION: 'update_supervision',
  DELETE_SUPERVISION: 'delete_supervision',
  CREATE_RENEWAL: 'create_renewal',
  UPDATE_RENEWAL: 'update_renewal',
  DELETE_RENEWAL: 'delete_renewal',
  SEND_NOTIFICATION: 'send_notification',
  UPDATE_PROFILE: 'update_profile',
  UPDATE_SETTINGS: 'update_settings',
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

// Helper function to format activity descriptions
export const formatActivityDescription = (
  type: ActivityType,
  metadata?: Record<string, any>
): string => {
  switch (type) {
    case ActivityTypes.LOGIN:
      return 'Logged in to the system';
    case ActivityTypes.LOGOUT:
      return 'Logged out of the system';
    case ActivityTypes.CREATE_TASK:
      return `Created task: ${metadata?.title || 'Untitled'}`;
    case ActivityTypes.UPDATE_TASK:
      return `Updated task: ${metadata?.title || 'Untitled'}`;
    case ActivityTypes.DELETE_TASK:
      return `Deleted task: ${metadata?.title || 'Untitled'}`;
    case ActivityTypes.CREATE_TRAINING:
      return `Created training record: ${metadata?.type || 'Unspecified'}`;
    case ActivityTypes.UPDATE_TRAINING:
      return `Updated training record: ${metadata?.type || 'Unspecified'}`;
    case ActivityTypes.DELETE_TRAINING:
      return `Deleted training record: ${metadata?.type || 'Unspecified'}`;
    case ActivityTypes.CREATE_DOLS:
      return `Created DoLS record for ${metadata?.residentName || 'Unnamed resident'}`;
    case ActivityTypes.UPDATE_DOLS:
      return `Updated DoLS record for ${metadata?.residentName || 'Unnamed resident'}`;
    case ActivityTypes.DELETE_DOLS:
      return `Deleted DoLS record for ${metadata?.residentName || 'Unnamed resident'}`;
    case ActivityTypes.CREATE_SUPERVISION:
      return `Scheduled supervision with ${metadata?.staffName || 'Unnamed staff'}`;
    case ActivityTypes.UPDATE_SUPERVISION:
      return `Updated supervision with ${metadata?.staffName || 'Unnamed staff'}`;
    case ActivityTypes.DELETE_SUPERVISION:
      return `Cancelled supervision with ${metadata?.staffName || 'Unnamed staff'}`;
    case ActivityTypes.CREATE_RENEWAL:
      return `Created renewal reminder: ${metadata?.title || 'Untitled'}`;
    case ActivityTypes.UPDATE_RENEWAL:
      return `Updated renewal reminder: ${metadata?.title || 'Untitled'}`;
    case ActivityTypes.DELETE_RENEWAL:
      return `Deleted renewal reminder: ${metadata?.title || 'Untitled'}`;
    case ActivityTypes.SEND_NOTIFICATION:
      return `Sent notification: ${metadata?.title || 'Untitled'}`;
    case ActivityTypes.UPDATE_PROFILE:
      return 'Updated profile information';
    case ActivityTypes.UPDATE_SETTINGS:
      return 'Updated system settings';
    default:
      return 'Performed an action';
  }
};

export default useActivities;
