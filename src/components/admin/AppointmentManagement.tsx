import { useState } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  MapPinIcon,
  UserIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isSameMonth, parseISO } from 'date-fns';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatPrice } from '../../lib/utils';
import { useUserProfile } from '../../hooks/useUserProfile';
import SuperAdminSystemInterface from '../appointments/SuperAdminSystemInterface';
import type { Appointment, TreatmentCentre, StaffMember, ServiceManagement } from '../../types';

type ViewMode = 'calendar' | 'grid';
type FilterStatus = 'all' | 'scheduled' | 'completed' | 'cancelled' | 'confirmed';

export function AppointmentManagement() {
  const { profile } = useUserProfile();
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCentreId, setSelectedCentreId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch centres
  const { data: allCentres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async (): Promise<TreatmentCentre[]> => {
      const snapshot = await getDocs(collection(db, 'centres'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TreatmentCentre));
    }
  });

  // Fetch appointments
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['appointments', selectedCentreId, filterStatus],
    queryFn: async (): Promise<Appointment[]> => {
      try {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('dateTime', 'desc')
        );

        const snapshot = await getDocs(appointmentsQuery);
        let appointmentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateTime: doc.data().dateTime.toDate()
        })) as Appointment[];

        // Apply status filter
        if (filterStatus !== 'all') {
          appointmentsList = appointmentsList.filter(apt => apt.status === filterStatus);
        }

        // Apply centre filter
        if (selectedCentreId !== 'all') {
          appointmentsList = appointmentsList.filter(apt => apt.centreId === selectedCentreId);
        }

        return appointmentsList;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
    }
  });

  // Centre options for filtering
  const centreOptions = [
    { value: 'all', label: 'All Centres' },
    ...allCentres.map(centre => ({
      value: centre.id,
      label: centre.name
    }))
  ];

  // Get appointments for current month in calendar view
  const getMonthAppointments = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.dateTime);
      return aptDate >= monthStart && aptDate <= monthEnd;
    });
  };

  // Navigate calendar
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  // Calendar day component
  const CalendarDay = ({ day, appointments }: { day: Date; appointments: Appointment[] }) => {
    const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.dateTime), day));
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isCurrentDay = isToday(day);

    return (
      <div className={`min-h-24 p-1 border border-gray-200 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${isCurrentDay ? 'bg-blue-50' : ''}`}>
        <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} ${isCurrentDay ? 'text-blue-600' : ''}`}>
          {format(day, 'd')}
        </div>
        <div className="space-y-1">
          {dayAppointments.slice(0, 3).map(apt => (
            <div
              key={apt.id}
              onClick={() => handleViewDetails(apt)}
              className={`text-xs p-1 rounded cursor-pointer truncate ${getStatusBgColor(apt.status)}`}
              title={`${apt.clientName} - ${format(new Date(apt.dateTime), 'HH:mm')}`}
            >
              {format(new Date(apt.dateTime), 'HH:mm')} {apt.clientName}
            </div>
          ))}
          {dayAppointments.length > 3 && (
            <div className="text-xs text-gray-500">
              +{dayAppointments.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  // Grid view component
  const GridView = () => {
    return (
      <div className="space-y-4">
        {appointments.map(appointment => (
          <Card key={appointment.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{appointment.clientName}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center">
                        <CalendarDaysIcon className="w-4 h-4 mr-1" />
                        {format(new Date(appointment.dateTime), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {format(new Date(appointment.dateTime), 'HH:mm')}
                      </div>
                      <div className="flex items-center">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        {appointment.centreName}
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1" />
                        {appointment.staffName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(appointment.price)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(appointment)}
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
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
          </Card>
        ))}
      </div>
    );
  };

  // Calendar view component
  const CalendarView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const monthAppointments = getMonthAppointments();

    // Fill calendar to start on Monday and show 6 weeks
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41); // 6 weeks = 42 days

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white rounded-lg shadow">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-px">
            {allDays.map(day => (
              <CalendarDay key={day.toISOString()} day={day} appointments={monthAppointments} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDeleteModal(true);
  };

  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  };

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const confirmDelete = async () => {
    if (!selectedAppointment) return;

    try {
      await deleteDoc(doc(db, 'appointments', selectedAppointment.id));
      setShowDeleteModal(false);
      setSelectedAppointment(null);
      refetch();
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-600">Manage all appointments across treatment centres</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {profile?.role === 'super_admin' && (
            <Button onClick={handleCreateNew}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'calendar' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDaysIcon className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Squares2X2Icon className="w-4 h-4 mr-2" />
              Grid
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
            <Select
              value={selectedCentreId}
              onValueChange={setSelectedCentreId}
              options={centreOptions}
              placeholder="Filter by centre"
              className="w-full sm:w-48"
            />
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as FilterStatus)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              placeholder="Filter by status"
              className="w-full sm:w-48"
            />
          </div>

          <div className="text-sm text-gray-600">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Main Content */}
      {appointments.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-600 mb-4">
            {filterStatus !== 'all' || selectedCentreId !== 'all'
              ? 'Try adjusting your filters to see more appointments.'
              : 'Get started by creating your first appointment.'
            }
          </p>
          {profile?.role === 'super_admin' && (
            <Button onClick={handleCreateNew}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create First Appointment
            </Button>
          )}
        </Card>
      ) : (
        <>
          {viewMode === 'calendar' ? <CalendarView /> : <GridView />}
        </>
      )}

      {/* Modals */}
      {showCreateModal && profile?.role === 'super_admin' && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="Create New Appointment">
          <SuperAdminSystemInterface 
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        </Modal>
      )}

      {showDetailsModal && selectedAppointment && (
        <Modal isOpen={true} onClose={() => setShowDetailsModal(false)} title="Appointment Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <p className="text-sm text-gray-900">{selectedAppointment.clientName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <p className="text-sm text-gray-900">
                  {format(new Date(selectedAppointment.dateTime), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <p className="text-sm text-gray-900">{selectedAppointment.duration} minutes</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <p className="text-sm text-gray-900">{selectedAppointment.serviceName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <p className="text-sm text-gray-900">{formatPrice(selectedAppointment.price)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Centre</label>
                <p className="text-sm text-gray-900">{selectedAppointment.centreName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff</label>
                <p className="text-sm text-gray-900">{selectedAppointment.staffName}</p>
              </div>
            </div>
            {selectedAppointment.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-sm text-gray-900">{selectedAppointment.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showDeleteModal && selectedAppointment && (
        <Modal isOpen={true} onClose={() => setShowDeleteModal(false)} title="Delete Appointment">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{selectedAppointment.clientName}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(selectedAppointment.dateTime), 'MMM d, yyyy HH:mm')} - {selectedAppointment.serviceName}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Appointment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 