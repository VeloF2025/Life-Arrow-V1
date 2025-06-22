import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export async function elevateCurrentUserToSuperAdmin() {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('No user is currently logged in');
  }

  const userId = currentUser.uid;
  
  try {
    console.log('🔄 Elevating current user to super-admin...');
    
    // Update user profile
    await updateDoc(doc(db, 'users', userId), {
      role: 'super-admin',
      updatedAt: new Date()
    });
    
    console.log('✅ User profile updated to super-admin');
    
    // Update/create admin profile
    await setDoc(doc(db, 'adminProfiles', userId), {
      id: userId,
      email: currentUser.email,
      firstName: 'Hein',
      lastName: 'van Vuuren',
      role: 'super-admin',
      specializations: ['System Administration'],
      credentials: [],
      bio: 'System Super Administrator',
      experience: 0,
      clients: [],
      availability: [],
      permissions: {
        canCreateAdmins: true,
        canDeleteAdmins: true,
        canManageSystem: true,
        canViewAllData: true,
      },
      settings: {
        appointmentDuration: 60,
        bufferTime: 15,
        maxDailyAppointments: 8,
        autoAcceptBookings: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
    
    console.log('✅ Admin profile updated to super-admin');
    console.log('🎉 SUCCESS! Please refresh the page to see changes.');
    
    return true;
  } catch (error) {
    console.error('❌ Error elevating user:', error);
    throw error;
  }
} 