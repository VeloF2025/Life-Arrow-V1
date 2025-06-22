import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function RegistrationSuccessPage() {
  const location = useLocation();
  const { email, needsPasswordSetup } = location.state || {};

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100">
          <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Registration Successful! 🎉
          </h1>
          <p className="text-gray-600 mb-6">
            Welcome to Life Arrow! Your wellness journey starts here.
          </p>
        </div>

        {/* Password Setup Instructions */}
        {email && needsPasswordSetup && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
            <h3 className="text-sm font-medium text-orange-800 mb-2">
              ⚠️ Important: Set Up Your Password
            </h3>
            <p className="text-sm text-orange-700 mb-3">
              We've sent a <strong>password reset email</strong> to:
            </p>
            <p className="text-sm font-mono bg-white px-2 py-1 rounded border text-orange-900">
              {email}
            </p>
            <p className="text-sm text-orange-700 mt-3">
              <strong>Before you can log in, please:</strong>
            </p>
            <ol className="text-sm text-orange-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Check your email (including spam folder)</li>
              <li>Click "Reset Password" in the email</li>
              <li>Create your secure password</li>
              <li>Return here to log in</li>
            </ol>
          </div>
        )}

        {/* Email Verification Notice */}
        {email && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              📧 Email Verification
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              We've also sent a verification email to confirm your email address.
            </p>
            <p className="text-sm text-blue-700">
              You may need to verify your email before accessing all features.
            </p>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
          <h3 className="text-sm font-medium text-green-800 mb-2">
            What happens next?
          </h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>1. ✅ Registration completed</p>
            <p>2. 🔑 Set up your password (check email)</p>
            <p>3. 📧 Verify your email address</p>
            <p>4. 🏠 Log in to your dashboard</p>
            <p>5. 📋 Complete your onboarding</p>
            <p>6. 📅 Schedule your first appointment</p>
            <p>7. 🌟 Begin your transformation!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link to="/login" className="block">
            <Button className="w-full">
              Go to Login
            </Button>
          </Link>
          
          <Link to="/" className="block">
            <Button variant="outline" className="w-full">
              Return to Home
            </Button>
          </Link>
        </div>

        {/* Help Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            Need Help?
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Check your spam/junk folder for emails</p>
            <p>• Make sure {email} is correct</p>
            <p>• Wait a few minutes for emails to arrive</p>
            <p>• Contact support if you don't receive emails</p>
          </div>
        </div>

        {/* Support Contact */}
        <div className="text-sm text-gray-500">
          <p>Still having trouble? Contact us at:</p>
          <p className="text-primary-600 font-medium">support@lifearrow.co.za</p>
        </div>
      </div>
    </div>
  );
} 