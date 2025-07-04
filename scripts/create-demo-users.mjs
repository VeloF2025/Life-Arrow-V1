import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// --- Configuration ---
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const DEMO_USERS = [
  {
    email: 'client@test.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'Client',
    role: 'client',
    isClient: true,
  },
  {
    email: 'staff@test.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'Staff',
    role: 'staff',
    isStaff: true,
  },
  {
    email: 'admin@test.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'admin',
    isAdmin: true,
  },
];

// --- Script ---

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function getOrCreateDemoCentre() {
  const centresRef = db.collection('centres');
  const snapshot = await centresRef.where('name', '==', 'Demo Centre').limit(1).get();

  if (!snapshot.empty) {
    console.log('Found existing Demo Centre.');
    return snapshot.docs[0].id;
  }

  console.log('No Demo Centre found, creating one...');
  const newCentreRef = await centresRef.add({
    name: 'Demo Centre',
    address: '123 Demo Street',
    phoneNumber: '555-0101',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`Created Demo Centre with ID: ${newCentreRef.id}`);
  return newCentreRef.id;
}

async function createDemoUsers() {
  console.log('Starting demo user creation...');
  const primaryCentreId = await getOrCreateDemoCentre();

  for (const userData of DEMO_USERS) {
    const { email, password, role, ...profileData } = userData;
    console.log(`Processing user: ${email}`);

    try {
      // 1. Get user by email if they exist
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`User ${email} already exists. UID: ${userRecord.uid}. Updating...`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // 2. Create user in Firebase Auth if they don't exist
          userRecord = await auth.createUser({
            email,
            password,
            displayName: `${profileData.firstName} ${profileData.lastName}`,
          });
          console.log(`Successfully created new user: ${email} (UID: ${userRecord.uid})`);
        } else {
          throw error; // Re-throw other errors
        }
      }

      const { uid } = userRecord;

      // 3. Set custom claims for role-based access
      const claims = {
        role,
        ...(role !== 'client' && { centreIds: [primaryCentreId], primaryCentreId }),
      };
      await auth.setCustomUserClaims(uid, claims);
      console.log(`Set custom claims for ${email}:`, claims);

      // 4. Create or update user document in Firestore
      const userDocRef = db.collection('users').doc(uid);
      const userDocData = {
        email,
        role,
        ...profileData,
        ...(role !== 'client' && { centreIds: [primaryCentreId], primaryCentreId }),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await userDocRef.set(userDocData, { merge: true });
      console.log(`Successfully created/updated Firestore document for ${email}.`);
      console.log('---');

    } catch (error) {
      console.error(`Failed to create or update user ${email}:`, error);
      console.log('---');
    }
  }
  console.log('Demo user creation process finished.');
}

createDemoUsers().catch(err => console.error('An unexpected error occurred:', err));
