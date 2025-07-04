import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientService } from '@/features/clients/api/clientService';
import { centreService } from '@/features/centres/api/centreService';
import { serviceService } from '@/features/services/api/serviceService';
import { staffService } from '@/features/staff/api/staffService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TextArea } from '@/components/ui/TextArea';
import { TimeSlotPicker } from './TimeSlotPicker';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Appointment, Client, Service, Centre } from '@/types';

export interface AppointmentFormData {
  clientId: string;
  centreId: string;
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  duration: number;
  status: Appointment['status'];
  notes?: string;
}

interface AppointmentFormProps {
  initialData?: Partial<AppointmentFormData>;
  onSubmit: (data: AppointmentFormData) => void;
  onClose: () => void;
  isEditing?: boolean;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({ initialData, onSubmit, onClose, isEditing = false }) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    clientId: initialData?.clientId || '',
    centreId: initialData?.centreId || '',
    serviceId: initialData?.serviceId || '',
    staffId: initialData?.staffId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    time: initialData?.time || '',
    duration: initialData?.duration || 60,
    status: initialData?.status || 'scheduled',
    notes: initialData?.notes || '',
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getAll(''),
  });
  const { data: centres, isLoading: isLoadingCentres } = useQuery({
    queryKey: ['centres'],
    queryFn: () => centreService.getAll(),
  });

  // Filter services by centre ID after fetching
  const { data: allServices, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceService.getAll(),
  });
  
  // Filter services by centre ID
  const services = useMemo(() => {
    if (!allServices || !formData.centreId) return [];
    return allServices.filter((service: Service) => service.centreId === formData.centreId);
  }, [allServices, formData.centreId]);

  // Filter staff by centre ID after fetching
  const { data: allStaff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffService.getAll(''),
  });
  
  // Filter staff by centre ID
  const staff = useMemo(() => {
    if (!allStaff || !formData.centreId) return [];
    
    // Log all staff for debugging
    console.log('All staff before filtering:', allStaff);
    
    // Filter staff by centreIds array instead of centreId field
    const filteredStaff = allStaff.filter((staffMember: any) => 
      staffMember.centreIds && Array.isArray(staffMember.centreIds) && staffMember.centreIds.includes(formData.centreId)
    );
    
    console.log('Filtered staff by centre:', filteredStaff);
    return filteredStaff;
  }, [allStaff, formData.centreId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const clientOptions = useMemo(() => {
    if (!clients) return [];
    const uniqueClients = Array.from(new Map(clients.map((item: Client) => [item.id, item])).values());
    return uniqueClients.map((c: Client) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }));
  }, [clients]);

  const centreOptions = useMemo(() => {
    if (!centres) return [];
    const uniqueCentres = Array.from(new Map(centres.map((item: Centre) => [item.id, item])).values());
    return uniqueCentres.map((c: Centre) => ({ value: c.id, label: c.name }));
  }, [centres]);

  const serviceOptions = useMemo(() => {
    if (!services) return [];
    const uniqueServices = Array.from(new Map(services.map((item: Service) => [item.id, item])).values());
    return uniqueServices.map((s: Service) => ({ value: s.id, label: s.name }));
  }, [services]);

  // Log staff data for debugging
  useEffect(() => {
    if (staff && staff.length > 0) {
      console.log('Staff data available for dropdown:', staff.length, 'members');
      staff.forEach((s: any) => {
        console.log(`Staff member: ${s.id}, Name: ${s.firstName || ''} ${s.lastName || ''}, Email: ${s.email}`);
      });
    } else {
      console.log('No staff available for dropdown');
    }
  }, [staff]);

  if (isLoadingClients || isLoadingCentres) {
    return <LoadingSpinner text="Loading form data..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SearchableSelect
          label="Client"
          options={clientOptions}
          value={formData.clientId || ''}
          onChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
          name="clientId"
          disabled={!!initialData?.clientId}
        />
        <Select
          label="Centre"
          options={centreOptions}
          value={formData.centreId}
          onChange={(value) => setFormData(prev => ({ ...prev, centreId: value, serviceId: '', staffId: '' }))}
          name="centreId"
        />
        <Select
          label="Service"
          options={serviceOptions}
          value={formData.serviceId}
          onChange={(value) => setFormData(prev => ({ ...prev, serviceId: value, staffId: '' }))}
          name="serviceId"
          disabled={!formData.centreId || isLoadingServices}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Staff Member <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 border-gray-300 text-gray-900"
            value={formData.staffId}
            onChange={(e) => {
              const value = e.target.value;
              console.log('Staff selected:', value);
              const selectedStaff = staff.find((s: any) => s.id === value);
              console.log('Selected staff details:', selectedStaff ? {
                id: selectedStaff.id,
                firstName: selectedStaff.firstName,
                lastName: selectedStaff.lastName,
                fullName: selectedStaff.fullName,
                email: selectedStaff.email
              } : 'Not found');
              setFormData(prev => ({ ...prev, staffId: value }));
            }}
            name="staffId"
            disabled={!formData.centreId || !formData.serviceId || isLoadingStaff}
            required
          >
            <option value="" disabled>
              Please select...
            </option>
            {staff && staff.length > 0 ? staff.map((staffMember: any) => {
              // Determine the display name with fallbacks
              const firstName = staffMember.firstName || '';
              const lastName = staffMember.lastName || '';
              const fullName = staffMember.fullName || `${firstName} ${lastName}`.trim();
              const displayName = fullName || staffMember.displayName || staffMember.email || `Staff ${staffMember.id}`;
              
              return (
                <option key={staffMember.id} value={staffMember.id}>
                  {displayName}
                </option>
              );
            }) : (
              <option value="" disabled>No staff available</option>
            )}
          </select>
        </div>
        <Input
          label="Date"
          type="date"
          name="date"
          value={formData.date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, date: e.target.value }))}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Available Time Slots</label>
          {formData.date && formData.staffId && formData.serviceId ? (
            <TimeSlotPicker
              selectedDate={formData.date}
              staffId={formData.staffId}
              serviceId={formData.serviceId}
              selectedTime={formData.time}
              onTimeSelect={(time) => setFormData(prev => ({ ...prev, time }))}
            />
          ) : (
            <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md border border-gray-200">
              Please select a date, service, and staff member to see available times.
            </div>
          )}
        </div>
        <Input
          label="Duration (minutes)"
          type="number"
          name="duration"
          value={formData.duration}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value, 10) || 0 }))}
        />
        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={(value) => setFormData(prev => ({ ...prev, status: value as Appointment['status'] }))}
          options={[
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'no-show', label: 'No Show' },
            { value: 'rescheduled', label: 'Rescheduled' },
          ]}
        />
      </div>
      <TextArea
        label="Notes"
        name="notes"
        value={formData.notes || ''}
        onChange={(value: string) => setFormData(prev => ({ ...prev, notes: value }))}
        rows={4}
      />
      <div className="flex justify-end space-x-4 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{isEditing ? 'Update Appointment' : 'Create Appointment'}</Button>
      </div>
    </form>
  );
};