import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

export interface ProfileCompletionStatus {
  isCompleted: boolean;
  completionPercentage: number;
  missingFields: string[];
  loading: boolean;
}

export function useProfileCompletion(): ProfileCompletionStatus {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<ProfileCompletionStatus>({
    isCompleted: false,
    completionPercentage: 0,
    missingFields: [],
    loading: true
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function checkProfileCompletion() {
      if (!user) {
        setStatus({
          isCompleted: false,
          completionPercentage: 0,
          missingFields: [],
          loading: false
        });
        return;
      }

      try {
        // Check if detailed client profile exists
        const clientProfileRef = doc(db, 'clientProfiles', user.uid);
        const clientProfileSnap = await getDoc(clientProfileRef);
        
        if (!clientProfileSnap.exists()) {
          setStatus({
            isCompleted: false,
            completionPercentage: 0,
            missingFields: ['Complete profile setup required'],
            loading: false
          });
          return;
        }

        const profileData = clientProfileSnap.data();
        
        // Required fields for complete profile
        const requiredFields = {
          // Personal Information
          'name': profileData.name,
          'surname': profileData.surname,
          'email': profileData.email,
          'gender': profileData.gender,
          'mobile': profileData.mobile,
          
          // Address Information
          'address1': profileData.address1,
          'suburb': profileData.suburb,
          'cityTown': profileData.cityTown,
          'province': profileData.province,
          'postalCode': profileData.postalCode,
          'country': profileData.country,
          
          // Contact & Personal Details
          'preferredMethodOfContact': profileData.preferredMethodOfContact,
          'maritalStatus': profileData.maritalStatus,
          'employmentStatus': profileData.employmentStatus,
          
          // Service Information
          'reasonForTransformation': profileData.reasonForTransformation,
          'whereDidYouHearAboutLifeArrow': profileData.whereDidYouHearAboutLifeArrow,
          'myNearestCentre': profileData.myNearestCentre,
          
          // Terms acceptance
          'termsAndConditionsAgreed': profileData.termsAndConditionsAgreed
        };

        const missingFields: string[] = [];
        let completedFields = 0;
        let totalFields = Object.keys(requiredFields).length;

        // Check each required field
        Object.entries(requiredFields).forEach(([fieldName, value]) => {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            missingFields.push(fieldName);
          } else {
            completedFields++;
          }
        });

        // Handle conditional ID/passport requirement
        const isIdValid = profileData.idNumber && profileData.idNumber.trim() !== '';
        const isPassportValid = profileData.passport && profileData.passport.trim() !== '';
        const isSouthAfrican = profileData.country === 'South Africa' || !profileData.country;
        
        if (isSouthAfrican) {
          // South Africans need ID number
          if (!isIdValid) {
            if (!missingFields.includes('idNumber')) {
              missingFields.push('idNumber');
            }
          } else {
            // ID is valid, count it as completed
            if (!missingFields.includes('idNumber')) {
              completedFields++;
            }
          }
          totalFields++; // Add one field for ID requirement
        } else {
          // International clients need either passport or ID
          if (!isIdValid && !isPassportValid) {
            missingFields.push('passport');
          } else {
            completedFields++;
          }
          totalFields++; // Add one field for passport/ID requirement
        }

        const completionPercentage = Math.round((completedFields / totalFields) * 100);
        const isCompleted = missingFields.length === 0;

        setStatus({
          isCompleted,
          completionPercentage,
          missingFields,
          loading: false
        });

      } catch (error) {
        console.error('Error checking profile completion:', error);
        setStatus({
          isCompleted: false,
          completionPercentage: 0,
          missingFields: ['Error checking profile'],
          loading: false
        });
      }
    }

    checkProfileCompletion();
  }, [user]);

  return status;
} 