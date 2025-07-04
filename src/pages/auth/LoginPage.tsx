import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import LoginForm from '../../components/forms/LoginForm';
import { Button } from '../../components/ui/Button';

const DEMO_USERS = {
  client: { email: 'client@test.com', password: 'password123' },
  staff: { email: 'staff@test.com', password: 'password123' },
  admin: { email: 'admin@test.com', password: 'password123' },
};

export default function LoginPage() {
  const [error, setError] = useState('');

  const handleDemoLogin = async (role: 'client' | 'staff' | 'admin') => {
    setError('');
    try {
      const { email, password } = DEMO_USERS[role];
      await signInWithEmailAndPassword(auth, email, password);
      // The auth state listener in the router will handle the redirect
    } catch (err) {
      console.error('Demo login failed:', err);
      setError('Demo login failed. Please check console for details.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center bg-blue-600 rounded-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back to{' '}
            <span className="font-medium text-blue-600">Life Arrow</span>
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          <LoginForm />
        </div>

        {/* Demo Login Section */}
        <div className="px-8 pt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-500">Or log in as a demo user</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button variant="outline" onClick={() => handleDemoLogin('client')}>
              Client
            </Button>
            <Button variant="outline" onClick={() => handleDemoLogin('staff')}>
              Staff
            </Button>
            <Button variant="outline" onClick={() => handleDemoLogin('admin')}>
              Admin
            </Button>
          </div>
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}