import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Initialize Firebase (same config as client app)
const firebaseConfig = {
  apiKey: "AIzaSyDRwVnC_TmgNglmF4v_eRV0ePNPGOYYdNA",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "909801207914",
  appId: "1:909801207914:web:6781dffb71a74aa33bf213"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUserToSuperAdmin() {
  const userId = 'fLfIpqSpH3ZDRjyqJrfapSojqlz1';
  
  try {
    console.log('🔧 Fixing user profile to super-admin...');
    
    // Force update user profile to super-admin
    await setDoc(doc(db, 'users', userId), {
      id: userId,
      email: 'hein@h10.co.za',
      firstName: 'Hein',
      lastName: 'van Vuuren',
      role: 'super-admin',
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('✅ User profile set to super-admin');
    
    // Force update admin profile to super-admin
    await setDoc(doc(db, 'adminProfiles', userId), {
      id: userId,
      email: 'hein@h10.co.za',
      firstName: 'Hein',
      lastName: 'van Vuuren',
      role: 'super-admin',
      specializations: [],
      credentials: [],
      bio: 'System Administrator',
      experience: 0,
      clients: [],
      availability: [],
      permissions: {
        canCreateAdmins: true,
        canDeleteAdmins: true,
        canManageSystem: true,
        canViewAllData: true,
      },
      settings: {
        appointmentDuration: 60,
        bufferTime: 15,
        maxDailyAppointments: 8,
        autoAcceptBookings: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('✅ Admin profile set to super-admin');
    console.log('🎉 SUCCESS! Now refresh your browser and you should see:');
    console.log('   - Purple "Super Admin" badge');
    console.log('   - "Super Admin Actions" section');
    console.log('   - "Create Admin" button');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUserToSuperAdmin(); 