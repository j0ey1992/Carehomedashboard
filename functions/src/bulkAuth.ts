import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

interface BulkAuthRequest {
  users: {
    userId: string;
    email: string;
    name: string;
  }[];
}

interface BulkAuthResponse {
  success: string[];
  failed: { userId: string; error: string }[];
}

// Function to create auth accounts in batches
export const createBulkAuthAccounts = onCall(
  {
    timeoutSeconds: 540, // 9 minutes
    memory: '1GiB',
    maxInstances: 10
  },
  async (request) => {
    // Verify admin user
    if (!request.auth?.token?.admin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can create bulk auth accounts'
      );
    }

    const data = request.data as BulkAuthRequest;
    const results: BulkAuthResponse = {
      success: [],
      failed: [],
    };

    // Process users in batches of 10
    const batchSize = 10;
    for (let i = 0; i < data.users.length; i += batchSize) {
      const batch = data.users.slice(i, i + batchSize);
      
      // Process each user in the current batch
      const batchPromises = batch.map(async (user) => {
        try {
          // Check if user already exists
          try {
            await admin.auth().getUser(user.userId);
            results.success.push(user.userId); // User already exists
            return;
          } catch (error: any) {
            // Only proceed if error is user-not-found
            if (error.code !== 'auth/user-not-found') {
              throw error;
            }
          }

          // Generate temporary password
          const tempPassword = Math.random().toString(36).slice(-8);

          // Create auth user
          await admin.auth().createUser({
            uid: user.userId,
            email: user.email,
            displayName: user.name,
            password: tempPassword,
          });

          // Send password reset email
          await admin.auth().generatePasswordResetLink(user.email);

          // Update user document with auth status
          await admin.firestore()
            .collection('users')
            .doc(user.userId)
            .update({
              authCreated: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          results.success.push(user.userId);
        } catch (error) {
          console.error(`Error creating auth account for ${user.userId}:`, error);
          results.failed.push({
            userId: user.userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Wait for current batch to complete
      await Promise.all(batchPromises);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < data.users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
);
