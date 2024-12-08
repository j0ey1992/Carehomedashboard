import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Timestamp,
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDays, addYears, isAfter } from 'date-fns';
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
  HealthCheckForm,
  CompetencyAssessment,
  ComplianceEvidence,
} from '../types/compliance';

interface ComplianceContextType {
  updateCompliance: (userId: string, data: StaffCompliance) => Promise<void>;
  updateHealthCheck: (userId: string, form: HealthCheckForm) => Promise<void>;
  signAgreement: (userId: string, agreementType: 'supervisionAgreement' | 'beneficiaryOnFile') => Promise<void>;
  uploadEvidence: (userId: string, field: keyof StaffCompliance, file: File) => Promise<void>;
  addDynamicItem: (userId: string, item: Omit<DynamicComplianceItem, 'date' | 'expiryDate' | 'status'>) => Promise<void>;
  updateDynamicItem: (userId: string, itemId: string, updates: Partial<DynamicComplianceItem>) => Promise<void>;
  removeDynamicItem: (userId: string, itemId: string) => Promise<void>;
  uploadDynamicEvidence: (userId: string, itemId: string, file: File) => Promise<void>;
  completeItem: (userId: string, field: keyof StaffCompliance) => Promise<void>;
  updateCompetencyAssessment: (userId: string, assessment: CompetencyAssessment) => Promise<void>;
  staffCompliance?: StaffCompliance;
  allStaffCompliance: StaffCompliance[];
  loading: boolean;
  error: string | null;
}

export const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

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

const initializeComplianceStatus = (record: StaffCompliance): StaffCompliance => {
  const now = new Date();
  const updatedRecord = { ...record };

  // Helper function to check if an item is expired
  const isItemExpired = (item: any) => {
    if (!item || !item.expiryDate) return true;
    return isAfter(now, item.expiryDate.toDate());
  };

  // Update status for each compliance field
  Object.entries(updatedRecord).forEach(([key, value]) => {
    if (value && typeof value === 'object' && 'status' in value) {
      (value as any).status = isItemExpired(value) ? 'expired' : 'valid';
    }
  });

  // Update dynamic items
  if (updatedRecord.dynamicItems) {
    Object.entries(updatedRecord.dynamicItems).forEach(([key, item]) => {
      if (item) {
        item.status = isItemExpired(item) ? 'expired' : 'valid';
      }
    });
  }

  return updatedRecord;
};

export const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [staffCompliance, setStaffCompliance] = useState<StaffCompliance>();
  const [allStaffCompliance, setAllStaffCompliance] = useState<StaffCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, userData, isAdmin } = useAuth();
  const { notify } = useNotifications();
  const { addTask } = useTask();

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
        const complianceData = snapshot.docs.map(doc => ({
          userId: doc.id,
          ...doc.data(),
        } as StaffCompliance));

        // Initialize status for all records
        const initializedData = complianceData.map(record => initializeComplianceStatus(record));

        setAllStaffCompliance(initializedData);

        const ownCompliance = initializedData.find((c) => c.userId === currentUser.uid);
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

const updateCompliance = async (userId: string, data: StaffCompliance) => {
  try {
    const complianceRef = doc(collection(db, 'compliance'), userId);
    
    // Get current document data
    const currentDoc = await getDoc(complianceRef);
    const currentData = currentDoc.data() as StaffCompliance || {};

    // Prepare update data
    const updateData: { [key: string]: ComplianceItemType } = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'userId' || !value) return;

      const field = key as keyof StaffCompliance;
      const currentItem = currentData[field] as ComplianceItemType | undefined;

      if (key === 'dbsCheck' && value.type === 'compliance') {
        updateData[field] = {
          ...(currentItem || {}),
          type: 'compliance' as const,
          date: value.date,
          expiryDate: value.date ? Timestamp.fromDate(calculateDBSExpiryDate(value.date)) : null,
          status: value.expiryDate && isAfter(value.expiryDate.toDate(), new Date()) ? ('valid' as const) : ('expired' as const),
          notes: value.notes || '',
          evidence: currentItem?.evidence,
        } as ComplianceItem;
      } else if (
        [
          'healthCheck',
          'supervisionAgreement',
          'beneficiaryOnFile',
          'stressRiskAssessment',
          'albacMat',
          'dysphagia',
          'manualHandling',
          'basicLifeSupport',
          'donningAndDoffing',
          'cprScenario',
        ].includes(key)
      ) {
        const baseUpdate = {
          ...(currentItem || {}),
          date: value.date,
          expiryDate: value.date ? Timestamp.fromDate(calculateExpiryDate(value.date)) : null,
          status: value.expiryDate && isAfter(value.expiryDate.toDate(), new Date()) ? ('valid' as const) : ('expired' as const),
          notes: value.notes || '',
          evidence: currentItem?.evidence,
        };

        if (key === 'supervisionAgreement' || key === 'beneficiaryOnFile') {
          updateData[field] = {
            ...baseUpdate,
            type: 'signable' as const,
            signed: true,
          } as SignableItem;
        } else if (key === 'healthCheck') {
          updateData[field] = {
            ...baseUpdate,
            type: 'healthCheck' as const,
            completed: true,
            form: (currentItem as HealthCheckItem)?.form,
          } as HealthCheckItem;
        } else if (['albacMat', 'dysphagia', 'manualHandling', 'basicLifeSupport'].includes(key)) {
          updateData[field] = {
            ...baseUpdate,
            type: 'competency' as const,
            assessedBy: value.assessedBy || '',
            score: value.score || 0,
            assessment: (currentItem as CompetencyItem)?.assessment,
          } as CompetencyItem;
        } else {
          updateData[field] = {
            ...baseUpdate,
            type: 'compliance' as const,
          } as ComplianceItem;
        }
      }
    });

    // Update Firestore
    await setDoc(complianceRef, updateData, { merge: true });

    // Fetch updated document to ensure we have the latest state
    const updatedDoc = await getDoc(complianceRef);
    const updatedData = updatedDoc.data() as StaffCompliance;

    // Update local state with the fetched data
    if (userId === currentUser?.uid) {
      setStaffCompliance(prev => {
        if (!prev) return undefined;
        return initializeComplianceStatus({ ...prev, ...updatedData });
      });
    }

    // Update all staff compliance
    setAllStaffCompliance(prev => 
      prev.map(compliance => 
        compliance.userId === userId
          ? initializeComplianceStatus({ ...compliance, ...updatedData })
          : compliance
      )
    );

    await notify({
      userId,
      type: 'system',
      title: 'Compliance Updated',
      message: 'Your compliance records have been updated',
      priority: 'medium',
    });

  } catch (error) {
    console.error('Error updating compliance:', error);
    throw error;
  }
};

  const updateHealthCheck = async (userId: string, form: HealthCheckForm) => {
    try {
      const now = Timestamp.now();
      const healthCheckItem: HealthCheckItem = {
        type: 'healthCheck',
        date: now,
        expiryDate: Timestamp.fromDate(calculateExpiryDate(now)),
        completed: true,
        form,
        status: 'valid',
      };

      const updateData = {
        healthCheck: healthCheckItem,
      };

      // Update Firestore first
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      // Update local state after successful Firestore update
      if (userId === currentUser?.uid) {
        setStaffCompliance(prev => {
          if (!prev) return undefined;
          const updated = { ...prev, ...updateData };
          return initializeComplianceStatus(updated);
        });
      }

      setAllStaffCompliance(prev => 
        prev.map(compliance => 
          compliance.userId === userId
            ? initializeComplianceStatus({ ...compliance, ...updateData })
            : compliance
        )
      );

      await notify({
        userId,
        type: 'system',
        title: 'Health Check Completed',
        message: 'Your health check has been updated',
        priority: 'medium',
      });
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

      const updateData = {
        [agreementType]: signableItem,
      };

      // Update Firestore first
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      // Update local state after successful Firestore update
      if (userId === currentUser?.uid) {
        setStaffCompliance(prev => {
          if (!prev) return undefined;
          const updated = { ...prev, ...updateData };
          return initializeComplianceStatus(updated);
        });
      }

      setAllStaffCompliance(prev => 
        prev.map(compliance => 
          compliance.userId === userId
            ? initializeComplianceStatus({ ...compliance, ...updateData })
            : compliance
        )
      );

      await notify({
        userId,
        type: 'supervision',
        title: 'Agreement Signed',
        message: `${agreementType.split(/(?=[A-Z])/).join(' ')} has been signed`,
        priority: 'medium',
      });
    } catch (error) {
      console.error('Error signing agreement:', error);
      throw error;
    }
  };

  const uploadEvidence = async (userId: string, field: keyof StaffCompliance, file: File) => {
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `compliance/${userId}/${field}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      const evidence: ComplianceEvidence = {
        fileUrl: downloadUrl,
        fileName: file.name,
        uploadedAt: Timestamp.now(),
        uploadedBy: currentUser?.uid || '',
        fileSize: file.size,
        fileType: file.type,
      };

      const currentItem = staffCompliance?.[field] as ComplianceItem | undefined;
      if (!currentItem) return;

      const updatedItem = {
        ...currentItem,
        evidence,
      };

      await updateCompliance(userId, { [field]: updatedItem } as StaffCompliance);
    } catch (error) {
      console.error('Error uploading evidence:', error);
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
        status: isAfter(expiryDate.toDate(), new Date()) ? 'valid' : 'expired',
        type: 'dynamic',
      };

      const updateData = {
        dynamicItems: {
          [item.title]: newItem,
        },
      };

      // Update Firestore first
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, { dynamicItems: updateData.dynamicItems }, { merge: true });

      // Update local state after successful Firestore update
      if (userId === currentUser?.uid) {
        setStaffCompliance(prev => {
          if (!prev) return undefined;
          const updated = {
            ...prev,
            dynamicItems: {
              ...prev.dynamicItems,
              ...updateData.dynamicItems,
            },
          };
          return initializeComplianceStatus(updated);
        });
      }

      setAllStaffCompliance(prev => 
        prev.map(compliance => 
          compliance.userId === userId
            ? initializeComplianceStatus({
                ...compliance,
                dynamicItems: {
                  ...compliance.dynamicItems,
                  ...updateData.dynamicItems,
                },
              })
            : compliance
        )
      );

      await addTask({
        title: `Complete ${item.title}`,
        description: item.description,
        dueDate: expiryDate.toDate(),
        priority: 'medium',
        status: 'pending',
        category: 'compliance',
        assignedTo: userId,
      });

      await createNotification(
        userId,
        'task',
        'New Compliance Task',
        `You have been assigned a new compliance task: ${item.title}`,
        '/compliance'
      );

      await notify({
        userId,
        type: 'task',
        title: 'New Compliance Task',
        message: `You have been assigned: ${item.title}`,
        priority: 'medium',
      });
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
        status: updates.expiryDate 
          ? isAfter(updates.expiryDate.toDate(), new Date()) ? 'valid' : 'expired'
          : currentItem.expiryDate 
            ? isAfter(currentItem.expiryDate.toDate(), new Date()) ? 'valid' : 'expired'
            : 'valid'
      };

      const updateData = {
        dynamicItems: {
          [itemId]: updatedItem,
        },
      };

      // Update Firestore first
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, { dynamicItems: updateData.dynamicItems }, { merge: true });

      // Update local state after successful Firestore update
      if (userId === currentUser?.uid) {
        setStaffCompliance(prev => {
          if (!prev) return undefined;
          const updated = {
            ...prev,
            dynamicItems: {
              ...prev.dynamicItems,
              ...updateData.dynamicItems,
            },
          };
          return initializeComplianceStatus(updated);
        });
      }

      setAllStaffCompliance(prev => 
        prev.map(compliance => 
          compliance.userId === userId
            ? initializeComplianceStatus({
                ...compliance,
                dynamicItems: {
                  ...compliance.dynamicItems,
                  ...updateData.dynamicItems,
                },
              })
            : compliance
        )
      );

      await notify({
        userId,
        type: 'system',
        title: 'Dynamic Item Updated',
        message: `${itemId} has been updated`,
        priority: 'low',
      });
    } catch (error) {
      console.error('Error updating dynamic compliance item:', error);
      throw error;
    }
  };

  const removeDynamicItem = async (userId: string, itemId: string) => {
    try {
      const currentState = allStaffCompliance.find(c => c.userId === userId);
      if (!currentState?.dynamicItems) return;

      const { [itemId]: removed, ...remainingItems } = currentState.dynamicItems;

      // Update Firestore first
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(
        complianceRef,
        {
          dynamicItems: remainingItems
        },
        { merge: true }
      );

      // Update local state after successful Firestore update
      if (userId === currentUser?.uid) {
        setStaffCompliance(prev => {
          if (!prev) return undefined;
          const { [itemId]: removed, ...remaining } = prev.dynamicItems || {};
          const updated = {
            ...prev,
            dynamicItems: remaining,
          };
          return initializeComplianceStatus(updated);
        });
      }

      setAllStaffCompliance(prev => 
        prev.map(compliance => {
          if (compliance.userId !== userId) return compliance;
          const { [itemId]: removed, ...remaining } = compliance.dynamicItems || {};
          return initializeComplianceStatus({
            ...compliance,
            dynamicItems: remaining,
          });
        })
      );

      await notify({
        userId,
        type: 'system',
        title: 'Dynamic Item Removed',
        message: `${itemId} has been removed`,
        priority: 'low',
      });
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

      const evidence: ComplianceEvidence = {
        fileUrl: downloadUrl,
        fileName: file.name,
        uploadedAt: Timestamp.now(),
        uploadedBy: currentUser?.uid || '',
        fileSize: file.size,
        fileType: file.type,
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
        updateData = { [field]: signableItem };
      } else if (field === 'healthCheck') {
        const healthCheckItem: HealthCheckItem = {
          type: 'healthCheck',
          date: now,
          expiryDate,
          status: 'valid',
          completed: true,
        };
        updateData = { [field]: healthCheckItem };
      } else if (field === 'albacMat' || field === 'dysphagia' || field === 'manualHandling' || field === 'basicLifeSupport') {
        const competencyItem: CompetencyItem = {
          type: 'competency',
          date: now,
          expiryDate,
          status: 'valid',
          assessedBy: currentUser?.displayName || '',
          score: 5,
        };
        updateData = { [field]: competencyItem };
      } else if (field !== 'userId' && field !== 'site' && field !== 'dynamicItems') {
        const complianceItem: ComplianceItem = {
          type: 'compliance',
          date: now,
          expiryDate,
          status: 'valid',
        };
        updateData = { [field]: complianceItem };
      }

      // Update Firestore first
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      // Update local state after successful Firestore update
      if (userId === currentUser?.uid) {
        setStaffCompliance(prev => {
          if (!prev) return undefined;
          const updated = { ...prev, ...updateData };
          return initializeComplianceStatus(updated);
        });
      }

      setAllStaffCompliance(prev => 
        prev.map(compliance => 
          compliance.userId === userId
            ? initializeComplianceStatus({ ...compliance, ...updateData })
            : compliance
        )
      );

      // Create notification
      await createNotification(
        userId,
        'task',
        'Compliance Item Completed',
        `${String(field).split(/(?=[A-Z])/).join(' ')} has been marked as complete`,
        '/compliance'
      );

      // Notify user
      await notify({
        userId,
        type: 'task',
        title: 'Compliance Item Completed',
        message: `${String(field).split(/(?=[A-Z])/).join(' ')} has been marked as complete`,
        priority: 'low',
      });
    } catch (error) {
      console.error('Error completing compliance item:', error);
      throw error;
    }
  };

  const updateCompetencyAssessment = async (userId: string, assessment: CompetencyAssessment) => {
    try {
      const competencyItem: CompetencyItem = {
        type: 'competency',
        date: assessment.assessmentDate,
        expiryDate: assessment.expiryDate,
        status: isAfter(assessment.expiryDate.toDate(), new Date()) ? 'valid' : 'expired',
        assessedBy: assessment.assessedBy,
        score: assessment.score,
        assessment,
      };

      const updateData = {
        [assessment.type]: competencyItem,
      };

      // Update Firestore first
      const complianceRef = doc(collection(db, 'compliance'), userId);
      await setDoc(complianceRef, updateData, { merge: true });

      // Update local state after successful Firestore update
      if (userId === currentUser?.uid) {
        setStaffCompliance(prev => {
          if (!prev) return undefined;
          const updated = { ...prev, ...updateData };
          return initializeComplianceStatus(updated);
        });
      }

      setAllStaffCompliance(prev => 
        prev.map(compliance => 
          compliance.userId === userId
            ? initializeComplianceStatus({ ...compliance, ...updateData })
            : compliance
        )
      );

      await notify({
        userId,
        type: 'training',
        title: 'Competency Assessment Updated',
        message: `${assessment.type} assessment has been updated`,
        priority: 'medium',
      });
    } catch (error) {
      console.error('Error updating competency assessment:', error);
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
    updateCompetencyAssessment,
    staffCompliance,
    allStaffCompliance,
    loading,
    error,
  };

  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
};
