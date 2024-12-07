import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  getDocs,
  QuerySnapshot,
  FirestoreError,
  orderBy,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'
import { TrainingRecord, TrainingStats, UploadResult, StaffPerformance, NewUserData } from '../types'
import { parseTrainingExcel, validateTrainingData } from '../utils/excelParser'
import { createNotification } from '../utils/notifications'

// Import course lists from courseConstants
import {
  TRAINING_COURSES,
  F2F_COURSES,
  SUPERVISION_COURSES,
  COMPLIANCE_COURSES,
} from '../utils/courseConstants'

interface TrainingContextType {
  trainingRecords: TrainingRecord[];
  stats: TrainingStats;
  loading: boolean;
  error: Error | null;
  uploadTrainingData: (file: File, userData: NewUserData) => Promise<void>;
  deleteTrainingRecord: (id: string) => Promise<void>;
  updateTrainingRecord: (id: string, data: Partial<TrainingRecord>) => Promise<void>;
  markDiscussionComplete: (recordId: string) => Promise<void>;
  updateNotificationPreferences: (staffId: string, preferences: { email: boolean; sms: boolean }) => Promise<void>;
  sendManualNotification: (staffIds: string[], message: string, type: 'email' | 'sms' | 'both') => Promise<void>;
  scheduleNotifications: (staffId: string, schedule: { time: string; days: number[] }) => Promise<void>;
  isStaff: boolean;
  isManager: boolean;
  isAdmin: boolean;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined)

export function useTraining() {
  const context = useContext(TrainingContext)
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider')
  }
  return context
}

// Helper function to determine record type based on course title with exact matching
const determineRecordType = (courseTitle: string): TrainingRecord['recordType'] => {
  const normalizedTitle = courseTitle.trim()

  if (F2F_COURSES.includes(normalizedTitle)) {
    return 'f2f'
  }

  if (SUPERVISION_COURSES.includes(normalizedTitle)) {
    return 'supervision'
  }

  if (COMPLIANCE_COURSES.includes(normalizedTitle)) {
    return 'compliance'
  }

  if (TRAINING_COURSES.includes(normalizedTitle)) {
    return 'training'
  }

  return 'training'
}

export const TrainingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, isAdmin } = useAuth()
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([])
  const [stats, setStats] = useState<TrainingStats>({
    totalStaff: 0,
    totalRecords: 0,
    expiringCount: 0,
    expiredCount: 0,
    completionRate: 0,
    staffPerformance: {} as { [key: string]: StaffPerformance },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!currentUser || !userData) return

    let q;

    if (isAdmin) {
      // Admin can see all training records
      q = query(
        collection(db, 'training'),
        orderBy('expiryDate', 'asc')
      );
    } else if (userData.role === 'manager' && userData.sites) {
      // Manager can only see training records for their sites
      q = query(
        collection(db, 'training'),
        where('siteId', 'in', userData.sites),
        orderBy('expiryDate', 'asc')
      );
    } else {
      // Staff can only see their own training records
      q = query(
        collection(db, 'training'),
        where('staffId', '==', currentUser.uid),
        orderBy('expiryDate', 'asc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      {
        next: (snapshot: QuerySnapshot) => {
          try {
            const trainingData: TrainingRecord[] = []
            for (const doc of snapshot.docs) {
              const data = doc.data()
              const recordType = determineRecordType(data.courseTitle)
              const record: TrainingRecord = {
                id: doc.id,
                staffId: data.staffId,
                staffName: data.staffName,
                staffEmail: data.staffEmail,
                courseTitle: data.courseTitle,
                location: data.location || 'Unknown',
                category: data.category || 'Uncategorized',
                expiryDate: data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : new Date(data.expiryDate),
                status: data.status,
                completionDate: data.completionDate instanceof Timestamp ? data.completionDate.toDate() :
                                data.completionDate ? new Date(data.completionDate) : undefined,
                remindersSent: data.remindersSent || 0,
                lastReminderDate: data.lastReminderDate instanceof Timestamp ? data.lastReminderDate.toDate() :
                                 data.lastReminderDate ? new Date(data.lastReminderDate) : undefined,
                requiresDiscussion: data.requiresDiscussion || false,
                discussionCompleted: data.discussionCompleted || false,
                notificationPreferences: data.notificationPreferences || {
                  email: true,
                  sms: true,
                },
                notificationSchedule: data.notificationSchedule,
                ragStatus: data.ragStatus || '',
                statsCategory: data.statsCategory || '',
                recordType: recordType,
                isManuallyScheduled: data.isManuallyScheduled || false,
                supervisionType: data.supervisionType,
                supervisor: data.supervisor,
                notes: data.notes,
                concerns: data.concerns || [],
                actionPoints: data.actionPoints || [],
                trainer: data.trainer,
                siteId: data.siteId || data.site || '',
              }
              trainingData.push(record)
            }
            setTrainingRecords(trainingData)
            setStats(calculateStats(trainingData))
            setError(null)
            setLoading(false)
          } catch (err) {
            console.error('Error processing training records:', err)
            setError(err instanceof Error ? err : new Error('Failed to process training records'))
            setLoading(false)
          }
        },
        error: (error: FirestoreError) => {
          console.error('Error subscribing to training records:', error)
          setError(error)
          setLoading(false)
        }
      }
    )

    return () => unsubscribe()
  }, [currentUser, userData, isAdmin])

  const uploadTrainingData = async (file: File, userData: NewUserData) => {
    setLoading(true)
    setError(null)
    try {
      const parsedRecords = await parseTrainingExcel(file)
      const validationErrors = validateTrainingData(parsedRecords)
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors:\n${validationErrors.join('\n')}`)
      }
      const functions = getFunctions()
      const processUpload = httpsCallable<{
        records: Partial<TrainingRecord>[],
        uploadedBy: string,
        userData: NewUserData
      }, UploadResult>(functions, 'processTrainingBulkUpload')
      
      const now = new Date()
      const result = await processUpload({
        records: parsedRecords.map(record => ({
          ...record,
          siteId: userData?.site || '',
        })),
        uploadedBy: currentUser?.uid || '',
        userData: {
          ...userData,
          createdAt: now,
          updatedAt: now,
          lastLogin: now,
          authCreated: false,
          probationStatus: 'pending',
          trainingProgress: {
            week1Review: false,
            week4Supervision: false,
            week8Review: false,
            week12Supervision: false,
          }
        }
      })
      
      const uploadResult = result.data
      await createNotification(
        currentUser?.uid || '',
        'training',
        'Training Upload Complete',
        `Upload processed successfully:\n${uploadResult.updatedRecords} updated\n${uploadResult.newRecords} new\n${uploadResult.skippedRows} skipped`
      )
      if (uploadResult.errors.length > 0) {
        await createNotification(
          currentUser?.uid || '',
          'training',
          'Training Upload Errors',
          `There were ${uploadResult.errors.length} errors during the upload. Please check the error report.`
        )
      }
      setLoading(false)
    } catch (err) {
      console.error('Error uploading training data:', err)
      setError(err instanceof Error ? err : new Error('Failed to upload training data'))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteTrainingRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'training', id))
    } catch (err) {
      console.error('Error deleting training record:', err)
      throw err
    }
  }

  const updateTrainingRecord = async (id: string, data: Partial<TrainingRecord>) => {
    try {
      const docRef = doc(db, 'training', id)
      const firestoreData = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser?.uid,
        siteId: data.siteId || userData?.site || '',
      }
      await updateDoc(docRef, firestoreData)
    } catch (err) {
      console.error('Error updating training record:', err)
      throw err
    }
  }

  const markDiscussionComplete = async (recordId: string) => {
    try {
      await updateDoc(doc(db, 'training', recordId), {
        discussionCompleted: true,
        requiresDiscussion: false,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser?.uid,
      })
    } catch (err) {
      console.error('Error marking discussion complete:', err)
      throw err
    }
  }

  const updateNotificationPreferences = async (
    staffId: string,
    preferences: { email: boolean; sms: boolean }
  ) => {
    try {
      const q = query(collection(db, 'training'), where('staffId', '==', staffId))
      const snapshot = await getDocs(q)
      const updates = snapshot.docs.map(doc =>
        updateDoc(doc.ref, { notificationPreferences: preferences })
      )
      await Promise.all(updates)
    } catch (err) {
      console.error('Error updating notification preferences:', err)
      throw err
    }
  }

  const sendManualNotification = async (
    staffIds: string[],
    message: string,
    type: 'email' | 'sms' | 'both'
  ) => {
    try {
      const functions = getFunctions()
      const sendNotification = httpsCallable(functions, 'sendManualNotification')
      await sendNotification({ staffIds, message, type })
    } catch (err) {
      console.error('Error sending manual notification:', err)
      throw err
    }
  }

  const scheduleNotifications = async (
    staffId: string,
    schedule: { time: string; days: number[] }
  ) => {
    try {
      const q = query(collection(db, 'training'), where('staffId', '==', staffId))
      const snapshot = await getDocs(q)
      const updates = snapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          notificationSchedule: schedule,
          isManuallyScheduled: true,
          updatedAt: Timestamp.now(),
          updatedBy: currentUser?.uid,
        })
      )
      await Promise.all(updates)
    } catch (err) {
      console.error('Error scheduling notifications:', err)
      throw err
    }
  }

  // Enforce role-based access control
  const isStaff = userData?.role === 'staff'
  const isManager = userData?.role === 'manager'

  return (
    <TrainingContext.Provider
      value={{
        trainingRecords,
        stats,
        loading,
        error,
        uploadTrainingData,
        deleteTrainingRecord,
        updateTrainingRecord,
        markDiscussionComplete,
        updateNotificationPreferences,
        sendManualNotification,
        scheduleNotifications,
        isStaff,
        isManager,
        isAdmin,
      }}
    >
      {children}
    </TrainingContext.Provider>
  )
}

const calculateStats = (records: TrainingRecord[]): TrainingStats => {
  // Group records by staffId
  const staffGroups = new Map<string, TrainingRecord[]>()
  records.forEach(record => {
    if (!staffGroups.has(record.staffId)) {
      staffGroups.set(record.staffId, [] as TrainingRecord[])
    }
    staffGroups.get(record.staffId)?.push(record)
  })

  const stats: TrainingStats = {
    totalStaff: staffGroups.size,
    totalRecords: records.length,
    expiringCount: 0,
    expiredCount: 0,
    completionRate: 0,
    staffPerformance: {} as { [key: string]: StaffPerformance },
  }

  // Calculate performance for each staff member
  staffGroups.forEach((staffRecords, staffId) => {
    stats.staffPerformance[staffId] = {
      totalCourses: staffRecords.length,
      onTime: 0,
      late: 0,
      expired: 0,
      expiringCourses: [],
      expiredCourses: [],
    }
    const performance = stats.staffPerformance[staffId]
    staffRecords.forEach(record => {
      // Update status counts
      if (record.status === 'valid') {
        performance.onTime++
      } else if (record.status === 'expiring') {
        performance.late++
        performance.expiringCourses.push(record.courseTitle)
        stats.expiringCount++
      } else {
        performance.expired++
        performance.expiredCourses.push(record.courseTitle)
        stats.expiredCount++
      }
    })
  })

  // Calculate overall completion rate (excluding expired records)
  const validRecords = records.filter((r: TrainingRecord) => r.status === 'valid').length
  const totalActiveRecords = records.filter((r: TrainingRecord) => r.status !== 'expired').length
  stats.completionRate = totalActiveRecords > 0 ? (validRecords / totalActiveRecords) * 100 : 0

  return stats
}

export default TrainingContext
