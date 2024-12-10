import { Timestamp } from 'firebase-admin/firestore';

export const toDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Helper to check if email notifications are configured
export const isEmailConfigured = (): boolean => {
  return !!(process.env.SENDGRID_FROM_EMAIL && process.env.SENDGRID_API_KEY);
};

// Helper to check if SMS notifications are configured
export const isSMSConfigured = (): boolean => {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
};
