import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvoOt4zRhTjv_WgJrEpH7fInQ3JR2pOoE",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "1081901476334",
  appId: "1:1081901476334:web:f6eeae9aaf8cae80e3a47a",
  measurementId: "G-E5L0D4QWHH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateBernardAppointment() {
  try {
    console.log('🔍 Looking for Bernard Mulder\'s appointment...');
    
    // Find Bernard's appointment
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('clientName', '==', 'Bernard Mulder')
    );
    
    const snapshot = await getDocs(appointmentsQuery);
    
    if (snapshot.empty) {
      console.log('❌ No appointments found for Bernard Mulder');
      return;
    }
    
    console.log(`✅ Found ${snapshot.docs.length} appointment(s) for Bernard Mulder`);
    
    // Get the first appointment (assuming it's the one we want to update)
    const appointmentDoc = snapshot.docs[0];
    const appointmentData = appointmentDoc.data();
    
    console.log('📋 Current appointment data:');
    console.log('   Centre:', appointmentData.centreName);
    console.log('   Service:', appointmentData.serviceName);
    console.log('   Date:', appointmentData.dateTime?.toDate());
    
    // Check if it's currently at Silverwoods
    if (appointmentData.centreName === 'Life Arrow Silverwoods') {
      console.log('🔄 Updating appointment to Sandton...');
      
      // First, let's find the Sandton centre ID
      const centresQuery = query(
        collection(db, 'centres'),
        where('name', '==', 'Life Arrow Sandton')
      );
      
      const centresSnapshot = await getDocs(centresQuery);
      
      if (centresSnapshot.empty) {
        console.log('❌ Sandton centre not found in database');
        return;
      }
      
      const sandtonCentre = centresSnapshot.docs[0];
      const sandtonData = sandtonCentre.data();
      
      console.log('✅ Found Sandton centre:', sandtonData.name);
      
      // Update the appointment
      await updateDoc(doc(db, 'appointments', appointmentDoc.id), {
        centreId: sandtonCentre.id,
        centreName: sandtonData.name,
        lastModifiedBy: 'admin-script',
        updatedAt: new Date()
      });
      
      console.log('✅ Successfully updated Bernard\'s appointment to Sandton!');
      console.log('📍 New centre:', sandtonData.name);
      
    } else {
      console.log('ℹ️  Appointment is not at Silverwoods, current centre:', appointmentData.centreName);
    }
    
  } catch (error) {
    console.error('❌ Error updating appointment:', error);
  }
}

// Run the update
updateBernardAppointment().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}); 