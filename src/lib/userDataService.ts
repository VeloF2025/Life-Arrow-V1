import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { uploadPhoto } from './storage';
import type { UserProfile } from '../types';

export interface CompleteUserProfile extends UserProfile {
  // Ensure photoURL is consistent with UserProfile type
  photoURL?: string;
  // Staff specific fields
  position?: string;
  department?: string;
  qualifications?: string;
  specializations?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  hireDate?: Date;
  centreIds?: string[];
  status?: 'active' | 'inactive' | 'on-leave';
  salary?: number;
  notes?: string;
  
  // Admin specific fields
  permissions?: string[];
  lastLogin?: Date;
}

/**
 * Fetches a complete user profile from multiple collections based on user ID
 * @param userId - The user's ID
 * @returns A complete user profile with data from all relevant collections
 */
export async function fetchCompleteUserProfile(userId: string): Promise<CompleteUserProfile | null> {
  try {
    console.log('Fetching complete profile for user:', userId);
    // Start with the base user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.log('User document not found');
      return null;
    }

    const userData = userDoc.data();
    console.log('Base user data:', userData);
    
    // Create base profile from users collection
    let profile: CompleteUserProfile = {
      id: userDoc.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'user',
      photoURL: userData.photoURL || userData.photoUrl || '',
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
    };

    // Fetch additional data based on the user's role
    switch (profile.role) {
      case 'staff':
        try {
          const staffDoc = await getDoc(doc(db, 'staff', userId));
          if (staffDoc.exists()) {
            const staffData = staffDoc.data();
            console.log('Staff data:', staffData);
            
            // Merge staff data
            Object.assign(profile, {
              position: staffData.position,
              department: staffData.department,
              qualifications: staffData.qualifications,
              specializations: staffData.specializations || [],
              status: staffData.status || 'active',
              hireDate: staffData.hireDate?.toDate(),
              centreIds: staffData.centreIds || [],
              salary: staffData.salary,
              notes: staffData.notes,
              emergencyContact: staffData.emergencyContact || {
                name: '',
                phone: '',
                relationship: '',
              },
              address: staffData.address || {
                street: '',
                city: '',
                province: '',
                postalCode: '',
              }
            });
          }
        } catch (error) {
          console.warn('Error fetching staff profile:', error);
        }
        break;
        
      case 'admin':
      case 'super-admin':
      case 'Super Admin':
        // Try fetching both staff and admin data for admins
        // because admins may have been promoted from staff
        try {
          const adminDoc = await getDoc(doc(db, 'adminProfiles', userId));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            console.log('Admin profile data:', adminData);
            
            // Merge admin data
            Object.assign(profile, {
              permissions: adminData.permissions || [],
              lastLogin: adminData.lastLogin?.toDate(),
            });
          }
        } catch (error) {
          console.warn('Error fetching admin profile:', error);
        }
        
        // Also fetch staff data for admins who were promoted from staff
        try {
          const staffDoc = await getDoc(doc(db, 'staff', userId));
          if (staffDoc.exists()) {
            const staffData = staffDoc.data();
            console.log('Staff data for admin:', staffData);
            
            // Merge staff data
            Object.assign(profile, {
              position: staffData.position,
              department: staffData.department,
              qualifications: staffData.qualifications,
              specializations: staffData.specializations || [],
              status: staffData.status || 'active',
              hireDate: staffData.hireDate?.toDate(),
              centreIds: staffData.centreIds || [],
              salary: staffData.salary,
              notes: staffData.notes,
              emergencyContact: staffData.emergencyContact || {
                name: '',
                phone: '',
                relationship: '',
              },
              address: staffData.address || {
                street: '',
                city: '',
                province: '',
                postalCode: '',
              }
            });
          }
        } catch (error) {
          console.warn('Error fetching staff data for admin:', error);
        }
        break;
    }

    console.log('Complete profile assembled:', profile);
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}

/**
 * Updates a user's profile across all relevant collections
 * @param userId - The user's ID
 * @param profileData - The profile data to update
 * @param userRole - The user's role
 */
export async function updateUserProfile(
  userId: string, 
  profileData: Partial<CompleteUserProfile>,
  userRole?: string
): Promise<void> {
  try {
    console.log('Updating profile for user:', userId);
    
    // Determine the user's role if not provided
    let role = userRole;
    if (!role) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        role = userDoc.data().role;
      }
    }
    
    // Update the base user document
    const userDocRef = doc(db, 'users', userId);
    const userData: Record<string, any> = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      photoURL: profileData.photoURL,
      updatedAt: new Date()
    };
    
    // Remove undefined values
    Object.keys(userData).forEach(key => {
      if (userData[key] === undefined) {
        delete userData[key];
      }
    });
    
    // Update user collection
    if (Object.keys(userData).length > 0) {
      console.log('Updating user data:', userData);
      await updateDoc(userDocRef, userData);
    }
    
    // Prepare common data for both staff and admin profiles
    const commonProfileData: Record<string, any> = {
      position: profileData.position,
      department: profileData.department,
      qualifications: profileData.qualifications,
      specializations: profileData.specializations,
      status: profileData.status,
      notes: profileData.notes,
      photoUrl: profileData.photoURL, // Ensure consistent field naming
      updatedAt: new Date(),
      emergencyContact: profileData.emergencyContact,
      address: {
        street: profileData.street || profileData.address?.street,
        city: profileData.city || profileData.address?.city,
        province: profileData.province || profileData.address?.province,
        postalCode: profileData.postalCode || profileData.address?.postalCode,
      }
    };
    
    // Remove undefined values from common data
    Object.keys(commonProfileData).forEach(key => {
      if (commonProfileData[key] === undefined) {
        delete commonProfileData[key];
      }
    });
    
    // Update staff-specific data
    if (role === 'staff' || role === 'admin' || role === 'super-admin' || (typeof role === 'string' && role.toLowerCase().includes('admin'))) {
      const staffData = {
        ...commonProfileData,
        hireDate: profileData.hireDate,
        centreIds: profileData.centreIds,
        salary: profileData.salary,
      };
      
      // Remove undefined values
      Object.keys(staffData).forEach(key => {
        if (staffData[key] === undefined) {
          delete staffData[key];
        }
      });
      
      // Update staff collection
      if (Object.keys(staffData).length > 0) {
        const staffDocRef = doc(db, 'staff', userId);
        console.log('Updating staff data:', staffData);
        
        // Check if staff doc exists first
        const staffDoc = await getDoc(staffDocRef);
        if (staffDoc.exists()) {
          await updateDoc(staffDocRef, staffData);
        } else {
          await setDoc(staffDocRef, {
            ...staffData,
            createdAt: new Date()
          });
        }
      }
    }
    
    // Update admin-specific data
    if (role === 'admin' || role === 'super-admin' || (typeof role === 'string' && role.toLowerCase().includes('admin'))) {
      const adminData = {
        ...commonProfileData, // Include all common profile data in admin profile
        permissions: profileData.permissions,
        lastLogin: profileData.lastLogin,
      };
      
      // Remove undefined values
      Object.keys(adminData).forEach(key => {
        if (adminData[key] === undefined) {
          delete adminData[key];
        }
      });
      
      // Update admin collection if there's data to update
      if (Object.keys(adminData).length > 0) {
        const adminDocRef = doc(db, 'adminProfiles', userId);
        console.log('Updating admin data:', adminData);
        
        // Check if admin doc exists first
        const adminDoc = await getDoc(adminDocRef);
        if (adminDoc.exists()) {
          await updateDoc(adminDocRef, adminData);
        } else {
          await setDoc(adminDocRef, {
            ...adminData,
            createdAt: new Date()
          });
        }
      }
    }
    
    console.log('Profile update complete');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
}

/**
 * Updates a user's profile photo and updates relevant collections
 * @param userId - The user's ID
 * @param file - The photo file to upload
 * @param role - The user's role
 */
export async function updateUserProfilePhoto(
  userId: string,
  file: File,
  role: string = 'user'
): Promise<string> {
  try {
    console.log('Updating profile photo for user:', userId);
    
    // Determine the appropriate storage path based on role
    let storagePath: string;
    
    // Simplified role checking logic that uses only paths allowed in storage.rules
    if (role === 'staff') {
      storagePath = `staff/${userId}`;
    } else if (typeof role === 'string' && role.toLowerCase().includes('admin')) {
      // Use staff path for admins since it's allowed in the rules
      storagePath = `staff/${userId}`;
    } else {
      storagePath = `users/${userId}/avatar`;
    }
    
    // Upload the photo
    const photoURL = await uploadPhoto(file, storagePath);
    
    // Update the user document with the new photo URL
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      photoURL,
      updatedAt: new Date()
    });
    
    // If this is a staff member, update the staff document too
    if (role === 'staff' || role === 'admin' || role === 'super-admin' || role === 'Super Admin') {
      const staffDocRef = doc(db, 'staff', userId);
      const staffDoc = await getDoc(staffDocRef);
      if (staffDoc.exists()) {
        await updateDoc(staffDocRef, {
          photoUrl: photoURL,
          updatedAt: new Date()
        });
      }
    }
    
    // If this is an admin, update the admin document too
    if (role === 'admin' || role === 'super-admin' || role === 'Super Admin') {
      const adminDocRef = doc(db, 'adminProfiles', userId);
      const adminDoc = await getDoc(adminDocRef);
      if (adminDoc.exists()) {
        await updateDoc(adminDocRef, {
          photoUrl: photoURL,
          updatedAt: new Date()
        });
      }
    }
    
    return photoURL;
  } catch (error) {
    console.error('Error updating user profile photo:', error);
    throw new Error('Failed to update profile photo');
  }
}
