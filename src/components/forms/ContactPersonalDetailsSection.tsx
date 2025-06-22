import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { 
  CONTACT_METHODS, 
  MARITAL_STATUS_OPTIONS, 
  EMPLOYMENT_STATUS_OPTIONS 
} from '../../lib/constants';
import type { ClientRegistrationData } from '../../lib/validation';

export interface ContactPersonalDetailsSectionProps {
  data: Partial<ClientRegistrationData>;
  onChange: (field: keyof ClientRegistrationData, value: string) => void;
  errors: Record<string, string>;
}

export function ContactPersonalDetailsSection({
  data,
  onChange,
  errors
}: ContactPersonalDetailsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Contact & Personal Details
        </h2>
        <p className="text-gray-600">
          Help us understand your background and communication preferences
        </p>
      </div>

      {/* Communication Preferences */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Communication Preferences
        </h3>
        
        <Select
          name="preferredMethodOfContact"
          label="Preferred Method of Contact"
          value={data.preferredMethodOfContact || ''}
          onChange={(value) => onChange('preferredMethodOfContact', value)}
          options={CONTACT_METHODS}
          required
          error={errors.preferredMethodOfContact}
          placeholder="How would you like us to contact you?"
        />
      </div>

      {/* Personal Background */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Personal Background
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            name="maritalStatus"
            label="Marital Status"
            value={data.maritalStatus || ''}
            onChange={(value) => onChange('maritalStatus', value)}
            options={MARITAL_STATUS_OPTIONS}
            required
            error={errors.maritalStatus}
            placeholder="Select your marital status"
          />
          
          <Select
            name="employmentStatus"
            label="Employment Status"
            value={data.employmentStatus || ''}
            onChange={(value) => onChange('employmentStatus', value)}
            options={EMPLOYMENT_STATUS_OPTIONS}
            required
            error={errors.employmentStatus}
            placeholder="Select your employment status"
          />
        </div>
      </div>

      {/* Work/Education Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Work & Education Information
        </h3>
        <p className="text-sm text-gray-600">
          Optional: This information helps us tailor our wellness programs
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            name="currentEmployerUniversitySchool"
            label="Current Employer/University/School"
            value={data.currentEmployerUniversitySchool || ''}
            onChange={(e) => onChange('currentEmployerUniversitySchool', e.target.value)}
            placeholder="Name of organization/institution"
            error={errors.currentEmployerUniversitySchool}
          />
          
          <Input
            name="occupationSchoolGrade"
            label="Occupation/School Grade"
            value={data.occupationSchoolGrade || ''}
            onChange={(e) => onChange('occupationSchoolGrade', e.target.value)}
            placeholder="Job title or grade level"
            error={errors.occupationSchoolGrade}
          />
        </div>
        
        <Input
          name="academicInstitution"
          label="Academic Institution"
          value={data.academicInstitution || ''}
          onChange={(e) => onChange('academicInstitution', e.target.value)}
          placeholder="University, college, or training institution"
          error={errors.academicInstitution}
          helperText="If different from current employer/school above"
        />
      </div>

      {/* Information Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Optional Information
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Work and education details are optional but help us understand your lifestyle 
                and recommend appropriate wellness programs and appointment times.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 