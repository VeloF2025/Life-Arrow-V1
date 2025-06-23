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

async function testCentresAndServices() {
  console.log('🔍 Testing Centres and Services Data...\n');
  
  try {
    // Test centres
    console.log('📍 CENTRES DATA:');
    const centresRef = collection(db, 'centres');
    const centresQuery = query(centresRef, where('isActive', '==', true));
    const centresSnapshot = await getDocs(centresQuery);
    
    console.log(`Total active centres: ${centresSnapshot.size}`);
    
    const centresWithServices = [];
    const centresWithoutServices = [];
    
    centresSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n  Centre: ${data.name}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Services field exists: ${!!data.services}`);
      console.log(`  Services count: ${data.services?.length || 0}`);
      console.log(`  Services array:`, data.services);
      console.log(`  Is Active: ${data.isActive}`);
      
      if (data.services && data.services.length > 0) {
        centresWithServices.push({
          id: doc.id,
          name: data.name,
          serviceCount: data.services.length,
          services: data.services
        });
      } else {
        centresWithoutServices.push({
          id: doc.id,
          name: data.name,
          hasServicesField: !!data.services,
          servicesValue: data.services
        });
      }
    });
    
    console.log(`\n✅ Centres WITH services: ${centresWithServices.length}`);
    centresWithServices.forEach(centre => {
      console.log(`  - ${centre.name}: ${centre.serviceCount} services`);
      console.log(`    Services: ${centre.services.join(', ')}`);
    });
    
    console.log(`\n❌ Centres WITHOUT services: ${centresWithoutServices.length}`);
    centresWithoutServices.forEach(centre => {
      console.log(`  - ${centre.name}: Has field: ${centre.hasServicesField}, Value:`, centre.servicesValue);
    });
    
    // Test services
    console.log('\n🔧 SERVICES DATA:');
    const servicesRef = collection(db, 'services');
    const servicesSnapshot = await getDocs(servicesRef);
    
    console.log(`Total services: ${servicesSnapshot.size}`);
    
    const servicesWithCentres = [];
    const servicesWithoutCentres = [];
    
    servicesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n  Service: ${data.name}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Available at centres field exists: ${!!data.availableAtCentres}`);
      console.log(`  Available at centres count: ${data.availableAtCentres?.length || 0}`);
      console.log(`  Available at centres:`, data.availableAtCentres);
      
      if (data.availableAtCentres && data.availableAtCentres.length > 0) {
        servicesWithCentres.push({
          id: doc.id,
          name: data.name,
          centreCount: data.availableAtCentres.length,
          centres: data.availableAtCentres
        });
      } else {
        servicesWithoutCentres.push({
          id: doc.id,
          name: data.name,
          hasField: !!data.availableAtCentres,
          value: data.availableAtCentres
        });
      }
    });
    
    console.log(`\n✅ Services WITH centres: ${servicesWithCentres.length}`);
    servicesWithCentres.forEach(service => {
      console.log(`  - ${service.name}: Available at ${service.centreCount} centres`);
      console.log(`    Centres: ${service.centres.join(', ')}`);
    });
    
    console.log(`\n❌ Services WITHOUT centres: ${servicesWithoutCentres.length}`);
    servicesWithoutCentres.forEach(service => {
      console.log(`  - ${service.name}: Has field: ${service.hasField}, Value:`, service.value);
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Total centres: ${centresSnapshot.size}`);
    console.log(`Centres with services: ${centresWithServices.length}`);
    console.log(`Centres without services: ${centresWithoutServices.length}`);
    console.log(`Total services: ${servicesSnapshot.size}`);
    console.log(`Services with centres: ${servicesWithCentres.length}`);
    console.log(`Services without centres: ${servicesWithoutCentres.length}`);
    
    // Booking system diagnosis
    console.log('\n🚨 BOOKING SYSTEM DIAGNOSIS:');
    if (centresWithServices.length === 0) {
      console.log('❌ CRITICAL: No centres have services linked!');
      console.log('   This explains why "No Centres Available" is shown in booking interface.');
      console.log('   The CentreSelection component filters for centres with services.length > 0');
    } else {
      console.log('✅ GOOD: Some centres have services linked');
      console.log('   Booking interface should show these centres');
    }
    
    if (servicesWithCentres.length === 0) {
      console.log('❌ CRITICAL: No services are linked to centres!');
      console.log('   Services need availableAtCentres field populated');
    } else {
      console.log('✅ GOOD: Some services are linked to centres');
    }
    
  } catch (error) {
    console.error('❌ Error testing data:', error);
  }
}

testCentresAndServices(); 