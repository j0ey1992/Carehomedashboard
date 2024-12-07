const admin = require('firebase-admin');
const serviceAccount = require('../managerdashboard-d8cec-firebase-adminsdk-gkms5-e01101d236.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const defaultStaffFields = {
  contractedHours: 37.5,
  preferences: {
    preferredShifts: [],
    unavailableDates: [],
    flexibleHours: false,
    nightShiftOnly: false
  },
  performanceMetrics: {
    attendanceRate: 100,
    punctualityScore: 100,
    shiftCompletionRate: 100,
    feedbackScore: 100
  },
  trainingStatus: {}
};

const getRolesFromUserRole = (role) => {
  switch (role) {
    case 'admin':
      return ['Shift Leader', 'Care Staff'];
    case 'manager':
      return ['Shift Leader', 'Care Staff'];
    case 'staff':
    default:
      return ['Care Staff'];
  }
};

async function migrateUsersToStaff() {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    let count = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Skip if user is not active
      if (!userData.active) {
        console.log(`Skipping inactive user: ${userData.name}`);
        continue;
      }

      // Create staff fields
      const staffData = {
        ...userData,
        ...defaultStaffFields,
        roles: getRolesFromUserRole(userData.role),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Update the user document with staff fields
      batch.update(userDoc.ref, staffData);
      count++;

      // Firestore batches are limited to 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Committed batch of ${count} updates`);
      }
    }

    // Commit any remaining updates
    if (count % 500 !== 0) {
      await batch.commit();
    }

    console.log(`Successfully migrated ${count} users to staff`);

  } catch (error) {
    console.error('Error migrating users to staff:', error);
  } finally {
    process.exit();
  }
}

migrateUsersToStaff();
