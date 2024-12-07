// Load the Firebase Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('../managerdashboard-d8cec-firebase-adminsdk-gkms5-b7510185da.json');

// Initialize the Firebase app with a service account, granting admin privileges
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://managerdashboard-d8cec.firebaseio.com"
  });
}

const db = admin.firestore();

// Function to set admin privileges for a user
async function setAdminPrivileges(email) {
  try {
    // Get the user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Add the admin claim to the user
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

    // Update the user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: email,
      name: userRecord.displayName || email,
      role: 'admin',
      roles: ['Care Staff', 'Shift Leader'],
      sites: ['Willowbrook', 'Oakwood'],
      site: 'Willowbrook',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
      notificationPreferences: { email: true, sms: true },
      probationStatus: 'completed',
      trainingProgress: {
        week1Review: true,
        week4Supervision: true,
        week8Review: true,
        week12Supervision: true
      },
      authCreated: true,
      departmentId: 'admin',
      points: 0,
      contractedHours: 37.5,
      annualLeave: 28,
      sickness: 0,
      attendance: {
        attendanceRate: 100,
        lateDays: 0,
        sickDays: 0,
        totalDays: 0
      },
      preferences: {
        preferredShifts: ['7:30-14:30', '14:30-21:30'],
        unavailableDates: [],
        flexibleHours: true,
        nightShiftOnly: false
      },
      performanceMetrics: {
        attendanceRate: 100,
        punctualityScore: 100,
        shiftCompletionRate: 100,
        feedbackScore: 100
      }
    }, { merge: true });

    console.log('Successfully set admin privileges for:', userRecord.uid);
  } catch (error) {
    console.error('Error setting admin privileges:', error);
  }
}

// Call the function to set admin privileges
setAdminPrivileges('usexportinternational11@gmail.com')
  .then(() => {
    console.log('Admin privileges set successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
