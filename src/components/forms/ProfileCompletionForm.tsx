import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { validateCompleteProfile, formatValidationErrors, type ClientRegistrationData } from '../../lib/validation';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';

// Import form sections
import { PersonalInfoSection } from './PersonalInfoSection';
import { AddressInfoSection } from './AddressInfoSection';
import { ContactPersonalDetailsSection } from './ContactPersonalDetailsSection';
import { MedicalInfoSection } from './MedicalInfoSection';
import { ServiceInfoSection } from './ServiceInfoSection';
import { TermsAdminSection } from './TermsAdminSection';

// UI Components
import { Button } from '../ui/Button';
import { ProgressIndicator, type ProgressStep } from '../ui/ProgressIndicator';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProfileCompletionFormProps {
  onSuccess?: () => void;
}

const FORM_STEPS: ProgressStep[] = [
  { id: 1, title: 'Personal Info' },
  { id: 2, title: 'Address' },
  { id: 3, title: 'Contact & Personal' },
  { id: 4, title: 'Medical Info' },
  { id: 5, title: 'Service Info' },
  { id: 6, title: 'Terms & Confirmation' },
];

export function ProfileCompletionForm({ onSuccess }: ProfileCompletionFormProps) {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<ClientRegistrationData>>({});

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Auto-save hook
  const { loadFromStorage, clearStorage } = useFormAutoSave({
    key: 'profile-completion',
    data: formData,
    enabled: true,
  });

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load existing profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Try to load from clientProfiles first
        const clientProfileDoc = await getDoc(doc(db, 'clientProfiles', user.uid));
        if (clientProfileDoc.exists()) {
          const profileData = clientProfileDoc.data();
          setFormData(profileData as Partial<ClientRegistrationData>);
        } else {
          // Load basic info from users collection
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData({
              name: userData.firstName || '',
              surname: userData.lastName || '',
              email: userData.email || user.email || '',
              country: 'South Africa', // Set default country
            });
          } else {
            // No user document exists, set minimal defaults
            setFormData({
              email: user.email || '',
              country: 'South Africa', // Set default country
            });
          }
          
          // Try to load saved form data
          const savedData = loadFromStorage();
          if (savedData) {
            setFormData(prev => ({ ...prev, ...savedData }));
          }
          
          // Ensure country is always set
          setFormData(prev => ({ 
            ...prev, 
            country: prev.country || 'South Africa' 
          }));
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        // Set defaults even on error
        setFormData({
          email: user.email || '',
          country: 'South Africa',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user, loadFromStorage]);

  const handleFieldChange = (field: keyof ClientRegistrationData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateCurrentStep = () => {
    const stepValidations = {
      1: ['name', 'surname', 'email', 'mobile', 'gender', 'country'], // Personal
      2: ['address1', 'suburb', 'cityTown', 'province', 'postalCode'], // Address
      3: ['preferredMethodOfContact', 'maritalStatus', 'employmentStatus'], // Contact
      4: [], // Medical (all optional)
      5: ['reasonForTransformation', 'whereDidYouHearAboutLifeArrow', 'myNearestCentre'], // Service
      6: ['termsAndConditionsAgreed'], // Terms
    };

    const fieldLabels = {
      name: 'First Name',
      surname: 'Last Name',
      email: 'Email Address',
      mobile: 'Mobile Number',
      gender: 'Gender',
      country: 'Country',
      idNumber: 'ID Number',
      address1: 'Address Line 1',
      suburb: 'Suburb',
      cityTown: 'City/Town',
      province: 'Province',
      postalCode: 'Postal Code',
      preferredMethodOfContact: 'Preferred Contact Method',
      maritalStatus: 'Marital Status',
      employmentStatus: 'Employment Status',
      reasonForTransformation: 'Reason for Transformation',
      whereDidYouHearAboutLifeArrow: 'How did you hear about Life Arrow',
      myNearestCentre: 'Nearest Treatment Centre',
      termsAndConditionsAgreed: 'Terms and Conditions'
    };

    const requiredFields = stepValidations[currentStep as keyof typeof stepValidations] || [];
    const stepErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      const value = formData[field as keyof ClientRegistrationData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        const label = fieldLabels[field as keyof typeof fieldLabels] || field;
        stepErrors[field] = `${label} is required`;
      }
    });

    // Special validations
    if (currentStep === 1) {
      // Email validation
      if (formData.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          stepErrors.email = 'Please enter a valid email address';
        }
      }
      
      // Mobile validation
      if (formData.mobile) {
        if (!/^(\+27|0)[6-8][0-9]{8}$/.test(formData.mobile.replace(/\s/g, ''))) {
          stepErrors.mobile = 'Please enter a valid South African mobile number (e.g., 0821234567)';
        }
      }
      
      // ID number validation for South African residents
      if (formData.country === 'South Africa' && !formData.idNumber) {
        stepErrors.idNumber = 'ID Number is required for South African residents';
      } else if (formData.country === 'South Africa' && formData.idNumber) {
        if (!/^\d{13}$/.test(formData.idNumber)) {
          stepErrors.idNumber = 'South African ID must be 13 digits';
        }
      }
      
      // Passport validation for international residents
      if (formData.country && formData.country !== 'South Africa' && !formData.passport) {
        stepErrors.passport = 'Passport number is required for international residents';
      }
    }

    if (currentStep === 2) {
      // Postal code validation
      if (formData.postalCode) {
        if (formData.country === 'South Africa') {
          if (!/^\d{4}$/.test(formData.postalCode)) {
            stepErrors.postalCode = 'South African postal codes must be 4 digits';
          }
        }
      }
    }

    if (currentStep === 5) {
      // Referrer name validation
      if (formData.whereDidYouHearAboutLifeArrow === 'Friend/Family Referral' && !formData.referrerName) {
        stepErrors.referrerName = 'Referrer name is required when referred by friend/family';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const validateAllSteps = () => {
    try {
      const validationResult = validateCompleteProfile(formData as ClientRegistrationData);
      if (validationResult.length > 0) {
        const formattedErrors = formatValidationErrors(validationResult);
        setErrors(formattedErrors);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      setErrors({ general: 'Validation failed. Please check your information.' });
      return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, FORM_STEPS.length));
    }
  };

  const handleStepClick = (stepId: number) => {
    // Allow direct navigation to any step
    // For steps ahead of current, validate the current step first
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    } else {
      // For future steps, validate current step first
      if (validateCurrentStep()) {
        // Jump directly to the clicked step
        setCurrentStep(stepId);
      }
    }
  };

  const getCompletedSteps = () => {
    const completedSteps: number[] = [];
    
    // Step 1: Personal Info
    const step1Fields = ['name', 'surname', 'email', 'mobile', 'gender', 'country'];
    const isStep1Complete = step1Fields.every(field => {
      const value = formData[field as keyof ClientRegistrationData];
      return value && (typeof value !== 'string' || value.trim() !== '');
    });
    
    // Additional validation for ID/passport based on country
    const isIdPassportValid = 
      (formData.country === 'South Africa' && formData.idNumber) ||
      (formData.country && formData.country !== 'South Africa' && formData.passport) ||
      !formData.country; // Skip this check if country isn't selected yet
    
    if (isStep1Complete && isIdPassportValid) completedSteps.push(1);
    
    // Step 2: Address
    const step2Fields = ['address1', 'suburb', 'cityTown', 'province', 'postalCode'];
    const isStep2Complete = step2Fields.every(field => {
      const value = formData[field as keyof ClientRegistrationData];
      return value && (typeof value !== 'string' || value.trim() !== '');
    });
    
    if (isStep2Complete) completedSteps.push(2);
    
    // Step 3: Contact & Personal
    const step3Fields = ['preferredMethodOfContact', 'maritalStatus', 'employmentStatus'];
    const isStep3Complete = step3Fields.every(field => {
      const value = formData[field as keyof ClientRegistrationData];
      return value && (typeof value !== 'string' || value.trim() !== '');
    });
    
    if (isStep3Complete) completedSteps.push(3);
    
    // Step 4: Medical Info (all optional)
    // Always consider step 4 complete if user has visited it
    if (currentStep > 4) completedSteps.push(4);
    
    // Step 5: Service Info
    const step5Fields = ['reasonForTransformation', 'whereDidYouHearAboutLifeArrow', 'myNearestCentre'];
    let isStep5Complete = step5Fields.every(field => {
      const value = formData[field as keyof ClientRegistrationData];
      return value && (typeof value !== 'string' || value.trim() !== '');
    });
    
    // Special case for referrer name
    if (formData.whereDidYouHearAboutLifeArrow === 'Friend/Family Referral' && !formData.referrerName) {
      isStep5Complete = false;
    }
    
    if (isStep5Complete) completedSteps.push(5);
    
    // Step 6: Terms
    if (formData.termsAndConditionsAgreed) completedSteps.push(6);
    
    return completedSteps;
  };

  const calculateProgress = () => {
    // Calculate progress based on completed fields rather than current step
    const totalRequiredFields = [
      // Step 1: Personal Info
      'name', 'surname', 'email', 'mobile', 'gender', 'country',
      // Step 2: Address
      'address1', 'suburb', 'cityTown', 'province', 'postalCode',
      // Step 3: Contact & Personal
      'preferredMethodOfContact', 'maritalStatus', 'employmentStatus',
      // Step 4: Medical Info (all optional)
      // Step 5: Service Info
      'reasonForTransformation', 'whereDidYouHearAboutLifeArrow', 'myNearestCentre',
      // Step 6: Terms
      'termsAndConditionsAgreed'
    ];
    
    // Count completed fields
    let completedFields = 0;
    totalRequiredFields.forEach(field => {
      const value = formData[field as keyof ClientRegistrationData];
      if (value && (typeof value !== 'string' || value.trim() !== '')) {
        completedFields++;
      }
    });
    
    // Special case for South African ID or passport
    if (formData.country === 'South Africa' && formData.idNumber) {
      completedFields++;
    } else if (formData.country && formData.country !== 'South Africa' && formData.passport) {
      completedFields++;
    }
    
    // Special case for referrer name
    if (formData.whereDidYouHearAboutLifeArrow !== 'Friend/Family Referral' || formData.referrerName) {
      completedFields++;
    }
    
    return Math.round((completedFields / (totalRequiredFields.length + 2)) * 100);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate all steps before submission
    if (!validateAllSteps()) {
      // Find first step with errors and navigate to it
      const stepValidations = {
        1: ['name', 'surname', 'email', 'mobile', 'gender', 'country', 'idNumber', 'passport'],
        2: ['address1', 'suburb', 'cityTown', 'province', 'postalCode'], 
        3: ['preferredMethodOfContact', 'maritalStatus', 'employmentStatus'],
        4: [],
        5: ['reasonForTransformation', 'whereDidYouHearAboutLifeArrow', 'myNearestCentre', 'referrerName'],
        6: ['termsAndConditionsAgreed']
      };

      for (const [step, fields] of Object.entries(stepValidations)) {
        if (fields.some(fieldName => errors[fieldName])) {
          setCurrentStep(Number(step));
          break;
        }
      }

      const errorFieldsCount = Object.keys(errors).length;
      const errorSummary = Object.entries(errors)
        .slice(0, 5)
        .map(([, message]) => message)
        .join(', ');
      
      alert(`Please complete the following required fields (${errorFieldsCount} total):\n\n${errorSummary}${errorFieldsCount > 5 ? '\n\n...and more. Please review all form sections.' : ''}`);
      return;
    }

    try {
      setSaving(true);
      setUploadingPhoto(!!photoFile);
      
      let photoUrl = '';
      
      // Upload photo if selected
      if (photoFile && user) {
        photoUrl = await uploadPhoto(photoFile, user.uid);
      }
      
      // Save to clientProfiles collection
      await setDoc(doc(db, 'clientProfiles', user.uid), {
        ...formData,
        ...(photoUrl && { photoUrl }),
        completedAt: new Date(),
        updatedAt: new Date()
      });

      // Clear auto-saved data
      clearStorage();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ general: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  // Photo upload functions
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, photo: 'Photo size must be less than 5MB' }));
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photo: 'Please select a valid image file' }));
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear photo error
      if (errors.photo) {
        setErrors(prev => ({ ...prev, photo: '' }));
      }
    }
  };

  const uploadPhoto = async (file: File, userId: string): Promise<string> => {
    const photoRef = ref(storage, `clients/${userId}/photo_${Date.now()}`);
    await uploadBytes(photoRef, file);
    return await getDownloadURL(photoRef);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const renderCurrentStep = () => {
    const stepProps = {
      data: formData,
      errors,
      onChange: handleFieldChange,
    };

    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoSection 
            {...stepProps} 
            photoPreview={photoPreview}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={removePhoto}
            uploadingPhoto={uploadingPhoto}
          />
        );
      case 2:
        return <AddressInfoSection {...stepProps} />;
      case 3:
        return <ContactPersonalDetailsSection {...stepProps} />;
      case 4:
        return <MedicalInfoSection {...stepProps} />;
      case 5:
        return <ServiceInfoSection {...stepProps} />;
      case 6:
        return <TermsAdminSection {...stepProps} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
        <p className="text-gray-600">Help us personalize your wellness experience</p>
      </div>

      {/* Progress Indicator */}
      <div className="card p-6">
        <ProgressIndicator 
          steps={FORM_STEPS}
          currentStep={currentStep}
          completedSteps={getCompletedSteps()}
          className="mb-4"
          onStepClick={handleStepClick}
        />
        <div className="text-center text-sm text-gray-600">
          Step {currentStep} of {FORM_STEPS.length} ({calculateProgress()}% complete)
        </div>
      </div>

      {/* Form Content */}
      <div className="card p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {FORM_STEPS[currentStep - 1].title}
          </h2>
          <p className="text-gray-600">
            {currentStep === 1 && "Let's start with your basic information to create your profile"}
            {currentStep === 2 && "Please provide your address information"}
            {currentStep === 3 && "Tell us about your contact preferences and personal details"}
            {currentStep === 4 && "Optional: Share any medical information that may be relevant"}
            {currentStep === 5 && "Help us understand your wellness goals and how you found us"}
            {currentStep === 6 && "Please review and accept our terms and conditions"}
          </p>
        </div>

        {/* Form Section */}
        <div className="mb-8">
          {renderCurrentStep()}
        </div>

        {/* Form Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <Button
                onClick={handlePrevious}
                className="btn-secondary"
              >
                Previous
              </Button>
            )}
          </div>
          
          <div className="space-x-3">
            {currentStep < FORM_STEPS.length ? (
              <Button
                onClick={handleNext}
                className="btn-primary"
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Complete Profile'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="text-center text-sm text-gray-500">
        Your progress is automatically saved as you fill out the form
      </div>
    </div>
  );
}
