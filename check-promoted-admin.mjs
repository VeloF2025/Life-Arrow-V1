import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

async function checkPromotedAdmin() {
  try {
    console.log(" Checking promoted admin status...\n");

    // Check staff members who were promoted
    const staffQuery = query(collection(db, "staff"), where("hasAdminAccount", "==", true));
    const staffSnapshot = await getDocs(staffQuery);
    
    console.log(` Found ${staffSnapshot.size} staff members with admin accounts:\n`);
    
    for (const staffDoc of staffSnapshot.docs) {
      const staff = staffDoc.data();
      console.log(` Staff: ${staff.firstName} ${staff.lastName}`);
      console.log(`    Email: ${staff.email}`);
      console.log(`    Admin User ID: ${staff.adminUserId || "Not set"}`);
      console.log(`    Promoted: ${staff.promotedToAdmin ? "Yes" : "No"}`);
      console.log(`    Promoted At: ${staff.promotedAt ? new Date(staff.promotedAt.seconds * 1000).toLocaleString() : "Not set"}`);
      
      // Check if user profile exists
      if (staff.adminUserId) {
        try {
          const userDoc = await getDoc(doc(db, "users", staff.adminUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log(`    User Profile:  EXISTS`);
            console.log(`    Role: ${userData.role}`);
          } else {
            console.log(`    User Profile:  NOT FOUND`);
          }
          
          // Check if admin profile exists
          const adminDoc = await getDoc(doc(db, "adminProfiles", staff.adminUserId));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            console.log(`    Admin Profile:  EXISTS`);
            console.log(`    Centres: ${adminData.centreIds?.length || 0}`);
          } else {
            console.log(`    Admin Profile:  NOT FOUND`);
          }
        } catch (error) {
          console.log(`    Error checking profiles: ${error.message}`);
        }
      }
      
      console.log(""); // Empty line for separation
    }

  } catch (error) {
    console.error(" Error checking admin status:", error);
  }
}

// Run the check
checkPromotedAdmin();
