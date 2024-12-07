const admin = require('firebase-admin');
const serviceAccount = require('../managerdashboard-d8cec-firebase-adminsdk-gkms5-e01101d236.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const defaultStaffFields = {
  active: true,
  notificationPreferences: {
    email: true,
    sms: true
  },
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

const staffMembers = [
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'admin',
    roles: ['Shift Leader', 'Care Staff'],
    preferences: {
      ...defaultStaffFields.preferences,
      flexibleHours: true
    }
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    role: 'staff',
    roles: ['Care Staff', 'Driver'],
    preferences: {
      ...defaultStaffFields.preferences,
      nightShiftOnly: true
    }
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    role: 'staff',
    roles: ['Care Staff'],
    preferences: defaultStaffFields.preferences
  },
  {
    name: 'Emma Wilson',
    email: 'emma.wilson@example.com',
    role: 'admin',
    roles: ['Shift Leader', 'Care Staff'],
    preferences: {
      ...defaultStaffFields.preferences,
      flexibleHours: true
    }
  },
  {
    name: 'David Lee',
    email: 'david.lee@example.com',
    role: 'staff',
    roles: ['Care Staff', 'Driver'],
    preferences: defaultStaffFields.preferences
  }
];

async function createStaffMembers() {
  try {
    const batch = db.batch();
    let count = 0;

    for (const staffMember of staffMembers) {
      const staffData = {
        ...defaultStaffFields,
        ...staffMember,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = db.collection('users').doc();
      batch.set(docRef, staffData);
      count++;

      console.log(`Added staff member: ${staffMember.name}`);
    }

    await batch.commit();
    console.log(`Successfully created ${count} staff members`);

  } catch (error) {
    console.error('Error creating staff members:', error);
  } finally {
    process.exit();
  }
}

createStaffMembers();
