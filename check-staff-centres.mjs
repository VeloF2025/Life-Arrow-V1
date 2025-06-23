import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkStaffCentreRelationships() {
  try {
    console.log('🔍 Checking staff-centre relationships...\n');
    
    // Get all staff
    const staffRef = collection(db, 'staff');
    const staffSnapshot = await getDocs(staffRef);
    
    console.log(`📊 Total staff in database: ${staffSnapshot.size}`);
    
    staffSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Staff ${index + 1} ---`);
      console.log('ID:', doc.id);
      console.log('Name:', `${data.firstName} ${data.lastName}`);
      console.log('Position:', data.position);
      console.log('Status:', data.status);
      console.log('Is Active:', data.isActive);
      
      // Check different centre field formats
      console.log('\n🏥 Centre Assignments:');
      console.log('  centre (string):', data.centre || 'NOT SET');
      console.log('  centreIds (array):', data.centreIds || 'NOT SET');
      console.log('  workingCentres (array):', data.workingCentres || 'NOT SET');
      
      // Check specializations
      console.log('\n🎯 Skills:');
      console.log('  specializations:', data.specializations || 'NOT SET');
      console.log('  qualifications:', data.qualifications || 'NOT SET');
      console.log('  department:', data.department || 'NOT SET');
    });

    // Get all centres for reference
    console.log('\n\n=== CENTRES REFERENCE ===');
    const centresRef = collection(db, 'centres');
    const centresSnapshot = await getDocs(centresRef);
    
    console.log(`🏢 Total centres: ${centresSnapshot.size}`);
    centresSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n${data.name} (ID: ${doc.id})`);
      console.log('  Active:', data.isActive);
      console.log('  Staff IDs:', data.staffIds || 'NOT SET');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkStaffCentreRelationships(); 