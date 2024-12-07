import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  where, 
  orderBy, 
  addDoc, 
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useUsers } from './UserContext';
import { createNotification } from '../utils/notifications';
import { 
  SicknessRecord, 
  SicknessContextType, 
  NewSicknessRecord, 
  TriggerStatus 
} from '../types/sickness';
import { useTask } from './TaskContext';

const SicknessContext = createContext<SicknessContextType | undefined>(undefined);

const TRIGGER_THRESHOLDS = {
  occurrences: 4,
  days: 10
};

// Helper function to safely convert Date/Timestamp to Date
const toDate = (value: Date | Timestamp | undefined): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return value.toDate();
};

export const useSickness = () => {
  const context = useContext(SicknessContext);
  if (!context) {
    throw new Error('useSickness must be used within a SicknessProvider');
  }
  return context;
};

export const SicknessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sicknessRecords, setSicknessRecords] = useState<SicknessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, userData, isAdmin } = useAuth();
  const { users, updateUser } = useUsers();
  const { addTask } = useTask();

  useEffect(() => {
    if (!currentUser || !userData) {
      setSicknessRecords([]);
      setLoading(false);
      return;
    }

    let q;
    const baseQuery = collection(db, 'sickness');
    
    // Different queries based on user role
    if (isAdmin) {
      // Admin can see all non-archived records
      q = query(
        baseQuery,
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );
    } else if (userData.role === 'manager' && userData.sites) {
      // Manager can only see records for their sites
      q = query(
        baseQuery,
        where('site', 'in', userData.sites),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Staff can only see their own records
      q = query(
        baseQuery,
        where('staffId', '==', currentUser.uid),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: SicknessRecord[] = [];
        snapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() } as SicknessRecord);
        });
        setSicknessRecords(records);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching sickness records:', err);
        setError('Failed to fetch sickness records');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userData, isAdmin]);

  // Calculate total sickness days for a staff member
  const calculateSicknessTotals = async (staffId: string): Promise<void> => {
    const staffRecords = sicknessRecords.filter(record => 
      record.staffId === staffId && record.type === 'sickness'
    );
    const today = new Date();
    let totalDays = 0;
    let sickDays = 0;

    staffRecords.forEach(record => {
      const start = toDate(record.startDate);
      const end = record.endDate ? toDate(record.endDate) : today;
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (record.status === 'completed') {
        totalDays += days;
        sickDays += days;
      }
    });

    const staffUser = users.find(u => u.id === staffId);
    if (staffUser) {
      const attendance = {
        ...staffUser.attendance,
        sickDays,
        totalDays,
        lateDays: staffUser.attendance?.lateDays || 0,
        attendanceRate: Math.max(0, 100 - (sickDays / totalDays * 100) || 100)
      };

      await updateUser(staffId, {
        attendance,
        sickness: sickDays
      });
    }
  };

  const detectPatterns = (records: SicknessRecord[]) => {
    const patterns: { type: string; description: string }[] = [];
    
    // Check for Monday/Friday patterns
    const dayOfWeekCounts = records.reduce((acc, record) => {
      const day = toDate(record.startDate).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    if ((dayOfWeekCounts[1] || 0) + (dayOfWeekCounts[5] || 0) > records.length * 0.5) {
      patterns.push({
        type: 'monday-friday',
        description: 'High occurrence of absences on Mondays/Fridays'
      });
    }

    // Check for regular intervals
    const sortedDates = records
      .map(r => toDate(r.startDate).getTime())
      .sort((a, b) => a - b);
    
    const intervals = sortedDates
      .slice(1)
      .map((date, i) => date - sortedDates[i]);
    
    const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const hasRegularPattern = intervals.every(interval => 
      Math.abs(interval - averageInterval) < 1000 * 60 * 60 * 24 * 7 // Within 7 days
    );

    if (hasRegularPattern && records.length > 2) {
      patterns.push({
        type: 'regular-interval',
        description: 'Regular pattern of absences detected'
      });
    }

    return patterns;
  };

  const getTriggerStatus = (staffId: string): TriggerStatus => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    
    // Only count sickness type records for trigger points
    const yearRecords = sicknessRecords.filter(record => 
      record.staffId === staffId &&
      record.type === 'sickness' &&
      toDate(record.startDate) >= yearStart
    );

    const totalDays = yearRecords.reduce((sum, record) => {
      const start = toDate(record.startDate);
      const end = record.endDate ? toDate(record.endDate) : today;
      return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);

    const occurrences = yearRecords.length;
    const hasReachedTrigger = totalDays > TRIGGER_THRESHOLDS.days || 
                             occurrences >= TRIGGER_THRESHOLDS.occurrences;
    const isNearingTrigger = !hasReachedTrigger && (
      occurrences >= TRIGGER_THRESHOLDS.occurrences - 1 || 
      totalDays >= TRIGGER_THRESHOLDS.days - 2
    );

    const patterns = detectPatterns(yearRecords);

    return { 
      occurrences, 
      totalDays, 
      isNearingTrigger,
      hasReachedTrigger,
      patterns 
    };
  };

  const createBackToWorkTask = async (record: SicknessRecord): Promise<void> => {
    const staffUser = users.find(u => u.id === record.staffId);
    const managerUser = users.find(u => u.id === staffUser?.managerId);

    if (!managerUser) {
      console.log('No manager found for staff:', staffUser);
      return;
    }

    await addTask({
      title: `Back to Work Interview - ${record.staffName}`,
      description: `Conduct back to work interview for ${record.staffName} following sickness absence`,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      priority: 'high',
      status: 'pending',
      assignedTo: managerUser.id,
      category: 'sickness',
      relatedRecordId: record.id,
      relatedRecordType: 'sickness',
      site: record.site,
    });
  };

  const createTriggerPointTask = async (record: SicknessRecord): Promise<void> => {
    const staffUser = users.find(u => u.id === record.staffId);
    const managerUser = users.find(u => u.id === staffUser?.managerId);

    if (!managerUser) {
      console.log('No manager found for staff:', staffUser);
      return;
    }

    const { occurrences, totalDays, patterns } = getTriggerStatus(record.staffId);

    await addTask({
      title: `Sickness Trigger Point Review - ${record.staffName}`,
      description: `Review required due to trigger points being reached:\n` +
                  `Occurrences: ${occurrences}/${TRIGGER_THRESHOLDS.occurrences}\n` +
                  `Total Days: ${totalDays}/${TRIGGER_THRESHOLDS.days}\n` +
                  (patterns.length > 0 ? `\nPatterns Detected:\n${patterns.map(p => `- ${p.description}`).join('\n')}` : ''),
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
      priority: 'high',
      status: 'pending',
      assignedTo: managerUser.id,
      category: 'sickness',
      relatedRecordId: record.id,
      relatedRecordType: 'sickness',
      site: record.site,
    });
  };

  const addSicknessRecord = async (record: NewSicknessRecord): Promise<string> => {
    try {
      const staffUser = users.find(u => u.id === record.staffId);
      
      if (!staffUser) {
        throw new Error('Staff user not found');
      }

      // Ensure we have the staff name and site
      const staffName = record.staffName || staffUser.name;
      const site = record.site || staffUser.site;

      // Create record data with null for undefined values (Firebase doesn't accept undefined)
      const recordData = {
        ...record,
        staffName,
        site,
        step: 0 as const, // Start with no steps
        endDate: record.endDate || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isArchived: false,
      };

      const docRef = await addDoc(collection(db, 'sickness'), recordData);

      // Update user's sickness totals
      if (record.type === 'sickness') {
        await calculateSicknessTotals(record.staffId);

        // Check trigger points and create task if needed
        const triggerStatus = getTriggerStatus(record.staffId);
        if (triggerStatus.hasReachedTrigger) {
          await createTriggerPointTask({
            id: docRef.id,
            ...recordData,
          } as SicknessRecord);

          await updateDoc(doc(db, 'sickness', docRef.id), { 
            step: 1 // Automatically progress to step 1 if trigger points reached
          });

          // Create notification for staff member about trigger points
          await createNotification(
            record.staffId,
            'system',
            'Sickness Trigger Points Reached',
            `You have reached sickness trigger points. A review meeting will be scheduled.`,
            '/sickness'
          );
        }
      }

      // Create notification for staff member
      await createNotification(
        record.staffId,
        'system',
        record.type === 'sickness' ? 'Sickness Record Added' : 'Unpaid Leave Record Added',
        `New ${record.type === 'sickness' ? 'sickness' : 'unpaid leave'} record added starting ${toDate(record.startDate).toLocaleDateString()}`,
        '/sickness'
      );

      return docRef.id;
    } catch (err) {
      console.error('Error adding sickness record:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to add sickness record');
    }
  };

  const updateSicknessRecord = async (id: string, updates: Partial<SicknessRecord>): Promise<void> => {
    try {
      const docRef = doc(db, 'sickness', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      // If the record exists and has a staffId, update totals for sickness records only
      const record = sicknessRecords.find(r => r.id === id);
      if (record && record.type === 'sickness') {
        await calculateSicknessTotals(record.staffId);
      }
    } catch (err) {
      console.error('Error updating sickness record:', err);
      throw new Error('Failed to update sickness record');
    }
  };

  const uploadReturnToWorkForm = async (recordId: string, file: File): Promise<void> => {
    try {
      const record = sicknessRecords.find(r => r.id === recordId);
      if (!record) throw new Error('Record not found');

      const fileRef = ref(storage, `returnToWork/${recordId}/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await updateSicknessRecord(recordId, {
        returnToWorkFormUrl: url
      });
    } catch (err) {
      console.error('Error uploading return to work form:', err);
      throw new Error('Failed to upload return to work form');
    }
  };

  const progressToNextStep = async (record: SicknessRecord): Promise<void> => {
    try {
      if (record.step >= 3 || record.type !== 'sickness') return;

      const nextStep = (record.step + 1) as 0 | 1 | 2 | 3;
      
      // Create back to work task when progressing to step 1
      if (nextStep === 1) {
        await createBackToWorkTask(record);
      }

      await updateSicknessRecord(record.id, {
        step: nextStep,
        status: nextStep === 3 ? 'completed' : record.status
      });

      // Create notification
      await createNotification(
        record.staffId,
        'system',
        'Sickness Case Updated',
        nextStep === 0 
          ? 'Your sickness case has been recorded'
          : `Your sickness case has progressed to step ${nextStep}`,
        '/sickness'
      );
    } catch (err) {
      console.error('Error progressing record:', err);
      throw new Error('Failed to progress record to next step');
    }
  };

  const archiveRecord = async (id: string): Promise<void> => {
    try {
      await updateSicknessRecord(id, {
        isArchived: true
      });
    } catch (err) {
      console.error('Error archiving record:', err);
      throw new Error('Failed to archive record');
    }
  };

  const scheduleReview = async (record: SicknessRecord, reviewDate: Date): Promise<void> => {
    try {
      await updateSicknessRecord(record.id, {
        status: 'review',
        reviewDate: Timestamp.fromDate(reviewDate),
      });

      // Create notification for staff member
      await createNotification(
        record.staffId,
        'system',
        'Sickness Review Scheduled',
        `Review scheduled for ${reviewDate.toLocaleDateString()}`,
        '/sickness'
      );
    } catch (err) {
      console.error('Error scheduling review:', err);
      throw new Error('Failed to schedule review');
    }
  };

  const completeSicknessRecord = async (id: string, endDate: Date): Promise<void> => {
    try {
      await updateSicknessRecord(id, {
        status: 'completed',
        endDate: Timestamp.fromDate(endDate),
        step: 3 as const
      });

      // Record exists and has been completed, update totals for sickness records only
      const record = sicknessRecords.find(r => r.id === id);
      if (record && record.type === 'sickness') {
        await calculateSicknessTotals(record.staffId);
      }
    } catch (err) {
      console.error('Error completing sickness record:', err);
      throw new Error('Failed to complete sickness record');
    }
  };

  const value = {
    sicknessRecords,
    loading,
    error,
    addSicknessRecord,
    updateSicknessRecord,
    scheduleReview,
    completeSicknessRecord,
    uploadReturnToWorkForm,
    progressToNextStep,
    archiveRecord,
    getTriggerStatus,
  };

  return (
    <SicknessContext.Provider value={value}>
      {children}
    </SicknessContext.Provider>
  );
};
