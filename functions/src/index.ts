import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as sgMail from '@sendgrid/mail';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid
sgMail.setApiKey(functions.config().sendgrid.api_key);

// Export all functions
export {
  processTrainingUpload,
  processCourseBooking,
  processScheduledTasks
} from './training';

export {
  checkExpiringTraining
} from './trainingReminders';

export {
  processTrainingBulkUpload
} from './trainingUploadProcessor';

export * from './auth';
export * from './dols';
export * from './messaging';
export * from './compliance';
export * from './supervision';
export * from './trainingMilestones';
