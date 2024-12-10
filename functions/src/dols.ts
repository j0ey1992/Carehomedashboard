import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';
import { toDate } from './utils';

// Initialize Twilio
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
);

interface DoLSRecord {
  id: string;
  residentName: string;
  managerId: string;
  expiryDate: admin.firestore.Timestamp;
  status: 'active' | 'expired' | 'renewed';
  remindersSent: number;
  lastReminderDate?: admin.firestore.Timestamp;
  documents: {
    url: string;
    name: string;
    uploadDate: admin.firestore.Timestamp;
  }[];
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
}

// Check for expiring DoLS
export const checkExpiringDoLS = onSchedule(
  {
    schedule: '0 9 * * *', // Run daily at 9 AM
    timeZone: 'Europe/London',
    memory: '1GiB',
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

    const query = await admin
      .firestore()
      .collection('dols')
      .where('expiryDate', '<=', thirtyDaysFromNow)
      .where('remindersSent', '<', 3)
      .where('status', '==', 'active')
      .get();

    const batch = admin.firestore().batch();
    const notifications: any[] = [];

    for (const doc of query.docs) {
      const dols = doc.data() as DoLSRecord;
      const expiryDate = toDate(dols.expiryDate);
      let shouldSendReminder = false;
      let reminderType: 'initial' | 'followup' | 'final' = 'initial';

      // Determine reminder type based on expiry date and previous reminders
      if (dols.remindersSent === 0 && expiryDate <= thirtyDaysFromNow) {
        shouldSendReminder = true;
        reminderType = 'initial';
      } else if (dols.remindersSent === 1 && expiryDate <= fourteenDaysFromNow) {
        shouldSendReminder = true;
        reminderType = 'followup';
      } else if (dols.remindersSent === 2 && expiryDate <= now.toDate()) {
        shouldSendReminder = true;
        reminderType = 'final';
      }

      if (shouldSendReminder) {
        // Update DoLS record
        batch.update(doc.ref, {
          remindersSent: dols.remindersSent + 1,
          lastReminderDate: now,
          status: reminderType === 'final' ? 'expired' : 'active',
        });

        // Get manager notification preferences
        const managerDoc = await admin
          .firestore()
          .collection('users')
          .doc(dols.managerId)
          .get();

        if (managerDoc.exists) {
          const manager = managerDoc.data() as UserData;
          const notificationData = createNotificationMessage(reminderType, dols);

          // Create in-app notification
          notifications.push({
            userId: dols.managerId,
            type: 'dols',
            title: notificationData.title,
            message: notificationData.message,
            read: false,
            timestamp: now,
            link: '/dols',
            priority: reminderType === 'final' ? 'high' : 'medium',
          });

          // Send email if enabled
          if (manager.notificationPreferences.email) {
            try {
              const emailContent = `<p>Dear ${manager.name},</p>
              <p>${notificationData.message}</p>
              <p>Please take necessary action to ensure compliance.</p>
              <p>Expiry Date: ${expiryDate.toLocaleDateString()}</p>`;

              await sgMail.send({
                to: manager.email,
                from: process.env.SENDGRID_FROM_EMAIL || '',
                subject: notificationData.title,
                text: notificationData.message,
                html: emailContent,
                templateId: process.env[`SENDGRID_DOLS_${reminderType.toUpperCase()}_TEMPLATE_ID`],
                dynamicTemplateData: {
                  managerName: manager.name,
                  residentName: dols.residentName,
                  expiryDate: expiryDate.toLocaleDateString(),
                  message: notificationData.message,
                },
              });
            } catch (error) {
              console.error('Error sending email:', error);
            }
          }

          // Send SMS if enabled
          if (manager.notificationPreferences.sms && manager.phoneNumber) {
            try {
              await twilioClient.messages.create({
                body: `${notificationData.title}\n\n${notificationData.message}`,
                to: manager.phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER || '',
              });
            } catch (error) {
              console.error('Error sending SMS:', error);
            }
          }

          // Create task for renewal
          await admin.firestore().collection('managementTasks').add({
            managerId: dols.managerId,
            taskType: 'dols_renewal',
            title: `Renew DoLS for ${dols.residentName}`,
            description: `DoLS authorization expires on ${expiryDate.toLocaleDateString()}`,
            priority: reminderType === 'final' ? 'critical' : 'high',
            completed: false,
            createdAt: now,
            dueDate: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Due in 7 days
            ),
          });
        }
      }
    }

    await batch.commit();
    await Promise.all(notifications.map(notification =>
      admin.firestore().collection('notifications').add(notification)
    ));
  }
);

function createNotificationMessage(
  reminderType: 'initial' | 'followup' | 'final',
  dols: DoLSRecord
) {
  const messages = {
    initial: {
      title: 'DoLS Expiring Soon',
      message: `DoLS authorization for ${dols.residentName} expires in 30 days (${toDate(
        dols.expiryDate
      ).toLocaleDateString()})`,
    },
    followup: {
      title: 'DoLS Expiration Reminder',
      message: `DoLS authorization for ${dols.residentName} expires in 14 days (${toDate(
        dols.expiryDate
      ).toLocaleDateString()})`,
    },
    final: {
      title: 'URGENT: DoLS Authorization Expired',
      message: `DoLS authorization for ${dols.residentName} has expired. Immediate action required.`,
    },
  };

  return messages[reminderType];
}

// Process DoLS document uploads
export const processDoLSDocumentUpload = onObjectFinalized(
  {
    bucket: process.env.STORAGE_BUCKET,
    memory: '1GiB',
  },
  async (event) => {
    if (!event.data.name?.startsWith('dols/')) return;

    const filePath = event.data.name;
    const fileName = filePath.split('/').pop();
    const dolsId = filePath.split('/')[1]; // Assuming path format: dols/{dolsId}/{fileName}

    if (!fileName || !dolsId) return;

    const downloadUrl = `https://storage.googleapis.com/${event.data.bucket}/${filePath}`;

    // Update DoLS record with new document
    await admin
      .firestore()
      .collection('dols')
      .doc(dolsId)
      .update({
        documents: admin.firestore.FieldValue.arrayUnion({
          url: downloadUrl,
          name: fileName,
          uploadDate: admin.firestore.FieldValue.serverTimestamp(),
        }),
      });

    // Create audit log
    await admin.firestore().collection('auditLogs').add({
      type: 'dols_document_upload',
      dolsId,
      fileName,
      uploadDate: admin.firestore.FieldValue.serverTimestamp(),
      downloadUrl,
    });
  }
);
