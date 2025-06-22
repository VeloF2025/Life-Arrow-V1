import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { PROVINCES } from '../../lib/constants';
import type { ClientRegistrationData } from '../../lib/validation';

export interface AddressInfoSectionProps {
  data: Partial<ClientRegistrationData>;
  onChange: (field: keyof ClientRegistrationData, value: string) => void;
  errors: Record<string, string>;
}

export function AddressInfoSection({
  data,
  onChange,
  errors
}: AddressInfoSectionProps) {
  const isInternational = data.country && data.country !== 'South Africa';

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Address Information
        </h2>
        <p className="text-gray-600">
          Please provide your residential address for our records
        </p>
      </div>

      {/* Address Lines */}
      <div className="space-y-4">
        <Input
          name="address1"
          label="Address Line 1"
          value={data.address1 || ''}
          onChange={(e) => onChange('address1', e.target.value)}
          placeholder="Street number and name"
          required
          error={errors.address1}
        />
        
        <Input
          name="address2"
          label="Address Line 2 (Optional)"
          value={data.address2 || ''}
          onChange={(e) => onChange('address2', e.target.value)}
          placeholder="Apartment, unit, building, floor, etc."
          error={errors.address2}
        />
      </div>

      {/* City and Suburb */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          name="suburb"
          label="Suburb"
          value={data.suburb || ''}
          onChange={(e) => onChange('suburb', e.target.value)}
          placeholder="Suburb or district"
          required
          error={errors.suburb}
        />
        
        <Input
          name="cityTown"
          label="City / Town"
          value={data.cityTown || ''}
          onChange={(e) => onChange('cityTown', e.target.value)}
          placeholder="City or town name"
          required
          error={errors.cityTown}
        />
      </div>

      {/* Province and Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          name="province"
          label="Province / State"
          value={data.province || ''}
          onChange={(value) => onChange('province', value)}
          options={PROVINCES}
          required
          error={errors.province}
          placeholder={isInternational ? "Select state/province" : "Select province"}
        />
        
        <Input
          name="postalCode"
          label="Postal Code"
          value={data.postalCode || ''}
          onChange={(e) => onChange('postalCode', e.target.value)}
          placeholder={isInternational ? "Postal/ZIP code" : "4-digit postal code"}
          required
          error={errors.postalCode}
          maxLength={isInternational ? 10 : 4}
        />
      </div>
    </div>
  );
} 