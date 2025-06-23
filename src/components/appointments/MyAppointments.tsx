import { useState } from 'react';
import { format, isPast, isFuture, addHours } from 'date-fns';
import { useAppointmentActions } from '../../hooks/useOptimisticBooking';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TextArea } from '../ui/TextArea';
import type { Appointment } from '../../types';

interface MyAppointmentsProps {
  appointments: Appointment[];
}

const MyAppointments = ({ appointments }: MyAppointmentsProps) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { cancelAppointment, rescheduleAppointment } = useAppointmentActions();

  // Group appointments by status
  const upcomingAppointments = appointments.filter(apt => 
    isFuture(apt.startTime) && ['scheduled', 'confirmed'].includes(apt.status)
  );
  
  const pastAppointments = appointments.filter(apt => 
    isPast(apt.startTime) || ['completed', 'cancelled', 'no-show'].includes(apt.status)
  );

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleRescheduleClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedAppointment || !cancellationReason.trim()) return;

    try {
      setIsSubmitting(true);
      await cancelAppointment.mutateAsync({
        appointmentId: selectedAppointment.id,
        reason: cancellationReason
      });
      
      setShowCancelModal(false);
      setCancellationReason('');
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCancelOrReschedule = (appointment: Appointment): boolean => {
    // Can only cancel/reschedule if appointment is more than 24 hours away
    const twentyFourHoursFromNow = addHours(new Date(), 24);
    return appointment.startTime > twentyFourHoursFromNow && 
           ['scheduled', 'confirmed'].includes(appointment.status);
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      'no-show': 'bg-orange-100 text-orange-800',
      rescheduled: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'cancelled':
        return <XMarkIcon className="w-4 h-4" />;
      case 'no-show':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No appointments yet</p>
        <p className="text-sm text-gray-400">
          Book your first appointment using the form above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Appointments ({upcomingAppointments.length})
          </h3>
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={() => handleCancelClick(appointment)}
                onReschedule={() => handleRescheduleClick(appointment)}
                canModify={canCancelOrReschedule(appointment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Past Appointments ({pastAppointments.length})
          </h3>
          <div className="space-y-4">
            {pastAppointments.slice(0, 5).map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canModify={false}
              />
            ))}
          </div>
          {pastAppointments.length > 5 && (
            <p className="text-sm text-gray-500 mt-4">
              Showing 5 most recent appointments
            </p>
          )}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Cancel Appointment"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to cancel your appointment for{' '}
              <strong>{selectedAppointment.serviceName}</strong> on{' '}
              <strong>{format(selectedAppointment.startTime, 'MMMM d, yyyy')}</strong>?
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation
              </label>
              <TextArea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please provide a reason for cancelling..."
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmitting}
              >
                Keep Appointment
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelConfirm}
                disabled={!cancellationReason.trim() || isSubmitting}
              >
                {isSubmitting ? 'Cancelling...' : 'Cancel Appointment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <Modal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          title="Reschedule Appointment"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              To reschedule your appointment, please contact the centre directly or cancel this appointment and book a new one.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Contact Information</h4>
              <p className="text-sm text-blue-800">
                <strong>{selectedAppointment.centreName}</strong>
              </p>
              {/* Add contact details here */}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowRescheduleModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowRescheduleModal(false);
                  handleCancelClick(selectedAppointment);
                }}
              >
                Cancel & Rebook
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Individual appointment card component
interface AppointmentCardProps {
  appointment: Appointment;
  onCancel?: () => void;
  onReschedule?: () => void;
  canModify: boolean;
}

const AppointmentCard = ({ appointment, onCancel, onReschedule, canModify }: AppointmentCardProps) => {
  const getStatusColor = (status: string): string => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      'no-show': 'bg-orange-100 text-orange-800',
      rescheduled: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          {/* Service and Status */}
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              {appointment.serviceName}
            </h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </div>

          {/* Date and Time */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4" />
              <span>{format(appointment.startTime, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4" />
              <span>
                {format(appointment.startTime, 'h:mm a')} - {format(appointment.endTime, 'h:mm a')}
              </span>
            </div>
          </div>

          {/* Location and Staff */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="w-4 h-4" />
              <span>{appointment.centreName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4" />
              <span>{appointment.staffName}</span>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="text-sm text-gray-600">
              <strong>Notes:</strong> {appointment.notes}
            </div>
          )}
        </div>

        {/* Actions */}
        {canModify && (
          <div className="flex space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onReschedule}
            >
              <PencilIcon className="w-4 h-4 mr-1" />
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments; 