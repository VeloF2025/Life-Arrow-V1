import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../lib/firebase';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  UserCircleIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  HeartIcon,
  StarIcon,
  CameraIcon,
  PhotoIcon,
  UserIcon,
  XMarkIcon
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
  photoUrl?: string;
  
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
  
  // Photo upload state
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

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
            photoUrl: userData.photoUrl || '',
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

  // Photo upload functions
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Photo size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setShowCamera(true);
      // Store the stream for the camera modal
      (window as any).cameraStream = stream;
    } catch (error) {
      console.error('Camera access denied:', error);
      setError('Camera access denied. Please use file upload instead.');
    }
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-video-profile') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotoFile(file);
          
          const reader = new FileReader();
          reader.onload = (e) => {
            setPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
          
          closeCameraModal();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const closeCameraModal = () => {
    const stream = (window as any).cameraStream;
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      delete (window as any).cameraStream;
    }
    setShowCamera(false);
  };

  const uploadPhoto = async (file: File, userId: string): Promise<string> => {
    const photoRef = ref(storage, `clients/${userId}/photo_${Date.now()}`);
    await uploadBytes(photoRef, file);
    return await getDownloadURL(photoRef);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !auth.currentUser) return;

    try {
      setUploadingPhoto(true);
      const photoUrl = await uploadPhoto(photoFile, auth.currentUser.uid);
      
      // Update profile data
      await updateDoc(doc(db, 'clientProfiles', auth.currentUser.uid), {
        photoUrl,
        updatedAt: new Date()
      });

      // Update local state
      setProfileData(prev => prev ? { ...prev, photoUrl } : null);
      setShowPhotoUpload(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
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
        {/* Profile Photo Section */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile Photo</h3>
              <Button
                onClick={() => setShowPhotoUpload(true)}
                variant="outline"
                size="sm"
              >
                <CameraIcon className="w-4 h-4 mr-2" />
                {profileData?.photoUrl ? 'Update Photo' : 'Add Photo'}
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full overflow-hidden">
                {profileData?.photoUrl ? (
                  <img
                    src={profileData.photoUrl}
                    alt={`${profileData.name} ${profileData.surname}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {profileData?.photoUrl ? 'Profile photo uploaded' : 'No profile photo'}
                </p>
                <p className="text-xs text-gray-500">
                  Click "Add Photo" to upload or take a new photo
                </p>
              </div>
            </div>
          </div>
        </div>

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

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Update Profile Photo</h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPhotoUpload(false);
                  removePhoto();
                }}
              >
                <XMarkIcon className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Photo Preview */}
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden">
                  {photoPreview || profileData?.photoUrl ? (
                    <img
                      src={photoPreview || profileData?.photoUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Buttons */}
              <div className="flex justify-center space-x-3">
                <input
                  id="photo-input-profile"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('photo-input-profile')?.click()}
                  disabled={uploadingPhoto}
                >
                  <PhotoIcon className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCameraCapture}
                  disabled={uploadingPhoto}
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>

              {/* Action Buttons */}
              {photoFile && (
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={removePhoto}
                    disabled={uploadingPhoto}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Save Photo'}
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Take Photo</h3>
              <Button variant="ghost" onClick={closeCameraModal}>
                <XMarkIcon className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <video
                  id="camera-video-profile"
                  autoPlay
                  playsInline
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                  ref={(video) => {
                    if (video && (window as any).cameraStream) {
                      video.srcObject = (window as any).cameraStream;
                    }
                  }}
                />
                <div className="absolute inset-0 border-4 border-white border-opacity-50 rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full"></div>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <Button variant="outline" onClick={closeCameraModal}>
                  Cancel
                </Button>
                <Button onClick={capturePhoto}>
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 