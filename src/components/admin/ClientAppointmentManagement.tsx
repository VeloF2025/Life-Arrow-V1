import { useState, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, isPast, isFuture } from 'date-fns';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatPrice } from '../../lib/utils';
import type { Appointment, TreatmentCentre, StaffMember, ServiceManagement } from '../../types';
import { auth } from '../../lib/firebase';

interface ClientAppointmentManagementProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

interface AppointmentFormData {
  centreId: string;
  serviceId: string;
  staffId: string;
  dateTime: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'confirmed' | 'rescheduled';
}

const ClientAppointmentManagement = ({ 
  clientId, 
  clientName, 
  onClose 
}: ClientAppointmentManagementProps) => {
  const queryClient = useQueryClient();
  
  // Component state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  
  // Form state
  const [formData, setFormData] = useState<AppointmentFormData>({
    centreId: '',
    serviceId: '',
    staffId: '',
    dateTime: '',
    notes: '',
    status: 'scheduled'
  });

  // Fetch client appointments
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['client-appointments', clientId],
    queryFn: async (): Promise<Appointment[]> => {
      try {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('clientId', '==', clientId),
          orderBy('dateTime', 'desc')
        );

        const snapshot = await getDocs(appointmentsQuery);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateTime: doc.data().dateTime.toDate()
        })) as Appointment[];
      } catch (error) {
        console.error('Error fetching client appointments:', error);
        return [];
      }
    }
  });

  // Fetch centres for form
  const { data: centres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async (): Promise<TreatmentCentre[]> => {
      const snapshot = await getDocs(collection(db, 'centres'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TreatmentCentre));
    }
  });

  // Fetch services based on selected centre
  const { data: services = [] } = useQuery({
    queryKey: ['services', formData.centreId],
    queryFn: async (): Promise<ServiceManagement[]> => {
      if (!formData.centreId) return [];
      
      const servicesQuery = query(
        collection(db, 'services'),
        where('availableAtCentres', 'array-contains', formData.centreId)
      );
      
      const snapshot = await getDocs(servicesQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceManagement));
    },
    enabled: !!formData.centreId
  });

  // Fetch staff based on selected centre
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', formData.centreId],
    queryFn: async (): Promise<StaffMember[]> => {
      if (!formData.centreId) return [];
      
      try {
        console.log('Fetching staff for centre:', formData.centreId);
        
        // Get the centre details to get the centre name
        const selectedCentre = centres.find(c => c.id === formData.centreId);
        if (!selectedCentre) {
          console.log('Centre not found:', formData.centreId);
          return [];
        }
        
        console.log('Centre name:', selectedCentre.name);
        
        // Get all staff from the staff collection
        const staffQuery = query(collection(db, 'staff'));
        const snapshot = await getDocs(staffQuery);
        
        console.log('Total staff found:', snapshot.docs.length);
        
        const allStaff = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StaffMember[];
        
        // Filter for active staff
        const activeStaff = allStaff.filter(staff => staff.isActive !== false);
        console.log('Active staff found:', activeStaff.length);
        
        // Filter staff assigned to this centre
        const centreStaff = activeStaff.filter(staff => {
          console.log(`Checking staff ${staff.firstName} ${staff.lastName}:`, {
            staffCentre: staff.centre,
            staffCentreIds: staff.centreIds,
            searchingForCentreId: selectedCentre.id,
            searchingForCentreName: selectedCentre.name
          });

          // Check new centreIds array format first
          if (staff.centreIds && Array.isArray(staff.centreIds)) {
            const match = staff.centreIds.includes(selectedCentre.id);
            console.log(`   ✓ centreIds check: ${match}`);
            if (match) return true;
          }
          
          // Check legacy centre string format (by name)
          if (staff.centre && typeof staff.centre === 'string') {
            const staffCentreNormalized = staff.centre.trim();
            const searchCentreNormalized = selectedCentre.name.trim();
            
            // Try exact match first
            if (staffCentreNormalized === searchCentreNormalized) {
              console.log(`   ✓ centre name exact match: ${staffCentreNormalized} === ${searchCentreNormalized}`);
              return true;
            }
            
            // Try case-insensitive match
            if (staffCentreNormalized.toLowerCase() === searchCentreNormalized.toLowerCase()) {
              console.log(`   ✓ centre name case-insensitive match: ${staffCentreNormalized} ~= ${searchCentreNormalized}`);
              return true;
            }
            
            console.log(`   ❌ centre name no match: "${staffCentreNormalized}" vs "${searchCentreNormalized}"`);
          }

          console.log(`   ❌ No centre match found for ${staff.firstName} ${staff.lastName}`);
          return false;
        });
        
        console.log('Staff assigned to centre:', centreStaff.length);
        centreStaff.forEach(staff => {
          console.log(`   - ${staff.firstName} ${staff.lastName} (${staff.position || 'No position'})`);
        });
        
        return centreStaff;
      } catch (error) {
        console.error('Error fetching staff:', error);
        return [];
      }
    },
    enabled: !!formData.centreId
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      console.log('🔄 Creating appointment with data:', data);
      
      const centre = centres.find(c => c.id === data.centreId);
      const service = services.find(s => s.id === data.serviceId);
      const staffMember = staff.find(s => s.id === data.staffId);

      console.log('📋 Found related data:', {
        centre: centre?.name,
        service: service?.name,
        staffMember: staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Not found'
      });

      const appointmentData = {
        clientId,
        clientName,
        adminId: auth.currentUser?.uid,
        centreId: data.centreId,
        centreName: centre?.name || 'Unknown Centre',
        serviceId: data.serviceId,
        serviceName: service?.name || 'Unknown Service',
        staffId: data.staffId,
        staffName: staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Unknown Staff',
        dateTime: Timestamp.fromDate(new Date(data.dateTime)),
        duration: service?.duration || 60,
        price: service?.price || 0,
        status: data.status,
        notes: data.notes,
        country: centre?.address?.country || 'South Africa',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('💾 Saving appointment data:', appointmentData);

      try {
        const result = await addDoc(collection(db, 'appointments'), appointmentData);
        console.log('✅ Appointment created successfully:', result.id);
        return result;
      } catch (error) {
        console.error('❌ Failed to create appointment:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('🎉 Appointment creation succeeded:', result?.id);
      queryClient.invalidateQueries({ queryKey: ['client-appointments', clientId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      console.error('💥 Appointment creation failed:', error);
    }
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, data }: { appointmentId: string; data: Partial<AppointmentFormData> }) => {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const updateData: any = { ...data, updatedAt: serverTimestamp() };
      
      if (data.dateTime) {
        updateData.dateTime = Timestamp.fromDate(new Date(data.dateTime));
      }
      
      return await updateDoc(appointmentRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-appointments', clientId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowEditModal(false);
      setSelectedAppointment(null);
      resetForm();
    }
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return await deleteDoc(doc(db, 'appointments', appointmentId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-appointments', clientId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowDeleteModal(false);
      setSelectedAppointment(null);
    }
  });

  // Generate time slots for the selected date
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    const slotInterval = 30; // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Simple availability check (in real app, check against database)
        const isAvailable = checkSlotAvailability(hour, minute);
        
        slots.push({
          time: timeString,
          available: isAvailable
        });
      }
    }

    return slots;
  };

  // Check if a time slot is available (simplified logic)
  const checkSlotAvailability = (hour: number, minute: number) => {
    // Make lunch time (12:00-13:00) unavailable
    if (hour === 12) return false;
    
    // Make some slots unavailable for demo (in real app, check against existing appointments)
    const random = (hour * 60 + minute) % 7; // Deterministic "randomness"
    return random > 2;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      centreId: '',
      serviceId: '',
      staffId: '',
      dateTime: '',
      notes: '',
      status: 'scheduled'
    });
  };

  // Handle create appointment
  const handleCreate = () => {
    setShowCreateModal(true);
    resetForm();
  };

  // Handle edit appointment
  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      centreId: appointment.centreId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      dateTime: format(appointment.dateTime, "yyyy-MM-dd'T'HH:mm"),
      notes: appointment.notes || '',
      status: appointment.status
    });
    setShowEditModal(true);
  };

  // Handle delete appointment
  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDeleteModal(true);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(appointment => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return isFuture(appointment.dateTime);
      case 'past':
        return isPast(appointment.dateTime);
      default:
        return true;
    }
  });

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'no-show':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Appointments for {clientName}
          </h2>
          <p className="mt-1 text-gray-600">
            Manage all appointments for this client
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => refetch()}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Show:</span>
          <Select
            value={filter}
            onChange={(value) => setFilter(value as 'all' | 'upcoming' | 'past')}
            options={[
              { value: 'all', label: 'All Appointments' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' }
            ]}
            className="w-40"
          />
          <span className="text-sm text-gray-600">
            {filteredAppointments.length} appointment(s)
          </span>
        </div>
      </Card>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.map(appointment => (
          <Card key={appointment.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(appointment.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.serviceName}
                    </h3>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarDaysIcon className="w-4 h-4 mr-2" />
                        {format(appointment.dateTime, 'PPP p')}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 mr-2" />
                        {appointment.centreName}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="w-4 h-4 mr-2" />
                        {appointment.staffName}
                      </div>
                    </div>
                  </div>
                </div>
                {appointment.notes && (
                  <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <strong>Notes:</strong> {appointment.notes}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatPrice(appointment.price || 0, appointment.country || 'South Africa')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {appointment.duration} minutes
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(appointment)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(appointment)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredAppointments.length === 0 && (
          <Card className="p-12 text-center">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Appointments Found
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? 'This client has no appointments yet.' 
                : `No ${filter} appointments found.`}
            </p>
            <Button onClick={handleCreate}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create First Appointment
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Appointment Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedAppointment(null);
          resetForm();
        }}
        title={showCreateModal ? 'Create New Appointment' : 'Edit Appointment'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            console.log('🚀 Form submission started:', {
              showCreateModal,
              formData,
              selectedAppointment: selectedAppointment?.id
            });
            
            // Validate required fields
            if (!formData.centreId) {
              console.error('❌ Missing centre ID');
              return;
            }
            if (!formData.serviceId) {
              console.error('❌ Missing service ID');
              return;
            }
            if (!formData.staffId) {
              console.error('❌ Missing staff ID');
              return;
            }
            if (!formData.dateTime) {
              console.error('❌ Missing date/time');
              return;
            }
            
            console.log('✅ All required fields present, proceeding with submission');
            
            if (showCreateModal) {
              console.log('📝 Creating new appointment...');
              createAppointmentMutation.mutate(formData);
            } else if (selectedAppointment) {
              console.log('📝 Updating existing appointment...');
              updateAppointmentMutation.mutate({
                appointmentId: selectedAppointment.id,
                data: formData
              });
            }
          }}
          className="space-y-4"
        >
          {/* Treatment Centre */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Treatment Centre *
            </label>
            <Select
              value={formData.centreId}
              onChange={(value) => setFormData({ ...formData, centreId: value })}
              options={(centres || []).map(centre => ({ value: centre.id, label: centre.name }))}
              placeholder="Select Treatment Centre"
              required
            />
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Service *
            </label>
            <Select
              value={formData.serviceId}
              onChange={(value) => setFormData({ ...formData, serviceId: value })}
              options={formData.centreId 
                ? (services || []).length > 0
                  ? (services || []).map(service => ({
                      value: service.id,
                      label: `${service.name} - ${formatPrice(service.price, 'ZAR')} (${service.duration}min)`
                    }))
                  : []
                : []
              }
              placeholder={!formData.centreId 
                ? "Please select a centre first" 
                : (services || []).length === 0 
                  ? "No services available at this centre"
                  : "Select Service"
              }
              required
              disabled={!formData.centreId}
            />
          </div>

          {/* Staff Member */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Staff Member *
            </label>
            <Select
              value={formData.staffId}
              onChange={(value) => setFormData({ ...formData, staffId: value })}
              options={(() => {
                console.log('🔍 Staff dropdown render debug:', {
                  centreId: formData.centreId,
                  staffArrayLength: (staff || []).length,
                  staffData: staff,
                  hasCentre: !!formData.centreId,
                  hasStaff: (staff || []).length > 0
                });
                
                if (!formData.centreId) return [];
                if ((staff || []).length === 0) return [];
                
                const options = (staff || []).map(member => ({
                  value: member.id,
                  label: `${member.firstName} ${member.lastName}`
                }));
                
                console.log('🔍 Generated staff options:', options);
                return options;
              })()}
              placeholder={!formData.centreId 
                ? "Please select a centre first"
                : (staff || []).length === 0
                  ? "No staff available at this centre"
                  : "Select Staff Member"
              }
              required
              disabled={!formData.centreId}
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.dateTime.split('T')[0] || ''}
                onChange={(e) => {
                  const date = e.target.value;
                  const currentTime = formData.dateTime.split('T')[1] || '09:00';
                  setFormData({ ...formData, dateTime: `${date}T${currentTime}` });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time Slot Selection */}
            {formData.dateTime.split('T')[0] && formData.staffId && formData.serviceId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots *
                </label>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {generateTimeSlots().map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => {
                          const date = formData.dateTime.split('T')[0];
                          setFormData({ ...formData, dateTime: `${date}T${slot.time}` });
                        }}
                        disabled={!slot.available}
                        className={`
                          px-3 py-2 text-sm rounded border transition-colors
                          ${formData.dateTime.split('T')[1] === slot.time
                            ? 'bg-blue-600 text-white border-blue-600'
                            : slot.available
                              ? 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          }
                        `}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  
                  {generateTimeSlots().filter(slot => slot.available).length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No available time slots for this date</p>
                      <p className="text-sm text-gray-400 mt-1">Please select a different date</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-600 rounded"></div>
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                      <span>Unavailable</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {(!formData.staffId || !formData.serviceId) && (
              <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                💡 Please select a staff member and service first to see available time slots
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as any })}
              options={[
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no-show', label: 'No Show' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'rescheduled', label: 'Rescheduled' }
              ]}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <TextArea
              value={formData.notes}
              onChange={(value) => setFormData({ ...formData, notes: value })}
              placeholder="Any additional notes for this appointment..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedAppointment(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
            >
              {showCreateModal ? 'Create Appointment' : 'Update Appointment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAppointment(null);
        }}
        title="Delete Appointment"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this appointment? This action cannot be undone.
          </p>
          
          {selectedAppointment && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm space-y-1">
                <div><strong>Service:</strong> {selectedAppointment.serviceName}</div>
                <div><strong>Date:</strong> {format(selectedAppointment.dateTime, 'PPP p')}</div>
                <div><strong>Centre:</strong> {selectedAppointment.centreName}</div>
                <div><strong>Staff:</strong> {selectedAppointment.staffName}</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedAppointment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedAppointment && deleteAppointmentMutation.mutate(selectedAppointment.id)}
              isLoading={deleteAppointmentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Appointment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClientAppointmentManagement; 