import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface FirebaseAuthError {
  code: string;
  message: string;
}

// Function to create Firebase Auth account for new users
export const createAuthAccount = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    const userId = context.params.userId;

    try {
      // Check if user already exists in Auth
      try {
        await admin.auth().getUser(userId);
        console.log('Auth user already exists:', userId);
        return null;
      } catch (error) {
        // User doesn't exist in Auth, proceed with creation
        const authError = error as FirebaseAuthError;
        if (authError.code === 'auth/user-not-found') {
          // Generate a temporary password
          const tempPassword = Math.random().toString(36).slice(-8);

          // Create auth user
          await admin.auth().createUser({
            uid: userId,
            email: userData.email,
            displayName: userData.name,
            password: tempPassword,
          });

          // Send password reset email to allow user to set their own password
          await admin.auth().generatePasswordResetLink(userData.email);

          // Update user document with auth status
          await snap.ref.update({
            authCreated: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log('Created auth account for:', userId);
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error creating auth account:', error);
      throw error;
    }
  });
