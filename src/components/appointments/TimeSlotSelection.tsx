import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, isToday, isPast } from 'date-fns';
import { useAvailableTimeSlots } from '../../hooks/useAvailableTimeSlots';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { ServiceManagement, TreatmentCentre, TimeSlot, StaffMember } from '../../types';

interface TimeSlotSelectionProps {
  centre: TreatmentCentre;
  service: ServiceManagement;
  staff: StaffMember;
  onNext: (timeSlot: TimeSlot) => void;
  onBack: () => void;
}

const TimeSlotSelection = ({ centre, service, staff, onNext, onBack }: TimeSlotSelectionProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);

  // Get available time slots for the selected date and staff member
  const { data: timeSlots, isLoading } = useAvailableTimeSlots(
    centre.id,
    service.id,
    selectedDate,
    staff.id // Filter by selected staff member
  );

  // Generate week view dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null); // Reset selected time slot when date changes
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleNext = () => {
    if (selectedTimeSlot) {
      onNext(selectedTimeSlot);
    }
  };

  const goToPreviousWeek = () => {
    const previousWeek = addDays(weekStart, -7);
    setSelectedDate(previousWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = addDays(weekStart, 7);
    setSelectedDate(nextWeek);
  };

  // Group time slots by time for better display
  const groupedTimeSlots = timeSlots?.reduce((groups, slot) => {
    const timeKey = format(slot.startTime, 'HH:mm');
    if (!groups[timeKey]) {
      groups[timeKey] = [];
    }
    groups[timeKey].push(slot);
    return groups;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Select Date & Time
        </h2>
        <p className="text-gray-600">
          Choose your preferred date and time for <span className="font-medium">{service.name}</span> at {centre.name}.
        </p>
        <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <span className="mr-2">👩‍⚕️</span>
          Staff: <span className="font-semibold ml-1">{staff.firstName} {staff.lastName}</span>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={isPast(addDays(weekStart, -1))}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <div className="text-lg font-medium">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </div>
        
        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Week Calendar */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isDisabled = isPast(date) && !isToday(date);
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateSelect(date)}
              disabled={isDisabled}
              className={`p-3 text-center rounded-lg border transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {format(date, 'EEE')}
              </div>
              <div className={`text-lg font-medium ${
                isToday(date) ? 'text-blue-600' : ''
              }`}>
                {format(date, 'd')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">
            Available Times for {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !timeSlots?.length ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Available Times</h4>
            <p className="text-gray-600">
              There are no available time slots for this date. Please select a different date.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTimeSlots || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([time, slots]) => (
                <div key={time} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{time}</span>
                    <span className="text-sm text-gray-500">
                      ({service.duration} minutes)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleTimeSlotSelect(slot)}
                        className={`p-3 text-left border rounded-lg transition-all ${
                          selectedTimeSlot?.id === slot.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <UserIcon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {slot.staffName}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(slot.startTime, 'HH:mm')} - {format(slot.endTime, 'HH:mm')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button onClick={onBack} variant="outline">
          Back to Services
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedTimeSlot}
          size="lg"
        >
          Continue to Confirmation
        </Button>
      </div>
    </div>
  );
};

export default TimeSlotSelection; 