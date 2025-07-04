import admin from 'firebase-admin';
import { createRequire } from 'module';

// Use createRequire to import the JSON file as a module
const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateStaff() {
  console.log('Starting staff data migration...');

  const staffCollectionRef = db.collection('staff');
  const usersCollectionRef = db.collection('users');
  
  try {
    const staffSnapshot = await staffCollectionRef.get();

    if (staffSnapshot.empty) {
      console.log('No documents found in the `staff` collection. Migration not needed.');
      return;
    }

    console.log(`Found ${staffSnapshot.size} document(s) to migrate.`);

    const batch = db.batch();

    staffSnapshot.forEach(doc => {
      const staffData = doc.data();
      const userId = doc.id;

      // Define the new document in the 'users' collection
      const userRef = usersCollectionRef.doc(userId);

      // Create new user data, adding the 'staff' role
      const newUserData = {
        ...staffData,
        role: 'staff' // Add or overwrite the role field
      };

      // Add the set operation to the batch
      batch.set(userRef, newUserData, { merge: true });

      // Add the delete operation for the old document to the batch
      batch.delete(staffCollectionRef.doc(userId));
      
      console.log(`- Preparing to migrate ${userId}...`);
    });

    // Commit the batch
    await batch.commit();

    console.log('\nMigration complete! All staff members have been moved to the `users` collection with the `role: \'staff\'` field.');
    console.log('The original documents in the `staff` collection have been deleted.');

  } catch (error) {
    console.error('An error occurred during migration:', error);
    console.error('\nPlease ensure your `serviceAccountKey.json` is correct and has the necessary permissions.');
  }
}

migrateStaff();
