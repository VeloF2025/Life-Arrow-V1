import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function AdminSetup() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const createAdminProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const adminProfile = {
        firstName: user.displayName?.split(' ')[0] || 'Admin',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'User',
        email: user.email,
        role: 'super-admin',
        permissions: {
          canManageClients: true,
          canManageStaff: true,
          canManageServices: true,
          canManageCentres: true,
          canViewReports: true,
          canManageSystem: true
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true
      };

      await setDoc(doc(db, 'adminProfiles', user.uid), adminProfile);
      setMessage('✅ Admin profile created successfully!');
    } catch (error) {
      console.error('Error creating admin profile:', error);
      setMessage('❌ Error creating admin profile: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createTestClients = async () => {
    setLoading(true);
    setMessage('');
    
    try {
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

      for (const client of testClients) {
        await addDoc(collection(db, 'clients'), client);
      }
      
      setMessage(`✅ Created ${testClients.length} test clients successfully!`);
    } catch (error) {
      console.error('Error creating test clients:', error);
      setMessage('❌ Error creating test clients: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="p-6">
        <p>Please log in to set up admin access.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Admin Setup</h2>
      <div className="space-y-4">
        <div>
          <p className="mb-2">Current User: {user.email}</p>
          <p className="mb-4">User ID: {user.uid}</p>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={createAdminProfile}
            disabled={loading}
            className="mr-2"
          >
            {loading ? 'Creating...' : 'Create Admin Profile'}
          </Button>
          
          <Button 
            onClick={createTestClients}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Creating...' : 'Create Test Clients'}
          </Button>
        </div>
        
        {message && (
          <div className={`p-3 rounded ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}
      </div>
    </Card>
  );
} 