import * as admin from 'firebase-admin';
import { TrainingRecord } from './training';

type ShiftRole = 'Driver' | 'Shift Leader' | 'Care Staff';
type ShiftTime = '7:30-14:30' | '14:30-21:30' | '21:30-7:30';

interface UploadError {
  row: number;
  column: string;
  value: string;
  issue: string;
  suggestion: string;
}

interface UploadResult {
  success: boolean;
  updatedRecords: number;
  newRecords: number;
  skippedRows: number;
  errors: UploadError[];
  processingDetails: {
    totalRows: number;
    processedAt: admin.firestore.Timestamp;
    uploadedBy: string;
  };
}

interface ProcessedRecord {
  status: 'updated' | 'new' | 'skipped';
  record?: TrainingRecord;
  error?: UploadError;
}

interface ExtendedTrainingRecord extends TrainingRecord {
  location?: string;
  category?: string;
  requiresDiscussion?: boolean;
  discussionCompleted?: boolean;
  isManuallyScheduled?: boolean;
  concerns?: string[];
  actionPoints?: string[];
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
  };
}

interface NewUserData {
  contractedHours: number;
  annualLeave: number;
  sickness: number;
  skills: ShiftRole[];
  email: string;
  phoneNumber: string;
  site: string;
}

interface StaffPreferences {
  preferredShifts: ShiftTime[];
  unavailableDates: string[];
  maxShiftsPerWeek: number;
  preferredRoles: ShiftRole[];
  flexibleHours: boolean;
  nightShiftOnly: boolean;
}

interface FirestoreTrainingRecord extends Omit<ExtendedTrainingRecord, 'id'> {
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  createdBy: string;
  updatedBy: string;
}

export async function processTrainingBulkUpload(
  data: {
    records: Partial<ExtendedTrainingRecord>[],
    uploadedBy: string,
    userData: NewUserData
  }
): Promise<UploadResult> {
  const { records, uploadedBy, userData } = data;
  const result: UploadResult = {
    success: true,
    updatedRecords: 0,
    newRecords: 0,
    skippedRows: 0,
    errors: [],
    processingDetails: {
      totalRows: records.length,
      processedAt: admin.firestore.Timestamp.now(),
      uploadedBy
    }
  };

  const batch = admin.firestore().batch();
  const processedRecords: ProcessedRecord[] = [];

  // Process each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2; // Adding 2 to account for header row and 0-based index

    try {
      // Validate required fields
      if (!record.staffName || !record.courseTitle) {
        result.errors.push({
          row: rowNumber,
          column: !record.staffName ? 'Staff Name' : 'Course Title',
          value: 'Missing',
          issue: 'Required field missing',
          suggestion: 'Please provide all required fields'
        });
        processedRecords.push({ status: 'skipped', error: result.errors[result.errors.length - 1] });
        continue;
      }

      // Check for existing record
      const existingRecords = await admin
        .firestore()
        .collection('training')
        .where('staffName', '==', record.staffName)
        .where('courseTitle', '==', record.courseTitle)
        .get();

      if (!existingRecords.empty) {
        // Update existing record
        const existingDoc = existingRecords.docs[0];
        const existingData = existingDoc.data() as FirestoreTrainingRecord;

        // Only update if new record is more recent
        const existingCompletionDate = existingData.completionDate?.toDate();
        const newCompletionDate = record.completionDate instanceof Date ? record.completionDate : undefined;
        
        if (newCompletionDate && (!existingCompletionDate || 
            newCompletionDate.getTime() > existingCompletionDate.getTime())) {
          const updateData: Partial<FirestoreTrainingRecord> = {
            ...record,
            updatedAt: admin.firestore.Timestamp.now(),
            updatedBy: uploadedBy,
            completionDate: newCompletionDate ? admin.firestore.Timestamp.fromDate(newCompletionDate) : undefined,
            expiryDate: record.expiryDate instanceof Date ? admin.firestore.Timestamp.fromDate(record.expiryDate) : existingData.expiryDate,
          };
          batch.update(existingDoc.ref, updateData);
          processedRecords.push({ status: 'updated', record: record as TrainingRecord });
          result.updatedRecords++;
        } else {
          result.errors.push({
            row: rowNumber,
            column: 'Completion Date',
            value: record.completionDate?.toString() || 'N/A',
            issue: 'Existing record is more recent',
            suggestion: 'No update needed'
          });
          processedRecords.push({ status: 'skipped', error: result.errors[result.errors.length - 1] });
        }
      } else {
        // Create new record with default values
        if (!record.staffId) {
          // Generate a consistent user ID from staff name
          record.staffId = `user_${record.staffName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        }

        // Default staff preferences
        const staffPreferences: StaffPreferences = {
          preferredShifts: ['7:30-14:30', '14:30-21:30'],
          unavailableDates: [],
          maxShiftsPerWeek: 5,
          preferredRoles: userData.skills,
          flexibleHours: true,
          nightShiftOnly: false
        };

        // Create or update user in users collection
        const userRef = admin.firestore().collection('users').doc(record.staffId);
        batch.set(userRef, {
          id: record.staffId,
          name: record.staffName,
          email: userData.email || `${record.staffId}@carehome.com`,
          role: 'staff',
          roles: userData.skills,
          phoneNumber: userData.phoneNumber,
          site: userData.site,
          sites: [userData.site],
          contractedHours: userData.contractedHours,
          annualLeave: userData.annualLeave,
          sickness: userData.sickness,
          preferences: staffPreferences,
          performanceMetrics: {
            attendanceRate: 100,
            punctualityScore: 100,
            shiftCompletionRate: 100,
            feedbackScore: 100
          },
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          lastLogin: admin.firestore.Timestamp.now(),
          authCreated: false,
          notificationPreferences: {
            email: true,
            sms: true,
          },
          probationStatus: 'pending',
          trainingProgress: {
            week1Review: false,
            week4Supervision: false,
            week8Review: false,
            week12Supervision: false,
          },
        }, { merge: true });

        const newRecord: FirestoreTrainingRecord = {
          staffId: record.staffId,
          staffName: record.staffName,
          staffEmail: userData.email || `${record.staffId}@carehome.com`,
          courseTitle: record.courseTitle,
          location: record.location || 'Unknown',
          category: record.category || 'Uncategorized',
          expiryDate: record.expiryDate instanceof Date ? 
            admin.firestore.Timestamp.fromDate(record.expiryDate) : 
            admin.firestore.Timestamp.fromDate(new Date()),
          status: record.status || 'active',
          completionDate: record.completionDate instanceof Date ? 
            admin.firestore.Timestamp.fromDate(record.completionDate) : undefined,
          remindersSent: 0,
          requiresDiscussion: false,
          discussionCompleted: false,
          notificationPreferences: {
            email: true,
            sms: true,
          },
          isManuallyScheduled: false,
          concerns: [],
          actionPoints: [],
          recordType: record.recordType || 'training',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          createdBy: uploadedBy,
          updatedBy: uploadedBy,
          siteId: userData.site,
        };

        const newDocRef = admin.firestore().collection('training').doc();
        batch.set(newDocRef, newRecord);

        // Convert Timestamps back to Dates for the frontend
        const frontendRecord: TrainingRecord = {
          id: newDocRef.id,
          staffId: newRecord.staffId,
          staffName: newRecord.staffName,
          staffEmail: newRecord.staffEmail,
          courseTitle: newRecord.courseTitle,
          expiryDate: newRecord.expiryDate,
          status: newRecord.status,
          remindersSent: newRecord.remindersSent,
          completionDate: newRecord.completionDate,
          recordType: newRecord.recordType,
          siteId: newRecord.siteId,
        };

        processedRecords.push({ status: 'new', record: frontendRecord });
        result.newRecords++;
      }
    } catch (error) {
      console.error('Error processing record:', error);
      result.errors.push({
        row: rowNumber,
        column: 'Multiple',
        value: 'N/A',
        issue: 'Processing error',
        suggestion: 'Please check data format and try again'
      });
      processedRecords.push({ status: 'skipped', error: result.errors[result.errors.length - 1] });
    }
  }

  // Commit all changes
  try {
    await batch.commit();
  } catch (error) {
    console.error('Error committing batch:', error);
    result.success = false;
    return result;
  }

  // Generate error report if there are any errors
  if (result.errors.length > 0) {
    await generateErrorReport(result, uploadedBy);
  }

  // Generate processing summary
  await generateProcessingSummary(result, processedRecords, uploadedBy);

  result.skippedRows = result.errors.length;
  return result;
}

async function generateErrorReport(result: UploadResult, uploadedBy: string) {
  const errorReport = {
    type: 'training_upload_errors',
    timestamp: admin.firestore.Timestamp.now(),
    uploadedBy,
    errors: result.errors,
    totalErrors: result.errors.length,
    processingDetails: result.processingDetails
  };

  await admin.firestore().collection('reports').add(errorReport);
}

async function generateProcessingSummary(
  result: UploadResult,
  processedRecords: ProcessedRecord[],
  uploadedBy: string
) {
  const summary = {
    type: 'training_upload_summary',
    timestamp: admin.firestore.Timestamp.now(),
    uploadedBy,
    stats: {
      totalRecords: result.processingDetails.totalRows,
      updatedRecords: result.updatedRecords,
      newRecords: result.newRecords,
      skippedRows: result.skippedRows,
      successRate: (
        ((result.updatedRecords + result.newRecords) / 
        result.processingDetails.totalRows) * 100
      ).toFixed(2)
    },
    recordDetails: processedRecords.map(pr => ({
      status: pr.status,
      staffName: pr.record?.staffName || 'N/A',
      courseTitle: pr.record?.courseTitle || 'N/A',
      error: pr.error
    }))
  };

  await admin.firestore().collection('reports').add(summary);

  // Create notification for admin
  await admin.firestore().collection('notifications').add({
    type: 'training_upload',
    title: 'Training Upload Processing Complete',
    message: `Processed ${result.processingDetails.totalRows} records:\n` +
             `- ${result.updatedRecords} updated\n` +
             `- ${result.newRecords} new\n` +
             `- ${result.skippedRows} skipped\n` +
             `Success rate: ${summary.stats.successRate}%`,
    timestamp: admin.firestore.Timestamp.now(),
    read: false,
    priority: result.errors.length > 0 ? 'high' : 'medium',
    link: '/training/reports'
  });
}
