import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  QueryConstraint,
  WhereFilterOp,
  OrderByDirection,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface QueryFilter {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

interface QueryOrder {
  field: string;
  direction: OrderByDirection;
}

interface UseDataOptions {
  filters?: QueryFilter[];
  orderByRules?: QueryOrder[];
  transform?: (data: DocumentData) => any;
}

const useData = <T = any>(
  collectionPath: string,
  options: UseDataOptions = {}
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [];

    // Add filters
    if (options.filters) {
      options.filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
    }

    // Add orderBy rules
    if (options.orderByRules) {
      options.orderByRules.forEach(rule => {
        constraints.push(orderBy(rule.field, rule.direction));
      });
    }

    // Create query
    const q = query(collection(db, collectionPath), ...constraints);

    // Subscribe to query
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        try {
          const fetchedData = snapshot.docs.map(doc => {
            const docData = { id: doc.id, ...doc.data() };
            return options.transform ? options.transform(docData) : docData;
          }) as T[];

          setData(fetchedData);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing data:', err);
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching data:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [collectionPath, JSON.stringify(options)]);

  return { data, loading, error };
};

export default useData;

// Helper hooks for specific collections
export const useTasks = (userId: string) => {
  return useData('tasks', {
    filters: [
      { field: 'userId', operator: '==', value: userId }
    ],
    orderByRules: [
      { field: 'dueDate', direction: 'asc' }
    ]
  });
};

export const useTraining = (userId: string) => {
  return useData('training', {
    filters: [
      { field: 'userId', operator: '==', value: userId }
    ],
    orderByRules: [
      { field: 'expiryDate', direction: 'asc' }
    ]
  });
};

export const useDols = () => {
  return useData('dols', {
    orderByRules: [
      { field: 'expiryDate', direction: 'asc' }
    ]
  });
};

export const useSupervisions = (userId: string, role: 'staff' | 'supervisor') => {
  const fieldName = role === 'supervisor' ? 'supervisorId' : 'staffId';
  return useData('supervisions', {
    filters: [
      { field: fieldName, operator: '==', value: userId }
    ],
    orderByRules: [
      { field: 'date', direction: 'desc' }
    ]
  });
};

export const useRenewals = () => {
  return useData('renewals', {
    orderByRules: [
      { field: 'expiryDate', direction: 'asc' }
    ]
  });
};

export const useNotifications = (userId: string) => {
  return useData('notifications', {
    filters: [
      { field: 'userId', operator: '==', value: userId },
      { field: 'read', operator: '==', value: false }
    ],
    orderByRules: [
      { field: 'timestamp', direction: 'desc' }
    ]
  });
};
