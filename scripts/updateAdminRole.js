// Load the Firebase Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('..managerdashboard-d8cec-firebase-adminsdk-gkms5-b7510185da.json');

// Initialize the Firebase app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://managerdashboard-d8cec.firebaseio.com"
});

// Function to update the admin role for the user
async function updateAdminRole(uid) {
  try {
    // Get the user document from Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      console.log('No such document!');
      return;
    }

    // Update the role to admin
    await admin.firestore().collection('users').doc(uid).update({ role: 'admin' });

    console.log('Successfully updated role to admin for user:', uid);
  } catch (error) {
    console.error('Error updating admin role:', error);
  }
}

// Call the function to update the admin role for the user
updateAdminRole('CP1nkVA38bMMbOuFVGSluBmbb6U2')
  .then(() => {
    console.log('Admin role updated successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
