import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  DocumentData,
  QueryConstraint,
  Query,
  CollectionReference,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { createNotification } from './notifications';

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const getCollection = <T = DocumentData>(path: string): CollectionReference<T> => {
  return collection(db, path) as CollectionReference<T>;
};

export const queryCollection = <T = DocumentData>(
  path: string,
  ...queryConstraints: QueryConstraint[]
): Query<T> => {
  return query(collection(db, path) as CollectionReference<T>, ...queryConstraints);
};

export const getStaffList = async (): Promise<Staff[]> => {
  try {
    const staffQuery = query(collection(db, 'users'), where('role', '==', 'staff'));
    const snapshot = await getDocs(staffQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
  } catch (error) {
    console.error('Error fetching staff list:', error);
    return [];
  }
};

export const sendTrainingReminder = async (
  staffId: string,
  trainingType: string,
  expiryDate: string
) => {
  try {
    const staffDocRef = doc(db, 'users', staffId);
    const staffDoc = await getDoc(staffDocRef);
    const staffData = staffDoc.data();

    if (staffData) {
      // Create notification
      await createNotification(
        staffId,
        'training',
        'Training Reminder',
        `Your ${trainingType} training expires on ${new Date(expiryDate).toLocaleDateString()}`,
        '/training'
      );

      // Log the reminder
      await addDoc(collection(db, 'trainingReminders'), {
        staffId,
        trainingType,
        expiryDate,
        sentAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error sending training reminder:', error);
  }
};

export const sendDolsReminder = async (
  staffId: string,
  residentName: string,
  expiryDate: string
) => {
  try {
    const staffDocRef = doc(db, 'users', staffId);
    const staffDoc = await getDoc(staffDocRef);
    const staffData = staffDoc.data();

    if (staffData) {
      // Create notification
      await createNotification(
        staffId,
        'dols',
        'DoLS Reminder',
        `DoLS for ${residentName} expires on ${new Date(expiryDate).toLocaleDateString()}`,
        '/dols'
      );

      // Log the reminder
      await addDoc(collection(db, 'dolsReminders'), {
        staffId,
        residentName,
        expiryDate,
        sentAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error sending DoLS reminder:', error);
  }
};

export const sendSupervisionReminder = async (
  staffId: string,
  supervisorId: string,
  dueDate: string
) => {
  try {
    const staffDocRef = doc(db, 'users', staffId);
    const supervisorDocRef = doc(db, 'users', supervisorId);
    
    const [staffDoc, supervisorDoc] = await Promise.all([
      getDoc(staffDocRef),
      getDoc(supervisorDocRef),
    ]);

    const staffData = staffDoc.data();
    const supervisorData = supervisorDoc.data();

    if (staffData && supervisorData) {
      // Create notifications for both staff and supervisor
      await Promise.all([
        createNotification(
          staffId,
          'supervision',
          'Supervision Due',
          `Your supervision with ${supervisorData.name} is due on ${new Date(dueDate).toLocaleDateString()}`,
          '/supervision'
        ),
        createNotification(
          supervisorId,
          'supervision',
          'Supervision Due',
          `Supervision with ${staffData.name} is due on ${new Date(dueDate).toLocaleDateString()}`,
          '/supervision'
        ),
      ]);

      // Log the reminder
      await addDoc(collection(db, 'supervisionReminders'), {
        staffId,
        supervisorId,
        dueDate,
        sentAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error sending supervision reminder:', error);
  }
};

export const updateUserPreferences = async (
  userId: string,
  preferences: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
    theme?: 'light' | 'dark';
  }
) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { preferences });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

export const logActivity = async (
  userId: string,
  type: string,
  description: string,
  metadata?: Record<string, any>
) => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      userId,
      type,
      description,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
