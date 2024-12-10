import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';
import { toDate } from './utils';

// Initialize Twilio
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
);

interface TrainingRecord {
  staffId: string;
  staffName: string;
  staffEmail: string;
  courseTitle: string;
  expiryDate: admin.firestore.Timestamp;
  remindersSent: number;
  status: 'active' | 'expired' | 'completed';
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

// Check for expiring training records
export const checkExpiringTraining = onSchedule(
  {
    schedule: '0 9 * * *', // Run daily at 9 AM
    timeZone: 'Europe/London',
    memory: '1GiB',
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    
    // Define notification thresholds
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get all training records that need attention
    const query = await admin
      .firestore()
      .collection('training')
      .where('expiryDate', '<=', thirtyDaysFromNow)
      .where('remindersSent', '<', 5)
      .where('status', '==', 'active')
      .get();

    const batch = admin.firestore().batch();
    const notifications: any[] = [];
    const consolidatedNotifications = new Map<string, string[]>();

    for (const doc of query.docs) {
      const training = doc.data() as TrainingRecord;
      const expiryDate = toDate(training.expiryDate);
      let shouldSendReminder = false;
      let reminderType: 'initial' | 'followup14' | 'followup7' | 'expired' | 'final' = 'initial';

      // Determine reminder type based on expiry date and previous reminders
      if (training.remindersSent === 0 && expiryDate <= thirtyDaysFromNow) {
        shouldSendReminder = true;
        reminderType = 'initial';
      } else if (training.remindersSent === 1 && expiryDate <= fourteenDaysFromNow) {
        shouldSendReminder = true;
        reminderType = 'followup14';
      } else if (training.remindersSent === 2 && expiryDate <= sevenDaysFromNow) {
        shouldSendReminder = true;
        reminderType = 'followup7';
      } else if (training.remindersSent === 3 && expiryDate <= now.toDate()) {
        shouldSendReminder = true;
        reminderType = 'expired';
      } else if (training.remindersSent === 4 && expiryDate <= now.toDate()) {
        shouldSendReminder = true;
        reminderType = 'final';

        // Create management task for significant discussion
        await admin.firestore().collection('managementTasks').add({
          staffId: training.staffId,
          taskType: 'training_discussion',
          title: `Schedule discussion with ${training.staffName}`,
          description: `Training expired: ${training.courseTitle}`,
          priority: 'high',
          completed: false,
          createdAt: now,
          dueDate: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Due in 7 days
          ),
        });
      }

      if (shouldSendReminder) {
        // Update training record
        batch.update(doc.ref, {
          remindersSent: training.remindersSent + 1,
          lastReminderDate: now,
          status: reminderType === 'expired' || reminderType === 'final' ? 'expired' : 'active',
        });

        // Consolidate notifications per user
        if (!consolidatedNotifications.has(training.staffId)) {
          consolidatedNotifications.set(training.staffId, []);
        }
        consolidatedNotifications.get(training.staffId)?.push(
          `${training.courseTitle} (expires ${expiryDate.toLocaleDateString()})`
        );

        // Get user notification preferences
        const userDoc = await admin
          .firestore()
          .collection('users')
          .doc(training.staffId)
          .get();

        if (userDoc.exists) {
          const user = userDoc.data() as UserData;

          // Create notification message based on reminder type
          const notificationData = createNotificationMessage(reminderType, training);

          // Create in-app notification
          notifications.push({
            userId: training.staffId,
            type: 'training',
            title: notificationData.title,
            message: notificationData.message,
            read: false,
            timestamp: now,
            link: '/training',
            priority: reminderType === 'final' || reminderType === 'expired' ? 'high' : 'medium',
          });

          // Send email if enabled
          if (user.notificationPreferences.email) {
            try {
              await sgMail.send({
                to: user.email,
                from: process.env.SENDGRID_FROM_EMAIL || '',
                subject: notificationData.title,
                templateId: process.env[`SENDGRID_TRAINING_${reminderType.toUpperCase()}_TEMPLATE_ID`],
                dynamicTemplateData: {
                  subject: notificationData.title,
                  staffName: training.staffName,
                  courseTitle: training.courseTitle,
                  expiryDate: expiryDate.toLocaleDateString(),
                  message: notificationData.message,
                },
              });
            } catch (error) {
              console.error('Error sending email:', error);
            }
          }

          // Send SMS if enabled
          if (user.notificationPreferences.sms && user.phoneNumber) {
            try {
              await twilioClient.messages.create({
                body: `${notificationData.title}\n\n${notificationData.message}`,
                to: user.phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER || '',
              });
            } catch (error) {
              console.error('Error sending SMS:', error);
            }
          }
        }
      }
    }

    await batch.commit();
    await Promise.all(notifications.map(notification =>
      admin.firestore().collection('notifications').add(notification)
    ));

    // Create consolidated reports for management
    const managementReport = {
      date: now,
      type: 'training_compliance',
      expiringSoon: Array.from(consolidatedNotifications.entries()).map(([staffId, courses]) => ({
        staffId,
        courses,
      })),
    };

    await admin.firestore().collection('reports').add(managementReport);
  }
);

function createNotificationMessage(
  reminderType: 'initial' | 'followup14' | 'followup7' | 'expired' | 'final',
  training: TrainingRecord
) {
  const messages = {
    initial: {
      title: 'Training Expiring Soon',
      message: `Your training for ${training.courseTitle} expires in 30 days (${toDate(
        training.expiryDate
      ).toLocaleDateString()})`,
    },
    followup14: {
      title: 'Training Expiration Reminder',
      message: `Your training for ${training.courseTitle} expires in 14 days (${toDate(
        training.expiryDate
      ).toLocaleDateString()})`,
    },
    followup7: {
      title: 'Urgent: Training Expiring Soon',
      message: `Your training for ${training.courseTitle} expires in 7 days (${toDate(
        training.expiryDate
      ).toLocaleDateString()})`,
    },
    expired: {
      title: 'Training Expired',
      message: `Your training for ${training.courseTitle} has expired. Immediate action required.`,
    },
    final: {
      title: 'Final Warning: Training Compliance',
      message: `FINAL NOTICE: Your training for ${
        training.courseTitle
      } remains expired. A significant discussion will be scheduled.`,
    },
  };

  return messages[reminderType];
}
