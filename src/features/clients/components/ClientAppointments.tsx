import React, { useState, useEffect } from 'react';
import { 
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  ArrowPathIcon,
  PlusIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { clientService } from '../api/clientService';
import type { Client, Appointment } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ClientAppointmentsProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
}

export function ClientAppointments({ isOpen, onClose, client }: ClientAppointmentsProps) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Load client appointments
  useEffect(() => {
    const loadAppointments = async () => {
      if (!client.id || !isOpen) return;
      
      setLoading(true);
      try {
        const appointmentsData = await clientService.getClientAppointments(client.id);
        setAppointments(appointmentsData);
        setError(null);
      } catch (err) {
        console.error('Error loading appointments:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAppointments();
  }, [client.id, isOpen]);
  
  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEEE, MMMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  // Format time helper
  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(`2000-01-01T${timeString}`), 'h:mm a');
    } catch (error) {
      return timeString || 'N/A';
    }
  };
  
  // Navigate to create appointment
  const handleCreateAppointment = () => {
    onClose();
    navigate('/admin/dashboard/appointments/create', { 
      state: { 
        preselectedClient: client 
      } 
    });
  };
  
  // Navigate to appointment details
  const handleViewAppointment = (appointmentId: string) => {
    onClose();
    navigate(`/admin/dashboard/appointments/${appointmentId}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Appointments for ${client.firstName} ${client.lastName}`}
      size="lg"
    >
      <div className="p-6">
        {/* Header with client info */}
        <div className="flex items-center mb-6 pb-4 border-b">
          <div className="flex-shrink-0">
            {client.photoUrl ? (
              <img
                src={client.photoUrl}
                alt={`${client.firstName} ${client.lastName}`}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium text-lg">
                  {client.firstName?.[0]}{client.lastName?.[0]}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">
              {client.firstName} {client.lastName}
            </h3>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <CalendarDaysIcon className="w-4 h-4 mr-1" />
              <span>
                {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
              </span>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              onClick={handleCreateAppointment}
              className="flex items-center bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading appointments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ExclamationCircleIcon className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Failed to load appointments</p>
            <p className="text-gray-600 mb-6">{error.message}</p>
            <Button
              onClick={() => {
                setLoading(true);
                clientService.getClientAppointments(client.id)
                  .then(data => {
                    setAppointments(data);
                    setError(null);
                  })
                  .catch(err => setError(err))
                  .finally(() => setLoading(false));
              }}
              className="flex items-center"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDaysIcon className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No appointments found</p>
            <p className="text-gray-600 mb-6">
              This client doesn't have any appointments scheduled yet.
            </p>
            <Button
              onClick={handleCreateAppointment}
              className="flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Schedule an Appointment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments
              .sort((a, b) => {
                // Sort by date (newest first)
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
              })
              .map(appointment => (
                <div
                  key={appointment.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewAppointment(appointment.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-md font-medium text-gray-900">
                      {appointment.type || 'Appointment'}
                    </h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      appointment.status === 'rescheduled' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <CalendarDaysIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(appointment.date)}
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {appointment.location || 'No location specified'}
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {appointment.staffMember || 'No staff assigned'}
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
        
        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ClientAppointments;
