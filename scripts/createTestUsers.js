const admin = require('firebase-admin');
const serviceAccount = require('../managerdashboard-d8cec-firebase-adminsdk-gkms5-b7510185da.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

const DEFAULT_PASSWORD = 'Test123!';
const DEFAULT_USER_DATA = {
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
};

async function createFirebaseUser(email, password, displayName) {
  try {
    // Check if user already exists
    try {
      const userRecord = await auth.getUserByEmail(email);
      console.log(`User ${email} already exists, skipping creation`);
      return userRecord.uid;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        const userRecord = await auth.createUser({
          email,
          password,
          displayName,
          emailVerified: true
        });
        console.log(`Created Firebase user: ${email} (${userRecord.uid})`);
        return userRecord.uid;
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error creating/getting user ${email}:`, error);
    throw error;
  }
}

async function createTestUsers() {
  try {
    // Create admin user
    const adminData = {
      email: 'admin@carehome.com',
      name: 'Admin User',
      role: 'admin',
      sites: ['Willowbrook', 'Oakwood', 'Sunnyside'],
      site: 'Willowbrook'
    };

    const adminUid = await createFirebaseUser(adminData.email, DEFAULT_PASSWORD, adminData.name);
    
    // Set admin custom claims
    await auth.setCustomUserClaims(adminUid, { admin: true });

    await db.collection('users').doc(adminUid).set({
      id: adminUid,
      ...adminData,
      roles: ['Care Staff', 'Shift Leader', 'Admin'],
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
      ...DEFAULT_USER_DATA
    });

    console.log(`Created admin user document: ${adminData.name} (${adminUid})`);

    // Create manager users
    const managerUsers = [
      {
        email: 'manager1@carehome.com',
        name: 'Manager User 1',
        sites: ['Willowbrook'],
        site: 'Willowbrook'
      },
      {
        email: 'manager2@carehome.com',
        name: 'Manager User 2',
        sites: ['Oakwood'],
        site: 'Oakwood'
      }
    ];

    for (const managerData of managerUsers) {
      const managerId = await createFirebaseUser(managerData.email, DEFAULT_PASSWORD, managerData.name);
      
      // Set manager custom claims
      await auth.setCustomUserClaims(managerId, { manager: true });

      await db.collection('users').doc(managerId).set({
        id: managerId,
        ...managerData,
        role: 'manager',
        roles: ['Care Staff', 'Shift Leader', 'Manager'],
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
        departmentId: 'management',
        ...DEFAULT_USER_DATA
      });

      console.log(`Created manager user document: ${managerData.name} (${managerId})`);
    }

    // Create staff users
    const staffUsers = [
      {
        email: 'staff1@carehome.com',
        name: 'Staff User 1',
        site: 'Willowbrook',
        roles: ['Care Staff']
      },
      {
        email: 'staff2@carehome.com',
        name: 'Staff User 2',
        site: 'Oakwood',
        roles: ['Care Staff', 'Driver']
      },
      {
        email: 'staff3@carehome.com',
        name: 'Staff User 3',
        site: 'Willowbrook',
        roles: ['Care Staff', 'Shift Leader']
      }
    ];

    const staffIds = {};

    for (const staffData of staffUsers) {
      const staffId = await createFirebaseUser(staffData.email, DEFAULT_PASSWORD, staffData.name);
      staffIds[staffData.name] = staffId;

      await db.collection('users').doc(staffId).set({
        id: staffId,
        email: staffData.email,
        name: staffData.name,
        role: 'staff',
        roles: staffData.roles,
        sites: [staffData.site],
        site: staffData.site,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        notificationPreferences: { email: true, sms: true },
        probationStatus: 'pending',
        trainingProgress: {
          week1Review: false,
          week4Supervision: false,
          week8Review: false,
          week12Supervision: false
        },
        authCreated: true,
        departmentId: 'care',
        points: 0,
        ...DEFAULT_USER_DATA,
        // Randomize some metrics for variety
        attendance: {
          ...DEFAULT_USER_DATA.attendance,
          attendanceRate: 90 + Math.floor(Math.random() * 10),
          lateDays: Math.floor(Math.random() * 3),
          sickDays: Math.floor(Math.random() * 5)
        },
        performanceMetrics: {
          ...DEFAULT_USER_DATA.performanceMetrics,
          punctualityScore: 90 + Math.floor(Math.random() * 10),
          shiftCompletionRate: 90 + Math.floor(Math.random() * 10)
        }
      });

      console.log(`Created staff user document: ${staffData.name} (${staffId})`);
    }

    // Create some test sickness records
    const sicknessCases = [
      {
        staffId: staffIds['Staff User 1'],
        staffName: 'Staff User 1',
        startDate: new Date(2024, 0, 15),
        endDate: new Date(2024, 0, 18),
        reason: 'Flu symptoms',
        type: 'sickness',
        status: 'completed',
        step: 3,
        site: 'Willowbrook',
        notes: 'Return to work completed',
        createdAt: new Date(2024, 0, 15),
        updatedAt: new Date(2024, 0, 18)
      },
      {
        staffId: staffIds['Staff User 1'],
        staffName: 'Staff User 1',
        startDate: new Date(),
        reason: 'Back pain',
        type: 'sickness',
        status: 'current',
        step: 1,
        site: 'Willowbrook',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        staffId: staffIds['Staff User 2'],
        staffName: 'Staff User 2',
        startDate: new Date(),
        reason: 'Migraine',
        type: 'sickness',
        status: 'review',
        step: 2,
        site: 'Oakwood',
        reviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const record of sicknessCases) {
      const docRef = await db.collection('sickness').add({
        ...record,
        isArchived: false
      });
      console.log(`Created sickness record for: ${record.staffName} (${docRef.id})`);
    }

    console.log('\nTest accounts created successfully:');
    console.log('Admin: admin@carehome.com / Test123!');
    console.log('Manager 1: manager1@carehome.com / Test123!');
    console.log('Manager 2: manager2@carehome.com / Test123!');
    console.log('Staff 1: staff1@carehome.com / Test123!');
    console.log('Staff 2: staff2@carehome.com / Test123!');
    console.log('Staff 3: staff3@carehome.com / Test123!');

  } catch (error) {
    console.error('Error creating test users:', error);
  }
}

createTestUsers().then(() => process.exit());
