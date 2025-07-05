import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  collection,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { staffService } from '../../staff/api/staffService';
import { clientService } from '../../clients/api/clientService';
import { centreService } from '../../centres/api/centreService';
import { serviceService } from '../../services/api/serviceService';

// Mock toast until react-toastify is properly installed
const toast = {
  success: (message: string) => console.log('SUCCESS:', message),
  error: (message: string) => console.error('ERROR:', message)
};

// UI Components
const Select: React.FC<SelectProps> = ({ value, onChange, options, placeholder, disabled = false, className }) => (
  <select 
    value={value} 
    onChange={(e) => onChange && onChange(e.target.value)}
    disabled={disabled}
    className={className || "w-full p-2 border rounded"}
  >
    <option value="" disabled>{placeholder || 'Please select...'}</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const Input: React.FC<InputProps> = ({ type = 'text', value = '', onChange, placeholder, disabled = false, className, name, defaultValue }) => (
  <input
    type={type}
    value={value}
    defaultValue={defaultValue}
    name={name}
    onChange={(e) => onChange && onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className={className || "w-full p-2 border rounded"}
  />
);

const TextArea: React.FC<TextAreaProps> = ({ value = '', onChange, placeholder, disabled = false, className, name, rows = 4 }) => (
  <textarea
    value={value}
    name={name}
    onChange={(e) => onChange && onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className={className || "w-full p-2 border rounded"}
    rows={rows}
  />
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Availability and TimeSlot interfaces (as in db-schema)
interface TimeSlot {
  isAvailable: boolean;
  start: string;
  end: string;
}

interface Availability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

// Define types with fullName property
interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userId?: string;
}

interface EnrichedClient extends Client {
  fullName?: string;
}

interface StaffMember {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  centreIds?: string[];
  availability?: Availability;
}

interface EnrichedStaffMember extends StaffMember {
  fullName?: string;
}

interface TreatmentCentre {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

// Component props types
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{value: string; label: string}>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

interface InputProps {
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  label?: string;
  required?: boolean;
  defaultValue?: string;
  min?: string;
}

interface TextAreaProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  rows?: number;
  label?: string;
  required?: boolean;
}

// Define types
interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  centreId: string;
  centreName: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string;
  time: string;
  dateTime: string;
  duration?: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentManagementProps {
  initialClientId?: string;
  onAppointmentBooked?: () => void;
  clientMode?: boolean;
}

// Helper function to convert "HH:mm" to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Generate available time slots based on staff availability and existing appointments
const generateAvailableSlots = (
  availability: Availability,
  existingAppointments: Appointment[],
  serviceDuration: number,
  selectedDate: string
): string[] => {
  if (!selectedDate || !availability) return [];
  const dayName = format(new Date(selectedDate.replace(/-/g, '/')), 'eeee').toLowerCase() as keyof Availability;
  const staffWorkingHours = availability[dayName];

  if (!staffWorkingHours || staffWorkingHours.every(slot => !slot.isAvailable)) {
    return []; // Staff not available on this day
  }

  const bookedTimeRanges = existingAppointments.map(appt => {
    const start = timeToMinutes(appt.time);
    const end = start + (appt.duration || serviceDuration);
    return { start, end };
  });

  const availableSlotsList: string[] = [];
  const slotIncrement = 15; // Check for a slot every 15 minutes

  staffWorkingHours.forEach(workSlot => {
    if (!workSlot.isAvailable) return;

    const workStart = timeToMinutes(workSlot.start);
    const workEnd = timeToMinutes(workSlot.end);

    for (let slotStart = workStart; slotStart + serviceDuration <= workEnd; slotStart += slotIncrement) {
      const slotEnd = slotStart + serviceDuration;

      const isOverlapping = bookedTimeRanges.some(booked =>
        (slotStart < booked.end && slotEnd > booked.start)
      );

      if (!isOverlapping) {
        const hours = Math.floor(slotStart / 60).toString().padStart(2, '0');
        const minutes = (slotStart % 60).toString().padStart(2, '0');
        availableSlotsList.push(`${hours}:${minutes}`);
      }
    }
  });

  return [...new Set(availableSlotsList)];
};
export const AppointmentManagement: React.FC<AppointmentManagementProps> = ({
  initialClientId,
  onAppointmentBooked,
  clientMode = false,
}) => {
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // State for selected appointment
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // State for form data
  const [createFormData, setCreateFormData] = useState({
    clientId: initialClientId || '',
    staffId: '',
    centreId: '',
    serviceId: '',
    date: '',
    time: '',
    duration: 0,
    notes: '',
    status: 'scheduled'
  });
  
  // State for edit form data
  const [editFormData, setEditFormData] = useState({
    id: '',
    clientId: '',
    staffId: '',
    centreId: '',
    serviceId: '',
    date: '',
    time: '',
    duration: 0,
    notes: '',
    status: ''
  });
  
  // State for available time slots
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Fetch all appointments or client-specific appointments
  const { data: allAppointments = [], isLoading: isLoadingAppointments, refetch } = useQuery({
    queryKey: ['appointments', clientMode ? initialClientId : 'all'],
    queryFn: async () => {
      try {
        const appointmentsCollection = collection(db, 'appointments');
        const querySnapshot = await getDocs(appointmentsCollection);
        const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        
        // If in client mode, filter to only show this client's appointments
        return clientMode && initialClientId 
          ? appointments.filter(appt => appt.clientId === initialClientId)
          : appointments;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
    },
    enabled: true
  });

  // Fetch clients
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const clients = await clientService.getClients();
        return clients.map(client => ({
          ...client,
          fullName: `${client.firstName || ''} ${client.lastName || ''}`.trim()
        }));
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
    }
  });

  // Fetch staff members
  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const staff = await staffService.getStaffMembers();
        return staff.map(member => ({
          ...member,
          fullName: member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim()
        }));
      } catch (error) {
        console.error('Error fetching staff:', error);
        return [];
      }
    }
  });

  // Fetch services
  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        return await serviceService.getServices();
      } catch (error) {
        console.error('Error fetching services:', error);
        return [];
      }
    }
  });

  // Fetch centres
  const { data: allCentres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async () => {
      try {
        return await centreService.getCentres();
      } catch (error) {
        console.error('Error fetching centres:', error);
        return [];
      }
    }
  });

  // Options for dropdowns
  const clientOptions = allClients.map(c => ({ value: c.id, label: c.fullName || `Client ${c.id}` }));
  const staffOptions = allStaff.map(s => ({ value: s.id, label: s.fullName || `Staff ${s.id}` }));
  const serviceOptions = allServices.map(s => ({ value: s.id, label: s.name }));
  const centreOptions = allCentres.map(c => ({ value: c.id, label: c.name }));
  
  // Form change handlers
  const handleCreateFormChange = (field: string, value: any) => {
    setCreateFormData(prev => ({ ...prev, [field]: value }));
    
    // If staff or date changed, recalculate available time slots
    if (field === 'staffId' || field === 'date' || field === 'serviceId') {
      updateAvailableTimeSlots();
    }
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  // Update available time slots based on staff availability and existing appointments
  const updateAvailableTimeSlots = () => {
    const { staffId, date, serviceId } = createFormData;
    if (!staffId || !date || !serviceId) {
      setAvailableTimeSlots([]);
      return;
    }

    const staff = allStaff.find(s => s.id === staffId);
    const service = allServices.find(s => s.id === serviceId);
    
    if (!staff?.availability || !service) {
      setAvailableTimeSlots([]);
      return;
    }

    const staffAppointments = allAppointments.filter(a => 
      a.staffId === staffId && a.date === date
    );

    const slots = generateAvailableSlots(
      staff.availability,
      staffAppointments,
      service.duration,
      date
    );

    setAvailableTimeSlots(slots);
  };

  // Get service by ID
  const getServiceById = (id: string) => {
    return allServices.find(s => s.id === id);
  };

  // Format date safely
  const safeFormatDate = (dateString: string, formatStr: string) => {
    try {
      return format(new Date(dateString), formatStr);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle view details
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Handle edit
  const handleEdit = (appointment: Appointment) => {
    setEditFormData({
      id: appointment.id,
      clientId: appointment.clientId,
      staffId: appointment.staffId,
      centreId: appointment.centreId,
      serviceId: appointment.serviceId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration || 0,
      notes: appointment.notes || '',
      status: appointment.status
    });
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(false);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedAppointment) return;
    
    try {
      await deleteDoc(doc(db, 'appointments', selectedAppointment.id));
      toast.success('Appointment deleted successfully');
      setShowDeleteModal(false);
      refetch();
    } catch (error) {
      toast.error('Failed to delete appointment');
      console.error('Error deleting appointment:', error);
    }
  };

  // Handle create submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { clientId, staffId, centreId, serviceId, date, time, duration, notes, status } = createFormData;
      
      // Get names for display
      const client = allClients.find(c => c.id === clientId);
      const staff = allStaff.find(s => s.id === staffId);
      const centre = allCentres.find(c => c.id === centreId);
      const service = allServices.find(s => s.id === serviceId);
      
      if (!client || !staff || !centre || !service) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      // Create dateTime string
      const dateTime = `${date}T${time}`;
      
      const newAppointment = {
        clientId,
        clientName: client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        staffId,
        staffName: staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
        centreId,
        centreName: centre.name,
        serviceId,
        serviceName: service.name,
        date,
        time,
        dateTime,
        duration,
        notes,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'appointments'), newAppointment);
      toast.success('Appointment created successfully');
      setShowCreateModal(false);
      refetch();
      
      if (onAppointmentBooked) {
        onAppointmentBooked();
      }
    } catch (error) {
      toast.error('Failed to create appointment');
      console.error('Error creating appointment:', error);
    }
  };

  // Handle edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { id, clientId, staffId, centreId, serviceId, date, time, duration, notes, status } = editFormData;
      
      // Get names for display
      const client = allClients.find(c => c.id === clientId);
      const staff = allStaff.find(s => s.id === staffId);
      const centre = allCentres.find(c => c.id === centreId);
      const service = allServices.find(s => s.id === serviceId);
      
      if (!client || !staff || !centre || !service) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      // Create dateTime string
      const dateTime = `${date}T${time}`;
      
      const updatedAppointment = {
        clientId,
        clientName: client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        staffId,
        staffName: staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
        centreId,
        centreName: centre.name,
        serviceId,
        serviceName: service.name,
        date,
        time,
        dateTime,
        duration,
        notes,
        status,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'appointments', id), updatedAppointment);
      toast.success('Appointment updated successfully');
      setShowEditModal(false);
      refetch();
    } catch (error) {
      toast.error('Failed to update appointment');
      console.error('Error updating appointment:', error);
    }
  };
  // Reset form data
  const resetCreateForm = () => {
    setCreateFormData({
      clientId: clientMode && initialClientId ? initialClientId : '',
      staffId: '',
      centreId: '',
      serviceId: '',
      date: '',
      time: '',
      duration: 0,
      notes: '',
      status: 'scheduled'
    });
    setAvailableTimeSlots([]);
  };

  // Open create modal
  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  // Render the component
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {clientMode ? 'Book Appointments' : 'Appointment Management'}
        </h1>
        <Button 
          onClick={openCreateModal} 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <PlusIcon className="h-5 w-5" />
          <span>{clientMode ? 'Book Appointment' : 'New Appointment'}</span>
        </Button>
      </div>

      {isLoadingAppointments ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  {!clientMode && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={clientMode ? 6 : 7} className="px-6 py-4 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  allAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {safeFormatDate(appointment.date, 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.time}
                        </div>
                      </td>
                      {!clientMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{appointment.clientName}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.staffName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.serviceName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.centreName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(appointment)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(appointment)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(appointment)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={clientMode ? "Book New Appointment" : "Create New Appointment"}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Client Selection - Hidden in client mode */}
          {!clientMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <Select
                value={createFormData.clientId}
                onChange={(value) => handleCreateFormChange('clientId', value)}
                options={clientOptions}
                placeholder="Select Client"
                className="mt-1"
              />
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Service</label>
            <Select
              value={createFormData.serviceId}
              onChange={(value) => {
                const service = getServiceById(value);
                handleCreateFormChange('serviceId', value);
                if (service) {
                  handleCreateFormChange('duration', service.duration);
                }
              }}
              options={serviceOptions}
              placeholder="Select Service"
              className="mt-1"
            />
          </div>

          {/* Centre Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Centre</label>
            <Select
              value={createFormData.centreId}
              onChange={(value) => handleCreateFormChange('centreId', value)}
              options={centreOptions}
              placeholder="Select Centre"
              className="mt-1"
            />
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Staff</label>
            <Select
              value={createFormData.staffId}
              onChange={(value) => handleCreateFormChange('staffId', value)}
              options={staffOptions}
              placeholder="Select Staff"
              className="mt-1"
            />
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <Input
              type="date"
              value={createFormData.date}
              onChange={(value) => handleCreateFormChange('date', value)}
              className="mt-1"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <Select
              value={createFormData.time}
              onChange={(value) => handleCreateFormChange('time', value)}
              options={availableTimeSlots.map(slot => ({ value: slot, label: slot }))}
              placeholder={availableTimeSlots.length > 0 ? "Select Time" : "No available slots"}
              disabled={availableTimeSlots.length === 0}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <TextArea
              value={createFormData.notes}
              onChange={(value) => handleCreateFormChange('notes', value)}
              placeholder="Add any notes here..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {clientMode ? "Book Appointment" : "Create Appointment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Appointment"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {/* Client Selection - Hidden in client mode */}
          {!clientMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <Select
                value={editFormData.clientId}
                onChange={(value) => handleEditFormChange('clientId', value)}
                options={clientOptions}
                placeholder="Select Client"
                className="mt-1"
              />
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Service</label>
            <Select
              value={editFormData.serviceId}
              onChange={(value) => {
                const service = getServiceById(value);
                handleEditFormChange('serviceId', value);
                if (service) {
                  handleEditFormChange('duration', service.duration);
                }
              }}
              options={serviceOptions}
              placeholder="Select Service"
              className="mt-1"
            />
          </div>

          {/* Centre Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Centre</label>
            <Select
              value={editFormData.centreId}
              onChange={(value) => handleEditFormChange('centreId', value)}
              options={centreOptions}
              placeholder="Select Centre"
              className="mt-1"
            />
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Staff</label>
            <Select
              value={editFormData.staffId}
              onChange={(value) => handleEditFormChange('staffId', value)}
              options={staffOptions}
              placeholder="Select Staff"
              className="mt-1"
            />
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <Input
              type="date"
              value={editFormData.date}
              onChange={(value) => handleEditFormChange('date', value)}
              className="mt-1"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <Input
              type="time"
              value={editFormData.time}
              onChange={(value) => handleEditFormChange('time', value)}
              className="mt-1"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <Select
              value={editFormData.status}
              onChange={(value) => handleEditFormChange('status', value)}
              options={[
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no-show', label: 'No Show' }
              ]}
              placeholder="Select Status"
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <TextArea
              value={editFormData.notes}
              onChange={(value) => handleEditFormChange('notes', value)}
              placeholder="Add any notes here..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Update Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {safeFormatDate(selectedAppointment.date, 'MMMM dd, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Time</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.time}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Client</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.clientName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Staff</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.staffName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Service</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.serviceName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Centre</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.centreName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedAppointment.duration} minutes
                </p>
              </div>
            </div>
            
            {selectedAppointment.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.notes}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
              >
                Close
              </Button>
              <Button
                onClick={() => handleEdit(selectedAppointment)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-1"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </Button>
              <Button
                onClick={() => handleDelete(selectedAppointment)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-1"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
      >
        <div className="p-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Delete Appointment</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete this appointment? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowDeleteModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export { AppointmentManagement };
