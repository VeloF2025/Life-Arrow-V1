import { useState } from 'react';
import { format } from 'date-fns';
import { useOptimisticBooking } from '../../hooks/useOptimisticBooking';
import { 
  ChevronLeftIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatPrice } from '../../lib/utils';
import type { BookingData } from '../../types';

interface BookingConfirmationProps {
  bookingData: BookingData;
  onComplete: () => void;
  onBack: () => void;
}

const BookingConfirmation = ({ bookingData, onComplete, onBack }: BookingConfirmationProps) => {
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  const bookingMutation = useOptimisticBooking();

  const handleConfirmBooking = async () => {
    try {
      setIsBooking(true);
      
      await bookingMutation.mutateAsync({
        ...bookingData,
        clientNotes: notes
      });
      
      setBookingSuccess(true);
      
      // Auto-complete after 3 seconds
      setTimeout(() => {
        onComplete();
      }, 3000);
      
    } catch (error) {
      console.error('Booking failed:', error);
      // Error is handled by the mutation hook
    } finally {
      setIsBooking(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="text-center py-12">
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600 mb-6">
          Your appointment has been successfully booked. You'll receive a confirmation email shortly.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
          <h3 className="font-semibold text-green-800 mb-2">Appointment Details</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Service:</strong> {bookingData.service.name}</p>
            <p><strong>Date:</strong> {format(bookingData.timeSlot.startTime, 'EEEE, MMMM d, yyyy')}</p>
            <p><strong>Time:</strong> {format(bookingData.timeSlot.startTime, 'h:mm a')}</p>
            <p><strong>Location:</strong> {bookingData.centre.name}</p>
          </div>
        </div>
        <Button
          onClick={onComplete}
          className="mt-6"
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Confirm Your Appointment
        </h2>
        <p className="text-gray-600">
          Please review your appointment details before confirming
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Appointment Summary</h3>
        
        {/* Service Details */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">{bookingData.service.name}</h4>
              <p className="text-sm text-gray-600">{bookingData.service.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>{bookingData.service.duration} minutes</span>
                <span>•</span>
                <span className="font-medium text-gray-900">{formatPrice(bookingData.service.price, bookingData.centre.address.country)}</span>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-start space-x-3">
            <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">
                {format(bookingData.timeSlot.startTime, 'EEEE, MMMM d, yyyy')}
              </h4>
              <p className="text-sm text-gray-600">
                {format(bookingData.timeSlot.startTime, 'h:mm a')} - {format(bookingData.timeSlot.endTime, 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Staff */}
          <div className="flex items-start space-x-3">
            <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">{bookingData.timeSlot.staffName}</h4>
              <p className="text-sm text-gray-600">Your practitioner</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start space-x-3">
            <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">{bookingData.centre.name}</h4>
              <p className="text-sm text-gray-600">
                {bookingData.centre.address.street}, {bookingData.centre.address.city}
              </p>
              {bookingData.centre.phone && (
                <p className="text-sm text-gray-500 mt-1">
                  📞 {bookingData.centre.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Additional Notes (Optional)
        </label>
        <TextArea
          value={notes}
          onChange={setNotes}
          placeholder="Any specific requirements or notes for your appointment..."
          rows={3}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          This information will be shared with your practitioner to ensure the best service.
        </p>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Important Information</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Please arrive 15 minutes before your appointment time</li>
          <li>• Cancellations must be made at least 24 hours in advance</li>
          <li>• Late arrivals may result in shortened appointment time</li>
          <li>• Bring a valid ID and any relevant medical documents</li>
        </ul>
      </div>

      {/* Total Cost */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total Cost:</span>
          <span className="text-primary-600">{formatPrice(bookingData.service.price, bookingData.centre.address.country)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Payment will be processed at the centre
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          disabled={isBooking}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Back to Time Selection
        </Button>
        
        <Button
          onClick={handleConfirmBooking}
          disabled={isBooking}
          size="lg"
          className="min-w-[160px]"
        >
          {isBooking ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>

      {/* Error Display */}
      {bookingMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            {bookingMutation.error.message}
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingConfirmation; 