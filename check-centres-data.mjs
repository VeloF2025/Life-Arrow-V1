import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function checkCentresData() {
  try {
    console.log('Checking centres data...');
    
    // Get all centres
    const centresRef = collection(db, 'centres');
    const snapshot = await getDocs(centresRef);
    
    console.log(`Total centres in database: ${snapshot.size}`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('\n--- Centre ---');
      console.log('ID:', doc.id);
      console.log('Name:', data.name);
      console.log('Is Active:', data.isActive);
      console.log('Services field exists:', 'services' in data);
      console.log('Services:', data.services);
      console.log('Services count:', data.services?.length || 0);
      
      // Check for old field name
      if (data.servicesOffered) {
        console.log('OLD servicesOffered field:', data.servicesOffered);
      }
    });

    // Check active centres only
    console.log('\n=== ACTIVE CENTRES ONLY ===');
    const activeQuery = query(centresRef, where('isActive', '==', true));
    const activeSnapshot = await getDocs(activeQuery);
    console.log(`Active centres: ${activeSnapshot.size}`);
    
    const centresWithServices = [];
    activeSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.services && data.services.length > 0) {
        centresWithServices.push({
          name: data.name,
          serviceCount: data.services.length
        });
      }
    });
    
    console.log('\nActive centres with services:', centresWithServices);
    console.log('Count of centres with services:', centresWithServices.length);
    
  } catch (error) {
    console.error('Error checking centres:', error);
  }
}

checkCentresData(); 