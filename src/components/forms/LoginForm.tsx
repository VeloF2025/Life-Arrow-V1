import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
type LoginFormType = z.infer<typeof loginSchema>;
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormType) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      onSuccess?.();
    } catch (error: unknown) {
      const firebaseError = error as { code: string };
      // Handle specific Firebase auth errors
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setAuthError('No account found with this email address');
          break;
        case 'auth/wrong-password':
          setAuthError('Incorrect password');
          break;
        case 'auth/invalid-email':
          setAuthError('Invalid email address');
          break;
        case 'auth/user-disabled':
          setAuthError('This account has been disabled');
          break;
        case 'auth/too-many-requests':
          setAuthError('Too many failed attempts. Please try again later');
          break;
        default:
          setAuthError('An error occurred during sign in. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setSendingReset(true);
    setAuthError(null);
    
    const emailToReset = forgotPasswordEmail || getValues('email');
    
    if (!emailToReset) {
      setAuthError('Please enter your email address');
      setSendingReset(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailToReset);
      setResetEmailSent(true);
      setShowForgotPassword(false);
    } catch (error: unknown) {
      const firebaseError = error as { code: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setAuthError('No account found with this email address. Please contact an administrator.');
          break;
        case 'auth/invalid-email':
          setAuthError('Invalid email address');
          break;
        case 'auth/too-many-requests':
          setAuthError('Too many password reset requests. Please try again later.');
          break;
        default:
          setAuthError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {authError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {authError}
        </div>
      )}

      {resetEmailSent && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          Password reset email sent! Check your inbox and spam folder.
        </div>
      )}

      {showForgotPassword && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Reset Password</h3>
          <p className="text-sm text-blue-700 mb-3">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={handleForgotPassword}
                isLoading={sendingReset}
                size="sm"
                className="bg-primary-600 hover:bg-primary-700"
              >
                Send Reset Email
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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
            {...register('email')}
            error={errors.email?.message}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1 relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
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

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>

        <div className="text-sm">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Forgot your password?
          </button>
        </div>
      </div>

      <div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          Sign in
        </Button>
      </div>
    </form>
  );
} 