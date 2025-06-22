import { TextArea } from '../ui/TextArea';
import { MEDICAL_DISCLAIMER } from '../../lib/constants';
import type { ClientRegistrationData } from '../../lib/validation';

export interface MedicalInfoSectionProps {
  data: Partial<ClientRegistrationData>;
  onChange: (field: keyof ClientRegistrationData, value: string) => void;
  errors: Record<string, string>;
}

export function MedicalInfoSection({
  data,
  onChange,
  errors
}: MedicalInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Medical Information
        </h2>
        <p className="text-gray-600">
          Help us provide safe and effective wellness treatments (Optional)
        </p>
      </div>

      {/* Medical Disclaimer */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-800 mb-2">
          Important Medical Information Notice
        </h3>
        <p className="text-sm text-red-700">{MEDICAL_DISCLAIMER}</p>
      </div>

      {/* Medical Fields */}
      <div className="space-y-4">
        <TextArea
          name="currentMedication"
          label="Current Medications"
          value={data.currentMedication || ''}
          onChange={(value) => onChange('currentMedication', value)}
          placeholder="List all medications you are currently taking..."
          rows={3}
          error={errors.currentMedication}
        />

        <TextArea
          name="chronicConditions"
          label="Chronic Conditions"
          value={data.chronicConditions || ''}
          onChange={(value) => onChange('chronicConditions', value)}
          placeholder="List any chronic health conditions..."
          rows={3}
          error={errors.chronicConditions}
        />

        <TextArea
          name="currentTreatments"
          label="Current Treatments"
          value={data.currentTreatments || ''}
          onChange={(value) => onChange('currentTreatments', value)}
          placeholder="Describe any ongoing medical treatments..."
          rows={3}
          error={errors.currentTreatments}
        />

        <TextArea
          name="previousProcedures"
          label="Previous Procedures & Surgeries"
          value={data.previousProcedures || ''}
          onChange={(value) => onChange('previousProcedures', value)}
          placeholder="List any previous surgeries or medical procedures..."
          rows={3}
          error={errors.previousProcedures}
        />

        <TextArea
          name="medicalImplants"
          label="Medical Implants & Devices"
          value={data.medicalImplants || ''}
          onChange={(value) => onChange('medicalImplants', value)}
          placeholder="List any medical implants or devices..."
          rows={2}
          error={errors.medicalImplants}
        />
      </div>
    </div>
  );
} 