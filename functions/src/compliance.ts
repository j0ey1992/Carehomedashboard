import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';

type ComplianceItemKey = 
  'dbsCheck' | 'healthCheck' | 'supervisionAgreement' | 'beneficiaryOnFile' | 
  'induction' | 'stressRiskAssessment' | 'albacMat' | 'donningAndDoffing' | 'cprScenario';

interface ComplianceItem {
  completed?: boolean;
  signed?: boolean;
  date?: admin.firestore.Timestamp;
  expiryDate?: admin.firestore.Timestamp;
  status: 'valid' | 'expired' | 'pending';
  assessedBy?: string;
  score?: number;
  answers?: {
    [key: string]: string | boolean | number;
  };
}

interface StaffCompliance {
  userId: string;
  siteId?: string;
  dbsCheck: ComplianceItem & {
    date: admin.firestore.Timestamp;
    expiryDate: admin.firestore.Timestamp;
  };
  healthCheck: ComplianceItem;
  supervisionAgreement: ComplianceItem;
  beneficiaryOnFile: ComplianceItem;
  induction: ComplianceItem;
  stressRiskAssessment: ComplianceItem;
  albacMat: ComplianceItem;
  donningAndDoffing: ComplianceItem;
  cprScenario: ComplianceItem;
}

interface StaffData {
  email: string;
  name: string;
  role?: string;
  siteId?: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const db = admin.firestore();

const checkItemExpiry = async (
  userId: string,
  staffName: string,
  staffEmail: string,
  itemName: string,
  itemKey: ComplianceItemKey,
  item: ComplianceItem,
  now: admin.firestore.Timestamp,
  thirtyDaysFromNow: admin.firestore.Timestamp,
  batch: admin.firestore.WriteBatch,
  staffRole?: string,
  managerId?: string
) => {
  if (item.expiryDate && item.status === 'valid') {
    // Check if expired or expiring
    if (item.expiryDate.toMillis() <= now.toMillis()) {
      // Update status to expired
      batch.update(db.collection('compliance').doc(userId), {
        [`${itemKey}.status`]: 'expired'
      });
    } else if (item.expiryDate.toMillis() <= thirtyDaysFromNow.toMillis()) {
      // Calculate days until expiry
      const daysUntilExpiry = Math.ceil(
        (item.expiryDate.toMillis() - now.toMillis()) / (24 * 60 * 60 * 1000)
      );

      // Determine task assignee based on item type and staff role
      const assigneeId = (itemKey === 'dbsCheck' || itemKey === 'albacMat') ? managerId || userId : userId;
      const taskTitle = `${itemName} Expiring - ${staffName}`;
      const taskDescription = (itemKey === 'dbsCheck' || itemKey === 'albacMat') ?
        `Please arrange ${itemName.toLowerCase()} renewal for ${staffName}.` :
        `${itemName} for ${staffName} will expire in ${daysUntilExpiry} days. Please arrange renewal.`;

      // Create task
      const taskRef = db.collection('tasks').doc();
      batch.set(taskRef, {
        title: taskTitle,
        description: taskDescription,
        dueDate: item.expiryDate,
        priority: 'high',
        status: 'pending',
        category: 'compliance',
        assignedTo: assigneeId,
        relatedRecordId: userId,
        relatedRecordType: 'compliance',
        createdAt: now,
        updatedAt: now,
      });

      // Create notification
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        userId,
        type: 'task',
        title: `${itemName} Expiring`,
        message: `Your ${itemName} will expire in ${daysUntilExpiry} days. Please contact your manager to arrange renewal.`,
        link: '/compliance',
        read: false,
        createdAt: now,
        timestamp: now,
        priority: 'high',
      });

      // Send email notification
      const msg = {
        to: staffEmail,
        from: 'notifications@carehome.com',
        subject: `${itemName} Expiring Soon`,
        templateId: 'compliance-expiry-notification',
        dynamicTemplateData: {
          staffName,
          itemName,
          daysUntilExpiry,
          expiryDate: item.expiryDate.toDate().toLocaleDateString(),
        },
      };

      await sgMail.send(msg);
    }
  }
};

// Daily check for expiring compliance items
export const checkComplianceExpiry = functions.pubsub
  .schedule('0 0 * * *') // Run daily at midnight
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const thirtyDaysFromNow = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + THIRTY_DAYS_MS
      );

      const complianceSnapshot = await db.collection('compliance').get();
      const batch = db.batch();
      
      for (const doc of complianceSnapshot.docs) {
        const compliance = doc.data() as StaffCompliance;
        
        // Get staff details for notifications
        const staffDoc = await db.collection('users').doc(compliance.userId).get();
        const staffData = staffDoc.data() as StaffData;

        // Get manager ID if staff has a siteId
        let managerId: string | undefined;
        if (staffData.siteId) {
          const managersSnapshot = await db.collection('users')
            .where('role', '==', 'manager')
            .where('siteId', '==', staffData.siteId)
            .limit(1)
            .get();
          
          if (!managersSnapshot.empty) {
            managerId = managersSnapshot.docs[0].id;
          }
        }

        // Check each compliance item
        const items: Array<{ name: string; key: ComplianceItemKey }> = [
          { name: 'DBS Check', key: 'dbsCheck' },
          { name: 'Health Check', key: 'healthCheck' },
          { name: 'Supervision Agreement', key: 'supervisionAgreement' },
          { name: 'Beneficiary', key: 'beneficiaryOnFile' },
          { name: 'Induction', key: 'induction' },
          { name: 'Stress Assessment', key: 'stressRiskAssessment' },
          { name: 'Albac Mat', key: 'albacMat' },
          { name: 'Donning and Doffing', key: 'donningAndDoffing' },
          { name: 'CPR Scenario', key: 'cprScenario' }
        ];

        for (const item of items) {
          await checkItemExpiry(
            compliance.userId,
            staffData.name,
            staffData.email,
            item.name,
            item.key,
            compliance[item.key],
            now,
            thirtyDaysFromNow,
            batch,
            staffData.role,
            managerId
          );
        }
      }

      await batch.commit();
      console.log('Compliance expiry check completed successfully');
    } catch (error) {
      console.error('Error checking compliance expiry:', error);
      throw error;
    }
  });

// Handle compliance record updates
export const onComplianceUpdate = functions.firestore
  .document('compliance/{userId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data() as StaffCompliance;
    const previousData = change.before.data() as StaffCompliance;
    const userId = context.params.userId;

    try {
      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      // Check each compliance item for status changes
      const items: Array<{ name: string; key: ComplianceItemKey }> = [
        { name: 'DBS Check', key: 'dbsCheck' },
        { name: 'Health Check', key: 'healthCheck' },
        { name: 'Supervision Agreement', key: 'supervisionAgreement' },
        { name: 'Beneficiary', key: 'beneficiaryOnFile' },
        { name: 'Induction', key: 'induction' },
        { name: 'Stress Assessment', key: 'stressRiskAssessment' },
        { name: 'Albac Mat', key: 'albacMat' },
        { name: 'Donning and Doffing', key: 'donningAndDoffing' },
        { name: 'CPR Scenario', key: 'cprScenario' }
      ];

      for (const item of items) {
        const newItem = newData[item.key];
        const previousItem = previousData[item.key];

        if (previousItem?.status !== newItem?.status) {
          // If status changed to valid, close any related tasks
          if (newItem?.status === 'valid') {
            const tasksSnapshot = await db.collection('tasks')
              .where('relatedRecordId', '==', userId)
              .where('relatedRecordType', '==', 'compliance')
              .where('status', '!=', 'completed')
              .get();

            tasksSnapshot.docs.forEach(doc => {
              batch.update(doc.ref, {
                status: 'completed',
                completedAt: now,
                updatedAt: now,
              });
            });
          }

          // Create activity log
          const activityRef = db.collection('activities').doc();
          batch.set(activityRef, {
            type: 'compliance',
            action: 'update',
            userId: userId,
            details: {
              field: `${item.key}.status`,
              oldValue: previousItem?.status,
              newValue: newItem?.status,
            },
            timestamp: now,
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error handling compliance update:', error);
      throw error;
    }
  });

// Create initial compliance record for new users
export const onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data() as StaffData;
    const userId = context.params.userId;
    const now = admin.firestore.Timestamp.now();

    try {
      await db.collection('compliance').doc(userId).set({
        userId: userId,
        siteId: userData.siteId,
        dbsCheck: {
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        healthCheck: {
          completed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        supervisionAgreement: {
          signed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        beneficiaryOnFile: {
          completed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        induction: {
          completed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        stressRiskAssessment: {
          completed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        albacMat: {
          completed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        donningAndDoffing: {
          completed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
        cprScenario: {
          completed: false,
          date: null,
          expiryDate: null,
          status: 'pending',
        },
      });

      // Create initial compliance tasks
      const batch = db.batch();

      // Get manager ID if staff has a siteId
      let managerId: string | undefined;
      if (userData.siteId) {
        const managersSnapshot = await db.collection('users')
          .where('role', '==', 'manager')
          .where('siteId', '==', userData.siteId)
          .limit(1)
          .get();
        
        if (!managersSnapshot.empty) {
          managerId = managersSnapshot.docs[0].id;
        }
      }

      // Create tasks for each compliance item
      const items: Array<{ 
        name: string; 
        key: ComplianceItemKey; 
        daysToComplete: number;
        assignToManager?: boolean;
      }> = [
        { name: 'DBS Check', key: 'dbsCheck', daysToComplete: 7, assignToManager: true },
        { name: 'Health Check', key: 'healthCheck', daysToComplete: 14 },
        { name: 'Supervision Agreement', key: 'supervisionAgreement', daysToComplete: 7 },
        { name: 'Beneficiary', key: 'beneficiaryOnFile', daysToComplete: 7 },
        { name: 'Induction', key: 'induction', daysToComplete: 14 },
        { name: 'Stress Assessment', key: 'stressRiskAssessment', daysToComplete: 14 },
        { name: 'Albac Mat', key: 'albacMat', daysToComplete: 14, assignToManager: true },
        { name: 'Donning and Doffing', key: 'donningAndDoffing', daysToComplete: 14 },
        { name: 'CPR Scenario', key: 'cprScenario', daysToComplete: 14 }
      ];

      items.forEach(item => {
        const taskRef = db.collection('tasks').doc();
        batch.set(taskRef, {
          title: `Complete ${item.name} - ${userData.name}`,
          description: `New staff member ${userData.name} requires ${item.name} completion.`,
          dueDate: admin.firestore.Timestamp.fromMillis(now.toMillis() + (item.daysToComplete * 24 * 60 * 60 * 1000)),
          priority: 'high',
          status: 'pending',
          category: 'compliance',
          assignedTo: item.assignToManager && managerId ? managerId : userId,
          relatedRecordId: userId,
          relatedRecordType: 'compliance',
          createdAt: now,
          updatedAt: now,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error creating initial compliance record:', error);
      throw error;
    }
  });
