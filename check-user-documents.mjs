import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

// Firebase config - using latest config from check-admin-status.mjs
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

async function checkUserDocuments() {
  try {
    console.log('🔍 Checking User Documents and Profiles...\n');

    // Get all users from the auth export to see who should exist
    const authUsers = [
      { uid: "FcZTJXl8k0WDttLIg4R0EMQn2hB3", email: "marietjie@lifearrow.biz" },
      { uid: "GwSnmnnFFIWSSWYq6QnbqXw1EZ03", email: "hein@lifearrow.biz" },
      { uid: "H35nH2lfo2bXi3QhSrrJEkwa4aE3", email: "client@lifearrow.biz" },
      { uid: "8fE3NXN5t0Vhq3Hi2234GJkgk8f2", email: "hein11@h10.co.za" },
      { uid: "AxjmfUqgSfNYXdsmt0v2NfdNMpd2", email: "hein11@xinox.co.za" },
      { uid: "fLfIpqSpH3ZDRjyqJrfapSojqlz1", email: "hein@h10.co.za" }
    ];

    console.log(`🔍 Checking ${authUsers.length} Firebase Auth users...\n`);

    for (const authUser of authUsers) {
      console.log(`👤 Checking: ${authUser.email} (${authUser.uid})`);
      
      // Check users collection
      try {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`   ✅ Users doc: EXISTS - Role: ${userData.role}`);
          
          // Check role-specific collections
          if (userData.role === 'admin' || userData.role === 'super-admin') {
            const adminDoc = await getDoc(doc(db, 'adminProfiles', authUser.uid));
            if (adminDoc.exists()) {
              console.log(`   ✅ Admin profile: EXISTS`);
            } else {
              console.log(`   ❌ Admin profile: MISSING`);
            }
          } else if (userData.role === 'client') {
            const clientDoc = await getDoc(doc(db, 'clientProfiles', authUser.uid));
            if (clientDoc.exists()) {
              console.log(`   ✅ Client profile: EXISTS`);
            } else {
              console.log(`   ❌ Client profile: MISSING`);
            }
          }
        } else {
          console.log(`   ❌ Users doc: MISSING`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking user: ${error.message}`);
      }
      
      console.log(''); // Empty line
    }

    // Check for staff members promoted to admin
    console.log('\n📋 Checking staff members with admin accounts...');
    try {
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      const promotedStaff = [];
      
      staffSnapshot.forEach(doc => {
        const staff = doc.data();
        if (staff.hasAdminAccount || staff.promotedToAdmin) {
          promotedStaff.push({
            id: doc.id,
            name: `${staff.firstName} ${staff.lastName}`,
            email: staff.email,
            adminUserId: staff.adminUserId,
            hasAdminAccount: staff.hasAdminAccount,
            promotedToAdmin: staff.promotedToAdmin
          });
        }
      });

      if (promotedStaff.length > 0) {
        console.log(`Found ${promotedStaff.length} promoted staff members:`);
        for (const staff of promotedStaff) {
          console.log(`\n👤 Staff: ${staff.name} (${staff.email})`);
          console.log(`   Admin User ID: ${staff.adminUserId || 'NOT SET'}`);
          console.log(`   Has Admin Account: ${staff.hasAdminAccount}`);
          console.log(`   Promoted to Admin: ${staff.promotedToAdmin}`);
          
          if (staff.adminUserId) {
            // Check if user document exists
            const userDoc = await getDoc(doc(db, 'users', staff.adminUserId));
            console.log(`   User Document: ${userDoc.exists() ? '✅ EXISTS' : '❌ MISSING'}`);
            
            // Check if admin profile exists
            const adminDoc = await getDoc(doc(db, 'adminProfiles', staff.adminUserId));
            console.log(`   Admin Profile: ${adminDoc.exists() ? '✅ EXISTS' : '❌ MISSING'}`);
          }
        }
      } else {
        console.log('No promoted staff members found.');
      }
    } catch (error) {
      console.log(`Error checking staff: ${error.message}`);
    }

    console.log('\n🎯 Analysis Complete!');

  } catch (error) {
    console.error('❌ Error checking user documents:', error);
  }
}

checkUserDocuments(); 