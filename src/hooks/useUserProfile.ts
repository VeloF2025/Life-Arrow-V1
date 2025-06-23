import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types';

export function useUserProfile() {
  const [authUser, authLoading] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      console.log('fetchProfile called. authUser:', authUser);
      console.log('authLoading:', authLoading);
      
      if (!authUser) {
        console.log('No authUser, setting profile to null');
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching user document for UID:', authUser.uid);
        
        // First, get the main user record to determine role
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        
        console.log('User document exists:', userDoc.exists());
        
        if (!userDoc.exists()) {
          console.log('User document not found');
          setError('User profile not found');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        console.log('User data:', userData);
        const userRole = userData.role;
        console.log('User role from document:', userRole);

        // Create base profile from users collection
        let profile: UserProfile = {
          id: userDoc.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userRole,
          avatar: userData.avatar,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
        };

        console.log('Base profile created:', profile);

        // Fetch role-specific data based on user role
        let roleSpecificData = null;
        
        switch (userRole) {
          case 'client':
            try {
              const clientDoc = await getDoc(doc(db, 'clientProfiles', authUser.uid));
              if (clientDoc.exists()) {
                roleSpecificData = clientDoc.data();
              }
            } catch {
              console.warn('Client profile not found, using basic user data');
            }
            break;

          case 'admin':
          case 'super-admin':
          case 'Super Admin':
            try {
              const adminDoc = await getDoc(doc(db, 'adminProfiles', authUser.uid));
              if (adminDoc.exists()) {
                roleSpecificData = adminDoc.data();
                console.log('Admin profile data:', roleSpecificData);
              } else {
                console.log('Admin profile document not found');
              }
            } catch (error) {
              console.warn('Admin profile not found, using basic user data. Error:', error);
            }
            break;

          case 'staff':
            try {
              const staffDoc = await getDoc(doc(db, 'staff', authUser.uid));
              if (staffDoc.exists()) {
                roleSpecificData = staffDoc.data();
              }
            } catch {
              console.warn('Staff profile not found, using basic user data');
            }
            break;
        }

        // Merge role-specific data if available
        if (roleSpecificData) {
          profile = {
            ...profile,
            ...roleSpecificData,
            // Ensure core fields from users collection take precedence
            id: profile.id,
            email: profile.email,
            role: profile.role,
          };
        }

        console.log('Final profile:', profile);
        setProfile(profile);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      console.log('Auth loading complete, calling fetchProfile');
      fetchProfile();
    } else {
      console.log('Still loading auth...');
    }
  }, [authUser, authLoading]);

  return {
    user: authUser,
    profile,
    loading: authLoading || loading,
    error,
    isAuthenticated: !!authUser,
  };
} 