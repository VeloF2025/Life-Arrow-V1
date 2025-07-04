import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '../api/appointmentService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface TimeSlotPickerProps {
  selectedDate: string;
  staffId: string;
  serviceId: string;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
}

export function TimeSlotPicker({ selectedDate, staffId, serviceId, selectedTime, onTimeSelect }: TimeSlotPickerProps) {
  const { data: availableSlots, isLoading, error } = useQuery<string[], Error>({
    queryKey: ['availableSlots', selectedDate, staffId, serviceId],
    queryFn: () => appointmentService.getAvailableSlots(selectedDate, staffId, serviceId),
    enabled: !!selectedDate && !!staffId && !!serviceId,
  });

  if (isLoading) {
    return <LoadingSpinner text="Finding available slots..." />;
  }

  if (error) {
    return <div className="text-red-500">Error finding slots. Please try again.</div>;
  }

  if (!availableSlots || availableSlots.length === 0) {
    return <div className="text-gray-500">No available slots for this day.</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {availableSlots.map(slot => (
        <button
          key={slot}
          type="button"
          onClick={() => onTimeSelect(slot)}
          className={`p-2 rounded-md text-center text-sm font-medium transition-colors ${
            selectedTime === slot
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
