import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
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

  if (!user) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Admin Setup</h2>
        <p className="text-gray-600">Please log in to use admin setup tools.</p>
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
        </div>
        
        {message && (
          <div className={`p-3 rounded ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Note:</h3>
          <p className="text-blue-800 text-sm">
            Test data can now be created directly through the Staff and Clients management sections using the "Add" buttons. 
            This ensures data consistency and uses the proper form validation.
          </p>
        </div>
      </div>
    </Card>
  );
} 