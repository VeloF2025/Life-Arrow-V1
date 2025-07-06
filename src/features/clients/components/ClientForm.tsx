import React, { useState, useEffect } from 'react';
import { 
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { clientService } from '../api/clientService';
import type { Client, Centre } from '@/types';
import { initializeTreatmentCentres } from '@/utils/initializeCentres';
import { TREATMENT_CENTRES } from '@/lib/constants';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clientData: Partial<Client>, photoFile?: File | null) => void;
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
    gender: 'prefer-not-to-say' as 'male' | 'female' | 'other' | 'prefer-not-to-say',
    dateOfBirth: '',
    idNumber: '',
    passport: '',
    country: 'South Africa',
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
    status: 'active',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    medicalAidName: '',
    medicalAidNumber: '',
    medicalAidPlan: '',
    allergies: '',
    medicalConditions: '',
    currentMedications: ''
  });
  
  // Photo handling
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  
  // Centres
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'additional' | 'medical'>('personal');
  
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
        // Initialize centres in database if they don't exist
        await initializeTreatmentCentres();
        
        // Fetch centres from database
        const centresData = await clientService.getCentres();
        
        if (centresData.length > 0) {
          // Type assertion to match Centre type
          setCentres(centresData as unknown as Centre[]);
        } else {
          // Fallback to constants if no centres in database
          console.log('No centres found in database, using fallback from constants');
          const fallbackCentres = TREATMENT_CENTRES.map(name => ({ 
            id: name, 
            name: name 
          } as Centre));
          setCentres(fallbackCentres);
        }
      } catch (error) {
        console.error('Error loading centres:', error);
        // Fallback to constants on error
        const fallbackCentres = TREATMENT_CENTRES.map(name => ({ 
          id: name, 
          name: name 
        } as Centre));
        setCentres(fallbackCentres);
      } finally {
        setLoadingCentres(false);
      }
    };
    
    loadCentres();
  }, []);
  
  // Handle input change for standard HTML elements
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle date input change
  const handleDateChange = (name: string, value: string | Date | null) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Adapter for Select and TextArea components that expect (value: string) => void
  const handleValueChange = (name: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
        photoUrl: undefined,
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Submit form data with photoFile to the parent component
    onSubmit(formData, photoFile);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Form Tabs */}
        <div className="mb-6 border-b">
          <nav className="-mb-px flex space-x-6">
            <button
              type="button"
              className={`pb-3 px-1 ${activeTab === 'personal' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('personal')}
            >
              Personal Info
            </button>
            <button
              type="button"
              className={`pb-3 px-1 ${activeTab === 'contact' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('contact')}
            >
              Contact & Address
            </button>
            <button
              type="button"
              className={`pb-3 px-1 ${activeTab === 'medical' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('medical')}
            >
              Medical Info
            </button>
            <button
              type="button"
              className={`pb-3 px-1 ${activeTab === 'additional' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('additional')}
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
                error={errors.firstName}
                required
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
                onChange={handleValueChange('status')}
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
                onChange={handleValueChange('preferredMethodOfContact')}
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

        {/* Medical Information Tab */}
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Emergency Contact Name"
                name="emergencyContactName"
                value={formData.emergencyContactName || ''}
                onChange={handleChange}
                placeholder="Full name"
              />
              
              <Input
                label="Emergency Contact Phone"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone || ''}
                onChange={handleChange}
                placeholder="Phone number"
              />
              
              <Input
                label="Relationship to Client"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship || ''}
                onChange={handleChange}
                placeholder="e.g. Spouse, Parent, Friend"
              />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mt-8">Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Medical Aid Name"
                name="medicalAidName"
                value={formData.medicalAidName || ''}
                onChange={handleChange}
                placeholder="Medical aid provider"
              />
              
              <Input
                label="Medical Aid Number"
                name="medicalAidNumber"
                value={formData.medicalAidNumber || ''}
                onChange={handleChange}
                placeholder="Membership number"
              />
              
              <Input
                label="Medical Aid Plan"
                name="medicalAidPlan"
                value={formData.medicalAidPlan || ''}
                onChange={handleChange}
                placeholder="Plan type"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <TextArea
                label="Allergies"
                name="allergies"
                value={formData.allergies || ''}
                onChange={handleValueChange('allergies')}
                rows={2}
                placeholder="List any allergies"
              />
              
              <TextArea
                label="Medical Conditions"
                name="medicalConditions"
                value={formData.medicalConditions || ''}
                onChange={handleValueChange('medicalConditions')}
                rows={2}
                placeholder="List any medical conditions"
              />
              
              <TextArea
                label="Current Medications"
                name="currentMedications"
                value={formData.currentMedications || ''}
                onChange={handleValueChange('currentMedications')}
                rows={2}
                placeholder="List any current medications"
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
                onChange={handleValueChange('maritalStatus')}
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
                onChange={handleValueChange('employmentStatus')}
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
              
              {centres.length > 0 ? (
                <Select
                  label="Nearest Centre"
                  name="myCentreId"
                  value={formData.myCentreId || ''}
                  onChange={handleValueChange('myCentreId')}
                  options={[
                    { value: '', label: 'Select Centre' },
                    ...centres.map(centre => ({
                      value: centre.id || '',
                      label: centre.name
                    }))
                  ]}
                  disabled={loadingCentres}
                />
              ) : (
                <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
                  <p className="text-yellow-700">No treatment centres are currently available.</p>
                </div>
              )}
              
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
                onChange={handleValueChange('notes')}
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
