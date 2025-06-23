import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBGvGKhzAKNnJdVNUwxCj0n8sHvmOAhMVE",
  authDomain: "life-arrow-wellness.firebaseapp.com",
  projectId: "life-arrow-wellness",
  storageBucket: "life-arrow-wellness.firebasestorage.app",
  messagingSenderId: "1071056763616",
  appId: "1:1071056763616:web:b4c5a5f5e5f5f5f5f5f5f5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixStaffData() {
  try {
    console.log('🔧 Fixing staff data structure...\n');
    
    // Get all centres first to create a mapping
    const centresRef = collection(db, 'centres');
    const centresSnapshot = await getDocs(centresRef);
    const centreNameToId = {};
    
    centresSnapshot.docs.forEach(doc => {
      const centre = { id: doc.id, ...doc.data() };
      centreNameToId[centre.name] = centre.id;
      console.log(`📍 Centre: ${centre.name} → ${centre.id}`);
    });
    
    console.log('\n🔍 Processing staff...\n');
    
    // Get all staff
    const staffRef = collection(db, 'staff');
    const staffSnapshot = await getDocs(staffRef);
    
    for (const staffDoc of staffSnapshot.docs) {
      const staffData = staffDoc.data();
      const staffId = staffDoc.id;
      
      console.log(`👤 Processing: ${staffData.firstName} ${staffData.lastName}`);
      console.log(`   Current centre: ${staffData.centre}`);
      console.log(`   Current centreIds: ${staffData.centreIds}`);
      console.log(`   Current isActive: ${staffData.isActive}`);
      
      const updates = {};
      
      // Ensure isActive is set
      if (staffData.isActive === undefined || staffData.isActive === null) {
        updates.isActive = true;
        console.log(`   ✅ Setting isActive: true`);
      }
      
      // Convert centre name to centreIds array
      if (staffData.centre && !staffData.centreIds) {
        const centreId = centreNameToId[staffData.centre];
        if (centreId) {
          updates.centreIds = [centreId];
          console.log(`   ✅ Setting centreIds: [${centreId}] (from centre: ${staffData.centre})`);
        } else {
          console.log(`   ⚠️  Centre "${staffData.centre}" not found in centres collection`);
        }
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'staff', staffId), updates);
        console.log(`   💾 Updated staff member`);
      } else {
        console.log(`   ✓ No updates needed`);
      }
      
      console.log('');
    }
    
    console.log('✅ Staff data structure update complete!');
    
  } catch (error) {
    console.error('❌ Error fixing staff data:', error);
  }
}

fixStaffData(); 