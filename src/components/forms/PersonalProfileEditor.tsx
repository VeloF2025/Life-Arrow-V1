import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { fetchCompleteUserProfile, updateUserProfile, updateUserProfilePhoto } from '../../lib/userDataService';
import type { CompleteUserProfile } from '../../lib/userDataService';
import { UserProfileForm } from './UserProfileForm';
import type { UserProfileFormData } from './UserProfileForm';
import { uploadPhoto } from '../../lib/storage';

interface PersonalProfileEditorProps {
  onClose?: () => void;
}

export function PersonalProfileEditor({ onClose }: PersonalProfileEditorProps) {
  const [authUser, authLoading] = useAuthState(auth);
  const [completeProfile, setCompleteProfile] = useState<CompleteUserProfile | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch the complete user profile from all collections
  useEffect(() => {
    async function loadCompleteProfile() {
      if (!authUser) return;
      
      try {
        setFetchLoading(true);
        const profile = await fetchCompleteUserProfile(authUser.uid);
        setCompleteProfile(profile);
      } catch (err) {
        console.error('Error loading complete profile:', err);
        setError('Failed to load your complete profile. Please try again.');
      } finally {
        setFetchLoading(false);
      }
    }
    
    if (!authLoading) {
      loadCompleteProfile();
    }
  }, [authUser, authLoading]);

  const handleSubmit = async (formData: UserProfileFormData) => {
    if (!authUser || !completeProfile) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Use the unified service to update all collections
      await updateUserProfile(authUser.uid, formData as Partial<CompleteUserProfile>, completeProfile.role);
      
      // Show success message or close modal
      onClose?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = async (file: File) => {
    if (!authUser || !completeProfile) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Uploading photo for user:', authUser.uid, 'with role:', completeProfile.role);
      
      // Use the unified service to update the photo across all collections
      const photoURL = await updateUserProfilePhoto(authUser.uid, file, completeProfile.role || 'user');
      console.log('Photo uploaded successfully, new URL:', photoURL);
      
      // Update the local state with the new photo URL
      setCompleteProfile(prev => prev ? {...prev, photoURL, photoUrl: photoURL} : null);

    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loading = authLoading || fetchLoading;
  
  if (loading) {
    return <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      <span className="ml-2 text-gray-600">Loading profile data...</span>
    </div>;
  }

  return (
    <UserProfileForm
      user={completeProfile || undefined}
      onSubmit={handleSubmit}
      onPhotoChange={handlePhotoChange}
      isLoading={isLoading}
      error={error}
      userId={authUser?.uid}
      userRole={completeProfile?.role || 'user'}
    />
  );
}