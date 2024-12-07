import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  FirestoreError,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { 
  updateEmail, 
  getAuth, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  AuthError 
} from 'firebase/auth';
import { db } from '../firebase/config';
import { User } from '../types';

const USERS_COLLECTION = 'users';
const auth = getAuth();

const DEFAULT_USER_DATA = {
  contractedHours: 37.5,
  annualLeave: 28,
  sickness: 0,
  attendance: {
    attendanceRate: 100,
    lateDays: 0,
    sickDays: 0,
    totalDays: 0
  },
  preferences: {
    preferredShifts: [],
    unavailableDates: [],
    flexibleHours: true,
    nightShiftOnly: false
  },
  performanceMetrics: {
    attendanceRate: 100,
    punctualityScore: 100,
    shiftCompletionRate: 100,
    feedbackScore: 100
  },
  notificationPreferences: {
    email: true,
    sms: true
  }
};

export function useUserData() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      orderBy('name', 'asc')
    );
    
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const newUsers = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            role: data.role || 'staff',
            roles: data.roles || ['Care Staff'],
            phoneNumber: data.phoneNumber || '',
            startDate: data.startDate?.toDate() || null,
            departmentId: data.departmentId || '',
            managerId: data.managerId || '',
            probationStatus: data.probationStatus || 'pending',
            trainingProgress: data.trainingProgress || {
              week1Review: false,
              week4Supervision: false,
              week8Review: false,
              week12Supervision: false,
            },
            notificationPreferences: {
              ...DEFAULT_USER_DATA.notificationPreferences,
              ...data.notificationPreferences
            },
            sites: data.sites || [],
            site: data.site || '',
            lastLogin: data.lastLogin?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            authCreated: data.authCreated || false,
            location: data.location || '',
            isAdmin: data.isAdmin || false,
            photoURL: data.photoURL || '',
            points: data.points || 0,
            contractedHours: data.contractedHours ?? DEFAULT_USER_DATA.contractedHours,
            annualLeave: data.annualLeave ?? DEFAULT_USER_DATA.annualLeave,
            sickness: data.sickness ?? DEFAULT_USER_DATA.sickness,
            attendance: {
              ...DEFAULT_USER_DATA.attendance,
              ...data.attendance
            },
            preferences: {
              ...DEFAULT_USER_DATA.preferences,
              ...data.preferences
            },
            performanceMetrics: {
              ...DEFAULT_USER_DATA.performanceMetrics,
              ...data.performanceMetrics
            }
          } as User;
        });
        setUsers(newUsers);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error('Error fetching users:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getUser = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: userDoc.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'staff',
          roles: data.roles || ['Care Staff'],
          phoneNumber: data.phoneNumber || '',
          startDate: data.startDate?.toDate() || null,
          departmentId: data.departmentId || '',
          managerId: data.managerId || '',
          probationStatus: data.probationStatus || 'pending',
          trainingProgress: data.trainingProgress || {
            week1Review: false,
            week4Supervision: false,
            week8Review: false,
            week12Supervision: false,
          },
          notificationPreferences: {
            ...DEFAULT_USER_DATA.notificationPreferences,
            ...data.notificationPreferences
          },
          sites: data.sites || [],
          site: data.site || '',
          lastLogin: data.lastLogin?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          authCreated: data.authCreated || false,
          location: data.location || '',
          isAdmin: data.isAdmin || false,
          photoURL: data.photoURL || '',
          points: data.points || 0,
          contractedHours: data.contractedHours ?? DEFAULT_USER_DATA.contractedHours,
          annualLeave: data.annualLeave ?? DEFAULT_USER_DATA.annualLeave,
          sickness: data.sickness ?? DEFAULT_USER_DATA.sickness,
          attendance: {
            ...DEFAULT_USER_DATA.attendance,
            ...data.attendance
          },
          preferences: {
            ...DEFAULT_USER_DATA.preferences,
            ...data.preferences
          },
          performanceMetrics: {
            ...DEFAULT_USER_DATA.performanceMetrics,
            ...data.performanceMetrics
          }
        } as User;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user:', err);
      throw err;
    }
  };

  const updateUser = async (userId: string, userData: Partial<User>) => {
    try {
      // Update Firestore document
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      // Merge nested objects properly
      const currentData = userDoc.data();
      const updatedData = {
        ...userData,
        updatedAt: Timestamp.now(),
        notificationPreferences: {
          ...currentData.notificationPreferences,
          ...userData.notificationPreferences
        },
        attendance: {
          ...currentData.attendance,
          ...userData.attendance
        },
        preferences: {
          ...currentData.preferences,
          ...userData.preferences
        },
        performanceMetrics: {
          ...currentData.performanceMetrics,
          ...userData.performanceMetrics
        }
      };

      // Update Firestore document
      await updateDoc(userRef, updatedData);
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  const createUser = async (userData: Partial<User>) => {
    try {
      const now = Timestamp.now();
      const newUser = {
        ...DEFAULT_USER_DATA,
        ...userData,
        createdAt: now,
        updatedAt: now,
        role: userData.role || 'staff',
        roles: userData.roles || ['Care Staff'],
        sites: userData.sites || [],
        notificationPreferences: {
          ...DEFAULT_USER_DATA.notificationPreferences,
          ...userData.notificationPreferences
        },
        attendance: {
          ...DEFAULT_USER_DATA.attendance,
          ...userData.attendance
        },
        preferences: {
          ...DEFAULT_USER_DATA.preferences,
          ...userData.preferences
        },
        performanceMetrics: {
          ...DEFAULT_USER_DATA.performanceMetrics,
          ...userData.performanceMetrics
        }
      };
      await addDoc(collection(db, USERS_COLLECTION), newUser);
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    getUser,
    updateUser,
    deleteUser,
    createUser,
  };
}

export default useUserData;
