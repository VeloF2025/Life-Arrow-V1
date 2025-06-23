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
  XMarkIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, where, getDocs, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { format } from 'date-fns';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import Select from '../ui/Select';
import type { TreatmentCentre, StaffMember, ServiceManagement } from '../../types';

interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  centreId: string;
  centreName: string;
  staffId: string;
  staffName: string;
  dateTime: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  price?: number;
  country?: string;
}

interface AdminCentreInterfaceProps {
  preSelectedClientId?: string;
  preSelectedClientName?: string;
}

const AdminCentreInterface = ({ 
  preSelectedClientId, 
  preSelectedClientName 
}: AdminCentreInterfaceProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // Fetch appointments
  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', statusFilter, dateFilter],
    queryFn: async (): Promise<Appointment[]> => {
      try {
        let appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('dateTime', 'desc')
        );

        // Apply status filter
        if (statusFilter !== 'all') {
          appointmentsQuery = query(
            collection(db, 'appointments'),
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

  // Fetch clients for selection
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'clients'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: showCreateModal
  });

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

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const centre = centres.find(c => c.id === data.centreId);
      const service = services.find(s => s.id === data.serviceId);
      const staffMember = staff.find(s => s.id === data.staffId);

      const appointmentData = {
        clientId: selectedClientId,
        clientName: selectedClientName,
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

      return await addDoc(collection(db, 'appointments'), appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowCreateModal(false);
      resetForm();
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
            if (!selectedClientId || !formData.centreId || !formData.serviceId || !formData.staffId || !formData.dateTime) {
              return;
            }
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
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900">{selectedClientName}</p>
              </div>
            ) : (
              <Select
                value={selectedClientId}
                onChange={(value) => {
                  setSelectedClientId(value);
                  const client = clients.find(c => c.id === value);
                  setSelectedClientName(client ? `${client.firstName} ${client.lastName}` : '');
                }}
                options={clients.map(client => ({
                  value: client.id,
                  label: `${client.firstName} ${client.lastName}`
                }))}
                placeholder="Select a client..."
              />
            )}
          </div>

          {/* Treatment Centre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Treatment Centre *
            </label>
            <Select
              value={formData.centreId}
              onChange={(value) => setFormData({ ...formData, centreId: value, serviceId: '', staffId: '' })}
              options={centres.map(centre => ({
                value: centre.id,
                label: centre.name
              }))}
              placeholder="Select a centre..."
            />
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service *
            </label>
            <Select
              value={formData.serviceId}
              onChange={(value) => setFormData({ ...formData, serviceId: value })}
              options={formData.centreId 
                ? services.map(service => ({
                    value: service.id,
                    label: `${service.name} - R${service.price}`
                  }))
                : []
              }
              placeholder={formData.centreId ? "Select a service..." : "Please select a centre first"}
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
              onChange={(value) => setFormData({ ...formData, staffId: value })}
              options={formData.centreId 
                ? staff.map(member => ({
                    value: member.id,
                    label: `${member.firstName} ${member.lastName}`
                  }))
                : []
              }
              placeholder={formData.centreId ? "Select a staff member..." : "Please select a centre first"}
              disabled={!formData.centreId}
            />
          </div>

          {/* Date and Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Any additional notes for this appointment..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedClientId || !formData.centreId || !formData.serviceId || !formData.staffId || !formData.dateTime || createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? 'Creating...' : 'Create Appointment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCentreInterface; 