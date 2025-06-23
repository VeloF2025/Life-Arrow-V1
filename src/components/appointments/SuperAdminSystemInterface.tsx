import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDaysIcon, 
  ListBulletIcon,
  Squares2X2Icon,
  FunnelIcon,
  PlusIcon,
  BuildingOfficeIcon,
  UserIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, where, getDocs, addDoc, Timestamp, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addHours } from 'date-fns';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { TextArea } from '../ui/TextArea';
import Select from '../ui/Select';
import { formatPrice } from '../../lib/utils';
import { useAppointmentActions } from '../../hooks/useOptimisticBooking';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { Appointment, TreatmentCentre, StaffMember, ServiceManagement } from '../../types';

type ViewMode = 'calendar' | 'list' | 'grid';
type FilterBy = 'all' | 'centre' | 'staff' | 'client' | 'service';
type DateRange = 'today' | 'week' | 'month' | 'custom';
type Status = 'all' | 'scheduled' | 'completed' | 'cancelled' | 'no-show';

// Client type for appointment creation
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  cellNumber?: string;
}

interface SuperAdminSystemInterfaceProps {
  preSelectedClientId?: string;
  preSelectedClientName?: string;
  editAppointment?: Appointment;
  onClose?: () => void;
}

const SuperAdminSystemInterface = ({ 
  preSelectedClientId, 
  preSelectedClientName,
  editAppointment,
  onClose
}: SuperAdminSystemInterfaceProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCentreId, setSelectedCentreId] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);

  // Appointment creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId || '');
  const [selectedClientName, setSelectedClientName] = useState(preSelectedClientName || '');
  const [clientSearch, setClientSearch] = useState('');
  const [formData, setFormData] = useState({
    centreId: '',
    serviceId: '',
    staffId: '',
    dateTime: '',
    notes: '',
    status: 'scheduled' as const
  });

  // Edit/Reschedule appointment state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(editAppointment || null);
  const [cancelReason, setCancelReason] = useState('');
  const [editFormData, setEditFormData] = useState({
    centreId: '',
    serviceId: '',
    staffId: '',
    dateTime: '',
    notes: '',
    status: 'scheduled' as const
  });

  // Get appointment actions
  const { cancelAppointment, rescheduleAppointment } = useAppointmentActions();

  // Auto-open edit modal when editAppointment is provided
  useEffect(() => {
    if (editAppointment) {
      setSelectedAppointment(editAppointment);
      setShowEditModal(true);
      handleEditAppointment(editAppointment);
    }
  }, [editAppointment]);

  // Helper function to get date range
  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return { 
          start: customStartDate ? new Date(customStartDate) : startOfWeek(now), 
          end: customEndDate ? new Date(customEndDate) : endOfWeek(now) 
        };
      default:
        return { start: startOfWeek(now), end: endOfWeek(now) };
    }
  };

  // Fetch centres for filtering
  const { data: centres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async (): Promise<TreatmentCentre[]> => {
      const snapshot = await getDocs(collection(db, 'centres'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TreatmentCentre));
    }
  });

  // Fetch staff for filtering
  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async (): Promise<StaffMember[]> => {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs
        .filter(doc => doc.data().role === 'staff')
        .map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
    }
  });

  // Fetch appointments
  const { data: appointments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['appointments', statusFilter, dateRange, selectedCentreId, selectedStaffId, customStartDate, customEndDate],
    queryFn: async (): Promise<Appointment[]> => {
      try {
        let appointmentsQuery = query(collection(db, 'appointments'), orderBy('dateTime', 'desc'));

        const snapshot = await getDocs(appointmentsQuery);
        const appointmentsList: Appointment[] = [];
        const { start, end } = getDateRangeFilter();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          
          // Skip if data is null or undefined
          if (!data) continue;
          
          const appointmentDate = data.dateTime?.toDate();
          
          // Skip if dateTime is missing
          if (!appointmentDate) continue;
          
          // Apply date range filter
          if (appointmentDate < start || appointmentDate > end) continue;
          
          // Apply status filter
          if (statusFilter !== 'all' && data.status !== statusFilter) continue;
          
          // Apply centre filter
          if (selectedCentreId !== 'all' && data.centreId !== selectedCentreId) continue;
          
          // Apply staff filter
          if (selectedStaffId !== 'all' && data.staffId !== selectedStaffId) continue;

          appointmentsList.push({
            id: doc.id,
            clientId: data.clientId,
            clientName: data.clientName || 'Unknown Client',
            serviceId: data.serviceId,
            serviceName: data.serviceName || 'Unknown Service',
            centreId: data.centreId,
            centreName: data.centreName || 'Unknown Centre',
            staffId: data.staffId,
            staffName: data.staffName || 'Unknown Staff',
            dateTime: appointmentDate,
            duration: data.duration || 60,
            status: data.status || 'scheduled',
            notes: data.notes,
            price: data.price || 0,
            country: data.country || 'South Africa'
          } as Appointment);
        }

        return appointmentsList;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
    },
    refetchInterval: 30000
  });

  // Filter appointments based on search
  const filteredAppointments = appointments.filter(appointment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      appointment.clientName?.toLowerCase().includes(searchLower) ||
      appointment.serviceName?.toLowerCase().includes(searchLower) ||
      appointment.centreName?.toLowerCase().includes(searchLower) ||
      appointment.staffName?.toLowerCase().includes(searchLower) ||
      appointment.notes?.toLowerCase().includes(searchLower)
    );
  });

  // Statistics
  const stats = {
    total: filteredAppointments.length,
    scheduled: filteredAppointments.filter(a => a.status === 'scheduled').length,
    completed: filteredAppointments.filter(a => a.status === 'completed').length,
    cancelled: filteredAppointments.filter(a => a.status === 'cancelled').length,
    noShow: filteredAppointments.filter(a => a.status === 'no-show').length,
    revenue: filteredAppointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch clients for appointment creation
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'clients'));
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Client[];
    },
    enabled: showCreateModal
  });

  // Client search functionality
  const filteredClients = clients.filter(client => 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.cellNumber?.includes(clientSearch)
  );

  // Fetch services based on selected centre for appointment creation
  const { data: appointmentServices = [] } = useQuery({
    queryKey: ['appointment-services', formData.centreId],
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

  // Fetch staff based on selected centre for appointment creation
  const { data: appointmentStaff = [] } = useQuery({
    queryKey: ['appointment-staff', formData.centreId],
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
      
      // Filter staff who work at the selected centre
      return allStaff.filter(member => {
        if (member.centreIds && Array.isArray(member.centreIds)) {
          return member.centreIds.includes(formData.centreId);
        }
        return false;
      });
    },
    enabled: !!formData.centreId && showCreateModal
  });

  // Generate time slots for appointment creation
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
        
        // Simple availability check
        const isAvailable = hour !== 12; // Make lunch time unavailable
        
        slots.push({
          time: timeString,
          available: isAvailable
        });
      }
    }

    return slots;
  };

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const centre = centres.find(c => c.id === data.centreId);
      const service = appointmentServices.find(s => s.id === data.serviceId);
      const staffMember = appointmentStaff.find(s => s.id === data.staffId);

      if (!selectedClientId || selectedClientId === auth.currentUser?.uid) {
        throw new Error('Please select a valid client.');
      }

      const appointmentData = {
        clientId: selectedClientId,
        clientName: selectedClientName,
        clientEmail: '',
        clientPhone: '',
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
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        lastModifiedBy: auth.currentUser?.uid
      };

      return await addDoc(collection(db, 'appointments'), appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments', selectedClientId] });
      
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating appointment:', error);
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
      setClientSearch('');
    }
  };

  const handleCreateAppointment = () => {
    setShowCreateModal(true);
  };

  const handleViewClient = (clientId: string) => {
    navigate('/admin/clients', { state: { selectedClientId: clientId } });
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditFormData({
      centreId: appointment.centreId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      dateTime: format(appointment.dateTime, "yyyy-MM-dd'T'HH:mm"),
      notes: appointment.notes || '',
      status: appointment.status
    });
    setShowEditModal(true);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedAppointment || !cancelReason.trim()) return;

    try {
      await cancelAppointment.mutateAsync({
        appointmentId: selectedAppointment.id,
        reason: cancelReason
      });
      
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  const handleEditConfirm = async () => {
    if (!selectedAppointment) return;

    try {
      const appointmentRef = doc(db, 'appointments', selectedAppointment.id);
      
      // Get centre, service, and staff data for the new values
      const selectedCentre = centres.find(c => c.id === editFormData.centreId);
      const selectedService = appointmentServices.find(s => s.id === editFormData.serviceId);
      const selectedStaff = appointmentStaff.find(s => s.id === editFormData.staffId);
      
      // Update the appointment with all new values
      await updateDoc(appointmentRef, {
        centreId: editFormData.centreId,
        centreName: selectedCentre?.name || 'Unknown Centre',
        serviceId: editFormData.serviceId,
        serviceName: selectedService?.name || 'Unknown Service',
        staffId: editFormData.staffId,
        staffName: selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : 'Unknown Staff',
        dateTime: Timestamp.fromDate(new Date(editFormData.dateTime)),
        startTime: Timestamp.fromDate(new Date(editFormData.dateTime)),
        endTime: Timestamp.fromDate(new Date(new Date(editFormData.dateTime).getTime() + ((selectedService?.duration || selectedAppointment.duration) * 60000))),
        duration: selectedService?.duration || selectedAppointment.duration,
        price: selectedService?.price || selectedAppointment.price,
        status: editFormData.status,
        notes: editFormData.notes,
        lastModifiedBy: auth.currentUser?.uid,
        updatedAt: serverTimestamp()
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      setShowEditModal(false);
      setSelectedAppointment(null);
      
      // Call onClose callback if provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
      alert('Failed to update appointment. Please try again.');
    }
  };

  const canModifyAppointment = (appointment: Appointment): boolean => {
    // Can modify if appointment is more than 24 hours away and not cancelled/completed
    const twentyFourHoursFromNow = addHours(new Date(), 24);
    return appointment.dateTime > twentyFourHoursFromNow && 
           ['scheduled', 'confirmed'].includes(appointment.status);
  };

  // Render statistics cards
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card className="p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-600">Total Appointments</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
        <div className="text-sm text-gray-600">Scheduled</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        <div className="text-sm text-gray-600">Completed</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
        <div className="text-sm text-gray-600">Cancelled</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-yellow-600">{stats.noShow}</div>
        <div className="text-sm text-gray-600">No Show</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-green-600">
          {formatPrice(stats.revenue, 'South Africa')}
        </div>
        <div className="text-sm text-gray-600">Revenue</div>
      </Card>
    </div>
  );

  // Render filters panel
  const renderFilters = () => (
    <Card className={`transition-all duration-300 ${showFilters ? 'block' : 'hidden'} mb-6`}>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          {/* Centre Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Centre</label>
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Centres</option>
              {centres.map(centre => (
                <option key={centre.id} value={centre.id}>{centre.name}</option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Staff</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  // Render appointment list view
  const renderListView = () => (
    <div className="space-y-4">
      {filteredAppointments.map(appointment => (
        <Card key={appointment.id} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {appointment.clientName}
                  </h3>
                  <div className="mt-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <CalendarDaysIcon className="w-4 h-4 mr-1" />
                        {format(appointment.dateTime, 'PPP p')}
                      </span>
                      <span className="flex items-center">
                        <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                        {appointment.centreName}
                      </span>
                      <span className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1" />
                        {appointment.staffName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {appointment.serviceName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {appointment.duration} min • {formatPrice(appointment.price || 0, appointment.country)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
              {appointment.notes && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <strong>Notes:</strong> {appointment.notes}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewClient(appointment.clientId)}
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
              {canModifyAppointment(appointment) && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAppointment(appointment)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelAppointment(appointment)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
      
      {filteredAppointments.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No appointments match your search criteria.' : 'No appointments scheduled for the selected period.'}
          </p>
          <Button onClick={handleCreateAppointment}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create New Appointment
          </Button>
        </Card>
      )}
    </div>
  );

  // Render grid view
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredAppointments.map(appointment => (
        <Card key={appointment.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900 truncate">
                {appointment.clientName}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <CalendarDaysIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{format(appointment.dateTime, 'MMM d, p')}</span>
              </div>
              <div className="flex items-center">
                <BuildingOfficeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{appointment.centreName}</span>
              </div>
              <div className="flex items-center">
                <UserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{appointment.staffName}</span>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <div className="font-medium text-gray-900">{appointment.serviceName}</div>
              <div className="text-sm text-gray-600">
                {appointment.duration} min • {formatPrice(appointment.price || 0, appointment.country)}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleViewClient(appointment.clientId)}
              >
                <EyeIcon className="w-4 h-4 mr-1" />
                View
              </Button>
              {canModifyAppointment(appointment) ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditAppointment(appointment)}
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => handleCancelAppointment(appointment)}
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <div className="flex-1 text-center text-sm text-gray-400 py-1">
                  {appointment.status === 'cancelled' ? 'Cancelled' : 
                   appointment.status === 'completed' ? 'Completed' : 
                   'Cannot modify'}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
      
      {filteredAppointments.length === 0 && (
        <div className="col-span-full">
          <Card className="p-12 text-center">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No appointments match your search criteria.' : 'No appointments scheduled for the selected period.'}
            </p>
            <Button onClick={handleCreateAppointment}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create New Appointment
            </Button>
          </Card>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-12 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Appointments</h3>
        <p className="text-gray-600 mb-4">Unable to load appointments data.</p>
        <Button onClick={() => refetch()}>
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="mt-1 text-gray-600">Comprehensive system-wide appointment overview</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline" onClick={() => refetch()}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateAppointment}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {renderStats()}

      {/* View Controls and Search */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex space-x-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <CalendarDaysIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
              <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters Panel */}
      {renderFilters()}

      {/* Content based on view mode */}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'calendar' && (
        <Card className="p-12 text-center">
          <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View</h3>
          <p className="text-gray-600">Calendar view coming soon! Use list or grid view for now.</p>
        </Card>
      )}

      {/* Create Appointment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Appointment"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            
            // Validate required fields
            if (!selectedClientId || !formData.centreId || !formData.serviceId || !formData.staffId || !formData.dateTime) {
              alert('Please fill in all required fields.');
              return;
            }
            
            createAppointmentMutation.mutate(formData);
          }}
          className="space-y-6"
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
                    setSelectedClientId(value);
                    const client = filteredClients.find(c => c.id === value);
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
                ? appointmentServices.length > 0
                  ? appointmentServices.map(service => ({
                      value: service.id,
                      label: `${service.name} - R${service.price} (${service.duration}min)`
                    }))
                  : []
                : []
              }
              placeholder={!formData.centreId 
                ? "Please select a centre first" 
                : appointmentServices.length === 0 
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
              options={formData.centreId 
                ? appointmentStaff.length > 0
                  ? appointmentStaff.map(member => ({
                      value: member.id,
                      label: `${member.firstName} ${member.lastName}`
                    }))
                  : []
                : []
              }
              placeholder={!formData.centreId 
                ? "Please select a centre first"
                : appointmentStaff.length === 0
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
                { value: 'no-show', label: 'No Show' }
              ]}
            />
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

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAppointment(null);
        }}
        title="Edit Appointment"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            
            // Validate required fields
            if (!selectedAppointment) return;
            
            handleEditConfirm();
          }}
          className="space-y-6"
        >
          {/* Client Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-sm font-medium text-blue-900">{selectedAppointment?.clientName}</p>
              </div>
            </div>
          </div>

          {/* Treatment Centre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Treatment Centre
            </label>
            <Select
              value={editFormData.centreId}
              onChange={(value) => setEditFormData({ 
                ...editFormData, 
                centreId: value,
                serviceId: '', // Reset service when centre changes
                staffId: '' // Reset staff when centre changes
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
              Service
            </label>
            <Select
              value={editFormData.serviceId}
              onChange={(value) => setEditFormData({ 
                ...editFormData, 
                serviceId: value,
                staffId: '' // Reset staff when service changes
              })}
              options={editFormData.centreId 
                ? appointmentServices.length > 0
                  ? appointmentServices.map(service => ({
                      value: service.id,
                      label: `${service.name} - ${formatPrice(service.price, 'South Africa')} (${service.duration}min)`
                    }))
                  : []
                : []
              }
              placeholder={!editFormData.centreId 
                ? "Please select a centre first" 
                : appointmentServices.length === 0 
                  ? "No services available at this centre"
                  : "Select service..."
              }
              required
              disabled={!editFormData.centreId}
            />
          </div>

          {/* Staff Member */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff Member
            </label>
            <Select
              value={editFormData.staffId}
              onChange={(value) => setEditFormData({ ...editFormData, staffId: value })}
              options={editFormData.centreId && editFormData.serviceId
                ? appointmentStaff.length > 0
                  ? appointmentStaff.map(staff => ({
                      value: staff.id,
                      label: `${staff.firstName} ${staff.lastName}${staff.position ? ` - ${staff.position}` : ''}`
                    }))
                  : []
                : []
              }
              placeholder={!editFormData.centreId 
                ? "Please select a centre first"
                : !editFormData.serviceId
                  ? "Please select a service first" 
                  : appointmentStaff.length === 0 
                    ? "No staff available for this service"
                    : "Select staff member..."
              }
              required
              disabled={!editFormData.centreId || !editFormData.serviceId}
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
                value={editFormData.dateTime.split('T')[0] || ''}
                onChange={(e) => {
                  const date = e.target.value;
                  const currentTime = editFormData.dateTime.split('T')[1] || '09:00';
                  setEditFormData({ ...editFormData, dateTime: `${date}T${currentTime}` });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time Slot Selection */}
            {editFormData.dateTime.split('T')[0] && editFormData.staffId && editFormData.serviceId && (
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
                          const date = editFormData.dateTime.split('T')[0];
                          setEditFormData({ ...editFormData, dateTime: `${date}T${slot.time}` });
                        }}
                        disabled={!slot.available}
                        className={`
                          px-3 py-2 text-sm rounded border transition-colors
                          ${editFormData.dateTime.split('T')[1] === slot.time
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
            
            {(!editFormData.staffId || !editFormData.serviceId) && (
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
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes for this appointment..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={editFormData.status}
              onChange={(value) => setEditFormData({ ...editFormData, status: value as any })}
              options={[
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no-show', label: 'No Show' }
              ]}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setSelectedAppointment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedAppointment || !editFormData.dateTime || (selectedAppointment && editFormData.status === selectedAppointment.status)}
            >
              {selectedAppointment && editFormData.status === selectedAppointment.status ? (
                <div className="text-gray-500">No changes needed</div>
              ) : (
                'Update Appointment'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedAppointment(null);
        }}
        title="Cancel Appointment"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            
            // Validate required fields
            if (!selectedAppointment) return;
            
            handleCancelConfirm();
          }}
          className="space-y-6"
        >
          {/* Client Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-sm font-medium text-blue-900">{selectedAppointment?.clientName}</p>
              </div>
            </div>
          </div>

          {/* Reason for Cancellation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter the reason for cancelling this appointment..."
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setSelectedAppointment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedAppointment || !cancelReason.trim()}
            >
              {cancelReason.trim() ? (
                <div className="text-red-500">Confirm Cancellation</div>
              ) : (
                <div className="text-gray-500">No reason provided</div>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminSystemInterface; 