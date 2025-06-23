import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRwVnC_TmgNglmF4v_eRV0ePNPGOYYdNA",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "909801207914",
  appId: "1:909801207914:web:6781dffb71a74aa33bf213"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUserRoles() {
  console.log('🔧 Starting user roles fix...\n');

  // Fix Mitzi's account (client)
  const mitziUid = 'xmeL4zxDrBWyMS6IXFJy40XfEOu1';
  console.log(`👤 Fixing Mitzi's account (${mitziUid})`);
  
  try {
    // Check if user exists in users collection
    const userDoc = await getDoc(doc(db, 'users', mitziUid));
    
    if (userDoc.exists()) {
      console.log('✅ User found in users collection');
      
      // Ensure user has correct role
      await updateDoc(doc(db, 'users', mitziUid), {
        role: 'client',
        isActive: true,
        updatedAt: new Date()
      });
      
      // Check if clientProfile exists
      const clientDoc = await getDoc(doc(db, 'clientProfiles', mitziUid));
      
      if (!clientDoc.exists()) {
        console.log('📝 Creating client profile...');
        const userData = userDoc.data();
        
        await setDoc(doc(db, 'clientProfiles', mitziUid), {
          id: mitziUid,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'client',
          isActive: true,
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
        });
        console.log('✅ Client profile created');
      } else {
        console.log('✅ Client profile already exists');
      }
      
    } else {
      console.log('❌ User not found in users collection');
    }
    
  } catch (error) {
    console.error('❌ Error fixing Mitzi\'s account:', error);
  }

  console.log('\n🎯 User roles fix completed!');
  console.log('\n📋 Summary:');
  console.log('- Fixed client account structure');
  console.log('- Ensured proper role-specific collections');
  console.log('- Users should now be able to log in properly');
}

fixUserRoles(); 