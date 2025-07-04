import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { centreService } from '@/features/centres/api/centreService';
import type { Service, Centre } from '@/types';

// Define form field types for proper TypeScript support
interface ServiceFormFields {
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  centreIds: string[];
  staffQualifications: string;
  requiredEquipment: string;
  isActive: boolean;
}

interface ServiceFormProps {
  onSubmit: (data: Record<string, any>) => void;
  initialValues?: Partial<Service>;
  onCancel: () => void;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ onSubmit, initialValues, onCancel }) => {
  console.log('ServiceForm initialValues:', initialValues);
  
  // Prepare default values with the correct field names
  const defaultValues = React.useMemo<ServiceFormFields>(() => {
    // Default values for new service
    const defaults: ServiceFormFields = { 
      name: '',
      description: '',
      duration: 0,
      price: 0,
      category: '',
      centreIds: [],
      staffQualifications: '',
      requiredEquipment: '',
      isActive: true 
    };
    
    // If we have initial values (editing mode), merge them with defaults
    if (initialValues) {
      return {
        name: initialValues.name || '',
        description: initialValues.description || '',
        duration: initialValues.duration || 0,
        price: initialValues.price || 0,
        category: initialValues.category || '',
        centreIds: initialValues.centreIds || [],
        // Convert arrays to comma-separated strings for input fields
        staffQualifications: Array.isArray(initialValues.staffQualifications) 
          ? initialValues.staffQualifications.join(', ')
          : (initialValues.staffQualifications as unknown as string || ''),
        requiredEquipment: Array.isArray(initialValues.requiredEquipment)
          ? initialValues.requiredEquipment.join(', ')
          : (initialValues.requiredEquipment as unknown as string || ''),
        isActive: initialValues.isActive !== undefined ? initialValues.isActive : true,
      };
    }
    
    return defaults;
  }, [initialValues]);
  
  console.log('Form defaultValues prepared:', defaultValues);
  
  // Initialize form with React Hook Form
  const { register, handleSubmit, control, formState: { errors } } = useForm<ServiceFormFields>({
    defaultValues,
  });

  // Fetch centres for dropdown
  const { data: centres, isLoading: isLoadingCentres } = useQuery<Centre[]>({ 
    queryKey: ['centres'], 
    queryFn: centreService.getAll 
  });

  const centreOptions = centres?.map(c => ({ value: c.id, label: c.name })) || [];

  // Process form data before submission
  const handleFormSubmit = (data: ServiceFormFields) => {
    console.log('ServiceForm raw form data:', data);
    
    // Process string fields that should be arrays
    const processedData = {
      ...data,
      // Process staffQualifications
      staffQualifications: typeof data.staffQualifications === 'string'
        ? data.staffQualifications.split(',').map(s => s.trim()).filter(Boolean)
        : data.staffQualifications || [],
      
      // Process requiredEquipment
      requiredEquipment: typeof data.requiredEquipment === 'string'
        ? data.requiredEquipment.split(',').map(s => s.trim()).filter(Boolean)
        : data.requiredEquipment || [],
      
      // Ensure ID is preserved if editing
      ...(initialValues?.id && { id: initialValues.id }),
    };
    
    console.log('ServiceForm processed data before submission:', processedData);
    onSubmit(processedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Input 
        label="Service Name" 
        {...register('name', { required: 'Name is required' })} 
        error={errors.name?.message} 
      />
      
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextArea 
            label="Description" 
            {...field} 
            value={field.value || ''} 
          />
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input 
          label="Duration (minutes)" 
          type="number" 
          {...register('duration', { 
            valueAsNumber: true, 
            required: 'Duration is required' 
          })} 
          error={errors.duration?.message} 
        />
        
        <Input 
          label="Price (R)" 
          type="number" 
          {...register('price', { 
            valueAsNumber: true, 
            required: 'Price is required' 
          })} 
          error={errors.price?.message} 
        />
      </div>
      
      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <Select
            label="Category"
            options={[
              { value: 'scan', label: 'Scan' },
              { value: 'consultation', label: 'Consultation' },
              { value: 'treatment', label: 'Treatment' },
              { value: 'wellness', label: 'Wellness' },
            ]}
            value={field.value || ''}
            onChange={field.onChange}
          />
        )}
      />
      
      <Controller
        name="centreIds"
        control={control}
        render={({ field }) => (
          <MultiSelect
            label="Treatment Centres"
            options={centreOptions}
            isLoading={isLoadingCentres}
            value={field.value || []}
            onChange={field.onChange}
            placeholder="Select centres..."
          />
        )}
      />
      
      <Controller
        name="staffQualifications"
        control={control}
        render={({ field }) => (
          <Input
            label="Staff Qualifications (comma-separated)"
            {...field}
            value={field.value || ''}
          />
        )}
      />
      
      <Controller
        name="requiredEquipment"
        control={control}
        render={({ field }) => (
          <Input
            label="Required Equipment (comma-separated)"
            {...field}
            value={field.value || ''}
          />
        )}
      />
      
      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <Checkbox 
            label="Service is active" 
            checked={field.value} 
            onChange={field.onChange} 
          />
        )}
      />
      
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Service</Button>
      </div>
    </form>
  );
};

export default ServiceForm;
