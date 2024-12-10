import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';
import { toDate } from './utils';

// Initialize Twilio
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
);

interface ScheduledMessage {
  id: string;
  type: 'email' | 'sms' | 'both';
  subject: string;
  message: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  recipients: string[]; // User IDs
  recipientGroups?: string[]; // Group IDs
  active: boolean;
  lastSent?: admin.firestore.Timestamp;
  variables?: {
    [key: string]: string;
  };
  template?: string;
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
  groups?: string[];
  role?: string;
}

interface MassMessageData {
  type: 'email' | 'sms' | 'both';
  subject: string;
  message: string;
  recipients?: string[];
  recipientGroups?: string[];
  template?: string;
  variables?: {
    [key: string]: string;
  };
}

// Process scheduled messages
export const processScheduledMessages = onSchedule(
  {
    schedule: '*/15 * * * *', // Run every 15 minutes
    timeZone: 'Europe/London',
    memory: '1GiB',
  },
  async () => {
    const now = new Date();
    const query = await admin
      .firestore()
      .collection('scheduledMessages')
      .where('active', '==', true)
      .get();

    for (const doc of query.docs) {
      const message = doc.data() as ScheduledMessage;
      let shouldSend = false;

      // Check if message should be sent based on frequency
      switch (message.frequency) {
        case 'once':
          shouldSend = !message.lastSent;
          break;
        case 'daily':
          shouldSend = !message.lastSent || 
            toDate(message.lastSent).getDate() !== now.getDate();
          break;
        case 'weekly':
          shouldSend = !message.lastSent && 
            now.getDay() === message.dayOfWeek;
          break;
        case 'monthly':
          shouldSend = !message.lastSent && 
            now.getDate() === message.dayOfMonth;
          break;
      }

      if (shouldSend) {
        // Get all recipients
        const recipientIds = new Set(message.recipients);

        // Add users from groups if any
        if (message.recipientGroups?.length) {
          const groupUsers = await admin
            .firestore()
            .collection('users')
            .where('groups', 'array-contains-any', message.recipientGroups)
            .get();

          groupUsers.docs.forEach(doc => recipientIds.add(doc.id));
        }

        // Get user details
        const userDocs = await Promise.all(
          Array.from(recipientIds).map(id =>
            admin.firestore().collection('users').doc(id).get()
          )
        );

        const users = userDocs
          .filter(doc => doc.exists)
          .map(doc => ({ id: doc.id, ...doc.data() })) as UserData[];

        // Process message for each user
        for (const user of users) {
          // Replace variables in message
          let processedMessage = message.message;
          let processedSubject = message.subject;

          if (message.variables) {
            const userData = {
              name: user.name,
              email: user.email,
              ...message.variables,
            };

            for (const [key, value] of Object.entries(userData)) {
              const regex = new RegExp(`{${key}}`, 'g');
              processedMessage = processedMessage.replace(regex, value);
              processedSubject = processedSubject.replace(regex, value);
            }
          }

          // Create in-app notification
          await admin.firestore().collection('notifications').add({
            userId: user.id,
            type: 'message',
            title: processedSubject,
            message: processedMessage,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Send email if enabled
          if ((message.type === 'email' || message.type === 'both') && 
              user.notificationPreferences.email) {
            try {
              if (message.template) {
                await sgMail.send({
                  to: user.email,
                  from: process.env.SENDGRID_FROM_EMAIL || '',
                  subject: processedSubject,
                  templateId: message.template,
                  dynamicTemplateData: {
                    subject: processedSubject,
                    message: processedMessage,
                    userName: user.name,
                  },
                });
              } else {
                await sgMail.send({
                  to: user.email,
                  from: process.env.SENDGRID_FROM_EMAIL || '',
                  subject: processedSubject,
                  text: processedMessage,
                  html: processedMessage,
                });
              }
            } catch (error) {
              console.error('Error sending email:', error);
            }
          }

          // Send SMS if enabled
          if ((message.type === 'sms' || message.type === 'both') && 
              user.notificationPreferences.sms && 
              user.phoneNumber) {
            try {
              await twilioClient.messages.create({
                body: `${processedSubject}\n\n${processedMessage}`,
                to: user.phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER || '',
              });
            } catch (error) {
              console.error('Error sending SMS:', error);
            }
          }
        }

        // Update last sent timestamp
        await doc.ref.update({
          lastSent: admin.firestore.FieldValue.serverTimestamp(),
          active: message.frequency === 'once' ? false : true,
        });
      }
    }
  }
);

// Send immediate mass message
export const sendMassMessage = onCall<MassMessageData>(
  { 
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const {
      type,
      subject,
      message,
      recipients,
      recipientGroups,
      template,
      variables,
    } = request.data;

    // Verify sender has permission
    const senderDoc = await admin
      .firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    const senderData = senderDoc.data() as UserData;
    if (!senderDoc.exists || !['admin', 'manager'].includes(senderData.role || '')) {
      throw new HttpsError(
        'permission-denied',
        'User does not have permission to send mass messages'
      );
    }

    // Get all recipients
    const recipientIds = new Set(recipients || []);

    // Add users from groups if any
    if (recipientGroups?.length) {
      const groupUsers = await admin
        .firestore()
        .collection('users')
        .where('groups', 'array-contains-any', recipientGroups)
        .get();

      groupUsers.docs.forEach(doc => recipientIds.add(doc.id));
    }

    // Get user details
    const userDocs = await Promise.all(
      Array.from(recipientIds).map(id =>
        admin.firestore().collection('users').doc(id).get()
      )
    );

    const users = userDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() })) as UserData[];

    // Send messages
    const results = await Promise.allSettled(
      users.flatMap(user => {
        const promises = [];

        // Process variables
        let processedMessage = message;
        let processedSubject = subject;

        if (variables) {
          const userData = {
            name: user.name,
            email: user.email,
            ...variables,
          };

          for (const [key, value] of Object.entries(userData)) {
            const regex = new RegExp(`{${key}}`, 'g');
            processedMessage = processedMessage.replace(regex, value);
            processedSubject = processedSubject.replace(regex, value);
          }
        }

        // Create in-app notification
        promises.push(
          admin.firestore().collection('notifications').add({
            userId: user.id,
            type: 'message',
            title: processedSubject,
            message: processedMessage,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          })
        );

        // Send email if enabled
        if ((type === 'email' || type === 'both') && 
            user.notificationPreferences.email) {
          if (template) {
            promises.push(
              sgMail.send({
                to: user.email,
                from: process.env.SENDGRID_FROM_EMAIL || '',
                subject: processedSubject,
                templateId: template,
                dynamicTemplateData: {
                  subject: processedSubject,
                  message: processedMessage,
                  userName: user.name,
                },
              })
            );
          } else {
            promises.push(
              sgMail.send({
                to: user.email,
                from: process.env.SENDGRID_FROM_EMAIL || '',
                subject: processedSubject,
                text: processedMessage,
                html: processedMessage,
              })
            );
          }
        }

        // Send SMS if enabled
        if ((type === 'sms' || type === 'both') && 
            user.notificationPreferences.sms && 
            user.phoneNumber) {
          promises.push(
            twilioClient.messages.create({
              body: `${processedSubject}\n\n${processedMessage}`,
              to: user.phoneNumber,
              from: process.env.TWILIO_PHONE_NUMBER || '',
            })
          );
        }

        return promises;
      })
    );

    // Create audit log
    await admin.firestore().collection('auditLogs').add({
      type: 'mass_message',
      sender: request.auth.uid,
      messageType: type,
      recipientCount: users.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      subject,
      template,
    });

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: true,
      stats: {
        total: results.length,
        successful,
        failed,
      },
    };
  }
);
