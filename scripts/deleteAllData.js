const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account from environment or file
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'managerdashboard-d8cec'
});

const db = admin.firestore();
const auth = admin.auth();

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(500);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid exploding the stack
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteAllAuthUsers() {
  const listUsersResult = await auth.listUsers();
  const userIds = listUsersResult.users.map(user => user.uid);

  if (userIds.length === 0) {
    console.log('No auth users to delete');
    return;
  }

  try {
    await auth.deleteUsers(userIds);
    console.log(`Successfully deleted ${userIds.length} auth users`);
  } catch (error) {
    console.error('Error deleting auth users:', error);
  }
}

async function deleteAllData() {
  console.log('Starting data deletion...');

  // Collections to delete
  const collections = [
    'users',
    'training',
    'trainingHistory',
    'supervisions',
    'notifications',
    'tasks',
    'reports',
    'compliance',
    'activities',
    'auditLogs',
    'managementTasks',
    'scheduledNotifications',
    'dols',
    'courseBookings'
  ];

  try {
    // Delete all Firestore collections
    console.log('Deleting Firestore collections...');
    for (const collection of collections) {
      console.log(`Deleting collection: ${collection}`);
      await deleteCollection(collection);
      console.log(`Deleted collection: ${collection}`);
    }

    // Delete all Auth users
    console.log('Deleting Auth users...');
    await deleteAllAuthUsers();

    console.log('All data has been deleted successfully');
  } catch (error) {
    console.error('Error deleting data:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the deletion
deleteAllData();
