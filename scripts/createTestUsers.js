const admin = require('firebase-admin');
const serviceAccount = require('../managerdashboard-d8cec-firebase-adminsdk-gkms5-b7510185da.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'managerdashboard-d8cec'
});

const auth = admin.auth();
const db = admin.firestore();

const testUsers = [
  {
    email: 'admin@carehome.com',
    password: 'Admin123!',
    displayName: 'Admin User',
    role: 'admin',
    roles: ['Admin', 'Manager', 'Care Staff'],
    sites: ['Willowbrook', 'Oakwood'],
    claims: { admin: true, manager: true }
  },
  {
    email: 'manager@carehome.com',
    password: 'Manager123!',
    displayName: 'Manager User',
    role: 'manager',
    roles: ['Manager', 'Care Staff'],
    sites: ['Willowbrook'],
    claims: { manager: true }
  }
];

async function createTestUser(userData) {
  try {
    // Create auth user
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName
    });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, userData.claims);

    // Create user document
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: userData.email,
      name: userData.displayName,
      role: userData.role,
      roles: userData.roles,
      sites: userData.sites,
      site: userData.sites[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      notificationPreferences: {
        email: true,
        sms: true
      },
      probationStatus: 'completed',
      trainingProgress: {
        week1Review: true,
        week4Supervision: true,
        week8Review: true,
        week12Supervision: true
      },
      authCreated: true,
      departmentId: userData.role,
      points: 1000,
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
        preferredShifts: ['7:30-14:30', '14:30-21:30', '21:30-7:30'],
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
    });

    console.log(`Successfully created ${userData.role} user:`, userRecord.uid);
    console.log(`Email: ${userData.email}`);
    console.log(`Password: ${userData.password}`);
    console.log('------------------------');
  } catch (error) {
    console.error(`Error creating ${userData.role} user:`, error);
  }
}

async function createAllTestUsers() {
  console.log('Creating test users...');
  console.log('------------------------');

  for (const userData of testUsers) {
    await createTestUser(userData);
  }

  console.log('Test users creation completed.');
  process.exit(0);
}

// Run the creation
createAllTestUsers();
