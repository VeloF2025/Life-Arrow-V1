import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { fetchCompleteUserProfile, updateUserProfile, updateUserProfilePhoto } from '../../lib/userDataService';
import type { CompleteUserProfile } from '../../lib/userDataService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { PhotoUpload } from '../ui/PhotoUpload';
import { Card } from '../ui/Card';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  HeartIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Constants for form options
const positions = [
  'Doctor', 'Nurse', 'Therapist', 'Wellness Coach', 'Nutritionist', 
  'Administrative Assistant', 'Manager', 'Receptionist', 'Cleaner', 'Security'
];

const departments = [
  'Medical', 'Therapy', 'Wellness', 'Nutrition', 'Administration', 
  'Management', 'Reception', 'Maintenance', 'Security'
];

const provinces = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'
];

interface StaffProfileEditorProps {
  onClose?: () => void;
}

export function StaffProfileEditor({ onClose }: StaffProfileEditorProps) {
  const [authUser, authLoading] = useAuthState(auth);
  const [completeProfile, setCompleteProfile] = useState<CompleteUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    qualifications: '',
    specializations: '',
    status: 'active' as 'active' | 'inactive' | 'on-leave',
    hireDate: '',
    centreIds: [] as string[],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
    photoUrl: ''
  });

  // Fetch the complete user profile from all collections
  useEffect(() => {
    async function loadCompleteProfile() {
      if (!authUser) return;
      
      try {
        setLoading(true);
        const profile = await fetchCompleteUserProfile(authUser.uid);
        setCompleteProfile(profile);
        
        if (profile) {
          // Map profile data to form fields
          setFormData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            email: profile.email || '',
            phone: profile.phone || '',
            position: profile.position || '',
            department: profile.department || '',
            qualifications: profile.qualifications || '',
            specializations: Array.isArray(profile.specializations) 
              ? profile.specializations.join(', ') 
              : '',
            status: profile.status || 'active',
            hireDate: profile.hireDate 
              ? new Date(profile.hireDate).toISOString().split('T')[0] 
              : '',
            centreIds: profile.centreIds || [],
            emergencyContactName: profile.emergencyContact?.name || '',
            emergencyContactPhone: profile.emergencyContact?.phone || '',
            emergencyContactRelationship: profile.emergencyContact?.relationship || '',
            street: profile.street || profile.address?.street || '',
            city: profile.city || profile.address?.city || '',
            province: profile.province || profile.address?.province || '',
            postalCode: profile.postalCode || profile.address?.postalCode || '',
            notes: profile.notes || '',
            photoUrl: profile.photoURL || profile.photoUrl || ''
          });
        }
      } catch (err) {
        console.error('Error loading complete profile:', err);
        setError('Failed to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading) {
      loadCompleteProfile();
    }
  }, [authUser, authLoading]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoChange = async (file: File) => {
    if (!authUser || !completeProfile) return;

    try {
      setPhotoUploading(true);
      setError(null);
      
      console.log('Uploading photo for user:', authUser.uid, 'with role:', completeProfile.role);
      
      // Use the unified service to update the photo across all collections
      const photoURL = await updateUserProfilePhoto(authUser.uid, file, completeProfile.role || 'user');
      console.log('Photo uploaded successfully, new URL:', photoURL);
      
      // Update the form data with the new photo URL
      setFormData(prev => ({
        ...prev,
        photoUrl: photoURL
      }));

    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !completeProfile) return;

    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare data for update
      const updateData: Partial<CompleteUserProfile> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        qualifications: formData.qualifications,
        specializations: formData.specializations.split(',').map(s => s.trim()).filter(Boolean),
        status: formData.status,
        hireDate: formData.hireDate ? new Date(formData.hireDate) : undefined,
        centreIds: formData.centreIds,
        photoURL: formData.photoUrl,
        photoUrl: formData.photoUrl, // Ensure both fields are updated
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship
        },
        address: {
          street: formData.street,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode
        },
        street: formData.street,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        notes: formData.notes,
        updatedAt: new Date()
      };
      
      // Use the unified service to update all collections
      await updateUserProfile(authUser.uid, updateData, completeProfile.role);
      
      // Show success message or close modal
      onClose?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-gray-600">Loading profile data...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Photo */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
          <PhotoUpload
            currentPhotoUrl={formData.photoUrl}
            onPhotoSelect={handlePhotoChange}
            onPhotoRemove={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
            uploading={photoUploading}
            className="mb-6"
            userId={authUser?.uid}
            userRole={completeProfile?.role as any}
          />
        </div>
      </Card>

      {/* Basic Information */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              required
              leftIcon={<UserIcon className="w-4 h-4" />}
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              required
              leftIcon={<UserIcon className="w-4 h-4" />}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              leftIcon={<EnvelopeIcon className="w-4 h-4" />}
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
              leftIcon={<PhoneIcon className="w-4 h-4" />}
            />
          </div>
        </div>
      </Card>

      {/* Professional Information */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Position</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <Input
              label="Specializations"
              value={formData.specializations}
              onChange={(e) => handleInputChange('specializations', e.target.value)}
              placeholder="e.g., Cardiology, Pediatrics (comma separated)"
              leftIcon={<HeartIcon className="w-4 h-4" />}
            />
            <Input
              label="Qualifications"
              value={formData.qualifications}
              onChange={(e) => handleInputChange('qualifications', e.target.value)}
              placeholder="e.g., MD, PhD, RN"
              leftIcon={<AcademicCapIcon className="w-4 h-4" />}
            />
            <div className="md:col-span-2">
              <TextArea
                label="Notes"
                value={formData.notes}
                onChange={(value) => handleInputChange('notes', value)}
                placeholder="Additional notes about this staff member"
                rows={4}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.emergencyContactName}
              onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              leftIcon={<UserGroupIcon className="w-4 h-4" />}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
              leftIcon={<PhoneIcon className="w-4 h-4" />}
            />
            <Input
              label="Relationship"
              value={formData.emergencyContactRelationship}
              onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
              leftIcon={<HeartIcon className="w-4 h-4" />}
            />
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Street Address"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                leftIcon={<MapPinIcon className="w-4 h-4" />}
              />
            </div>
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              leftIcon={<MapPinIcon className="w-4 h-4" />}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select
                value={formData.province}
                onChange={(e) => handleInputChange('province', e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Province</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              leftIcon={<MapPinIcon className="w-4 h-4" />}
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
