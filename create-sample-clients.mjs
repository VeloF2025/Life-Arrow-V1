import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmwV6LQXJCj4PYJVgJW7v4zSvPdPv6I0k",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "909801207914",
  appId: "1:909801207914:web:b58e9d9d0dc65e52e7b9b0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample client data
const sampleClients = [
  {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    mobile: "+27823456789",
    gender: "Male",
    dateOfBirth: "1985-03-15",
    idNumber: "8503157654321",
    country: "South Africa",
    address1: "123 Main Street",
    address2: "Apartment 4B",
    suburb: "Sandton",
    cityTown: "Johannesburg",
    province: "Gauteng",
    postalCode: "2196",
    preferredMethodOfContact: "Email",
    maritalStatus: "Married",
    employmentStatus: "Employed",
    currentMedication: "None",
    chronicConditions: "Hypertension",
    reasonForTransformation: "Weight loss and improved health",
    whereDidYouHearAboutLifeArrow: "Social Media",
    myNearestTreatmentCentre: "Sandton Centre",
    status: "active",
    addedTime: Timestamp.now(),
    registrationDate: Timestamp.now(),
    lastActivity: Timestamp.now()
  },
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@example.com",
    mobile: "+27834567890",
    gender: "Female",
    dateOfBirth: "1990-07-22",
    idNumber: "9007226543210",
    country: "South Africa",
    address1: "456 Oak Avenue",
    suburb: "Claremont",
    cityTown: "Cape Town",
    province: "Western Cape",
    postalCode: "7708",
    preferredMethodOfContact: "SMS",
    maritalStatus: "Single",
    employmentStatus: "Self-employed",
    currentMedication: "Vitamins",
    chronicConditions: "None",
    reasonForTransformation: "Fitness and wellness improvement",
    whereDidYouHearAboutLifeArrow: "Friend Referral",
    myNearestTreatmentCentre: "Cape Town Central",
    referrerName: "Mike Wilson",
    status: "active",
    addedTime: Timestamp.now(),
    registrationDate: Timestamp.now(),
    lastActivity: Timestamp.now()
  },
  {
    firstName: "Michael",
    lastName: "Davis",
    email: "michael.davis@example.com",
    mobile: "+27845678901",
    gender: "Male",
    dateOfBirth: "1978-11-08",
    idNumber: "7811087654321",
    country: "South Africa",
    address1: "789 Pine Road",
    suburb: "Umhlanga",
    cityTown: "Durban",
    province: "KwaZulu-Natal",
    postalCode: "4319",
    preferredMethodOfContact: "Phone",
    maritalStatus: "Divorced",
    employmentStatus: "Employed",
    currentMedication: "Blood pressure medication",
    chronicConditions: "Diabetes Type 2",
    currentTreatments: "Regular diabetes monitoring",
    reasonForTransformation: "Health management and weight control",
    whereDidYouHearAboutLifeArrow: "Google Search",
    myNearestTreatmentCentre: "Durban North",
    status: "active",
    addedTime: Timestamp.now(),
    registrationDate: Timestamp.now(),
    lastActivity: Timestamp.now()
  },
  {
    firstName: "Lisa",
    lastName: "Williams",
    email: "lisa.williams@example.com",
    mobile: "+27856789012",
    gender: "Female",
    dateOfBirth: "1995-04-30",
    idNumber: "9504305432109",
    country: "South Africa",
    address1: "321 Elm Street",
    suburb: "Hatfield",
    cityTown: "Pretoria",
    province: "Gauteng",
    postalCode: "0083",
    preferredMethodOfContact: "Email",
    maritalStatus: "Single",
    employmentStatus: "Student",
    currentMedication: "None",
    chronicConditions: "None",
    reasonForTransformation: "Lifestyle improvement and stress management",
    whereDidYouHearAboutLifeArrow: "University Health Fair",
    myNearestTreatmentCentre: "Pretoria East",
    status: "pending-verification",
    addedTime: Timestamp.now(),
    registrationDate: Timestamp.now(),
    lastActivity: Timestamp.now()
  },
  {
    firstName: "Robert",
    lastName: "Brown",
    email: "robert.brown@example.com",
    mobile: "+27867890123",
    gender: "Male",
    dateOfBirth: "1982-09-12",
    idNumber: "8209129876543",
    country: "South Africa",
    address1: "654 Maple Drive",
    suburb: "Bellville",
    cityTown: "Cape Town",
    province: "Western Cape",
    postalCode: "7530",
    preferredMethodOfContact: "SMS",
    maritalStatus: "Married",
    employmentStatus: "Employed",
    currentMedication: "Cholesterol medication",
    chronicConditions: "High cholesterol",
    reasonForTransformation: "Heart health improvement",
    whereDidYouHearAboutLifeArrow: "Doctor Referral",
    myNearestTreatmentCentre: "Cape Town Central",
    status: "active",
    addedTime: Timestamp.now(),
    registrationDate: Timestamp.now(),
    lastActivity: Timestamp.now()
  }
];

async function createSampleClients() {
  try {
    console.log('Creating sample clients...');
    
    for (let i = 0; i < sampleClients.length; i++) {
      const client = sampleClients[i];
      const docRef = await addDoc(collection(db, 'clients'), client);
      console.log(`✓ Created client: ${client.firstName} ${client.lastName} (ID: ${docRef.id})`);
    }
    
    console.log(`\n🎉 Successfully created ${sampleClients.length} sample clients!`);
    console.log('\nYou can now view them in the Clients Management section of your admin dashboard.');
    
  } catch (error) {
    console.error('❌ Error creating sample clients:', error);
  }
}

// Run the script
createSampleClients(); 