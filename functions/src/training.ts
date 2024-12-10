import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface TrainingRecord {
  staffId: string;
  staffName: string;
  courseTitle: string;
  completionDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expiring' | 'expired';
  location: string;
  category: string;
  recordType: 'training' | 'f2f' | 'supervision' | 'compliance';
  supervisionType?: string;
  requiresDiscussion: boolean;
  discussionCompleted?: boolean;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
  remindersSent: number;
  lastReminderDate?: Date;
  ragStatus?: string;
  statsCategory?: string;
  siteId?: string;
}

interface UploadResult {
  newRecords: number;
  updatedRecords: number;
  skippedRows: number;
  errors: string[];
}

// Function to process bulk training upload
export const processTrainingBulkUpload = onCall(
  { 
    timeoutSeconds: 540, // 9 minutes
    memory: '1GiB'
  }, 
  async (request) => {
    // Verify authenticated user
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be authenticated to upload training data'
      );
    }

    const data = request.data as { records: Partial<TrainingRecord>[], uploadedBy: string };
    const result: UploadResult = {
      newRecords: 0,
      updatedRecords: 0,
      skippedRows: 0,
      errors: []
    };

    const db = admin.firestore();
    const batch = db.batch();
    const processedIds = new Set<string>();

    try {
      // Process records in batches
      for (const record of data.records) {
        if (!record.staffId || !record.courseTitle) {
          result.skippedRows++;
          continue;
        }

        const recordId = `${record.staffId}_${record.courseTitle}`;
        
        // Skip duplicate records in the same upload
        if (processedIds.has(recordId)) {
          result.skippedRows++;
          continue;
        }
        processedIds.add(recordId);

        const recordRef = db.collection('training').doc(recordId);
        const recordDoc = await recordRef.get();

        const trainingData = {
          ...record,
          completionDate: record.completionDate ? Timestamp.fromDate(new Date(record.completionDate)) : null,
          expiryDate: record.expiryDate ? Timestamp.fromDate(new Date(record.expiryDate)) : null,
          lastReminderDate: record.lastReminderDate ? Timestamp.fromDate(new Date(record.lastReminderDate)) : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid
        };

        if (recordDoc.exists) {
          batch.update(recordRef, trainingData);
          result.updatedRecords++;
        } else {
          batch.set(recordRef, {
            ...trainingData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: request.auth.uid
          });
          result.newRecords++;
        }

        // Create task for F2F courses
        if (record.recordType === 'f2f') {
          const taskRef = db.collection('tasks').doc();
          batch.set(taskRef, {
            title: `Book ${record.courseTitle} for ${record.staffName}`,
            description: `Face-to-face training task: Book ${record.courseTitle} training for ${record.staffName}`,
            dueDate: record.expiryDate ? Timestamp.fromDate(new Date(record.expiryDate)) : 
                    Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            priority: record.status === 'expired' ? 'high' : record.status === 'expiring' ? 'medium' : 'low',
            status: 'pending',
            category: 'training',
            relatedRecordType: 'training',
            relatedRecordId: recordId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: request.auth.uid
          });
        }
      }

      // Commit all changes
      await batch.commit();

      return result;

    } catch (error) {
      console.error('Error processing training upload:', error);
      throw new HttpsError(
        'internal',
        'Error processing training upload',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

// Function to update training record
export const updateTrainingRecord = onRequest(
  { 
    timeoutSeconds: 60,
    cors: true
  },
  async (req, res) => {
    try {
      // Verify method
      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

      // Verify auth token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).send('Unauthorized');
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const { recordId, data } = req.body;
      if (!recordId || !data) {
        res.status(400).send('Missing required fields');
        return;
      }

      const recordRef = admin.firestore().collection('training').doc(recordId);
      await recordRef.update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decodedToken.uid
      });

      res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error updating training record:', error);
      res.status(500).send('Internal server error');
    }
  }
);

// Function to mark discussion as complete
export const markDiscussionComplete = onRequest(
  {
    timeoutSeconds: 60,
    cors: true
  },
  async (req, res) => {
    try {
      // Verify method
      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

      // Verify auth token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).send('Unauthorized');
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const { recordId } = req.body;
      if (!recordId) {
        res.status(400).send('Missing record ID');
        return;
      }

      const recordRef = admin.firestore().collection('training').doc(recordId);
      await recordRef.update({
        discussionCompleted: true,
        requiresDiscussion: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decodedToken.uid
      });

      res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error marking discussion complete:', error);
      res.status(500).send('Internal server error');
    }
  }
);

// Function to update notification preferences
export const updateNotificationPreferences = onRequest(
  {
    timeoutSeconds: 60,
    cors: true
  },
  async (req, res) => {
    try {
      // Verify method
      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

      // Verify auth token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).send('Unauthorized');
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const { staffId, preferences } = req.body;
      if (!staffId || !preferences) {
        res.status(400).send('Missing required fields');
        return;
      }

      const db = admin.firestore();
      const trainingRef = db.collection('training');
      const snapshot = await trainingRef.where('staffId', '==', staffId).get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          notificationPreferences: preferences,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: decodedToken.uid
        });
      });

      await batch.commit();
      res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).send('Internal server error');
    }
  }
);
