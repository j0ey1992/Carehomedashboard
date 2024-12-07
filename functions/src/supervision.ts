/* eslint-disable */
// @ts-nocheck
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { addMonths } from 'date-fns';

interface SupervisionRecord {
  id: string;
  staffId: string;
  supervisorId: string;
  date: admin.firestore.Timestamp;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  actionPoints?: {
    description: string;
    dueDate: admin.firestore.Timestamp;
    completed: boolean;
  }[];
  questionnaireSent: boolean;
  questionnaireCompleted: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
}

// Process supervision scheduling
export const processSupervsionScheduling = functions.firestore
  .document('supervisions/{supervisionId}')
  .onCreate(async (snap, context) => {
    const supervision = snap.data() as SupervisionRecord;
    const { staffId, supervisorId, date } = supervision;

    try {
      // Get staff and supervisor data
      const [staffDoc, supervisorDoc] = await Promise.all([
        admin.firestore().doc(`users/${staffId}`).get(),
        admin.firestore().doc(`users/${supervisorId}`).get(),
      ]);

      if (!staffDoc.exists || !supervisorDoc.exists) {
        throw new Error('Staff or supervisor not found');
      }

      const staff = staffDoc.data() as UserData;
      const supervisor = supervisorDoc.data() as UserData;

      // Create notifications
      const notifications = [
        {
          userId: staffId,
          type: 'supervision',
          title: 'Supervision Scheduled',
          message: `Your supervision with ${supervisor.name} is scheduled for ${date.toDate().toLocaleString()}`,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
        {
          userId: supervisorId,
          type: 'supervision',
          title: 'Supervision Scheduled',
          message: `Supervision with ${staff.name} is scheduled for ${date.toDate().toLocaleString()}`,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
      ];

      await Promise.all([
        // Create notifications
        ...notifications.map(notification =>
          admin.firestore().collection('notifications').add(notification)
        ),
        // Send email to staff
        staff.notificationPreferences.email &&
          sgMail.send({
            to: staff.email,
            from: functions.config().sendgrid.from_email,
            subject: 'Supervision Scheduled',
            templateId: functions.config().sendgrid.supervision_scheduled_template,
            dynamicTemplateData: {
              staffName: staff.name,
              supervisorName: supervisor.name,
              date: date.toDate().toLocaleString(),
              questionnaireLink: `/supervision/${snap.id}/questionnaire`,
            },
          }),
      ]);

      return { success: true };
    } catch (error) {
      console.error('Error in processSupervsionScheduling:', error);
      throw error;
    }
  });

// Process questionnaire submission
export const processQuestionnaireSubmission = functions.firestore
  .document('supervisionQuestionnaires/{questionnaireId}')
  .onCreate(async (snap, context) => {
    try {
      const supervisionId = snap.data().supervisionId;
      const supervisionDoc = await admin.firestore()
        .doc(`supervisions/${supervisionId}`)
        .get();

      if (!supervisionDoc.exists) {
        throw new Error('Supervision record not found');
      }

      const supervision = supervisionDoc.data() as SupervisionRecord;
      const [staffDoc, supervisorDoc] = await Promise.all([
        admin.firestore().doc(`users/${supervision.staffId}`).get(),
        admin.firestore().doc(`users/${supervision.supervisorId}`).get(),
      ]);

      if (!staffDoc.exists || !supervisorDoc.exists) {
        throw new Error('Staff or supervisor not found');
      }

      const staff = staffDoc.data() as UserData;
      const supervisor = supervisorDoc.data() as UserData;

      // Update supervision record
      await supervisionDoc.ref.update({
        questionnaireCompleted: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error in processQuestionnaireSubmission:', error);
      throw error;
    }
  });

// Process supervision completion
export const processSupervisionCompletion = functions.firestore
  .document('supervisions/{supervisionId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data() as SupervisionRecord;
    const oldData = change.before.data() as SupervisionRecord;

    // Only proceed if status changed to completed
    if (oldData.status !== 'completed' && newData.status === 'completed') {
      try {
        const [staffDoc, supervisorDoc] = await Promise.all([
          admin.firestore().doc(`users/${newData.staffId}`).get(),
          admin.firestore().doc(`users/${newData.supervisorId}`).get(),
        ]);

        if (!staffDoc.exists || !supervisorDoc.exists) {
          throw new Error('Staff or supervisor not found');
        }

        const staff = staffDoc.data() as UserData;
        const supervisor = supervisorDoc.data() as UserData;

        // Send email to staff
        if (staff.notificationPreferences.email) {
          await sgMail.send({
            to: staff.email,
            from: functions.config().sendgrid.from_email,
            subject: 'Supervision Summary',
            templateId: functions.config().sendgrid.supervision_summary_template,
            dynamicTemplateData: {
              staffName: staff.name,
              date: newData.date.toDate().toLocaleString(),
              notes: newData.notes,
              actionPoints: newData.actionPoints?.map(ap => ({
                description: ap.description,
                dueDate: ap.dueDate.toDate().toLocaleString(),
              })),
            },
          });
        }

        // Create action point tasks
        if (newData.actionPoints?.length) {
          const tasks = newData.actionPoints.map(ap => ({
            staffId: newData.staffId,
            supervisorId: newData.supervisorId,
            title: ap.description,
            dueDate: ap.dueDate,
            status: 'pending',
            type: 'supervision_action',
            supervisionId: change.after.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }));

          await Promise.all(
            tasks.map(task =>
              admin.firestore().collection('tasks').add(task)
            )
          );
        }

        return { success: true };
      } catch (error) {
        console.error('Error in processSupervisionCompletion:', error);
        throw error;
      }
    }

    return null;
  });

// Process scheduled supervision reminders
export const processScheduledSupervisionReminders = functions.pubsub
  .schedule('0 9 * * *') // Run daily at 9 AM
  .timeZone('Europe/London')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const query = await admin.firestore()
        .collection('supervisions')
        .where('status', '==', 'scheduled')
        .where('date', '<=', threeDaysFromNow)
        .get();

      const notifications = [];

      for (const doc of query.docs) {
        const supervision = doc.data() as SupervisionRecord;
        const [staffDoc, supervisorDoc] = await Promise.all([
          admin.firestore().doc(`users/${supervision.staffId}`).get(),
          admin.firestore().doc(`users/${supervision.supervisorId}`).get(),
        ]);

        if (!staffDoc.exists || !supervisorDoc.exists) continue;

        const staff = staffDoc.data() as UserData;
        const supervisor = supervisorDoc.data() as UserData;

        // Send reminders
        notifications.push(
          // Staff reminder
          staff.notificationPreferences.email &&
          sgMail.send({
            to: staff.email,
            from: functions.config().sendgrid.from_email,
            subject: 'Supervision Reminder',
            templateId: functions.config().sendgrid.supervision_reminder_template,
            dynamicTemplateData: {
              staffName: staff.name,
              supervisorName: supervisor.name,
              date: supervision.date.toDate().toLocaleString(),
              questionnaireLink: `/supervision/${doc.id}/questionnaire`,
            },
          }),

          // Supervisor reminder
          supervisor.notificationPreferences.email &&
          sgMail.send({
            to: supervisor.email,
            from: functions.config().sendgrid.from_email,
            subject: 'Supervision Reminder',
            templateId: functions.config().sendgrid.supervision_reminder_template,
            dynamicTemplateData: {
              staffName: staff.name,
              supervisorName: supervisor.name,
              date: supervision.date.toDate().toLocaleString(),
              supervisionLink: `/supervision/${doc.id}`,
            },
          })
        );

        // Create in-app notifications
        notifications.push(
          admin.firestore().collection('notifications').add({
            userId: supervision.staffId,
            type: 'supervision',
            title: 'Upcoming Supervision',
            message: `Your supervision is scheduled for ${supervision.date.toDate().toLocaleString()}`,
            read: false,
            timestamp: now,
          }),
          admin.firestore().collection('notifications').add({
            userId: supervision.supervisorId,
            type: 'supervision',
            title: 'Upcoming Supervision',
            message: `Supervision with ${staff.name} is scheduled for ${supervision.date.toDate().toLocaleString()}`,
            read: false,
            timestamp: now,
          })
        );
      }

      await Promise.all(notifications);
      return { success: true };
    } catch (error) {
      console.error('Error in processScheduledSupervisionReminders:', error);
      throw error;
    }
  });

// Migrate supervision records
export const migrateSupervisionRecords = functions.pubsub
  .schedule('0 0 1 * *') // Run monthly
  .timeZone('Europe/London')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const sixMonthsAgo = addMonths(now.toDate(), -6);

      const query = await admin.firestore()
        .collection('supervisions')
        .where('date', '<=', sixMonthsAgo)
        .where('status', '==', 'completed')
        .get();

      let batch = admin.firestore().batch();
      let count = 0;

      for (const doc of query.docs) {
        // Archive record
        const archiveRef = admin.firestore()
          .collection('archivedSupervisions')
          .doc(doc.id);

        batch.set(archiveRef, {
          ...doc.data(),
          archivedAt: now,
        });

        batch.delete(doc.ref);

        count++;

        // Commit batch every 500 operations
        if (count % 500 === 0) {
          await batch.commit();
          batch = admin.firestore().batch();
        }
      }

      // Commit any remaining operations
      if (count % 500 !== 0) {
        await batch.commit();
      }

      console.log(`Migrated ${count} supervision records`);
      return { success: true, count };
    } catch (error) {
      console.error('Error in migrateSupervisionRecords:', error);
      throw error;
    }
  });

// Update supervision statuses
export const updateSupervisionStatuses = functions.pubsub
  .schedule('0 * * * *') // Run hourly
  .timeZone('Europe/London')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();

      // Get supervisions that need status updates
      const query = await admin.firestore()
        .collection('supervisions')
        .where('status', '==', 'scheduled')
        .where('date', '<=', now)
        .get();

      let batch = admin.firestore().batch();
      let count = 0;

      for (const doc of query.docs) {
        const supervision = doc.data() as SupervisionRecord;

        // Update to completed if questionnaire is done
        if (supervision.questionnaireCompleted) {
          batch.update(doc.ref, {
            status: 'completed',
            updatedAt: now,
          });
        }
        // Update to cancelled if more than 24 hours past scheduled time
        else if (supervision.date.toMillis() + (24 * 60 * 60 * 1000) < now.toMillis()) {
          batch.update(doc.ref, {
            status: 'cancelled',
            updatedAt: now,
          });
        }

        count++;

        // Commit batch every 500 operations
        if (count % 500 === 0) {
          await batch.commit();
          batch = admin.firestore().batch();
        }
      }

      // Commit any remaining operations
      if (count % 500 !== 0) {
        await batch.commit();
      }

      console.log(`Updated ${count} supervision statuses`);
      return { success: true, count };
    } catch (error) {
      console.error('Error in updateSupervisionStatuses:', error);
      throw error;
    }
  });
