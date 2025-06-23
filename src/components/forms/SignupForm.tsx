import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, query, where, getDocs, collection, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import type { UserProfile } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EyeIcon, EyeSlashIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.literal('client'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormType = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess?: () => void;
}

interface ExistingClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  status: string;
  [key: string]: any;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);
  const [showClientMatch, setShowClientMatch] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SignupFormType>({
    resolver: zodResolver(signupSchema),
  });

  const emailValue = watch('email');

  // Check for existing client when email changes
  const checkForExistingClient = async (email: string) => {
    if (!email || !email.includes('@')) return;

    try {
      const clientsQuery = query(
        collection(db, 'clients'),
        where('email', '==', email.toLowerCase().trim())
      );
      
      const querySnapshot = await getDocs(clientsQuery);
      
      if (!querySnapshot.empty) {
        const clientDoc = querySnapshot.docs[0];
        const clientData = clientDoc.data() as ExistingClient;
        clientData.id = clientDoc.id;
        
        // Pre-populate form with client data
        setValue('firstName', clientData.firstName || '');
        setValue('lastName', clientData.lastName || '');
        
        setExistingClient(clientData);
        setShowClientMatch(true);
      } else {
        setExistingClient(null);
        setShowClientMatch(false);
      }
    } catch (error) {
      console.error('Error checking for existing client:', error);
    }
  };

  // Debounced email check
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    
    // Clear timeout if exists
    const timeoutId = setTimeout(() => {
      checkForExistingClient(email);
    }, 500); // 500ms delay
    
    return () => clearTimeout(timeoutId);
  };

  const onSubmit = async (data: SignupFormType) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });

      // Create user profile in Firestore
      const userProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
        id: userCredential.user.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'client' as const,
        isActive: true,
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        ...userProfile,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Check if there's an existing client record to link
      if (existingClient) {
        console.log('🔗 Linking to existing client record:', existingClient.id);
        
        // Update the existing client record with the new user ID
        await updateDoc(doc(db, 'clients', existingClient.id), {
          userId: userCredential.user.uid,
          status: 'active', // Activate the client record
          linkedAt: new Date(),
          userAccountCreated: true,
          lastUpdated: new Date()
        });

        // Create client profile using existing client data
        await setDoc(doc(db, 'clientProfiles', userCredential.user.uid), {
          ...userProfile,
          role: 'client',
          
          // Import existing client data
          clientRecordId: existingClient.id,
          mobile: existingClient.mobile || '',
          gender: existingClient.gender || '',
          dateOfBirth: existingClient.dateOfBirth || null,
          country: existingClient.country || 'South Africa',
          address: {
            street: existingClient.address1 || '',
            city: existingClient.cityTown || '',
            province: existingClient.province || '',
            postalCode: existingClient.postalCode || ''
          },
          medicalInfo: {
            allergies: existingClient.allergies || '',
            medications: existingClient.currentMedication || '',
            conditions: existingClient.chronicConditions || '',
            treatments: existingClient.currentTreatments || ''
          },
          preferredTreatmentCentre: existingClient.myNearestTreatmentCentre || '',
          reasonForTransformation: existingClient.reasonForTransformation || '',
          
          // Default profile settings
          goals: [],
          healthMetrics: [],
          preferences: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notifications: {
              email: true,
              push: true,
              reminders: true,
            },
            privacy: {
              shareDataWithAdmin: true,
              allowAnalytics: true,
            },
          },
          onboardingCompleted: false, // User should complete onboarding to review/update imported data
          importedFromClientRecord: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log('✅ Successfully linked user account to existing client record');
      } else {
        // Create standard client profile for new clients
        await setDoc(doc(db, 'clientProfiles', userCredential.user.uid), {
          ...userProfile,
          role: 'client',
          goals: [],
          healthMetrics: [],
          preferences: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notifications: {
              email: true,
              push: true,
              reminders: true,
            },
            privacy: {
              shareDataWithAdmin: true,
              allowAnalytics: true,
            },
          },
          onboardingCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      onSuccess?.();
    } catch (error: unknown) {
      const firebaseError = error as { code: string };
      // Handle specific Firebase auth errors
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          setAuthError('An account with this email already exists');
          break;
        case 'auth/invalid-email':
          setAuthError('Invalid email address');
          break;
        case 'auth/weak-password':
          setAuthError('Password is too weak');
          break;
        default:
          setAuthError('An error occurred during sign up. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {authError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {authError}
        </div>
      )}

      {/* Show existing client match notification */}
      {showClientMatch && existingClient && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="w-6 h-6 text-blue-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-blue-900 font-medium mb-1">Existing Client Record Found!</h4>
              <p className="text-blue-800 text-sm mb-2">
                We found an existing client record for <strong>{existingClient.email}</strong>. 
                Your account will be automatically linked to this record.
              </p>
              <div className="text-sm text-blue-700 bg-blue-100 rounded p-2">
                <strong>Client:</strong> {existingClient.firstName} {existingClient.lastName}<br/>
                <strong>Status:</strong> {existingClient.status}<br/>
                {existingClient.mobile && <><strong>Phone:</strong> {existingClient.mobile}<br/></>}
                {existingClient.myNearestTreatmentCentre && (
                  <><strong>Treatment Centre:</strong> {existingClient.myNearestTreatmentCentre}</>
                )}
              </div>
              <p className="text-blue-700 text-xs mt-2">
                ✅ Your profile will be pre-populated with existing information
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden role field - always client */}
      <input type="hidden" value="client" {...register('role')} />

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First name
          </label>
          <div className="mt-1">
            <Input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
          </div>
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last name
          </label>
          <div className="mt-1">
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <div className="mt-1">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            {...register('email', {
              onChange: handleEmailChange
            })}
            error={errors.email?.message}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1 relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a password"
            {...register('password')}
            error={errors.password?.message}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <div className="mt-1 relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Confirm your password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="text-sm text-gray-600">
        By creating an account, you agree to our{' '}
        <a href="/terms" className="text-primary-600 hover:text-primary-500">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-primary-600 hover:text-primary-500">
          Privacy Policy
        </a>
        .
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating account...
          </>
        ) : (
          <>
            <UserIcon className="w-4 h-4 mr-2" />
            {existingClient ? 'Link Account & Sign Up' : 'Create Account'}
          </>
        )}
      </Button>
    </form>
  );
} 