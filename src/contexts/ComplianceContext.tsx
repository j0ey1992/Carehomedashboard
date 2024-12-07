import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Timestamp,
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDays, addYears } from 'date-fns';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { useTask } from './TaskContext';
import { createNotification } from '../utils/notifications';
import {
  ComplianceItem,
  HealthCheckItem,
  SignableItem,
  CompetencyItem,
  DynamicComplianceItem,
  StaffCompliance,
  ComplianceItemType,
  DynamicItemUpdate,
  ComplianceStateUpdater,
  ComplianceStateUpdate,
} from '../types/compliance';

interface ComplianceContextType {
  updateCompliance: (userId: string, data: StaffCompliance) => Promise<void>;
  updateHealthCheck: (userId: string, answers: { [key: string]: string | boolean | number }) => Promise<void>;
  signAgreement: (userId: string, agreementType: 'supervisionAgreement' | 'beneficiaryOnFile') => Promise<void>;
  uploadEvidence: (userId: string, field: keyof StaffCompliance, file: File) => Promise<void>;
  addDynamicItem: (userId: string, item: Omit<DynamicComplianceItem, 'date' | 'expiryDate' | 'status'>) => Promise<void>;
  updateDynamicItem: (userId: string, itemId: string, updates: Partial<DynamicComplianceItem>) => Promise<void>;
  removeDynamicItem: (userId: string, itemId: string) => Promise<void>;
  uploadDynamicEvidence: (userId: string, itemId: string, file: File) => Promise<void>;
  completeItem: (userId: string, field: keyof StaffCompliance) => Promise<void>;
  staffCompliance?: StaffCompliance;
  allStaffCompliance: StaffCompliance[];
  loading: boolean;
  error: string | null;
}

const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

export const useCompliance = () => {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error('useCompliance must be used within a ComplianceProvider');
  }
  return context;
};

const calculateDBSExpiryDate = (date: Timestamp) => {
  return addYears(date.toDate(), 3);
};

const calculateExpiryDate = (date: Timestamp) => {
  return addYears(date.toDate(), 1);
};

const calculateDynamicExpiryDate = (
  date: Timestamp,
  recurrence: string,
  customRecurrence?: { interval: number; unit: string }
) => {
  const baseDate = date.toDate();
  switch (recurrence) {
    case 'monthly':
      return addDays(baseDate, 30);
    case 'yearly':
      return addYears(baseDate, 1);
    case 'custom':
      if (!customRecurrence) return addYears(baseDate, 1);
      switch (customRecurrence.unit) {
        case 'days':
          return addDays(baseDate, customRecurrence.interval);
        case 'months':
          return addDays(baseDate, customRecurrence.interval * 30);
        case 'years':
          return addYears(baseDate, customRecurrence.interval);
        default:
          return addYears(baseDate, 1);
      }
    default:
      return addYears(baseDate, 1);
  }
};

function isComplianceItem(value: any): value is ComplianceItem {
  return value && typeof value === 'object' && 'type' in value && value.type === 'compliance';
}

function isHealthCheckItem(value: any): value is HealthCheckItem {
  return value && typeof value === 'object' && 'type' in value && value.type === 'healthCheck';
}

function isSignableItem(value: any): value is SignableItem {
  return value && typeof value === 'object' && 'type' in value && value.type === 'signable';
}

function isCompetencyItem(value: any): value is CompetencyItem {
  return value && typeof value === 'object' && 'type' in value && value.type === 'competency';
}

function isDynamicComplianceItem(value: any): value is DynamicComplianceItem {
  return value && typeof value === 'object' && 'type' in value && value.type === 'dynamic';
}

export const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [staffCompliance, setStaffCompliance] = useState<StaffCompliance>();
  const [allStaffCompliance, setAllStaffCompliance] = useState<StaffCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, userData, isAdmin } = useAuth();
  const { notify } = useNotifications();
  const { addTask } = useTask();

  const updateStaffCompliance = (updater: ComplianceStateUpdater) => {
    setStaffCompliance((prev: StaffCompliance | undefined) => {
      const updated = updater(prev);
      if (!updated) return prev;
      return updated;
    });
  };

  const updateAllStaffCompliance = (userId: string, updater: ComplianceStateUpdater) => {
    setAllStaffCompliance((prev: StaffCompliance[]) =>
      prev.map((compliance) =>
        compliance.userId === userId ? updater(compliance) || compliance : compliance
      )
    );
  };

  useEffect(() => {
    if (!currentUser || !userData) return;

    const loadCompliance = async () => {
      try {
        setLoading(true);
        let complianceQuery;

        if (isAdmin) {
          complianceQuery = query(collection(db, 'compliance'));
        } else if (userData.role === 'manager' && userData.sites) {
          complianceQuery = query(
            collection(db, 'compliance'),
            where('site', 'in', userData.sites)
          );
        } else {
          complianceQuery = query(
            collection(db, 'compliance'),
            where('userId', '==', currentUser.uid)
          );
        }

        const snapshot = await getDocs(complianceQuery);
        const complianceData = snapshot.docs.map(
          (doc) =>
            ({
              userId: doc.id,
              ...doc.data(),
            } as StaffCompliance)
        );

        setAllStaffCompliance(complianceData);

        const ownCompliance = complianceData.find((c) => c.userId === currentUser.uid);
        if (ownCompliance) {
          setStaffCompliance(ownCompliance);
        }

        setError(null);
      } catch (err) {
        console.error('Error loading compliance data:', err);
        setError('Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };

    loadCompliance();
  }, [currentUser, userData, isAdmin]);

  const uploadEvidence = async (userId: string, field: keyof StaffCompliance, file: File) => {
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `compliance/${userId}/${field}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      const evidence = {
        fileUrl: downloadUrl,
        fileName: file.name,
        uploadedAt: Timestamp.now(),
      };

      const currentField = staffCompliance?.[field];
      if (!isComplianceItem(currentField)) {
        throw new Error('Invalid compliance item');
      }

      const updatedField: ComplianceItem = {
        ...currentField,
        evidence,
      };

      const updateData: { [key: string]: ComplianceItemType } = {
        [field]: updatedField,
      };

      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      if (userId === currentUser?.uid) {
        updateStaffCompliance((prev: StaffCompliance | undefined) =>
          prev ? { ...prev, ...updateData } : undefined
        );
      }

      updateAllStaffCompliance(userId, (prev: StaffCompliance | undefined) =>
        prev ? { ...prev, ...updateData } : undefined
      );
    } catch (error) {
      console.error('Error uploading evidence:', error);
      throw error;
    }
  };

  const updateCompliance = async (userId: string, data: StaffCompliance) => {
    try {
      const updateData: { [key: string]: ComplianceItemType | DynamicItemUpdate } = {};

      Object.entries(data).forEach(([key, value]) => {
        if (key === 'userId' || !value) return;

        const field = key as keyof StaffCompliance;

        if (key === 'dbsCheck' && isComplianceItem(value)) {
          const { type: _, ...restValue } = value;
          updateData[String(field)] = {
            type: 'compliance',
            ...restValue,
            expiryDate: value.date
              ? Timestamp.fromDate(calculateDBSExpiryDate(value.date))
              : null,
            status: 'valid',
          } as ComplianceItem;
        } else if (
          [
            'healthCheck',
            'supervisionAgreement',
            'beneficiaryOnFile',
            'stressRiskAssessment',
            'albacMat',
            'donningAndDoffing',
            'cprScenario',
          ].includes(key) &&
          isComplianceItem(value)
        ) {
          const { type: _, ...restValue } = value;
          const baseUpdate = {
            ...restValue,
            expiryDate: value.date ? Timestamp.fromDate(calculateExpiryDate(value.date)) : null,
            status: 'valid',
          };

          if (key === 'supervisionAgreement' || key === 'beneficiaryOnFile') {
            updateData[String(field)] = {
              type: 'signable',
              ...baseUpdate,
              signed: true,
            } as SignableItem;
          } else if (key === 'healthCheck') {
            updateData[String(field)] = {
              type: 'healthCheck',
              ...baseUpdate,
              completed: true,
            } as HealthCheckItem;
          } else if (key === 'albacMat') {
            updateData[String(field)] = {
              type: 'competency',
              ...baseUpdate,
            } as CompetencyItem;
          } else {
            updateData[String(field)] = {
              type: 'compliance',
              ...baseUpdate,
            } as ComplianceItem;
          }
        } else {
          updateData[String(field)] = value as ComplianceItemType;
        }
      });

      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      if (userId === currentUser?.uid) {
        updateStaffCompliance((prev: StaffCompliance | undefined) =>
          prev ? { ...prev, ...updateData } : undefined
        );
      }

      updateAllStaffCompliance(userId, (prev: StaffCompliance | undefined) =>
        prev ? { ...prev, ...updateData } : undefined
      );
    } catch (error) {
      console.error('Error updating compliance:', error);
      throw error;
    }
  };

  const updateHealthCheck = async (
    userId: string,
    answers: { [key: string]: string | boolean | number }
  ) => {
    try {
      const now = Timestamp.now();
      const healthCheckItem: HealthCheckItem = {
        type: 'healthCheck',
        date: now,
        expiryDate: Timestamp.fromDate(calculateExpiryDate(now)),
        completed: true,
        answers,
        status: 'valid',
      };

      const updateData: { [key: string]: ComplianceItemType } = {
        healthCheck: healthCheckItem,
      };

      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      if (userId === currentUser?.uid) {
        updateStaffCompliance((prev: StaffCompliance | undefined) =>
          prev ? { ...prev, ...updateData } : undefined
        );
      }

      updateAllStaffCompliance(userId, (prev: StaffCompliance | undefined) =>
        prev ? { ...prev, ...updateData } : undefined
      );
    } catch (error) {
      console.error('Error updating health check:', error);
      throw error;
    }
  };

  const signAgreement = async (
    userId: string,
    agreementType: 'supervisionAgreement' | 'beneficiaryOnFile'
  ) => {
    try {
      const now = Timestamp.now();
      const signableItem: SignableItem = {
        type: 'signable',
        date: now,
        expiryDate: Timestamp.fromDate(calculateExpiryDate(now)),
        signed: true,
        status: 'valid',
      };

      const updateData: { [key: string]: ComplianceItemType } = {
        [agreementType]: signableItem,
      };

      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      if (userId === currentUser?.uid) {
        updateStaffCompliance((prev: StaffCompliance | undefined) =>
          prev ? { ...prev, ...updateData } : undefined
        );
      }

      updateAllStaffCompliance(userId, (prev: StaffCompliance | undefined) =>
        prev ? { ...prev, ...updateData } : undefined
      );
    } catch (error) {
      console.error('Error signing agreement:', error);
      throw error;
    }
  };

  const addDynamicItem = async (
    userId: string,
    item: Omit<DynamicComplianceItem, 'date' | 'expiryDate' | 'status'>
  ) => {
    try {
      const now = Timestamp.now();
      const expiryDate = Timestamp.fromDate(
        calculateDynamicExpiryDate(now, item.recurrence, item.customRecurrence)
      );
      const newItem: DynamicComplianceItem = {
        ...item,
        date: now,
        expiryDate,
        status: 'pending',
        type: 'dynamic',
      };

      const updateData: DynamicItemUpdate = {
        dynamicItems: {
          [item.title]: newItem,
        },
      };

      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      // Create task
      await addTask({
        title: `Complete ${item.title}`,
        description: item.description,
        dueDate: expiryDate.toDate(),
        priority: 'medium',
        status: 'pending',
        category: 'compliance',
        assignedTo: userId,
      });

      // Create system notification
      await createNotification(
        userId,
        'task',
        'New Compliance Task',
        `You have been assigned a new compliance task: ${item.title}`,
        '/compliance'
      );

      // Show UI notification
      await notify({
        userId,
        type: 'task',
        title: 'New Compliance Task',
        message: `You have been assigned: ${item.title}`,
        priority: 'medium',
      });

      if (userId === currentUser?.uid) {
        updateStaffCompliance((prev: StaffCompliance | undefined) =>
          prev
            ? {
                ...prev,
                dynamicItems: {
                  ...prev.dynamicItems,
                  [item.title]: newItem,
                },
              }
            : undefined
        );
      }

      updateAllStaffCompliance(userId, (prev: StaffCompliance | undefined) =>
        prev
          ? {
              ...prev,
              dynamicItems: {
                ...prev.dynamicItems,
                [item.title]: newItem,
              },
            }
          : undefined
      );
    } catch (error) {
      console.error('Error adding dynamic compliance item:', error);
      throw error;
    }
  };

  const updateDynamicItem = async (
    userId: string,
    itemId: string,
    updates: Partial<DynamicComplianceItem>
  ) => {
    try {
      const currentItem = staffCompliance?.dynamicItems?.[itemId];
      if (!currentItem) throw new Error('Dynamic item not found');

      const updatedItem: DynamicComplianceItem = {
        ...currentItem,
        ...updates,
      };

      const updateData: DynamicItemUpdate = {
        dynamicItems: {
          [itemId]: updatedItem,
        },
      };

      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      const updateState = (prev: StaffCompliance | undefined) => {
        if (!prev?.dynamicItems) return prev;
        return {
          ...prev,
          dynamicItems: {
            ...prev.dynamicItems,
            [itemId]: updatedItem,
          },
        };
      };

      if (userId === currentUser?.uid) {
        updateStaffCompliance(updateState);
      }

      updateAllStaffCompliance(userId, updateState);
    } catch (error) {
      console.error('Error updating dynamic compliance item:', error);
      throw error;
    }
  };

  const removeDynamicItem = async (userId: string, itemId: string) => {
    try {
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(
        complianceRef,
        {
          [`dynamicItems.${itemId}`]: null,
        },
        { merge: true }
      );

      const updateState = (prev: StaffCompliance | undefined) => {
        if (!prev?.dynamicItems) return prev;
        const { [itemId]: removed, ...rest } = prev.dynamicItems;
        return {
          ...prev,
          dynamicItems: rest,
        };
      };

      if (userId === currentUser?.uid) {
        updateStaffCompliance(updateState);
      }

      updateAllStaffCompliance(userId, updateState);
    } catch (error) {
      console.error('Error removing dynamic compliance item:', error);
      throw error;
    }
  };

  const uploadDynamicEvidence = async (userId: string, itemId: string, file: File) => {
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `compliance/${userId}/dynamic/${itemId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      const evidence = {
        fileUrl: downloadUrl,
        fileName: file.name,
        uploadedAt: Timestamp.now(),
      };

      await updateDynamicItem(userId, itemId, { evidence });
    } catch (error) {
      console.error('Error uploading dynamic evidence:', error);
      throw error;
    }
  };

  const completeItem = async (userId: string, field: keyof StaffCompliance) => {
    try {
      const now = Timestamp.now();
      const expiryDate = Timestamp.fromDate(calculateExpiryDate(now));

      let updateData: { [key: string]: ComplianceItemType } = {};

      if (field === 'supervisionAgreement' || field === 'beneficiaryOnFile') {
        const signableItem: SignableItem = {
          type: 'signable',
          date: now,
          expiryDate,
          status: 'valid',
          signed: true,
        };
        updateData = {
          [String(field)]: signableItem,
        };
      } else if (field === 'healthCheck') {
        const healthCheckItem: HealthCheckItem = {
          type: 'healthCheck',
          date: now,
          expiryDate,
          status: 'valid',
          completed: true,
        };
        updateData = {
          [String(field)]: healthCheckItem,
        };
      } else if (field === 'albacMat') {
        const competencyItem: CompetencyItem = {
          type: 'competency',
          date: now,
          expiryDate,
          status: 'valid',
        };
        updateData = {
          [String(field)]: competencyItem,
        };
      } else if (field !== 'userId' && field !== 'site' && field !== 'dynamicItems') {
        const complianceItem: ComplianceItem = {
          type: 'compliance',
          date: now,
          expiryDate,
          status: 'valid',
        };
        updateData = {
          [String(field)]: complianceItem,
        };
      }

      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      // Create notification
      await createNotification(
        userId,
        'task',
        'Compliance Item Completed',
        `${String(field).split(/(?=[A-Z])/).join(' ')} has been marked as complete`,
        '/compliance'
      );

      // Show UI notification
      await notify({
        userId,
        type: 'task',
        title: 'Compliance Item Completed',
        message: `${String(field).split(/(?=[A-Z])/).join(' ')} has been marked as complete`,
        priority: 'low',
      });

      if (userId === currentUser?.uid) {
        updateStaffCompliance((prev: StaffCompliance | undefined) =>
          prev ? { ...prev, ...updateData } : undefined
        );
      }

      updateAllStaffCompliance(userId, (prev: StaffCompliance | undefined) =>
        prev ? { ...prev, ...updateData } : undefined
      );
    } catch (error) {
      console.error('Error completing compliance item:', error);
      throw error;
    }
  };

  const value = {
    updateCompliance,
    updateHealthCheck,
    signAgreement,
    uploadEvidence,
    addDynamicItem,
    updateDynamicItem,
    removeDynamicItem,
    uploadDynamicEvidence,
    completeItem,
    staffCompliance,
    allStaffCompliance,
    loading,
    error,
  };

  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
};
