import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import { REFERRAL_SOURCES, TREATMENT_CENTRES } from '../../lib/constants';
import type { ClientRegistrationData } from '../../lib/validation';

export interface ServiceInfoSectionProps {
  data: Partial<ClientRegistrationData>;
  onChange: (field: keyof ClientRegistrationData, value: string) => void;
  errors: Record<string, string>;
}

export function ServiceInfoSection({
  data,
  onChange,
  errors
}: ServiceInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Service Information
        </h2>
        <p className="text-gray-600">
          Tell us about your wellness goals and how you found Life Arrow
        </p>
      </div>

      {/* Wellness Goals */}
      <div className="bg-primary-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Wellness Journey
        </h3>
        
        <TextArea
          name="reasonForTransformation"
          label="Reason for Transformation"
          value={data.reasonForTransformation || ''}
          onChange={(value) => onChange('reasonForTransformation', value)}
          placeholder="Tell us about your wellness goals and what you hope to achieve..."
          rows={4}
          maxLength={2000}
          required
          error={errors.reasonForTransformation}
          helpText="Share your motivation, goals, and what transformation you're seeking"
        />
      </div>

      {/* How did you hear about us */}
      <Select
        name="whereDidYouHearAboutLifeArrow"
        label="How did you hear about Life Arrow?"
        value={data.whereDidYouHearAboutLifeArrow || ''}
        onChange={(value) => onChange('whereDidYouHearAboutLifeArrow', value)}
        options={REFERRAL_SOURCES}
        required
        error={errors.whereDidYouHearAboutLifeArrow}
        placeholder="Select how you discovered us"
      />

      {/* Referrer Name */}
      {data.whereDidYouHearAboutLifeArrow === 'Friend/Family Referral' && (
        <Input
          name="referrerName"
          label="Referrer Name"
          value={data.referrerName || ''}
          onChange={(e) => onChange('referrerName', e.target.value)}
          placeholder="Who referred you to Life Arrow?"
          error={errors.referrerName}
          helperText="Help us thank the person who referred you"
        />
      )}

      {/* Treatment Centre */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Location Preference
        </h3>
        
        <Select
          name="myNearestTreatmentCentre"
          label="Nearest Treatment Centre"
          value={data.myNearestTreatmentCentre || ''}
          onChange={(value) => onChange('myNearestTreatmentCentre', value)}
          options={TREATMENT_CENTRES}
          required
          error={errors.myNearestTreatmentCentre}
          placeholder="Select your preferred location"
        />
        
        <p className="text-sm text-gray-600 mt-2">
          This will be your primary location for appointments and treatments
        </p>
      </div>

      {/* Journey Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Your Wellness Journey Starts Here
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Thank you for choosing Life Arrow for your wellness transformation. 
                Your goals and preferences help us create a personalized experience 
                tailored specifically for you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 