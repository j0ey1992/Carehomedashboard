import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { User } from '../types';

interface UserContextType {
  users: User[];
  createUser: (userData: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  loading: boolean;
  error: Error | null;
  getStaffForManager: (managerId: string) => User[];
  getDepartmentStaff: (departmentId: string) => User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

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
  }
};

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    let q;

    if (isAdmin) {
      // Admin can see all users
      q = query(
        collection(db, 'users'),
        orderBy('name')
      );
    } else if (userData?.role === 'manager' && userData.sites) {
      // Manager can only see users in their sites
      q = query(
        collection(db, 'users'),
        where('site', 'in', userData.sites),
        orderBy('name')
      );
    } else {
      // Staff can only see themselves
      q = query(
        collection(db, 'users'),
        where('id', '==', currentUser.uid),
        orderBy('name')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const userData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            role: data.role || 'staff',
            roles: data.roles || [],
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
            notificationPreferences: data.notificationPreferences || {
              email: true,
              sms: true,
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
            // Add new fields with defaults
            contractedHours: data.contractedHours ?? DEFAULT_USER_DATA.contractedHours,
            annualLeave: data.annualLeave ?? DEFAULT_USER_DATA.annualLeave,
            sickness: data.sickness ?? DEFAULT_USER_DATA.sickness,
            attendance: {
              attendanceRate: data.attendance?.attendanceRate ?? DEFAULT_USER_DATA.attendance.attendanceRate,
              lateDays: data.attendance?.lateDays ?? DEFAULT_USER_DATA.attendance.lateDays,
              sickDays: data.attendance?.sickDays ?? DEFAULT_USER_DATA.attendance.sickDays,
              totalDays: data.attendance?.totalDays ?? DEFAULT_USER_DATA.attendance.totalDays
            },
            preferences: {
              preferredShifts: data.preferences?.preferredShifts ?? DEFAULT_USER_DATA.preferences.preferredShifts,
              unavailableDates: data.preferences?.unavailableDates ?? DEFAULT_USER_DATA.preferences.unavailableDates,
              flexibleHours: data.preferences?.flexibleHours ?? DEFAULT_USER_DATA.preferences.flexibleHours,
              nightShiftOnly: data.preferences?.nightShiftOnly ?? DEFAULT_USER_DATA.preferences.nightShiftOnly
            },
            performanceMetrics: {
              attendanceRate: data.performanceMetrics?.attendanceRate ?? DEFAULT_USER_DATA.performanceMetrics.attendanceRate,
              punctualityScore: data.performanceMetrics?.punctualityScore ?? DEFAULT_USER_DATA.performanceMetrics.punctualityScore,
              shiftCompletionRate: data.performanceMetrics?.shiftCompletionRate ?? DEFAULT_USER_DATA.performanceMetrics.shiftCompletionRate,
              feedbackScore: data.performanceMetrics?.feedbackScore ?? DEFAULT_USER_DATA.performanceMetrics.feedbackScore
            }
          } as User;
        });

        setUsers(userData);
        setError(null);
      } catch (err) {
        console.error('Error processing users:', err);
        setError(err instanceof Error ? err : new Error('Failed to process users'));
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Error subscribing to users:', err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userData, isAdmin]);

  const createUser = async (userData: Omit<User, 'id'>) => {
    try {
      setError(null);
      const docRef = doc(collection(db, 'users'));
      const now = new Date();
      await setDoc(docRef, {
        ...userData,
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
        roles: userData.roles || [],
        departmentId: userData.departmentId || '',
        probationStatus: userData.probationStatus || 'pending',
        trainingProgress: userData.trainingProgress || {
          week1Review: false,
          week4Supervision: false,
          week8Review: false,
          week12Supervision: false,
        },
        notificationPreferences: userData.notificationPreferences || {
          email: true,
          sms: true,
        },
        sites: userData.sites || [],
        authCreated: false,
        // Add new fields with defaults if not provided
        contractedHours: userData.contractedHours ?? DEFAULT_USER_DATA.contractedHours,
        annualLeave: userData.annualLeave ?? DEFAULT_USER_DATA.annualLeave,
        sickness: userData.sickness ?? DEFAULT_USER_DATA.sickness,
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
      });
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err : new Error('Failed to create user'));
      throw err;
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      setError(null);
      const updateData = {
        ...userData,
        updatedAt: new Date(),
      };

      // If updating attendance, preferences, or metrics, merge with existing data
      if (userData.attendance || userData.preferences || userData.performanceMetrics) {
        const currentUser = users.find(u => u.id === id);
        if (currentUser) {
          if (userData.attendance) {
            updateData.attendance = {
              ...currentUser.attendance,
              ...userData.attendance
            };
          }
          if (userData.preferences) {
            updateData.preferences = {
              ...currentUser.preferences,
              ...userData.preferences
            };
          }
          if (userData.performanceMetrics) {
            updateData.performanceMetrics = {
              ...currentUser.performanceMetrics,
              ...userData.performanceMetrics
            };
          }
        }
      }

      await updateDoc(doc(db, 'users', id), updateData);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err : new Error('Failed to update user'));
      throw err;
    }
  };

  const getStaffForManager = (managerId: string) => {
    return users.filter(user => 
      user.role === 'staff' && 
      user.managerId === managerId
    );
  };

  const getDepartmentStaff = (departmentId: string) => {
    // For admin, return all staff members
    if (!departmentId) {
      return users.filter(user => user.role === 'staff');
    }

    // For managers, return staff in their department
    return users.filter(user => 
      user.role === 'staff' && 
      user.departmentId === departmentId
    );
  };

  return (
    <UserContext.Provider
      value={{
        users,
        createUser,
        updateUser,
        loading,
        error,
        getStaffForManager,
        getDepartmentStaff,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
