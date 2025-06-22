import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  UserCircleIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface ProfileData {
  // Personal Information
  name: string;
  surname: string;
  email: string;
  mobile: string;
  gender: string;
  country: string;
  idNumber: string;
  passport?: string;
  
  // Address Information
  address1: string;
  address2?: string;
  suburb: string;
  cityTown: string;
  province: string;
  postalCode: string;
  
  // Contact & Personal Details
  preferredMethodOfContact: string;
  maritalStatus: string;
  employmentStatus: string;
  
  // Medical Information (optional)
  currentMedication?: string;
  chronicConditions?: string;
  currentTreatments?: string;
  
  // Service Information
  reasonForTransformation: string;
  whereDidYouHearAboutLifeArrow: string;
  myNearestTreatmentCentre: string;
  referrerName?: string;
  
  // Terms & Administrative
  termsAndConditionsAgreed: boolean;
}

interface ProfileManagementProps {
  onNavigateToCompletion?: () => void;
}

export function ProfileManagement({ onNavigateToCompletion }: ProfileManagementProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await loadProfileData(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadProfileData = async (currentUser: User) => {
    try {
      setLoading(true);
      
      // Try to load from clientProfiles collection first
      const profileDoc = await getDoc(doc(db, 'clientProfiles', currentUser.uid));
      
      if (profileDoc.exists()) {
        const data = profileDoc.data() as ProfileData;
        setProfileData(data);
      } else {
        // Fallback to users collection
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profileData: ProfileData = {
            name: userData.firstName || '',
            surname: userData.lastName || '',
            email: userData.email || currentUser.email || '',
            mobile: userData.mobile || '',
            gender: userData.gender || '',
            country: userData.country || '',
            idNumber: userData.idNumber || '',
            passport: userData.passport || '',
            address1: userData.address1 || '',
            address2: userData.address2 || '',
            suburb: userData.suburb || '',
            cityTown: userData.cityTown || '',
            province: userData.province || '',
            postalCode: userData.postalCode || '',
            preferredMethodOfContact: userData.preferredMethodOfContact || '',
            maritalStatus: userData.maritalStatus || '',
            employmentStatus: userData.employmentStatus || '',
            currentMedication: userData.currentMedication || '',
            chronicConditions: userData.chronicConditions || '',
            currentTreatments: userData.currentTreatments || '',
            reasonForTransformation: userData.reasonForTransformation || '',
            whereDidYouHearAboutLifeArrow: userData.whereDidYouHearAboutLifeArrow || '',
            myNearestTreatmentCentre: userData.myNearestTreatmentCentre || '',
            referrerName: userData.referrerName || '',
            termsAndConditionsAgreed: userData.termsAndConditionsAgreed || false,
          };
          setProfileData(profileData);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCompletion = () => {
    if (onNavigateToCompletion) {
      onNavigateToCompletion();
    } else {
      navigate('/profile/complete');
    }
  };

  const getCompletionStatus = () => {
    if (!profileData) return { percentage: 0, isComplete: false };
    
    const requiredFields = [
      'name', 'surname', 'email', 'mobile', 'gender', 'country',
      'address1', 'suburb', 'cityTown', 'province', 'postalCode',
      'preferredMethodOfContact', 'maritalStatus', 'employmentStatus',
      'reasonForTransformation', 'whereDidYouHearAboutLifeArrow', 
      'myNearestTreatmentCentre', 'termsAndConditionsAgreed'
    ];
    
    // Add ID/Passport requirement
    if (profileData.country === 'South Africa') {
      requiredFields.push('idNumber');
    } else if (profileData.country && profileData.country !== 'South Africa') {
      requiredFields.push('passport');
    }
    
    const completedFields = requiredFields.filter(field => {
      const value = profileData[field as keyof ProfileData];
      return value !== null && value !== undefined && value !== '' && value !== false;
    });
    
    const percentage = Math.round((completedFields.length / requiredFields.length) * 100);
    const isComplete = percentage === 100;
    
    return { percentage, isComplete };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const { percentage, isComplete } = getCompletionStatus();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Management</h1>
          <p className="text-gray-600">View and manage your personal information</p>
        </div>
        <div className="space-x-3">
          {!isComplete && (
            <Button onClick={handleStartCompletion} className="btn-primary">
              Complete Profile
            </Button>
          )}
          <Button 
            onClick={handleStartCompletion}
            className="btn-secondary"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Profile Completion Status */}
      {!isComplete && (
        <div className="card p-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">Profile Incomplete</h3>
              <p className="text-yellow-700 mb-3">Your profile is {percentage}% complete</p>
              <Button onClick={handleStartCompletion} className="btn btn-accent-blue text-sm">
                Complete Your Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <UserCircleIcon className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Full Name</span>
              <p className="text-gray-900">{profileData?.name || 'Not specified'} {profileData?.surname || ''}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Gender</span>
              <p className="text-gray-900">{profileData?.gender || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Country</span>
              <p className="text-gray-900">{profileData?.country || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">
                {profileData?.country === 'South Africa' ? 'ID Number' : 'Passport'}
              </span>
              <p className="text-gray-900">
                {profileData?.country === 'South Africa' 
                  ? (profileData?.idNumber || 'Not specified')
                  : (profileData?.passport || 'Not specified')
                }
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <PhoneIcon className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Email</span>
              <p className="text-gray-900">{profileData?.email || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Mobile</span>
              <p className="text-gray-900">{profileData?.mobile || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Preferred Contact Method</span>
              <p className="text-gray-900">{profileData?.preferredMethodOfContact || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <MapPinIcon className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Address</span>
              <p className="text-gray-900">
                {profileData?.address1 ? (
                  <>
                    {profileData.address1}<br />
                    {profileData.address2 && <>{profileData.address2}<br /></>}
                    {profileData.suburb}, {profileData.cityTown}<br />
                    {profileData.province} {profileData.postalCode}
                  </>
                ) : 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <StarIcon className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Marital Status</span>
              <p className="text-gray-900">{profileData?.maritalStatus || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Employment Status</span>
              <p className="text-gray-900">{profileData?.employmentStatus || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wellness Journey Information */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <HeartIcon className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Wellness Journey</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <span className="text-sm font-medium text-gray-600">Reason for Transformation</span>
            <p className="text-gray-900">{profileData?.reasonForTransformation || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">How did you hear about Life Arrow?</span>
            <p className="text-gray-900">{profileData?.whereDidYouHearAboutLifeArrow || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Nearest Treatment Centre</span>
            <p className="text-gray-900">{profileData?.myNearestTreatmentCentre || 'Not specified'}</p>
          </div>
          {profileData?.referrerName && (
            <div>
              <span className="text-sm font-medium text-gray-600">Referred by</span>
              <p className="text-gray-900">{profileData.referrerName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 