import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

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

async function checkCentresData() {
  try {
    console.log('🏢 Checking centres data...\n');

    const centresRef = collection(db, 'centres');
    const q = query(centresRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    console.log(`📋 Found ${snapshot.size} centres:\n`);
    
    snapshot.docs.forEach((doc, index) => {
      const centre = doc.data();
      console.log(`${index + 1}. Centre ID: ${doc.id}`);
      console.log(`   Name: ${centre.name || 'NO NAME'}`);
      console.log(`   Code: ${centre.code || 'NO CODE'}`);
      console.log(`   Active: ${centre.isActive !== false ? 'Yes' : 'No'}`);
      console.log(`   Staff Assigned: ${centre.staffAssigned?.length || 0}`);
      if (centre.address) {
        console.log(`   Address: ${centre.address.street}, ${centre.address.city}`);
      }
      console.log('');
    });
    
    if (snapshot.size === 0) {
      console.log('⚠️  No centres found in database');
      console.log('💡 You may need to create centres first');
    }

  } catch (error) {
    console.error('❌ Error checking centres:', error.message);
  }
}

checkCentresData(); 