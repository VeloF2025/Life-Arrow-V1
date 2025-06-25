import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import type { UserProfile } from '../../types';
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

export interface UserProfileFormData {
  id: string;
  photoURL: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  position: string;
  department: string;
  specializations: string[];
  qualifications: string;
  experience: string;
  bio: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

interface UserProfileFormProps {
  user?: UserProfile;
  onSubmit: (data: UserProfileFormData) => Promise<void>;
  onCancel?: () => void;
  onPhotoChange?: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
  userId?: string;
  userRole?: string;
}

export function UserProfileForm({ 
  user, 
  onSubmit, 
  onCancel, 
  onPhotoChange, 
  isLoading, 
  error,
  userId,
  userRole
}: UserProfileFormProps) {
  const [formData, setFormData] = useState<UserProfileFormData>(() => ({
    id: user?.id || '',
    photoURL: user?.photoUrl || '',
    createdAt: user?.createdAt || new Date(),
    updatedAt: new Date(),
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || '',
    position: user?.position || '',
    department: user?.department || '',
    specializations: user?.specializations || [],
    qualifications: user?.qualifications || '',
    experience: user?.experience || '',
    bio: user?.bio || '',
    emergencyContactName: user?.emergencyContactName || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
    emergencyContactRelationship: user?.emergencyContactRelationship || '',
    street: user?.street || '',
    city: user?.city || '',
    province: user?.province || '',
    postalCode: user?.postalCode || ''
  }));

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        id: user.id || '',
        photoURL: user.photoUrl || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        position: user.position || '',
        department: user.department || '',
        specializations: user.specializations || [],
        qualifications: user.qualifications || '',
        experience: user.experience || '',
        bio: user.bio || '',
        emergencyContactName: user.emergencyContactName || '',
        emergencyContactPhone: user.emergencyContactPhone || '',
        emergencyContactRelationship: user.emergencyContactRelationship || '',
        street: user.street || '',
        city: user.city || '',
        province: user.province || '',
        postalCode: user.postalCode || '',
        createdAt: user.createdAt || prev.createdAt,
        updatedAt: new Date()
      }));
    }
  }, [user]);

  const handleInputChange = (field: keyof UserProfileFormData) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }));
  };

  const handleSpecializationsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const specializations = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      specializations,
      updatedAt: new Date()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      await onSubmit({
        ...formData,
        updatedAt: new Date()
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Photo */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
          <PhotoUpload
            currentPhotoUrl={formData.photoURL}
            onPhotoSelect={file => onPhotoChange?.(file)}
            onPhotoRemove={() => setFormData(prev => ({ ...prev, photoURL: '' }))}
            uploading={isLoading}
            className="mb-6"
            userId={userId}
            userRole={userRole as any}
          />
        </div>
      </Card>

      {/* Personal Information */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
              required
              leftIcon={<UserIcon className="w-4 h-4" />}
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
              required
              leftIcon={<UserIcon className="w-4 h-4" />}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              required
              leftIcon={<EnvelopeIcon className="w-4 h-4" />}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange('phone')}
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
            <Input
              label="Position"
              value={formData.position}
              onChange={handleInputChange('position')}
              leftIcon={<BriefcaseIcon className="w-4 h-4" />}
            />
            <Input
              label="Department"
              value={formData.department}
              onChange={handleInputChange('department')}
              leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}
            />
            <Input
              label="Specializations"
              value={Array.isArray(formData.specializations) ? formData.specializations.join(', ') : ''}
              onChange={handleSpecializationsChange}
              placeholder="Separate with commas"
              leftIcon={<AcademicCapIcon className="w-4 h-4" />}
            />
            <Input
              label="Qualifications"
              value={formData.qualifications}
              onChange={handleInputChange('qualifications')}
              leftIcon={<AcademicCapIcon className="w-4 h-4" />}
            />
            <Input
              label="Years of Experience"
              type="number"
              value={formData.experience}
              onChange={handleInputChange('experience')}
              placeholder="e.g., 5"
              leftIcon={<ClockIcon className="w-4 h-4" />}
            />
            <div className="md:col-span-2">
              <TextArea
                label="Bio"
                value={formData.bio}
                onChange={(value: string) => setFormData(prev => ({ ...prev, bio: value, updatedAt: new Date() }))}
                placeholder="Brief description of your background and expertise"
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
              onChange={handleInputChange('emergencyContactName')}
              leftIcon={<UserGroupIcon className="w-4 h-4" />}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={handleInputChange('emergencyContactPhone')}
              leftIcon={<PhoneIcon className="w-4 h-4" />}
            />
            <Input
              label="Relationship"
              value={formData.emergencyContactRelationship}
              onChange={handleInputChange('emergencyContactRelationship')}
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
                onChange={handleInputChange('street')}
                leftIcon={<MapPinIcon className="w-4 h-4" />}
              />
            </div>
            <Input
              label="City"
              value={formData.city}
              onChange={handleInputChange('city')}
              leftIcon={<MapPinIcon className="w-4 h-4" />}
            />
            <Input
              label="Province"
              value={formData.province}
              onChange={handleInputChange('province')}
              leftIcon={<MapPinIcon className="w-4 h-4" />}
            />
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={handleInputChange('postalCode')}
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
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
