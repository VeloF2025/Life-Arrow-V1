import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBl3rE7-4lMZKDGEhLMzJZZZeHLmQqN8zQ",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "1091375462890",
  appId: "1:1091375462890:web:7d5e3f8b1e9f8c8b5e5e5e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// This should be the UID of the current logged-in user (Hein van Vuuren)
// You'll need to get this from the Firebase Auth console or from the browser
const adminUserId = "YOUR_USER_ID_HERE"; // Replace with actual UID

const adminProfile = {
  firstName: "Hein",
  lastName: "van Vuuren",
  email: "hein@blitzfibre.com", // or the actual email
  role: "super-admin",
  permissions: {
    canManageClients: true,
    canManageStaff: true,
    canManageServices: true,
    canManageCentres: true,
    canViewReports: true,
    canManageSystem: true
  },
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  isActive: true
};

async function setupAdminProfile() {
  try {
    console.log('Setting up admin profile...');
    
    if (adminUserId === "YOUR_USER_ID_HERE") {
      console.log('❌ Please update the adminUserId in the script with the actual user ID');
      console.log('You can find this in the Firebase Auth console or browser developer tools');
      return;
    }
    
    await setDoc(doc(db, 'adminProfiles', adminUserId), adminProfile);
    console.log(`✅ Admin profile created for user: ${adminUserId}`);
    console.log('Profile details:', adminProfile);
    
  } catch (error) {
    console.error('❌ Error creating admin profile:', error);
  }
}

setupAdminProfile(); 