import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { addDays } from 'date-fns';

interface Stats {
  totalRecords: number;
  expiringTraining: number;
  expiredTraining: number;
  expiringDols: number;
  expiredDols: number;
  pendingTasks: number;
  overdueTasks: number;
}

interface DataContextType {
  stats: Stats;
  loading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRecords: 0,
    expiringTraining: 0,
    expiredTraining: 0,
    expiringDols: 0,
    expiredDols: 0,
    pendingTasks: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const thirtyDaysFromNow = addDays(new Date(), 30);
    const now = new Date();

    // Training Records
    const trainingUnsubscribe = onSnapshot(
      query(collection(db, 'training')),
      (snapshot) => {
        setStats((currentStats) => ({
          ...currentStats,
          totalRecords: snapshot.size,
          expiringTraining: snapshot.docs.filter(
            (doc) => doc.data().expiryDate <= thirtyDaysFromNow && doc.data().expiryDate > now
          ).length,
          expiredTraining: snapshot.docs.filter(
            (doc) => doc.data().expiryDate <= now
          ).length,
        }));
      },
      (err) => {
        console.error('Error fetching training records:', err);
        setError(err as Error);
      }
    );

    // DoLS Records
    const dolsUnsubscribe = onSnapshot(
      query(collection(db, 'dols')),
      (snapshot) => {
        setStats((currentStats) => ({
          ...currentStats,
          expiringDols: snapshot.docs.filter(
            (doc) => doc.data().status === 'active' && doc.data().expiryDate <= thirtyDaysFromNow
          ).length,
          expiredDols: snapshot.docs.filter(
            (doc) => doc.data().status === 'active' && doc.data().expiryDate <= now
          ).length,
        }));
      },
      (err) => {
        console.error('Error fetching DoLS records:', err);
        setError(err as Error);
      }
    );

    // Tasks
    const tasksUnsubscribe = onSnapshot(
      query(collection(db, 'tasks')),
      (snapshot) => {
        setStats((currentStats) => ({
          ...currentStats,
          pendingTasks: snapshot.docs.filter(
            (doc) => doc.data().status === 'pending'
          ).length,
          overdueTasks: snapshot.docs.filter(
            (doc) => doc.data().status === 'pending' && doc.data().dueDate <= now
          ).length,
        }));
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError(err as Error);
      }
    );

    setLoading(false);

    return () => {
      trainingUnsubscribe();
      dolsUnsubscribe();
      tasksUnsubscribe();
    };
  }, [currentUser]);

  return (
    <DataContext.Provider
      value={{
        stats,
        loading,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
