import { Checkbox } from '../ui/Checkbox';
import { TERMS_AND_CONDITIONS_SUMMARY } from '../../lib/constants';
import type { ClientRegistrationData } from '../../lib/validation';

export interface TermsAdminSectionProps {
  data: Partial<ClientRegistrationData>;
  onChange: (field: keyof ClientRegistrationData, value: string | boolean) => void;
  errors: Record<string, string>;
  isProfileCompletion?: boolean;
}

export function TermsAdminSection({
  data,
  onChange,
  errors,
  isProfileCompletion = false
}: TermsAdminSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isProfileCompletion ? 'Profile Completion & Terms' : 'Terms & Confirmation'}
        </h2>
        <p className="text-gray-600">
          {isProfileCompletion 
            ? 'Review and accept our terms to complete your profile'
            : 'Review and accept our terms to complete your registration'
          }
        </p>
      </div>

      {/* Registration/Profile Summary - Only show if data is available */}
      {(data.name || data.email) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">
            {isProfileCompletion ? '🎉 Profile Almost Complete!' : '🎉 Almost Complete!'}
          </h3>
          <div className="text-sm text-green-800 space-y-2">
            {data.name && data.surname && (
              <p><strong>Name:</strong> {data.name} {data.surname}</p>
            )}
            {data.email && (
              <p><strong>Email:</strong> {data.email}</p>
            )}
            {data.preferredMethodOfContact && (
              <p><strong>Preferred Contact:</strong> {data.preferredMethodOfContact}</p>
            )}
            {data.myNearestTreatmentCentre && (
              <p><strong>Treatment Centre:</strong> {data.myNearestTreatmentCentre}</p>
            )}
          </div>
        </div>
      )}

      {/* Terms and Conditions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Terms and Conditions
        </h3>
        
        <div className="prose prose-sm text-gray-700 mb-6">
          <p>{TERMS_AND_CONDITIONS_SUMMARY}</p>
          
          <div className="mt-4 space-y-2 text-sm">
            <h4 className="font-medium">By proceeding, you agree to:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Follow treatment recommendations and guidelines</li>
              <li>Attend scheduled appointments or provide adequate notice for cancellations</li>
              <li>Respect our practitioners and facility policies</li>
              <li>Pay for services as per our payment terms</li>
            </ul>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <h4 className="font-medium">We commit to:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Protect your personal and medical information (POPIA compliance)</li>
              <li>Provide professional and ethical treatment services</li>
              <li>Respect your privacy and dignity</li>
              <li>Maintain appropriate professional boundaries</li>
              <li>Offer transparent pricing and clear communication</li>
            </ul>
          </div>
        </div>

        <Checkbox
          name="termsAndConditionsAgreed"
          checked={data.termsAndConditionsAgreed || false}
          onChange={(checked) => onChange('termsAndConditionsAgreed', checked)}
          required
          error={errors.termsAndConditionsAgreed}
          label={
            <span>
              I have read and agree to the{' '}
              <button 
                type="button" 
                className="text-blue-600 hover:text-blue-700 underline"
                onClick={() => {
                  // In a real app, this would open a modal or new page with full T&C
                  alert('Full Terms and Conditions would be displayed here');
                }}
              >
                Terms and Conditions
              </button>
              {' '}and{' '}
              <button 
                type="button" 
                className="text-blue-600 hover:text-blue-700 underline"
                onClick={() => {
                  // In a real app, this would open privacy policy
                  alert('Privacy Policy would be displayed here');
                }}
              >
                Privacy Policy
              </button>
            </span>
          }
          labelClassName="text-sm"
        />
      </div>

      {/* Privacy and Data Protection Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Your Data is Protected
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Life Arrow is committed to protecting your personal information under the 
                Protection of Personal Information Act (POPIA). Your data is encrypted, 
                securely stored, and only accessed by authorized personnel for treatment purposes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">
          What happens next?
        </h3>
        <div className="text-sm text-yellow-700 space-y-1">
          {isProfileCompletion ? (
            <>
              <p>1. Review your information and complete your profile</p>
              <p>2. Your profile will be updated and saved to your account</p>
              <p>3. You can now book appointments and access all wellness services</p>
              <p>4. Begin your personalized wellness transformation journey with Life Arrow!</p>
            </>
          ) : (
            <>
              <p>1. Review your information and submit your registration</p>
              <p>2. Receive a confirmation email with your account details</p>
              <p>3. Complete your onboarding and schedule your first appointment</p>
              <p>4. Begin your wellness transformation journey with Life Arrow!</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 