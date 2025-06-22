import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { GENDER_OPTIONS, COUNTRIES } from '../../lib/constants';
import type { ClientRegistrationData } from '../../lib/validation';

export interface PersonalInfoSectionProps {
  data: Partial<ClientRegistrationData>;
  onChange: (field: keyof ClientRegistrationData, value: string) => void;
  errors: Record<string, string>;
}

export function PersonalInfoSection({
  data,
  onChange,
  errors
}: PersonalInfoSectionProps) {
  const isInternational = data.country && data.country !== 'South Africa';

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Personal Information
        </h2>
        <p className="text-gray-600">
          Let's start with your basic information to create your profile
        </p>
      </div>

      {/* Country Selection (moved to top to determine ID/Passport requirements) */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <Select
          name="country"
          label="Country of Residence"
          value={data.country || ''}
          onChange={(value) => onChange('country', value)}
          options={COUNTRIES}
          required
          error={errors.country}
          placeholder="Select your country"
        />
        <p className="text-sm text-blue-700 mt-2">
          {isInternational 
            ? 'As an international client, you\'ll need to provide your passport number.'
            : 'South African residents need to provide a valid ID number.'
          }
        </p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          name="name"
          label="First Name"
          value={data.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Enter your first name"
          required
          error={errors.name}
        />
        
        <Input
          name="surname"
          label="Last Name"
          value={data.surname || ''}
          onChange={(e) => onChange('surname', e.target.value)}
          placeholder="Enter your last name"
          required
          error={errors.surname}
        />
      </div>

      {/* ID Number / Passport */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isInternational ? (
          <>
                         <Input
               name="idNumber"
               label="South African ID Number"
               value={data.idNumber || ''}
               onChange={(e) => onChange('idNumber', e.target.value)}
               placeholder="1234567890123"
               required
               error={errors.idNumber}
               maxLength={13}
               helperText="Enter your 13-digit South African ID number"
             />
             
             <Input
               name="passport"
               label="Passport Number (Optional)"
               value={data.passport || ''}
               onChange={(e) => onChange('passport', e.target.value)}
               placeholder="For international travel"
               error={errors.passport}
               helperText="Optional: For clients who travel internationally"
             />
          </>
        ) : (
          <>
                         <Input
               name="passport"
               label="Passport Number"
               value={data.passport || ''}
               onChange={(e) => onChange('passport', e.target.value)}
               placeholder="Enter your passport number"
               required
               error={errors.passport}
               helperText="Required for international clients"
             />
             
             <Input
               name="idNumber"
               label="National ID (Optional)"
               value={data.idNumber || ''}
               onChange={(e) => onChange('idNumber', e.target.value)}
               placeholder="Your national ID number"
               error={errors.idNumber}
               helperText="Optional: Your home country ID number"
             />
          </>
        )}
      </div>

      {/* Gender */}
      <div className="max-w-md">
        <Select
          name="gender"
          label="Gender"
          value={data.gender || ''}
          onChange={(value) => onChange('gender', value)}
          options={GENDER_OPTIONS}
          required
          error={errors.gender}
          placeholder="Select your gender"
        />
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Contact Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            name="email"
            label="Email Address"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="your.email@example.com"
            required
            error={errors.email}
            helperText="We'll use this for appointment confirmations and updates"
          />
          
          <Input
            name="mobile"
            label="Mobile Number"
            type="tel"
            value={data.mobile || ''}
            onChange={(e) => onChange('mobile', e.target.value)}
            placeholder="0821234567"
            required
            error={errors.mobile}
            helperText="South African format: 0821234567 or +27821234567"
          />
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Privacy Protection
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Your personal information is protected under POPIA regulations and 
                will only be used for treatment planning and communication purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 