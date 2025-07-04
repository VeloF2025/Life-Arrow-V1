import React, { useState, useEffect } from 'react';
import { 
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { clientService } from '../api/clientService';
import type { Client, Centre } from '@/types';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clientData: Partial<Client>) => void;
  client?: Client;
  isSubmitting: boolean;
  title: string;
}

export function ClientForm({
  isOpen,
  onClose,
  onSubmit,
  client,
  isSubmitting,
  title
}: ClientFormProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<Client>>({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: '',
    dateOfBirth: '',
    idNumber: '',
    country: '',
    address1: '',
    address2: '',
    suburb: '',
    cityTown: '',
    province: '',
    postalCode: '',
    maritalStatus: '',
    employmentStatus: '',
    preferredMethodOfContact: 'email',
    myCentreId: '',
    referrerName: '',
    status: 'active'
  });
  
  // Photo handling
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  
  // Centres
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'additional'>('personal');
  
  // Initialize form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        ...client
      });
      
      if (client.photoUrl) {
        setPhotoPreview(client.photoUrl);
      }
    }
  }, [client]);
  
  // Load centres
  useEffect(() => {
    const loadCentres = async () => {
      setLoadingCentres(true);
      try {
        const centresData = await clientService.getCentres();
        setCentres(centresData);
      } catch (error) {
        console.error('Error loading centres:', error);
      } finally {
        setLoadingCentres(false);
      }
    };
    
    loadCentres();
  }, []);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image size should be less than 5MB');
      return;
    }
    
    setPhotoFile(file);
    setPhotoError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Remove photo
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    
    // If editing an existing client with a photo, mark for deletion
    if (client?.photoUrl) {
      setFormData(prev => ({
        ...prev,
        photoUrl: null,
        deletePhoto: true
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    // Email validation
    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    // Phone validation
    if (formData.mobile?.trim()) {
      const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(formData.mobile)) {
        newErrors.mobile = 'Please enter a valid phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Find the first tab with errors and switch to it
      const fieldsWithErrors = Object.keys(errors);
      
      if (fieldsWithErrors.some(field => ['firstName', 'lastName', 'email', 'mobile', 'gender', 'dateOfBirth', 'idNumber'].includes(field))) {
        setActiveTab('personal');
      } else if (fieldsWithErrors.some(field => ['country', 'address1', 'address2', 'suburb', 'cityTown', 'province', 'postalCode'].includes(field))) {
        setActiveTab('contact');
      } else {
        setActiveTab('additional');
      }
      
      return;
    }
    
    // Submit form data
    onSubmit({
      ...formData,
      photoFile
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'personal'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Personal Information
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contact'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contact & Address
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('additional')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'additional'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Additional Details
            </button>
          </nav>
        </div>

        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {/* Photo Upload */}
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Client photo"
                      className="h-24 w-24 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-200"
                    >
                      <XMarkIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center">
                  <label
                    htmlFor="photo-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                  >
                    <span>Upload a photo</span>
                    <input
                      id="photo-upload"
                      name="photo-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
                {photoError && (
                  <p className="text-xs text-red-500 mt-1">{photoError}</p>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleChange}
                required
                error={errors.firstName}
              />
              
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleChange}
                required
                error={errors.lastName}
              />
              
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
                error={errors.email}
              />
              
              <Input
                label="Mobile Number"
                name="mobile"
                value={formData.mobile || ''}
                onChange={handleChange}
                error={errors.mobile}
              />
              
              <Select
                label="Gender"
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select Gender' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
                ]}
              />
              
              <Input
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={handleChange}
              />
              
              <Input
                label="ID Number"
                name="idNumber"
                value={formData.idNumber || ''}
                onChange={handleChange}
              />
              
              <Select
                label="Status"
                name="status"
                value={formData.status || 'active'}
                onChange={handleChange}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending-verification', label: 'Pending Verification' },
                  { value: 'suspended', label: 'Suspended' }
                ]}
              />
            </div>
          </div>
        )}

        {/* Contact & Address Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Country"
                name="country"
                value={formData.country || ''}
                onChange={handleChange}
              />
              
              <Input
                label="Address Line 1"
                name="address1"
                value={formData.address1 || ''}
                onChange={handleChange}
              />
              
              <Input
                label="Address Line 2"
                name="address2"
                value={formData.address2 || ''}
                onChange={handleChange}
              />
              
              <Input
                label="Suburb"
                name="suburb"
                value={formData.suburb || ''}
                onChange={handleChange}
              />
              
              <Input
                label="City/Town"
                name="cityTown"
                value={formData.cityTown || ''}
                onChange={handleChange}
              />
              
              <Input
                label="Province/State"
                name="province"
                value={formData.province || ''}
                onChange={handleChange}
              />
              
              <Input
                label="Postal Code"
                name="postalCode"
                value={formData.postalCode || ''}
                onChange={handleChange}
              />
              
              <Select
                label="Preferred Method of Contact"
                name="preferredMethodOfContact"
                value={formData.preferredMethodOfContact || 'email'}
                onChange={handleChange}
                options={[
                  { value: 'email', label: 'Email' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'whatsapp', label: 'WhatsApp' }
                ]}
              />
            </div>
          </div>
        )}

        {/* Additional Details Tab */}
        {activeTab === 'additional' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Marital Status"
                name="maritalStatus"
                value={formData.maritalStatus || ''}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select Marital Status' },
                  { value: 'single', label: 'Single' },
                  { value: 'married', label: 'Married' },
                  { value: 'divorced', label: 'Divorced' },
                  { value: 'widowed', label: 'Widowed' },
                  { value: 'separated', label: 'Separated' },
                  { value: 'other', label: 'Other' }
                ]}
              />
              
              <Select
                label="Employment Status"
                name="employmentStatus"
                value={formData.employmentStatus || ''}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select Employment Status' },
                  { value: 'employed', label: 'Employed' },
                  { value: 'self-employed', label: 'Self-Employed' },
                  { value: 'unemployed', label: 'Unemployed' },
                  { value: 'student', label: 'Student' },
                  { value: 'retired', label: 'Retired' },
                  { value: 'other', label: 'Other' }
                ]}
              />
              
              <Select
                label="Nearest Centre"
                name="myCentreId"
                value={formData.myCentreId || ''}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select Centre' },
                  ...centres.map(centre => ({
                    value: centre.id,
                    label: centre.name
                  }))
                ]}
                disabled={loadingCentres}
              />
              
              <Input
                label="Referrer Name"
                name="referrerName"
                value={formData.referrerName || ''}
                onChange={handleChange}
                placeholder="How did they hear about us?"
              />
            </div>
            
            <div>
              <TextArea
                label="Notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Any additional notes about this client..."
              />
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Save Client
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ClientForm;
