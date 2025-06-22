import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

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

const testClients = [
  {
    firstName: "John",
    lastName: "Doe", 
    email: "john.doe@example.com",
    mobile: "+27 82 123 4567",
    gender: "Male",
    idNumber: "8001015009088",
    country: "South Africa",
    address1: "123 Main Street",
    address2: "Unit 4A",
    suburb: "Sandton",
    cityTown: "Johannesburg", 
    province: "Gauteng",
    postalCode: "2196",
    preferredMethodOfContact: "Email",
    maritalStatus: "Single",
    employmentStatus: "Employed",
    currentMedication: "None",
    chronicConditions: "None",
    reasonForTransformation: "Weight loss and fitness improvement",
    whereDidYouHearAboutLifeArrow: "Social Media",
    myNearestTreatmentCentre: "Sandton Centre",
    status: "active",
    registrationDate: Timestamp.now(),
    addedTime: Timestamp.now(),
    userId: "user_john_doe_123"
  },
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.j@example.com", 
    mobile: "+27 83 987 6543",
    gender: "Female",
    idNumber: "9205142345067",
    country: "South Africa",
    address1: "456 Oak Avenue",
    suburb: "Rosebank",
    cityTown: "Johannesburg",
    province: "Gauteng", 
    postalCode: "2196",
    preferredMethodOfContact: "Phone",
    maritalStatus: "Married",
    employmentStatus: "Self-employed",
    currentMedication: "Vitamin D supplements",
    chronicConditions: "Mild hypertension",
    reasonForTransformation: "Overall wellness and health monitoring",
    whereDidYouHearAboutLifeArrow: "Referral",
    myNearestTreatmentCentre: "Rosebank Centre",
    referrerName: "Dr. Smith",
    status: "pending-verification",
    registrationDate: Timestamp.now(),
    addedTime: Timestamp.now(),
    userId: "user_sarah_johnson_456"
  },
  {
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@example.com",
    mobile: "+27 84 555 7890", 
    gender: "Male",
    idNumber: "7503081234567",
    country: "South Africa",
    address1: "789 Pine Road",
    suburb: "Centurion",
    cityTown: "Pretoria",
    province: "Gauteng",
    postalCode: "0157",
    preferredMethodOfContact: "Email",
    maritalStatus: "Divorced", 
    employmentStatus: "Employed",
    currentMedication: "Metformin",
    chronicConditions: "Type 2 Diabetes",
    currentTreatments: "Dietary counseling",
    reasonForTransformation: "Diabetes management and weight control",
    whereDidYouHearAboutLifeArrow: "Healthcare Provider",
    myNearestTreatmentCentre: "Centurion Centre",
    referrerName: "Dr. Williams",
    status: "active",
    registrationDate: Timestamp.fromDate(new Date('2024-01-10')),
    addedTime: Timestamp.fromDate(new Date('2024-01-10')),
    userId: "user_michael_brown_789"
  },
  {
    firstName: "Lisa",
    lastName: "Davis",
    email: "lisa.davis@example.com",
    mobile: "+27 81 222 3344",
    gender: "Female", 
    idNumber: "8809123456789",
    country: "South Africa",
    address1: "321 Maple Street",
    suburb: "Bellville",
    cityTown: "Cape Town",
    province: "Western Cape",
    postalCode: "7530",
    preferredMethodOfContact: "Phone",
    maritalStatus: "Single",
    employmentStatus: "Student",
    currentMedication: "None",
    chronicConditions: "None",
    reasonForTransformation: "Fitness improvement and lifestyle change",
    whereDidYouHearAboutLifeArrow: "Friend recommendation",
    myNearestTreatmentCentre: "Cape Town Centre",
    status: "inactive",
    registrationDate: Timestamp.fromDate(new Date('2024-01-05')),
    addedTime: Timestamp.fromDate(new Date('2024-01-05')),
    userId: "user_lisa_davis_321"
  }
];

async function createTestClients() {
  try {
    console.log('Creating test clients...');
    
    for (const client of testClients) {
      const docRef = await addDoc(collection(db, 'clients'), client);
      console.log(`Created client: ${client.firstName} ${client.lastName} with ID: ${docRef.id}`);
    }
    
    console.log('✅ All test clients created successfully!');
  } catch (error) {
    console.error('❌ Error creating test clients:', error);
  }
}

createTestClients(); 