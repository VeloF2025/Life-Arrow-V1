import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCQHOGE6wjx-TFWHaOCIKbA7y9-IWN_J_k",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "810491503055",
  appId: "1:810491503055:web:dcb3e9e3dc5c8c3e3bb4b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function fixMissingUserProfiles() {
  console.log('🔧 Fixing Missing User Profiles...\n');

  // Known users from auth export that should have accounts
  const knownAuthUsers = [
    { uid: "FcZTJXl8k0WDttLIg4R0EMQn2hB3", email: "marietjie@lifearrow.biz", name: "Marietjie" },
    { uid: "GwSnmnnFFIWSSWYq6QnbqXw1EZ03", email: "hein@lifearrow.biz", name: "Hein" },
    { uid: "H35nH2lfo2bXi3QhSrrJEkwa4aE3", email: "client@lifearrow.biz", name: "Client Test" },
    { uid: "8fE3NXN5t0Vhq3Hi2234GJkgk8f2", email: "hein11@h10.co.za", name: "Jan van Vuuren" },
    { uid: "AxjmfUqgSfNYXdsmt0v2NfdNMpd2", email: "hein11@xinox.co.za", name: "Jan van Vuuren" },
    { uid: "fLfIpqSpH3ZDRjyqJrfapSojqlz1", email: "hein@h10.co.za", name: "Hein van Vuuren" }
  ];

  // Known issue: marietjie@lifearrow.biz was promoted from staff but may be missing profiles
  const marietjieInfo = {
    uid: "FcZTJXl8k0WDttLIg4R0EMQn2hB3",
    email: "marietjie@lifearrow.biz",
    firstName: "Marietjie",
    lastName: "Potgieter"
  };

  console.log('🔍 Creating missing user profile for Marietjie...');
  
  try {
    // Create user profile in Firestore if it doesn't exist
    await setDoc(doc(db, 'users', marietjieInfo.uid), {
      id: marietjieInfo.uid,
      email: marietjieInfo.email,
      firstName: marietjieInfo.firstName,
      lastName: marietjieInfo.lastName,
      role: 'admin',
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    console.log('✅ User profile created/updated for Marietjie');

    // Create admin profile
    await setDoc(doc(db, 'adminProfiles', marietjieInfo.uid), {
      id: marietjieInfo.uid,
      email: marietjieInfo.email,
      firstName: marietjieInfo.firstName,
      lastName: marietjieInfo.lastName,
      role: 'admin',
      specializations: [],
      credentials: [],
      bio: 'Promoted from staff member',
      experience: 0,
      clients: [],
      availability: [],
      permissions: {
        canCreateAdmins: false,
        canDeleteAdmins: false,
        canManageSystem: false,
        canViewAllData: false,
      },
      settings: {
        appointmentDuration: 60,
        bufferTime: 15,
        maxDailyAppointments: 8,
        autoAcceptBookings: false,
      },
      centreIds: [],
      originalStaffId: 'unknown', // We don't know the original staff ID
      promotedAt: new Date(),
      promotedBy: 'system-repair',
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    console.log('✅ Admin profile created/updated for Marietjie');

    // Send password reset email
    console.log('📧 Sending password reset email to Marietjie...');
    await sendPasswordResetEmail(auth, marietjieInfo.email);
    console.log('✅ Password reset email sent!');

  } catch (error) {
    console.error('❌ Error fixing Marietjie\'s profile:', error);
    
    if (error.code === 'auth/user-not-found') {
      console.log('🚨 Firebase Auth account does not exist!');
      console.log('💡 The promotion process failed - need to recreate the Firebase Auth account');
      
      try {
        console.log('🔧 Creating new Firebase Auth account...');
        const tempPassword = `TempAdmin${Math.random().toString(36).slice(2)}${Date.now()}`;
        
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          marietjieInfo.email,
          tempPassword
        );
        
        console.log('✅ Firebase Auth account created with UID:', userCredential.user.uid);
        console.log('📧 Sending password reset email...');
        await sendPasswordResetEmail(auth, marietjieInfo.email);
        console.log('✅ Password reset email sent!');
        
        // Update the UID and create profiles
        const newUid = userCredential.user.uid;
        
        await setDoc(doc(db, 'users', newUid), {
          id: newUid,
          email: marietjieInfo.email,
          firstName: marietjieInfo.firstName,
          lastName: marietjieInfo.lastName,
          role: 'admin',
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await setDoc(doc(db, 'adminProfiles', newUid), {
          id: newUid,
          email: marietjieInfo.email,
          firstName: marietjieInfo.firstName,
          lastName: marietjieInfo.lastName,
          role: 'admin',
          specializations: [],
          credentials: [],
          bio: 'Recreated admin account',
          experience: 0,
          clients: [],
          availability: [],
          permissions: {
            canCreateAdmins: false,
            canDeleteAdmins: false,
            canManageSystem: false,
            canViewAllData: false,
          },
          settings: {
            appointmentDuration: 60,
            bufferTime: 15,
            maxDailyAppointments: 8,
            autoAcceptBookings: false,
          },
          centreIds: [],
          recreatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log('✅ All profiles created for new account!');
        console.log(`🔑 New UID: ${newUid}`);
        
      } catch (createError) {
        console.error('❌ Error creating new account:', createError);
      }
    }
  }

  // Create missing profiles for other known users
  console.log('\n🔍 Checking other known users...');
  
  const clientTestInfo = {
    uid: "H35nH2lfo2bXi3QhSrrJEkwa4aE3",
    email: "client@lifearrow.biz",
    firstName: "Client",
    lastName: "Test"
  };

  try {
    // Create user profile for client test
    await setDoc(doc(db, 'users', clientTestInfo.uid), {
      id: clientTestInfo.uid,
      email: clientTestInfo.email,
      firstName: clientTestInfo.firstName,
      lastName: clientTestInfo.lastName,
      role: 'client',
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    // Create client profile
    await setDoc(doc(db, 'clientProfiles', clientTestInfo.uid), {
      id: clientTestInfo.uid,
      email: clientTestInfo.email,
      firstName: clientTestInfo.firstName,
      lastName: clientTestInfo.lastName,
      role: 'client',
      goals: [],
      healthMetrics: [],
      preferences: {
        timezone: 'Africa/Johannesburg',
        notifications: {
          email: true,
          push: true,
          reminders: true,
        },
        privacy: {
          shareDataWithAdmin: true,
          allowAnalytics: true,
        },
      },
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    console.log('✅ Client profile created/updated for client@lifearrow.biz');

  } catch (error) {
    console.error('❌ Error creating client profile:', error);
  }

  console.log('\n🎯 Profile repair complete!');
  console.log('\n📋 Summary:');
  console.log('- Fixed/created user profile for Marietjie');
  console.log('- Fixed/created admin profile for Marietjie'); 
  console.log('- Fixed/created client profile for test client');
  console.log('- Sent password reset emails where needed');
  console.log('\n💡 Users should now be able to log in after setting their passwords!');
}

fixMissingUserProfiles(); 