import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export * from './training';
export * from './auth';
export * from './bulkAuth';

// Test function
export const testFunction = onRequest(
  { 
    timeoutSeconds: 30,
    cors: true
  }, 
  async (req, res) => {
    res.json({ message: "Test function working" });
  }
);
