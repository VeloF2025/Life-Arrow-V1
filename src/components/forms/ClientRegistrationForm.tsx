import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
// import { ProgressIndicator, CompactProgressIndicator } from '../ui/ProgressIndicator';
import { PersonalInfoSection } from './PersonalInfoSection';
import { AddressInfoSection } from './AddressInfoSection';
import { ContactPersonalDetailsSection } from './ContactPersonalDetailsSection';
import { MedicalInfoSection } from './MedicalInfoSection';
import { ServiceInfoSection } from './ServiceInfoSection';
import { TermsAdminSection } from './TermsAdminSection';
import { useFormAutoSave, useFormStepManager } from '../../hooks/useFormAutoSave';
import { 
  validateRegistrationStep, 
  validateCompleteRegistration,
  formatValidationErrors,
  type ClientRegistrationData 
} from '../../lib/validation';
import { REGISTRATION_STEPS } from '../../lib/constants';

const STORAGE_KEY = 'lifeArrow-clientRegistration';

export function ClientRegistrationForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<ClientRegistrationData>>({
    country: 'South Africa', // Default value
  });

  // Form management hooks
  const stepManager = useFormStepManager(REGISTRATION_STEPS.length);
  const { loadFromStorage, clearStorage, hasSavedData } = useFormAutoSave({
    key: STORAGE_KEY,
    data: formData,
    enabled: true,
  });

  // Load saved data on component mount
  useEffect(() => {
    const savedData = loadFromStorage();
    const savedStep = stepManager.getCurrentStep();
    
    if (savedData && Object.keys(savedData).length > 0) {
      setFormData(savedData);
      setCurrentStep(savedStep);
    }
  }, [loadFromStorage, stepManager]);

  // Handle field changes
  const handleFieldChange = (field: keyof ClientRegistrationData, value: string | boolean) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate current step
  const validateCurrentStep = () => {
    const stepErrors = validateRegistrationStep(currentStep, formData);
    const formattedErrors = formatValidationErrors(stepErrors);
    setErrors(formattedErrors);
    return stepErrors.length === 0;
  };

  // Handle step navigation
  const handleNext = () => {
    if (validateCurrentStep()) {
      const nextStep = stepManager.nextStep(currentStep);
      setCurrentStep(nextStep);
    }
  };

  const handlePrevious = () => {
    const prevStep = stepManager.previousStep(currentStep);
    setCurrentStep(prevStep);
  };

  // Note: handleGoToStep could be used for progress indicator click navigation
  // const handleGoToStep = (step: number) => {
  //   if (step <= currentStep) {
  //     const targetStep = stepManager.goToStep(step);
  //     setCurrentStep(targetStep);
  //   }
  // };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate all steps
    const allErrors = validateCompleteRegistration(formData as ClientRegistrationData);
    const formattedErrors = formatValidationErrors(allErrors);
    
    if (allErrors.length > 0) {
      setErrors(formattedErrors);
      
      // Find the first step with errors and navigate to it
      for (let step = 1; step <= REGISTRATION_STEPS.length; step++) {
        const stepErrors = validateRegistrationStep(step, formData);
        if (stepErrors.length > 0) {
          setCurrentStep(step);
          break;
        }
      }
      return;
    }

    setIsLoading(true);
    
    try {
      // Generate a random temporary password
      const tempPassword = `TempPass${Math.random().toString(36).slice(2)}${Date.now()}`;
      
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email!,
        tempPassword
      );

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Send password reset email so user can set their own password
      await sendPasswordResetEmail(auth, formData.email!);

      // Prepare data for Firestore
      const clientData = {
        ...formData,
        addedTime: Timestamp.now(),
        registrationDate: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        status: 'pending-verification',
        createdBy: 'self-registration',
        userId: userCredential.user.uid,
        needsPasswordSetup: true, // Flag to track password setup
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'clients'), clientData);
      
      // Clear form data from localStorage
      clearStorage();
      stepManager.clearStepProgress();
      
      // Navigate to success page
      navigate('/registration-success', { 
        state: { 
          clientId: docRef.id,
          email: formData.email,
          needsPasswordSetup: true
        } 
      });

    } catch (error: unknown) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      // Handle specific Firebase errors
      if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) {
          errorMessage = 'An account with this email already exists. Please try signing in instead.';
        } else if (error.message.includes('weak-password')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = 'Please enter a valid email address.';
        }
      }
      
      setErrors({ 
        submit: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render current step content
  const renderStepContent = () => {
    const commonProps = {
      data: formData,
      onChange: handleFieldChange,
      errors
    };

    switch (currentStep) {
      case 1:
        return <PersonalInfoSection {...commonProps} />;
      case 2:
        return <AddressInfoSection {...commonProps} />;
      case 3:
        return <ContactPersonalDetailsSection {...commonProps} />;
      case 4:
        return <MedicalInfoSection {...commonProps} />;
      case 5:
        return <ServiceInfoSection {...commonProps} />;
      case 6:
        return <TermsAdminSection {...commonProps} />;
      default:
        return <PersonalInfoSection {...commonProps} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Creating your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Life Arrow Client Registration
          </h1>
          <p className="mt-2 text-gray-600">
            Join our wellness community and start your transformation journey
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-900">
                Step {currentStep} of {REGISTRATION_STEPS.length}
              </span>
              <span className="text-gray-500">
                {Math.round(((currentStep - 1) / (REGISTRATION_STEPS.length - 1)) * 100)}% Complete
              </span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(((currentStep - 1) / (REGISTRATION_STEPS.length - 1)) * 100, 8)}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {REGISTRATION_STEPS[currentStep - 1]?.title}
            </p>
          </div>
        </div>

        {/* Saved Data Notice */}
        {hasSavedData() && currentStep === 1 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Welcome back!
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  We've restored your previously saved information. You can continue where you left off.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
          {renderStepContent()}

          {/* Global Error Messages */}
          {errors.submit && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Registration Error
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            <div className="flex space-x-4">
              {currentStep < REGISTRATION_STEPS.length ? (
                <Button onClick={handleNext}>
                  Next Step
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-8"
                >
                  Complete Registration
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 