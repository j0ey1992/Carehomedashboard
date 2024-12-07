import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';
import { toDate } from './utils';
import { F2F_COURSES } from '../../src/utils/courseConstants';

export interface TrainingRecord {
  id?: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  courseTitle: string;
  expiryDate: admin.firestore.Timestamp;
  remindersSent: number;
  status: 'active' | 'expired' | 'completed';
  completionDate?: admin.firestore.Timestamp;
  renewalDate?: admin.firestore.Timestamp;
  recordType?: string;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  createdBy?: string;
  updatedBy?: string;
  siteId?: string;
}

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  notificationPreferences: NotificationPreferences;
}

// Helper function to merge training records
const mergeTrainingRecords = async (
  existingRecord: FirebaseFirestore.DocumentData,
  newRecord: TrainingRecord
): Promise<Partial<TrainingRecord>> => {
  // If new record has a completion date and existing doesn't, or new completion date is later
  if (
    (newRecord.completionDate && !existingRecord.completionDate) ||
    (newRecord.completionDate && existingRecord.completionDate && 
     newRecord.completionDate.toMillis() > existingRecord.completionDate.toMillis())
  ) {
    return {
      ...existingRecord,
      completionDate: newRecord.completionDate,
      status: 'completed',
      expiryDate: newRecord.expiryDate,
    };
  }
  
  // Keep existing record if it's more up to date
  return existingRecord;
};

// Helper function to consolidate notifications
const consolidateNotifications = (records: TrainingRecord[]): string => {
  const completed = records.filter(r => r.status === 'completed');
  const expired = records.filter(r => r.status === 'expired');
  const expiring = records.filter(r => r.status === 'active');

  let message = '';

  if (completed.length > 0) {
    message += `\nCompleted Courses:\n${completed.map(r => `- ${r.courseTitle}`).join('\n')}`;
  }

  if (expired.length > 0) {
    message += `\n\nExpired Courses:\n${expired.map(r => `- ${r.courseTitle}`).join('\n')}`;
  }

  if (expiring.length > 0) {
    message += `\n\nUpcoming Courses:\n${expiring.map(r => `- ${r.courseTitle} (expires: ${r.expiryDate.toDate().toLocaleDateString()})`).join('\n')}`;
  }

  return message;
};

// Helper function to ensure staff record exists
const ensureStaffRecord = async (training: TrainingRecord) => {
  const staffRef = admin.firestore().collection('staff').doc(training.staffId);
  const staffDoc = await staffRef.get();

  if (!staffDoc.exists) {
    // Create new staff record with default values
    await staffRef.set({
      id: training.staffId,
      name: training.staffName,
      email: training.staffEmail,
      roles: ['Care Staff'], // Default role
      contractedHours: 37.5, // Default hours
      preferences: {
        preferredShifts: ['7:30-14:30', '14:30-21:30'], // Default shifts
        unavailableDates: [],
        maxShiftsPerWeek: 5,
        preferredRoles: ['Care Staff'],
        flexibleHours: true,
        nightShiftOnly: false
      },
      performanceMetrics: {
        attendanceRate: 100,
        punctualityScore: 100,
        shiftCompletionRate: 100,
        feedbackScore: 100
      },
      trainingStatus: {
        [training.courseTitle]: training.status === 'completed'
      }
    });
  } else {
    // Update existing staff record's training status
    await staffRef.update({
      [`trainingStatus.${training.courseTitle}`]: training.status === 'completed'
    });
  }
};

// Process training data upload
export const processTrainingUpload = functions.firestore
  .document('training/{trainingId}')
  .onCreate(async (snap, context) => {
    const training = snap.data() as TrainingRecord;

    // Ensure staff record exists in staff collection
    await ensureStaffRecord(training);

    // Check if this is an F2F course and update recordType if needed
    const isF2F = F2F_COURSES.some(course => 
      course.toLowerCase() === training.courseTitle.toLowerCase()
    );
    if (isF2F && (!training.recordType || training.recordType !== 'f2f')) {
      await snap.ref.update({ recordType: 'f2f' });
    }

    // Get user document
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(training.staffId)
      .get();

    if (!userDoc.exists) {
      console.error('User document not found');
      return;
    }

    const user = userDoc.data() as UserData;
    const notificationPreferences = user?.notificationPreferences || {
      email: true,
      sms: true,
    };

    // Check for existing training records for this staff and course
    const existingRecordQuery = await admin
      .firestore()
      .collection('training')
      .where('staffId', '==', training.staffId)
      .where('courseTitle', '==', training.courseTitle)
      .where('__name__', '!=', context.params.trainingId)
      .get();

    // If existing record found, merge the data
    if (!existingRecordQuery.empty) {
      const existingRecord = existingRecordQuery.docs[0];
      const mergedData = await mergeTrainingRecords(existingRecord.data(), training);
      
      // Update existing record and delete the new one
      await existingRecord.ref.update(mergedData);
      await snap.ref.delete();
      
      // Update historical records
      await admin.firestore().collection('trainingHistory').add({
        staffId: training.staffId,
        courseTitle: training.courseTitle,
        action: 'merged',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          expiryDate: mergedData.expiryDate,
          status: mergedData.status,
          recordType: isF2F ? 'f2f' : training.recordType,
        },
      });

      return;
    }

    // Get all training records for this staff member
    const allStaffRecords = await admin
      .firestore()
      .collection('training')
      .where('staffId', '==', training.staffId)
      .get();

    const staffRecords = allStaffRecords.docs.map(doc => doc.data() as TrainingRecord);
    const notificationMessage = consolidateNotifications([...staffRecords, training]);

    // Create consolidated notification
    await admin.firestore().collection('notifications').add({
      userId: training.staffId,
      type: 'training',
      title: 'Training Records Update',
      message: notificationMessage,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      link: '/training',
    });

    // Send consolidated email notification
    if (notificationPreferences.email) {
      try {
        const config = functions.config();
        if (config && config.sendgrid && config.sendgrid.from_email && config.sendgrid.training_template_id) {
          await sgMail.send({
            to: training.staffEmail,
            from: config.sendgrid.from_email,
            subject: 'Training Records Update',
            templateId: config.sendgrid.training_template_id,
            dynamicTemplateData: {
              staffName: training.staffName,
              message: notificationMessage,
            },
          });
        }
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }

    // Send consolidated SMS notification
    if (notificationPreferences.sms && user?.phoneNumber) {
      try {
        const config = functions.config();
        if (config && config.twilio && config.twilio.account_sid && config.twilio.auth_token && config.twilio.phone_number) {
          const twilioClient = new Twilio(config.twilio.account_sid, config.twilio.auth_token);
          await twilioClient.messages.create({
            body: `Hi ${training.staffName}, your training records have been updated:\n${notificationMessage}`,
            to: user.phoneNumber,
            from: config.twilio.phone_number,
          });
        }
      } catch (error) {
        console.error('Error sending SMS:', error);
      }
    }

    // Update historical records
    await admin.firestore().collection('trainingHistory').add({
      staffId: training.staffId,
      courseTitle: training.courseTitle,
      action: 'added',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        expiryDate: training.expiryDate,
        status: training.status,
        recordType: isF2F ? 'f2f' : training.recordType,
      },
    });
  });

// Process face-to-face course bookings
export const processCourseBooking = functions.firestore
  .document('courseBookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    const { staffId, courseName, date, location, link, materials } = booking;

    const staffDoc = await admin
      .firestore()
      .collection('users')
      .doc(staffId)
      .get();

    if (!staffDoc.exists) {
      console.error('Staff document not found');
      return;
    }

    const staff = staffDoc.data() as UserData;

    // Create immediate notification
    await admin.firestore().collection('notifications').add({
      userId: staffId,
      type: 'course',
      title: 'Course Booking Confirmed',
      message: `You have been booked on ${courseName} on ${toDate(date).toLocaleString()}`,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      link: `/training/courses/${context.params.bookingId}`,
    });

    // Send immediate email notification
    if (staff?.email) {
      try {
        const config = functions.config();
        if (config && config.sendgrid && config.sendgrid.from_email && config.sendgrid.course_booking_template_id) {
          await sgMail.send({
            to: staff.email,
            from: config.sendgrid.from_email,
            subject: 'Course Booking Confirmed',
            templateId: config.sendgrid.course_booking_template_id,
            dynamicTemplateData: {
              staffName: staff.name,
              courseName,
              date: toDate(date).toLocaleString(),
              location,
              link,
              materials,
            },
          });
        }
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }

    // Schedule reminder notifications
    const sevenDayReminder = new Date(toDate(date));
    sevenDayReminder.setDate(sevenDayReminder.getDate() - 7);

    const oneDayReminder = new Date(toDate(date));
    oneDayReminder.setDate(oneDayReminder.getDate() - 1);

    // Create scheduled reminders
    await admin.firestore().collection('scheduledNotifications').add({
      userId: staffId,
      type: 'courseReminder',
      scheduledFor: admin.firestore.Timestamp.fromDate(sevenDayReminder),
      sent: false,
      data: {
        courseName,
        date,
        location,
        link,
        materials,
        reminderType: '7day',
      },
    });

    await admin.firestore().collection('scheduledNotifications').add({
      userId: staffId,
      type: 'courseReminder',
      scheduledFor: admin.firestore.Timestamp.fromDate(oneDayReminder),
      sent: false,
      data: {
        courseName,
        date,
        location,
        link,
        materials,
        reminderType: '1day',
      },
    });
  });

// Fix F2F records and process scheduled course reminders
export const processScheduledTasks = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/London')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    // Fix F2F records
    const trainingRef = admin.firestore().collection('training');
    const trainingSnapshot = await trainingRef.get();
    const trainingBatch = admin.firestore().batch();
    let fixedCount = 0;

    trainingSnapshot.forEach(doc => {
      const data = doc.data() as TrainingRecord;
      const isF2F = F2F_COURSES.some(course => 
        course.toLowerCase() === data.courseTitle.toLowerCase()
      );

      // Update records that should be F2F but aren't marked as such
      if (isF2F && (!data.recordType || data.recordType !== 'f2f')) {
        trainingBatch.update(doc.ref, { recordType: 'f2f' });
        fixedCount++;
      }
    });

    if (fixedCount > 0) {
      await trainingBatch.commit();
      console.log(`Updated ${fixedCount} F2F records`);
    }

    // Process scheduled reminders
    const scheduledReminders = await admin
      .firestore()
      .collection('scheduledNotifications')
      .where('type', '==', 'courseReminder')
      .where('sent', '==', false)
      .where('scheduledFor', '<=', now)
      .get();

    const reminderBatch = admin.firestore().batch();

    for (const doc of scheduledReminders.docs) {
      const reminder = doc.data();
      const { userId, data } = reminder;

      const userDoc = await admin
        .firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) continue;

      const user = userDoc.data() as UserData;
      const reminderText = data.reminderType === '7day'
        ? `Reminder: Your course "${data.courseName}" is in 7 days`
        : `Reminder: Your course "${data.courseName}" is tomorrow`;

      // Send email reminder
      if (user.notificationPreferences.email) {
        try {
          const config = functions.config();
          if (config && config.sendgrid && config.sendgrid.from_email && config.sendgrid.course_reminder_template_id) {
            await sgMail.send({
              to: user.email,
              from: config.sendgrid.from_email,
              subject: 'Course Reminder',
              templateId: config.sendgrid.course_reminder_template_id,
              dynamicTemplateData: {
                staffName: user.name,
                courseName: data.courseName,
                date: toDate(data.date).toLocaleString(),
                location: data.location,
                link: data.link,
                materials: data.materials,
                reminderType: data.reminderType,
              },
            });
          }
        } catch (error) {
          console.error('Error sending email:', error);
        }
      }

      // Send SMS reminder
      if (user.notificationPreferences.sms && user.phoneNumber) {
        try {
          const config = functions.config();
          if (config && config.twilio && config.twilio.account_sid && config.twilio.auth_token && config.twilio.phone_number) {
            const twilioClient = new Twilio(config.twilio.account_sid, config.twilio.auth_token);
            await twilioClient.messages.create({
              body: `${reminderText} on ${toDate(data.date).toLocaleString()}. Location: ${data.location}`,
              to: user.phoneNumber,
              from: config.twilio.phone_number,
            });
          }
        } catch (error) {
          console.error('Error sending SMS:', error);
        }
      }

      // Create in-app notification
      await admin.firestore().collection('notifications').add({
        userId,
        type: 'courseReminder',
        title: reminderText,
        message: `Your course is scheduled for ${toDate(data.date).toLocaleString()} at ${data.location}`,
        read: false,
        timestamp: now,
        link: `/training/courses/${doc.id}`,
      });

      // Mark reminder as sent
      reminderBatch.update(doc.ref, { sent: true });
    }

    await reminderBatch.commit();
  });



