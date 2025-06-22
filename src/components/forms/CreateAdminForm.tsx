import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const createAdminSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  specializations: z.string().optional(),
  bio: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;

interface CreateAdminFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateAdminForm({ onSuccess, onCancel }: CreateAdminFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
  });

  const onSubmit = async (data: CreateAdminForm) => {
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
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'admin',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create admin profile
      await setDoc(doc(db, 'adminProfiles', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'admin',
        specializations: data.specializations ? data.specializations.split(',').map(s => s.trim()) : [],
        credentials: [],
        bio: data.bio || '',
        experience: 0,
        clients: [],
        availability: [],
        permissions: {
          canCreateAdmins: false, // Only super-admins can create admins
          canDeleteAdmins: false,
          canManageSystem: false,
          canViewAllData: false,
        },
        settings: {
          appointmentDuration: 60,
          bufferTime: 15,
          maxDailyAppointments: 8,
          autoAcceptBookings: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      reset();
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
          setAuthError('An error occurred while creating the admin account. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Admin Account</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {authError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {authError}
          </div>
        )}

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
              placeholder="Enter email address"
              {...register('email')}
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
              placeholder="Enter password"
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
              placeholder="Confirm password"
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

        {/* Specializations */}
        <div>
          <label htmlFor="specializations" className="block text-sm font-medium text-gray-700">
            Specializations (optional)
          </label>
          <div className="mt-1">
            <Input
              id="specializations"
              type="text"
              placeholder="e.g., Nutrition, Fitness, Mental Health (comma-separated)"
              {...register('specializations')}
              error={errors.specializations?.message}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Enter specializations separated by commas
          </p>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
            Bio (optional)
          </label>
          <div className="mt-1">
            <textarea
              id="bio"
              rows={3}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Brief professional bio..."
              {...register('bio')}
            />
          </div>
          {errors.bio && (
            <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Admin'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
} 