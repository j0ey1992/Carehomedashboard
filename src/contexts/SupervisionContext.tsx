import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  orderBy,
  getDocs,
  QuerySnapshot,
  FirestoreError,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Supervision } from '../types';
import { createNotification } from '../utils/notifications';

interface SupervisionStats {
  total: number;
  completed: number;
  scheduled: number;
  overdue: number;
  completionRate: number;
  upcomingCount: number;
}

interface SupervisionContextType {
  supervisions: Supervision[];
  loading: boolean;
  error: Error | null;
  stats: SupervisionStats;
  createSupervision: (data: Partial<Supervision>) => Promise<void>;
  updateSupervision: (id: string, data: Partial<Supervision>) => Promise<void>;
  deleteSupervision: (id: string) => Promise<void>;
  markComplete: (id: string) => Promise<void>;
  sendReminder: (supervisionId: string, message: string) => Promise<void>;
}

const SupervisionContext = createContext<SupervisionContextType | undefined>(undefined);

const toDate = (value: string | Timestamp | Date | undefined | null): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return new Date(value);
};

const toTimestamp = (date: Date | string | undefined): Timestamp => {
  if (!date) return Timestamp.now();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return Timestamp.fromDate(dateObj);
};

interface FirestoreSupervision extends Omit<Supervision, 'date' | 'nextDueDate' | 'createdAt' | 'updatedAt'> {
  date: Timestamp;
  nextDueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  site?: string;
}

const calculateStats = (supervisions: Supervision[]): SupervisionStats => {
  const total = supervisions.length;
  const completed = supervisions.filter(s => s.status === 'completed').length;
  const scheduled = supervisions.filter(s => s.status === 'scheduled').length;
  const overdue = supervisions.filter(s => s.status === 'overdue').length;
  const upcomingCount = supervisions.filter(s => {
    if (s.status !== 'scheduled') return false;
    const date = s.date;
    if (!date) return false;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return date > now && date <= thirtyDaysFromNow;
  }).length;

  return {
    total,
    completed,
    scheduled,
    overdue,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    upcomingCount,
  };
};

export function useSupervision() {
  const context = useContext(SupervisionContext);
  if (context === undefined) {
    throw new Error('useSupervision must be used within a SupervisionProvider');
  }
  return context;
}

export const SupervisionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, isAdmin } = useAuth();
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [stats, setStats] = useState<SupervisionStats>({
    total: 0,
    completed: 0,
    scheduled: 0,
    overdue: 0,
    completionRate: 0,
    upcomingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser || !userData) return;

    let q;

    if (isAdmin) {
      // Admin can see all supervisions
      q = query(
        collection(db, 'supervisions'),
        orderBy('date', 'desc')
      );
    } else if (userData.role === 'manager' && userData.sites) {
      // Manager can only see supervisions for their sites
      q = query(
        collection(db, 'supervisions'),
        where('site', 'in', userData.sites),
        orderBy('date', 'desc')
      );
    } else {
      // Staff can only see their own supervisions
      q = query(
        collection(db, 'supervisions'),
        where('staffId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        try {
          const supervisionData: Supervision[] = snapshot.docs.map(doc => {
            const data = doc.data() as FirestoreSupervision;
            const date = data.date?.toDate();
            if (!date) throw new Error('Invalid date in supervision record');

            return {
              id: doc.id,
              staffId: data.staffId,
              supervisorId: data.supervisorId,
              staffName: data.staffName,
              supervisor: data.supervisor,
              date: date,
              nextDueDate: data.nextDueDate?.toDate(),
              status: data.status,
              type: data.type,
              notes: data.notes || '',
              concerns: data.concerns || [],
              actionPoints: data.actionPoints || [],
              notificationSchedule: data.notificationSchedule,
              createdAt: data.createdAt.toDate(),
              updatedAt: data.updatedAt.toDate(),
              site: data.site,
            };
          });

          setSupervisions(supervisionData);
          setStats(calculateStats(supervisionData));
          setError(null);
          setLoading(false);
        } catch (err) {
          console.error('Error processing supervision records:', err);
          setError(err instanceof Error ? err : new Error('Failed to process supervision records'));
          setLoading(false);
        }
      },
      (error: FirestoreError) => {
        console.error('Error subscribing to supervision records:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userData, isAdmin]);

  const createSupervision = async (data: Partial<Supervision>) => {
    try {
      const firestoreData = {
        ...data,
        date: data.date ? toTimestamp(data.date) : Timestamp.now(),
        nextDueDate: data.nextDueDate ? toTimestamp(data.nextDueDate) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        site: userData?.site || '',
      } as FirestoreSupervision;

      const supervisionRef = await addDoc(collection(db, 'supervisions'), firestoreData);

      // Create notification for staff member
      if (data.date && data.staffId) {
        await createNotification(
          data.staffId,
          'supervision',
          'New Supervision Scheduled',
          `A new supervision has been scheduled for ${toDate(data.date)?.toLocaleDateString()}`,
          `/supervision/${supervisionRef.id}`
        );
      }
    } catch (err) {
      console.error('Error creating supervision:', err);
      throw err;
    }
  };

  const updateSupervision = async (id: string, data: Partial<Supervision>) => {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      } as Partial<FirestoreSupervision>;

      if (data.date) {
        updateData.date = toTimestamp(data.date);
      }
      if (data.nextDueDate) {
        updateData.nextDueDate = toTimestamp(data.nextDueDate);
      }

      await updateDoc(doc(db, 'supervisions', id), updateData);
    } catch (err) {
      console.error('Error updating supervision:', err);
      throw err;
    }
  };

  const deleteSupervision = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'supervisions', id));
    } catch (err) {
      console.error('Error deleting supervision:', err);
      throw err;
    }
  };

  const markComplete = async (id: string) => {
    try {
      const supervision = supervisions.find(s => s.id === id);
      if (!supervision) throw new Error('Supervision not found');

      await updateDoc(doc(db, 'supervisions', id), {
        status: 'completed',
        updatedAt: Timestamp.now(),
      });

      // Schedule next supervision
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 3); // 3 months from now

      const nextDueDate = new Date(nextDate);
      nextDueDate.setDate(nextDueDate.getDate() + 90); // 90 days after

      await createSupervision({
        staffId: supervision.staffId,
        supervisorId: supervision.supervisorId,
        staffName: supervision.staffName,
        supervisor: supervision.supervisor,
        date: nextDate,
        nextDueDate: nextDueDate,
        status: 'scheduled',
        type: supervision.type,
        site: supervision.site,
      });
    } catch (err) {
      console.error('Error marking supervision complete:', err);
      throw err;
    }
  };

  const sendReminder = async (supervisionId: string, message: string) => {
    try {
      const supervision = supervisions.find(s => s.id === supervisionId);
      if (!supervision) throw new Error('Supervision not found');

      await createNotification(
        supervision.staffId,
        'supervision',
        'Supervision Reminder',
        message,
        `/supervision/${supervisionId}`
      );

      await updateDoc(doc(db, 'supervisions', supervisionId), {
        'notificationSchedule.lastSent': Timestamp.now(),
      });
    } catch (err) {
      console.error('Error sending reminder:', err);
      throw err;
    }
  };

  return (
    <SupervisionContext.Provider
      value={{
        supervisions,
        loading,
        error,
        stats,
        createSupervision,
        updateSupervision,
        deleteSupervision,
        markComplete,
        sendReminder,
      }}
    >
      {children}
    </SupervisionContext.Provider>
  );
};
