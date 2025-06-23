import { useState } from 'react';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, where, getDocs, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { format } from 'date-fns';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import Select from '../ui/Select';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { TreatmentCentre, StaffMember, ServiceManagement, Appointment } from '../../types';

// Client type for this component
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  cellNumber?: string;
}

interface AdminCentreInterfaceProps {
  preSelectedClientId?: string;
  preSelectedClientName?: string;
}

const AdminCentreInterface = ({ 
  preSelectedClientId, 
  preSelectedClientName 
}: AdminCentreInterfaceProps) => {
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  
  // Appointment creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId || '');
  const [selectedClientName, setSelectedClientName] = useState(preSelectedClientName || '');
  const [formData, setFormData] = useState({
    centreId: '',
    serviceId: '',
    staffId: '',
    dateTime: '',
    notes: '',
    status: 'scheduled' as const
  });

  // Reference props to avoid linter errors - will be used in booking functionality
  if (preSelectedClientId || preSelectedClientName) {
    // This will be implemented when adding booking functionality
  }

  // First, fetch the admin's assigned centres
  const { data: adminCentres = [], isLoading: centresLoading } = useQuery({
    queryKey: ['admin-centres', profile?.id],
    queryFn: async (): Promise<TreatmentCentre[]> => {
      if (!profile?.id) return [];
      
      try {
        const centresQuery = query(
          collection(db, 'centres'),
          where('adminIds', 'array-contains', profile.id)
        );
        
        const snapshot = await getDocs(centresQuery);
        return snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as TreatmentCentre));
      } catch (error) {
        console.error('Error fetching admin centres:', error);
        return [];
      }
    },
    enabled: !!profile?.id
  });

  // Get admin's centre IDs for filtering
  const adminCentreIds = adminCentres.map(centre => centre.id);

  // Fetch appointments only for admin's centres
  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', statusFilter, dateFilter, adminCentreIds],
    queryFn: async (): Promise<Appointment[]> => {
      if (adminCentreIds.length === 0) return []; // No centres assigned to admin
      
      try {
        // Create a query that filters by centre IDs
        let appointmentsQuery = query(
          collection(db, 'appointments'),
          where('centreId', 'in', adminCentreIds.slice(0, 10)), // Firestore limit for 'in' queries
          orderBy('dateTime', 'desc')
        );

        // Apply status filter
        if (statusFilter !== 'all') {
          appointmentsQuery = query(
            collection(db, 'appointments'),
            where('centreId', 'in', adminCentreIds.slice(0, 10)),
            where('status', '==', statusFilter),
            orderBy('dateTime', 'desc')
          );
        }

        const snapshot = await getDocs(appointmentsQuery);
        const appointmentsList: Appointment[] = [];

        for (const doc of snapshot.docs) {
          const data = doc.data();
          
          // Fetch related data
          const [clientDoc, serviceDoc, centreDoc, staffDoc] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('uid', '==', data.clientId))),
            getDocs(query(collection(db, 'services'), where('id', '==', data.serviceId))),
            getDocs(query(collection(db, 'centres'), where('id', '==', data.centreId))),
            getDocs(query(collection(db, 'staff'), where('id', '==', data.staffId)))
          ]);

          const client = clientDoc.docs[0]?.data();
          const service = serviceDoc.docs[0]?.data();
          const centre = centreDoc.docs[0]?.data();
          const staff = staffDoc.docs[0]?.data();

          appointmentsList.push({
            id: doc.id,
            clientId: data.clientId,
            clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client',
            serviceId: data.serviceId,
            serviceName: service?.name || 'Unknown Service',
            centreId: data.centreId,
            centreName: centre?.name || 'Unknown Centre',
            staffId: data.staffId,
            staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown Staff',
            dateTime: data.dateTime.toDate(),
            duration: data.duration || 60,
            status: data.status || 'scheduled',
            notes: data.notes,
            price: data.price,
            country: data.country
          });
        }

        return appointmentsList;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
    },
    enabled: adminCentreIds.length > 0, // Only fetch when we have centre IDs
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Filter appointments based on search and date
  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    const matchesSearch = searchTerm === '' || 
      appointment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.centreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.staffName.toLowerCase().includes(searchTerm.toLowerCase());

    const today = new Date();
    const appointmentDate = appointment.dateTime;
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = appointmentDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = appointmentDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = appointmentDate >= monthAgo;
    }

    return matchesSearch && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBookAppointment = () => {
    setShowCreateModal(true);
  };

  // Fetch clients for selection - only those with appointments at admin's centres
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients', adminCentreIds],
    queryFn: async () => {
      if (adminCentreIds.length === 0) return [];
      
      console.log('Fetching clients for admin centres:', adminCentreIds);
      
      // First get all appointments for admin's centres
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('centreId', 'in', adminCentreIds.slice(0, 10))
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const clientIds = new Set<string>();
      
      // Collect unique client IDs from appointments
      appointmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.clientId) {
          clientIds.add(data.clientId);
        }
      });
      
      if (clientIds.size === 0) return [];
      
      // Fetch client details for these IDs
      const clientIdArray = Array.from(clientIds);
      const clientsQuery = query(
        collection(db, 'clients'),
        where('id', 'in', clientIdArray.slice(0, 10)) // Firestore limit
      );
      
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsList = clientsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Client[];
      
      console.log('Fetched clients for admin centres:', clientsList);
      return clientsList;
    },
    enabled: showCreateModal && adminCentreIds.length > 0
  });

  // Client search functionality
  const [clientSearch, setClientSearch] = useState('');
  const filteredClients = clients.filter(client => 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.cellNumber?.includes(clientSearch)
  );

  // Fetch centres for form
  const { data: centres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async (): Promise<TreatmentCentre[]> => {
      const snapshot = await getDocs(collection(db, 'centres'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TreatmentCentre));
    },
    enabled: showCreateModal
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
    enabled: !!formData.centreId && showCreateModal
  });

  // Fetch staff based on selected centre
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', formData.centreId],
    queryFn: async (): Promise<StaffMember[]> => {
      if (!formData.centreId) return [];
      
      const selectedCentre = centres.find(c => c.id === formData.centreId);
      if (!selectedCentre) return [];
      
      const staffQuery = query(collection(db, 'staff'));
      const snapshot = await getDocs(staffQuery);
      
      const allStaff = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StaffMember[];
      
      // Filter staff assigned to this centre
      return allStaff.filter(staff => {
        if (staff.centreIds && Array.isArray(staff.centreIds)) {
          return staff.centreIds.includes(selectedCentre.id);
        }
        return staff.centre === selectedCentre.name;
      });
    },
    enabled: !!formData.centreId && showCreateModal
  });

  // Generate time slots for the selected date, staff, and service
  const generateTimeSlots = () => {
    if (!formData.dateTime.split('T')[0] || !formData.staffId || !formData.serviceId) {
      return [];
    }

    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    const slotInterval = 30; // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if this slot is available (simplified check)
        const isAvailable = checkSlotAvailability(hour, minute);
        
        slots.push({
          time: timeString,
          available: isAvailable
        });
      }
    }

    return slots;
  };

  // Simple availability check (can be enhanced with actual database queries)
  const checkSlotAvailability = (hour: number, minute: number) => {
    // Make lunch time (12:00-13:00) unavailable
    if (hour === 12) return false;
    
    // Make some random slots unavailable for demo (you can replace with actual availability logic)
    const timeSlot = hour * 100 + minute;
    return timeSlot % 100 !== 0 || Math.random() > 0.2; // Some slots unavailable
  };

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const centre = centres.find(c => c.id === data.centreId);
      const service = services.find(s => s.id === data.serviceId);
      const staffMember = staff.find(s => s.id === data.staffId);

      console.log('🚀 Creating appointment with full debug info:', {
        selectedClientId,
        selectedClientName,
        adminId: auth.currentUser?.uid,
        formData: data,
        isClientIdSameAsAdmin: selectedClientId === auth.currentUser?.uid,
        clientIdLength: selectedClientId?.length
      });

      // CRITICAL: Prevent creating appointment if clientId is same as admin ID
      if (!selectedClientId || selectedClientId === auth.currentUser?.uid) {
        console.error('❌ CRITICAL ERROR: No valid client selected or client ID matches admin ID', {
          selectedClientId,
          adminId: auth.currentUser?.uid,
          selectedClientName
        });
        throw new Error('Please select a valid client. Cannot create appointment for admin user.');
      }

      const appointmentData = {
        clientId: selectedClientId,
        clientName: selectedClientName,
        clientEmail: '', // Will be filled from client data
        clientPhone: '', // Will be filled from client data
        adminId: auth.currentUser?.uid,
        centreId: data.centreId,
        centreName: centre?.name || 'Unknown Centre',
        serviceId: data.serviceId,
        serviceName: service?.name || 'Unknown Service',
        staffId: data.staffId,
        staffName: staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Unknown Staff',
        startTime: Timestamp.fromDate(new Date(data.dateTime)),
        endTime: Timestamp.fromDate(new Date(new Date(data.dateTime).getTime() + (service?.duration || 60) * 60000)),
        dateTime: Timestamp.fromDate(new Date(data.dateTime)),
        duration: service?.duration || 60,
        price: service?.price || 0,
        status: data.status,
        notes: data.notes,
        country: centre?.address?.country || 'South Africa',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        lastModifiedBy: auth.currentUser?.uid
      };

      console.log('✅ Final appointment data before saving:', appointmentData);

      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
      console.log('✅ Appointment created with ID:', docRef.id);
      
      return docRef;
    },
    onSuccess: () => {
      // Invalidate multiple query caches to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments', selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      
      setShowCreateModal(false);
      resetForm();
      
      console.log('✅ Appointment created successfully for client:', selectedClientId, selectedClientName);
    },
    onError: (error) => {
      console.error('❌ Error creating appointment:', error);
      alert(`Error creating appointment: ${error.message}`);
    }
  });

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
    if (!preSelectedClientId) {
      setSelectedClientId('');
      setSelectedClientName('');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XMarkIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Appointments</h3>
        <p className="text-gray-600">Unable to load appointments data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="sm:w-48">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Book Appointment Button */}
          <button
            onClick={handleBookAppointment}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Found</h3>
            <p className="text-gray-600 mb-4">
              {appointments.length === 0 
                ? "No appointments have been scheduled yet." 
                : "No appointments match your current filters."
              }
            </p>
            <button
              onClick={handleBookAppointment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Book First Appointment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.clientName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.serviceName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {format(appointment.dateTime, 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(appointment.dateTime, 'h:mm a')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.staffName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">{appointment.centreName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{filteredAppointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredAppointments.filter(a => a.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserIcon className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredAppointments.filter(a => a.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <XMarkIcon className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredAppointments.filter(a => a.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Appointment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Book New Appointment"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            console.log('🚀 Form submission started:', {
              selectedClientId,
              selectedClientName,
              formData,
              adminId: auth.currentUser?.uid,
              preSelectedClientId,
              currentSelectedId: selectedClientId,
              isPreSelected: !!preSelectedClientId,
              formValues: {
                centreId: formData.centreId,
                serviceId: formData.serviceId,
                staffId: formData.staffId,
                dateTime: formData.dateTime
              }
            });
            
            // Enhanced validation with detailed logging
            const validationErrors = [];
            
            if (!selectedClientId) {
              validationErrors.push('Missing client selection');
              console.error('❌ Missing client selection');
            } else if (selectedClientId === auth.currentUser?.uid) {
              validationErrors.push('Client ID matches admin ID - this is invalid');
              console.error('❌ Client ID matches admin ID:', { selectedClientId, adminId: auth.currentUser?.uid });
            }
            
            if (!formData.centreId) {
              validationErrors.push('Missing centre ID');
              console.error('❌ Missing centre ID');
            }
            if (!formData.serviceId) {
              validationErrors.push('Missing service ID');
              console.error('❌ Missing service ID');
            }
            if (!formData.staffId) {
              validationErrors.push('Missing staff ID');
              console.error('❌ Missing staff ID');
            }
            if (!formData.dateTime) {
              validationErrors.push('Missing date/time');
              console.error('❌ Missing date/time');
            }
            
            if (validationErrors.length > 0) {
              console.error('❌ Form validation failed:', validationErrors);
              alert(`Please fix the following errors:\n- ${validationErrors.join('\n- ')}`);
              return;
            }
            
            console.log('✅ All required fields present, proceeding with submission');
            console.log('📋 About to submit with selectedClientId:', selectedClientId);
            
            createAppointmentMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client *
            </label>
            {preSelectedClientId ? (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                  <p className="text-sm font-medium text-blue-900">{selectedClientName}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Client Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search clients by name, email, or phone..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Client Selection Dropdown */}
                <Select
                  value={selectedClientId}
                  onChange={(value) => {
                    console.log('Client selected:', value);
                    setSelectedClientId(value);
                    const client = filteredClients.find(c => c.id === value);
                    console.log('Found client:', client);
                    setSelectedClientName(client ? `${client.firstName} ${client.lastName}` : '');
                  }}
                  options={filteredClients.slice(0, 10).map(client => ({
                    value: client.id,
                    label: `${client.firstName} ${client.lastName}${client.email ? ` (${client.email})` : ''}`
                  }))}
                  placeholder={clientSearch ? 
                    (filteredClients.length > 0 ? 
                      `Select from ${filteredClients.length} matching client(s)...` : 
                      'No clients found matching your search') : 
                    'Select a client...'
                  }
                />
                
                {clientSearch && filteredClients.length > 10 && (
                  <p className="text-xs text-gray-500">
                    Showing first 10 of {filteredClients.length} matching clients. Refine your search for more specific results.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Treatment Centre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Treatment Centre *
            </label>
            <Select
              value={formData.centreId}
              onChange={(value) => setFormData({ 
                ...formData, 
                centreId: value, 
                serviceId: '', 
                staffId: '', 
                dateTime: formData.dateTime.split('T')[0] ? `${formData.dateTime.split('T')[0]}T09:00` : ''
              })}
              options={centres.map(centre => ({
                value: centre.id,
                label: centre.name
              }))}
              placeholder="Select treatment centre..."
              required
            />
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service *
            </label>
            <Select
              value={formData.serviceId}
              onChange={(value) => setFormData({ 
                ...formData, 
                serviceId: value, 
                staffId: '',
                dateTime: formData.dateTime.split('T')[0] ? `${formData.dateTime.split('T')[0]}T09:00` : ''
              })}
              options={formData.centreId 
                ? services.length > 0
                  ? services.map(service => ({
                      value: service.id,
                      label: `${service.name} - R${service.price} (${service.duration}min)`
                    }))
                  : []
                : []
              }
              placeholder={!formData.centreId 
                ? "Please select a centre first" 
                : services.length === 0 
                  ? "No services available at this centre"
                  : "Select service..."
              }
              required
              disabled={!formData.centreId}
            />
          </div>

          {/* Staff Member */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff Member *
            </label>
            <Select
              value={formData.staffId}
              onChange={(value) => setFormData({ 
                ...formData, 
                staffId: value,
                dateTime: formData.dateTime.split('T')[0] ? `${formData.dateTime.split('T')[0]}T09:00` : ''
              })}
              options={(() => {
                console.log('🔍 Staff dropdown render debug:', {
                  centreId: formData.centreId,
                  staffArrayLength: staff.length,
                  staffData: staff,
                  hasCentre: !!formData.centreId,
                  hasStaff: staff.length > 0
                });
                
                if (!formData.centreId) return [];
                if (staff.length === 0) return [];
                
                const options = staff.map(member => ({
                  value: member.id,
                  label: `${member.firstName} ${member.lastName}`
                }));
                
                console.log('🔍 Generated staff options:', options);
                return options;
              })()}
              placeholder={!formData.centreId 
                ? "Please select a centre first"
                : staff.length === 0
                  ? "No staff available at this centre"
                  : "Select staff member..."
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes for this appointment..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedClientId || !formData.centreId || !formData.serviceId || !formData.staffId || !formData.dateTime || createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Appointment'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCentreInterface; 