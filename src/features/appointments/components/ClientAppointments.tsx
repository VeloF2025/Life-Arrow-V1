import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { format } from 'date-fns';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useUserProfile } from '../../../hooks/useUserProfile';
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Mock toast until react-toastify is properly installed
const toast = {
  success: (message: string) => console.log('SUCCESS:', message),
  error: (message: string) => console.error('ERROR:', message)
};

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

interface ClientAppointmentsProps {
  onBookAppointment?: () => void;
}

export const ClientAppointments: React.FC<ClientAppointmentsProps> = ({
  onBookAppointment
}) => {
  const localizer = momentLocalizer(moment);
  const { profile } = useUserProfile();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch client's appointments
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['clientAppointments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const appointmentsCollection = collection(db, 'appointments');
      const querySnapshot = await getDocs(appointmentsCollection);
      
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
        .filter(appt => appt.clientId === profile.id)
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    },
    enabled: !!profile?.id
  });

  // Helper function to format date safely
  const safeFormatDate = (dateString: string, formatStr: string) => {
    try {
      return format(new Date(dateString), formatStr);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Handle viewing appointment details
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Handle canceling appointment
  const handleCancelAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  // Confirm cancellation
  const confirmCancel = async () => {
    if (!selectedAppointment) return;
    
    try {
      // Update appointment status to 'cancelled'
      await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Appointment cancelled successfully');
      setShowCancelModal(false);
      setSelectedAppointment(null);
      refetch();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  // Get status color for badges
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  // Format appointments for calendar view
  const calendarEvents = appointments.map(appointment => ({
    id: appointment.id,
    title: `${appointment.serviceName} with ${appointment.staffName}`,
    start: new Date(appointment.dateTime),
    end: new Date(new Date(appointment.dateTime).getTime() + (appointment.duration || 60) * 60000),
    resource: appointment
  }));

  // Group appointments by date for list view
  const groupedAppointments = appointments.reduce((acc, appointment) => {
    const date = appointment.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);

  // Sort dates for display
  const sortedDates = Object.keys(groupedAppointments).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Filter appointments by status
  const upcomingAppointments = appointments.filter(
    appt => appt.status.toLowerCase() === 'scheduled' && new Date(appt.dateTime) > new Date()
  );
  
  const pastAppointments = appointments.filter(
    appt => appt.status.toLowerCase() === 'completed' || new Date(appt.dateTime) < new Date()
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="client-appointments">
      {/* Header with view toggle */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">My Appointments</h2>
        <div className="flex space-x-2">
          <Button 
            variant={viewMode === 'list' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('list')}
            className="px-3 py-1"
          >
            List View
          </Button>
          <Button 
            variant={viewMode === 'calendar' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('calendar')}
            className="px-3 py-1"
          >
            Calendar
          </Button>
          <Button 
            onClick={onBookAppointment}
            className="ml-2"
          >
            Book New Appointment
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            onSelectEvent={(event) => handleViewDetails(event.resource)}
            views={['month', 'week', 'day']}
            defaultView="month"
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {upcomingAppointments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">You have no upcoming appointments.</p>
                  <Button onClick={onBookAppointment} className="mt-4">
                    Book an Appointment
                  </Button>
                </div>
              ) : (
                upcomingAppointments.map(appointment => (
                  <div key={appointment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{appointment.serviceName}</h4>
                        <p className="text-sm text-gray-600">with {appointment.staffName}</p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <CalendarDaysIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                          {safeFormatDate(appointment.dateTime, 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <ClockIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                          {safeFormatDate(appointment.dateTime, 'h:mm a')} ({appointment.duration || 60} min)
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <MapPinIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                          {appointment.centreName}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        <div className="mt-2 flex space-x-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleViewDetails(appointment)}
                          >
                            Details
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handleCancelAppointment(appointment)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Past Appointments */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Past Appointments</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {pastAppointments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No past appointments found.</p>
                </div>
              ) : (
                pastAppointments.slice(0, 5).map(appointment => (
                  <div key={appointment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{appointment.serviceName}</h4>
                        <p className="text-sm text-gray-600">with {appointment.staffName}</p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <CalendarDaysIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                          {safeFormatDate(appointment.dateTime, 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <ClockIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                          {safeFormatDate(appointment.dateTime, 'h:mm a')}
                        </div>
                      </div>
                      <div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="mt-2"
                          onClick={() => handleViewDetails(appointment)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {pastAppointments.length > 5 && (
                <div className="p-4 text-center">
                  <Button variant="link">View All Past Appointments</Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Appointment Details">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedAppointment.serviceName}</h3>
                <p className="text-gray-600">with {selectedAppointment.staffName}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                {selectedAppointment.status}
              </span>
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center">
                  <CalendarDaysIcon className="mr-2 h-5 w-5 text-gray-400" />
                  <span>{safeFormatDate(selectedAppointment.dateTime, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center">
                  <ClockIcon className="mr-2 h-5 w-5 text-gray-400" />
                  <span>{safeFormatDate(selectedAppointment.dateTime, 'h:mm a')} ({selectedAppointment.duration || 60} mins)</span>
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="mr-2 h-5 w-5 text-gray-400" />
                  <span>{selectedAppointment.centreName}</span>
                </div>
              </div>
            </div>
            {selectedAppointment.notes && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-gray-800">Notes</h4>
                <p className="text-gray-600 whitespace-pre-line">{selectedAppointment.notes}</p>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 mt-4 border-t">
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button>
              {selectedAppointment.status === 'scheduled' && new Date(selectedAppointment.dateTime) > new Date() && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleCancelAppointment(selectedAppointment);
                  }}
                >
                  Cancel Appointment
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedAppointment && (
        <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Confirm Cancellation">
          <div className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Cancel Appointment</h3>
              <div className="mt-2 text-sm text-gray-500">
                <p>Are you sure you want to cancel your appointment for</p>
                <p className="font-semibold">{selectedAppointment.serviceName} on {safeFormatDate(selectedAppointment.dateTime, 'MMM d, yyyy')}?</p>
                <p className="mt-2">This action cannot be undone.</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              variant="danger"
              onClick={confirmCancel}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel Appointment
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Keep Appointment
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClientAppointments;
