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
  PencilIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isSameMonth } from 'date-fns';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatPrice } from '../../lib/utils';
import { useUserProfile } from '../../hooks/useUserProfile';
import SuperAdminSystemInterface from '../appointments/SuperAdminSystemInterface';
import type { Appointment, TreatmentCentre } from '../../types';

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
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetails(appointment)}
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
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
        {appointments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No appointments found for the selected filters.
          </div>
        )}
      </div>
    );
  };

  // Calendar view component
  const CalendarView = () => {
    const monthAppointments = getMonthAppointments();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(day => (
            <CalendarDay key={day.toISOString()} day={day} appointments={monthAppointments} />
          ))}
        </div>
      </div>
    );
  };

  // Event handlers
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDeleteModal(true);
  };

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  // Status styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-orange-100 text-orange-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-200 text-blue-900';
      case 'confirmed': return 'bg-green-200 text-green-900';
      case 'completed': return 'bg-gray-200 text-gray-900';
      case 'cancelled': return 'bg-red-200 text-red-900';
      case 'no-show': return 'bg-orange-200 text-orange-900';
      case 'rescheduled': return 'bg-yellow-200 text-yellow-900';
      default: return 'bg-gray-200 text-gray-900';
    }
  };

  // Status filter options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-600">Manage appointments for all clients and centres</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center space-x-2">
          <PlusIcon className="w-4 h-4" />
          <span>Create Appointment</span>
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span>Grid</span>
            </button>
          </div>

          {/* Centre Filter */}
          {profile?.role === 'super-admin' && (
            <Select
              value={selectedCentreId}
              onChange={setSelectedCentreId}
              options={centreOptions}
              className="min-w-48"
            />
          )}

          {/* Status Filter */}
          <Select
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as FilterStatus)}
            options={statusOptions}
            className="min-w-36"
          />
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{appointments.length} appointments</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="p-1"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'calendar' ? <CalendarView /> : <GridView />}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Create New Appointment"
          size="lg"
        >
          <SuperAdminSystemInterface />
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAppointment && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAppointment(null);
            refetch();
          }}
          title="Edit Appointment"
          size="lg"
        >
          <SuperAdminSystemInterface 
            editAppointment={selectedAppointment}
            onClose={() => {
              setShowEditModal(false);
              setSelectedAppointment(null);
              refetch();
            }}
          />
        </Modal>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetailsModal(false)}
          title="Appointment Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <p className="text-gray-900">{selectedAppointment.clientName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                <p className="text-gray-900">
                  {format(new Date(selectedAppointment.dateTime), 'PPP p')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Centre</label>
                <p className="text-gray-900">{selectedAppointment.centreName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Staff</label>
                <p className="text-gray-900">{selectedAppointment.staffName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Service</label>
                <p className="text-gray-900">{selectedAppointment.serviceName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <p className="text-gray-900">{formatPrice(selectedAppointment.price)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <p className="text-gray-900">{selectedAppointment.duration || 60} minutes</p>
              </div>
            </div>
            {selectedAppointment.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="text-gray-900">{selectedAppointment.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleDelete(selectedAppointment);
                }}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowEditModal(true);
                }}
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAppointment && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Appointment"
        >
          <div className="space-y-4">
            <p>Are you sure you want to delete this appointment?</p>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium">{selectedAppointment.clientName}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(selectedAppointment.dateTime), 'PPP p')}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={async () => {
                  try {
                    await deleteDoc(doc(db, 'appointments', selectedAppointment.id));
                    setShowDeleteModal(false);
                    refetch();
                  } catch (error) {
                    console.error('Error deleting appointment:', error);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 