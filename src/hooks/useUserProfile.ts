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
      if (!authUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // First, get the main user record to determine role
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        
        if (!userDoc.exists()) {
          setError('User profile not found');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const userRole = userData.role;

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
            try {
              const adminDoc = await getDoc(doc(db, 'adminProfiles', authUser.uid));
              if (adminDoc.exists()) {
                roleSpecificData = adminDoc.data();
              }
            } catch {
              console.warn('Admin profile not found, using basic user data');
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

        setProfile(profile);
      } catch (err) {
        setError('Failed to fetch user profile');
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
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