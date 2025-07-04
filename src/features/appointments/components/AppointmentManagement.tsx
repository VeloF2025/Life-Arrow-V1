import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { format } from 'date-fns';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
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

// Mock useProfile hook
const useProfile = () => {
  return { profile: { id: 'mock-profile-id', role: 'admin' }, isLoading: false };
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



// Map pin icon component
const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
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
  label?: string;
  required?: boolean;
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
}

// Helper function to convert "HH:mm" to minutes from midnight
const timeToMinutes = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

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
}) => {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [editAvailableSlots, setEditAvailableSlots] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState('card'); // 'card', 'grid', 'calendar'
  const localizer = momentLocalizer(moment);

  const { profile } = useProfile();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Define the AppointmentFormData type
  interface AppointmentFormData {
    clientId: string;
    clientName?: string;
    centreId: string;
    serviceId: string;
    staffId: string;
    date: string;
    time: string;
    duration: number;
    status: string;
    notes: string;
  }
  
  // Define editFormData - used when editing an existing appointment
  const [editFormData, setEditFormData] = useState<AppointmentFormData>({
    clientId: '',
    centreId: '',
    serviceId: '',
    staffId: '',
    date: '',
    time: '',
    duration: 60,
    status: 'scheduled',
    notes: ''
  });
  
  // Initial form data for creating a new appointment
  const [createFormData, setCreateFormData] = useState<AppointmentFormData>({
    clientId: initialClientId || '',
    centreId: '',
    serviceId: '',
    staffId: '',
    date: '',
    time: '',
    duration: 60,
    status: 'scheduled',
    notes: '',
  });
  
  // Effect to update form if initialClientId changes
  React.useEffect(() => {
    if (initialClientId && initialClientId !== createFormData.clientId) {
      setCreateFormData(prev => ({
        ...prev,
        clientId: initialClientId,
      }));
    }
  }, [initialClientId]);

  // Fetch staff members
  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const staffData = await staffService.getAll('');
        console.log('Fetched staff:', staffData.length);
        return staffData as EnrichedStaffMember[];
      } catch (error) {
        console.error('Error fetching staff:', error);
        return [] as EnrichedStaffMember[];
      }
    },
    enabled: !!profile,
  });

  // Fetch clients
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const clientData = await clientService.getAll('');
        console.log('Fetched clients:', clientData.length);
        return clientData as EnrichedClient[];
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [] as EnrichedClient[];
      }
    },
    enabled: !!profile,
  });

  // Fetch centres
  const { data: allCentres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async () => {
      try {
        const centreData = await centreService.getAll();
        console.log('Fetched centres:', centreData.length);
        return centreData as TreatmentCentre[];
      } catch (error) {
        console.error('Error fetching centres:', error);
        return [] as TreatmentCentre[];
      }
    },
    enabled: !!profile,
  });

  // Fetch services
  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        const serviceData = await serviceService.getAll();
        console.log('Fetched services:', serviceData.length);
        return serviceData as Service[];
      } catch (error) {
        console.error('Error fetching services:', error);
        return [] as Service[];
      }
    },
    enabled: !!profile,
  });

  // Fetch appointments
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'appointments'));
      let results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Appointment[];
      
      // If user is a staff member, only show appointments for their centres
      if (profile?.role === 'staff') {
        const staffMember = allStaff.find(staff => staff.id === profile.id);
        if (staffMember && staffMember.centreIds && Array.isArray(staffMember.centreIds)) {
          results = results.filter(appt => staffMember.centreIds!.includes(appt.centreId));
        }
      }
      
      // If user is a client, only show their appointments
      if (profile?.role !== 'staff' && profile?.role !== 'admin') {
        const clientId = allClients.find(client => client.userId === profile.id)?.id;
        if (clientId) {
          results = results.filter(appt => appt.clientId === clientId);
        }
      }

      return results;
    },
    enabled: !!profile && allStaff.length > 0 && allClients.length > 0,
  });
  
  // Get admin status
  const isAdmin = profile?.role === 'admin';
  
  // Find current client if user is a client
  const currentClient = !isAdmin && profile?.role !== 'staff' && profile ? 
    allClients.find((client: EnrichedClient) => client.userId === profile.id) : null;

  // Handle view details
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Handle edit
  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditFormData({
      clientId: appointment.clientId,
      centreId: appointment.centreId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration || 0,
      status: appointment.status,
      notes: appointment.notes || '',
    });
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDeleteModal(true);
  };

  // Handle create new
  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  // Confirm delete function
  const confirmDelete = async () => {
    if (selectedAppointment) {
      try {
        const appointmentRef = doc(db, 'appointments', selectedAppointment.id);
        await deleteDoc(appointmentRef);
        toast.success('Appointment deleted successfully');
        setShowDeleteModal(false);
        setSelectedAppointment(null);
        refetch();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast.error('Failed to delete appointment');
      }
    }
  };

  // Handle form changes for create/edit modals
  const handleCreateFormChange = (field: keyof AppointmentFormData, value: string | number) => {
    setCreateFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditFormChange = (field: keyof AppointmentFormData, value: string | number) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submissions
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { clientId, centreId, serviceId, staffId, date, time, duration, status, notes } = createFormData;

    if (!clientId || !centreId || !serviceId || !staffId || !date || !time) {
      toast.error('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      const client = allClients.find(c => c.id === clientId);
      const centre = allCentres.find(c => c.id === centreId);
      const service = allServices.find(s => s.id === serviceId);
      const staff = allStaff.find(s => s.id === staffId);

      const newAppointment = {
        clientId,
        clientName: client?.fullName || `${client?.firstName} ${client?.lastName}`.trim() || 'N/A',
        centreId,
        centreName: centre?.name || 'N/A',
        serviceId,
        serviceName: service?.name || 'N/A',
        staffId,
        staffName: staff?.fullName || `${staff?.firstName} ${staff?.lastName}`.trim() || 'N/A',
        dateTime: new Date(`${date}T${time}`).toISOString(),
        duration: Number(duration),
        status,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'appointments'), newAppointment);
      toast.success('Appointment created successfully!');
      setShowCreateModal(false);
      onAppointmentBooked?.(); // Notify parent component
      setCreateFormData({
        clientId: initialClientId || '', // Reset form, preserving initial client
        centreId: '',
        serviceId: '',
        staffId: '',
        date: '',
        time: '',
        duration: 60,
        status: 'scheduled',
        notes: '',
      });
      refetch();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setIsSubmitting(true);

    const { clientId, centreId, serviceId, staffId, date, time, duration, status, notes } = editFormData;

    try {
      const client = allClients.find(c => c.id === clientId);
      const centre = allCentres.find(c => c.id === centreId);
      const service = allServices.find(s => s.id === serviceId);
      const staff = allStaff.find(s => s.id === staffId);

      const updatedAppointment = {
        clientId,
        clientName: client?.fullName || `${client?.firstName} ${client?.lastName}`.trim() || 'N/A',
        centreId,
        centreName: centre?.name || 'N/A',
        serviceId,
        serviceName: service?.name || 'N/A',
        staffId,
        staffName: staff?.fullName || `${staff?.firstName} ${staff?.lastName}`.trim() || 'N/A',
        dateTime: new Date(`${date}T${time}`).toISOString(),
        duration: Number(duration),
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };

      const appointmentRef = doc(db, 'appointments', selectedAppointment.id);
      await updateDoc(appointmentRef, updatedAppointment);
      toast.success('Appointment updated successfully!');
      setShowEditModal(false);
      setSelectedAppointment(null);
      refetch();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Create client options for dropdown - used in the appointment forms
  const clientOptions = useMemo(() => {
    if (!allClients) return [];
    return allClients.map((client: EnrichedClient) => ({
      value: client.id,
      label: `${client.firstName} ${client.lastName} (${client.email})`,
    }));
  }, [allClients]);



  // Effect to calculate available slots for the create form
  React.useEffect(() => {
    const calculateSlots = async () => {
      if (!createFormData.staffId || !createFormData.date || !createFormData.serviceId) {
        setAvailableSlots([]);
        return;
      }

      const selectedStaff = allStaff?.find((s: StaffMember) => s.id === createFormData.staffId);
      if (!selectedStaff?.availability) {
        setAvailableSlots([]);
        return;
      }

      const selectedService = allServices.find(s => s.id === createFormData.serviceId);
      if (!selectedService) {
        setAvailableSlots([]);
        return;
      }
      const serviceDuration = selectedService.duration;

      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('staffId', '==', createFormData.staffId),
        where('date', '==', createFormData.date)
      );
      const querySnapshot = await getDocs(q);
      const existingAppointments = querySnapshot.docs.map(doc => doc.data() as Appointment);

      const slots = generateAvailableSlots(
        selectedStaff.availability,
        existingAppointments,
        serviceDuration,
        createFormData.date
      );
      setAvailableSlots(slots);
    };

    calculateSlots();
  }, [createFormData.staffId, createFormData.date, createFormData.serviceId, allStaff, allServices]);

  // Effect to calculate available slots for the edit form
  React.useEffect(() => {
    const calculateSlots = async () => {
      if (!editFormData.staffId || !editFormData.date || !editFormData.serviceId || !showEditModal) {
        setEditAvailableSlots([]);
        return;
      }

      const selectedStaff = allStaff?.find((s: StaffMember) => s.id === editFormData.staffId);
      if (!selectedStaff?.availability) {
        setEditAvailableSlots([]);
        return;
      }

      const selectedService = allServices.find(s => s.id === editFormData.serviceId);
      if (!selectedService) {
        setEditAvailableSlots([]);
        return;
      }
      const serviceDuration = selectedService.duration;

      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('staffId', '==', editFormData.staffId),
        where('date', '==', editFormData.date)
      );
      const querySnapshot = await getDocs(q);
      const existingAppointments = querySnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Appointment))
        .filter(appt => appt.id !== selectedAppointment?.id);

      const slots = generateAvailableSlots(
        selectedStaff.availability,
        existingAppointments,
        serviceDuration,
        editFormData.date
      );
      setEditAvailableSlots(slots);
    };

    calculateSlots();
  }, [editFormData.staffId, editFormData.date, editFormData.serviceId, allStaff, allServices, showEditModal, selectedAppointment]);

  // Create staff options for dropdown - used in the create form
  const filteredStaff = useMemo(() => {
    if (!allStaff || !createFormData.centreId) return [];
    return allStaff.filter(staff => 
      staff.centreIds && Array.isArray(staff.centreIds) && staff.centreIds.includes(createFormData.centreId)
    );
  }, [allStaff, createFormData.centreId]);

  const staffOptions = useMemo(() => {
    return filteredStaff.map(staff => ({
      value: staff.id,
      label: staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.displayName || staff.email || staff.id
    }));
  }, [filteredStaff]);

  // Filter staff for edit form based on selected centre
  const editFilteredStaff = useMemo(() => {
    if (!allStaff || !editFormData.centreId) return [];
    return allStaff.filter(staff => 
      staff.centreIds && Array.isArray(staff.centreIds) && staff.centreIds.includes(editFormData.centreId)
    );
  }, [allStaff, editFormData.centreId]);

  // Create staff options for edit form dropdown - used when editing appointments
  const editStaffOptions = useMemo(() => {
    return editFilteredStaff.map(staff => ({
      value: staff.id,
      label: staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.displayName || staff.email || staff.id
    }));
  }, [editFilteredStaff]);

  // Create status options for dropdown
  const appointmentStatusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no-show', label: 'No Show' }
  ];
  




  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | undefined, formatString: string): string => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, formatString);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {appointments.map((appointment: Appointment) => (
        <div key={appointment.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-blue-600">{appointment.serviceName}</p>
                <p className="text-lg font-bold text-gray-800">{appointment.clientName}</p>
                <p className="text-sm text-gray-500">with {appointment.staffName}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <ClockIcon className="w-4 h-4 mr-2" />
                <span>{safeFormatDate(appointment.dateTime, 'EEE, MMM d, yyyy @ h:mm a')}</span>
              </div>
              <div className="flex items-center">
                <MapPinIcon />
                <span className="ml-2">{appointment.centreName}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleViewDetails(appointment)}>Details</Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(appointment)}><PencilIcon className="w-4 h-4"/></Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(appointment)}><TrashIcon className="w-4 h-4"/></Button>
          </div>
        </div>
      ))}
    </div>
  );

  const GridView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white shadow-md rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {appointments.map((appointment: Appointment) => (
            <tr key={appointment.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{appointment.clientName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appointment.serviceName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appointment.staffName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{safeFormatDate(appointment.dateTime, 'EEE, MMM d, yyyy @ h:mm a')}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                  {appointment.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleViewDetails(appointment)}>Details</Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(appointment)}><PencilIcon className="w-4 h-4"/></Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(appointment)}><TrashIcon className="w-4 h-4"/></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const CalendarView = () => {
    const events = appointments.map(appointment => ({
      id: appointment.id,
      title: `${appointment.serviceName} - ${appointment.clientName}`,
      start: new Date(appointment.dateTime),
      end: moment(appointment.dateTime).add(appointment.duration, 'minutes').toDate(),
      allDay: false,
      resource: appointment,
    }));

    return (
      <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: '700px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={event => handleViewDetails(event.resource as Appointment)}
        />
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Appointment Management</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-gray-200 rounded-lg p-1">
            <Button variant={viewMode === 'card' ? 'primary' : 'ghost'} onClick={() => setViewMode('card')}>Card</Button>
            <Button variant={viewMode === 'grid' ? 'primary' : 'ghost'} onClick={() => setViewMode('grid')}>Grid</Button>
            <Button variant={viewMode === 'calendar' ? 'primary' : 'ghost'} onClick={() => setViewMode('calendar')}>Calendar</Button>
          </div>
          <Button onClick={handleCreateNew}><PlusIcon className="w-5 h-5 mr-2"/>Create Appointment</Button>
        </div>
      </header>

      {isLoading && <LoadingSpinner />}

      {!isLoading && appointments.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No appointments found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new appointment.</p>
        </div>
      )}

      {!isLoading && appointments.length > 0 && (
        <>
          {viewMode === 'card' && <CardView />}
          {viewMode === 'grid' && <GridView />}
          {viewMode === 'calendar' && <CalendarView />}
        </>
      )}

      {/* Modals for Create, Edit, Details, Delete */}
      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Appointment">
        <form onSubmit={handleCreateSubmit} className="space-y-4 p-4">
          
          {/* Client Dropdown */}
          <div className="col-span-1">
            <label htmlFor="client" className="block text-sm font-medium text-gray-700">Client</label>
            <Select
              value={createFormData.clientId}
              onChange={(value) => handleCreateFormChange('clientId', value)}
              options={clientOptions}
              placeholder="Select a client..."
              disabled={!!initialClientId} // Disable if a client is pre-selected
            />
          </div>

          {/* Centre Dropdown */}
          <div className="col-span-1">
            <label htmlFor="centre" className="block text-sm font-medium text-gray-700">Centre</label>
            <Select
              value={createFormData.centreId}
              onChange={(value) => handleCreateFormChange('centreId', value)}
              options={allCentres.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select a centre..."
            />
          </div>

          {/* Service Dropdown */}
          <div className="col-span-1">
            <label htmlFor="service" className="block text-sm font-medium text-gray-700">Service</label>
            <Select
              value={createFormData.serviceId}
              onChange={(value) => {
                const service = allServices.find(s => s.id === value);
                handleCreateFormChange('serviceId', value);
                if (service) {
                  handleCreateFormChange('duration', service.duration);
                }
              }}
              options={allServices.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Select a service..."
            />
          </div>

          {/* Staff Dropdown */}
          <div className="col-span-1">
            <label htmlFor="staff" className="block text-sm font-medium text-gray-700">Staff</label>
            <Select
              value={createFormData.staffId}
              onChange={(value) => handleCreateFormChange('staffId', value)}
              options={staffOptions}
              placeholder="Select a staff member..."
              disabled={!createFormData.centreId}
            />
          </div>

          {/* Date Picker */}
          <div className="col-span-1">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
            <Input
              type="date"
              value={createFormData.date}
              onChange={(value) => handleCreateFormChange('date', value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Time Slot Dropdown */}
          <div className="col-span-1">
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
            <Select
              value={createFormData.time}
              onChange={(value) => handleCreateFormChange('time', value)}
              options={availableSlots.map(slot => ({ value: slot, label: slot }))}
              placeholder={availableSlots.length > 0 ? "Select a time..." : "No available slots"}
              disabled={availableSlots.length === 0}
            />
          </div>

          {/* Duration (Read-only) */}
          <div className="col-span-1">
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
            <Input
              type="number"
              value={String(createFormData.duration)}
              disabled // Duration is set by the service
            />
          </div>

          {/* Status Dropdown */}
          <div className="col-span-1">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
            <Select
              value={createFormData.status}
              onChange={(value) => handleCreateFormChange('status', value)}
              options={appointmentStatusOptions}
            />
          </div>

          {/* Notes Text Area */}
          <div className="col-span-1">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <TextArea
              value={createFormData.notes}
              onChange={(value) => handleCreateFormChange('notes', value)}
              placeholder="Add any relevant notes..."
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="mr-2">Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      {showEditModal && selectedAppointment && (
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Appointment">
          <form onSubmit={handleEditSubmit} className="space-y-4 p-4">
            {/* Form fields for editing, similar to create modal but pre-filled */}
            {/* Client (read-only) */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <Input value={editFormData.clientName} disabled />
            </div>

            {/* Centre Dropdown */}
            <div className="col-span-1">
              <label htmlFor="edit-centre" className="block text-sm font-medium text-gray-700">Centre</label>
              <Select
                value={editFormData.centreId}
                onChange={(value) => handleEditFormChange('centreId', value)}
                options={allCentres.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>

            {/* Service Dropdown */}
            <div className="col-span-1">
              <label htmlFor="edit-service" className="block text-sm font-medium text-gray-700">Service</label>
              <Select
                value={editFormData.serviceId}
                onChange={(value) => {
                  const service = allServices.find(s => s.id === value);
                  handleEditFormChange('serviceId', value);
                  if (service) {
                    handleEditFormChange('duration', service.duration);
                  }
                }}
                options={allServices.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>
            
            {/* Staff Dropdown */}
            <div className="col-span-1">
              <label htmlFor="edit-staff" className="block text-sm font-medium text-gray-700">Staff</label>
              <Select
                value={editFormData.staffId}
                onChange={(value) => handleEditFormChange('staffId', value)}
                options={editStaffOptions}
                disabled={!editFormData.centreId}
              />
            </div>

            {/* Date Picker */}
            <div className="col-span-1">
              <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">Date</label>
              <Input
                type="date"
                value={editFormData.date}
                onChange={(value) => handleEditFormChange('date', value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Time Slot Dropdown */}
            <div className="col-span-1">
              <label htmlFor="edit-time" className="block text-sm font-medium text-gray-700">Time</label>
              <Select
                value={editFormData.time}
                onChange={(value) => handleEditFormChange('time', value)}
                options={editAvailableSlots.map(slot => ({ value: slot, label: slot }))}
                placeholder={editAvailableSlots.length > 0 ? "Select a time..." : "No available slots"}
                disabled={editAvailableSlots.length === 0}
              />
            </div>

            {/* Duration (Read-only) */}
            <div className="col-span-1">
              <label htmlFor="edit-duration" className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
              <Input type="number" value={String(editFormData.duration)} disabled />
            </div>
            
            {/* Status Dropdown */}
            <div className="col-span-1">
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Status</label>
              <Select
                value={editFormData.status}
                onChange={(value) => handleEditFormChange('status', value)}
                options={appointmentStatusOptions}
              />
            </div>

            {/* Notes Text Area */}
            <div className="col-span-1">
              <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">Notes</label>
              <TextArea
                value={editFormData.notes}
                onChange={(value) => handleEditFormChange('notes', value)}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} className="mr-2">Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Appointment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Appointment Details">
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedAppointment.serviceName}</h3>
                <p className="text-gray-600">with {selectedAppointment.staffName}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                {selectedAppointment.status}
              </span>
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="font-semibold">{selectedAppointment.clientName}</p>
              <p className="text-sm text-gray-500">{safeFormatDate(selectedAppointment.dateTime, 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-gray-500">{safeFormatDate(selectedAppointment.dateTime, 'h:mm a')} ({selectedAppointment.duration} mins)</p>
              <p className="text-sm text-gray-500">at {selectedAppointment.centreName}</p>
            </div>
            {selectedAppointment.notes && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-gray-800">Notes</h4>
                <p className="text-gray-600 whitespace-pre-line">{selectedAppointment.notes}</p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAppointment && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Deletion">
          <div className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Delete Appointment</h3>
              <div className="mt-2 text-sm text-gray-500">
                <p>Are you sure you want to delete the appointment for</p>
                <p className="font-semibold">{selectedAppointment.clientName} on {safeFormatDate(selectedAppointment.dateTime, 'MMM d, yyyy')}?</p>
                <p className="mt-2">This action cannot be undone.</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              variant="danger"
              onClick={confirmDelete}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

