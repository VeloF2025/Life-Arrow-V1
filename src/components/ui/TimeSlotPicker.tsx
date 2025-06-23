import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Card } from './Card';
import { Button } from './Button';
import LoadingSpinner from './LoadingSpinner';

interface TimeSlot {
  time: string;
  available: boolean;
  staffName?: string;
}

interface TimeSlotPickerProps {
  selectedDate: string;
  selectedTime: string;
  onTimeSelect: (dateTime: string) => void;
  staffId: string;
  serviceId: string;
  serviceDuration: number;
}

export function TimeSlotPicker({
  selectedDate,
  selectedTime,
  onTimeSelect,
  staffId,
  serviceId,
  serviceDuration
}: TimeSlotPickerProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate time slots for the selected date
  useEffect(() => {
    if (!selectedDate || !staffId || !serviceId) {
      setAvailableSlots([]);
      return;
    }

    generateTimeSlots();
  }, [selectedDate, staffId, serviceId, serviceDuration]);

  const generateTimeSlots = async () => {
    setLoading(true);
    try {
      const slots: TimeSlot[] = [];
      const startHour = 9; // 9 AM
      const endHour = 17; // 5 PM
      const slotInterval = 30; // 30 minutes

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotInterval) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const dateTimeString = `${selectedDate}T${timeString}`;
          
          // Check if this slot is available (simplified - in real app you'd check against database)
          const isAvailable = await checkSlotAvailability(dateTimeString);
          
          slots.push({
            time: timeString,
            available: isAvailable
          });
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const checkSlotAvailability = async (dateTime: string): Promise<boolean> => {
    // TODO: Implement actual availability check against database
    // For now, simulate some unavailable slots
    const hour = parseInt(dateTime.split('T')[1].split(':')[0]);
    
    // Make lunch time (12:00-13:00) unavailable
    if (hour === 12) return false;
    
    // Make some random slots unavailable for demo
    return Math.random() > 0.3;
  };

  const handleTimeSlotClick = (timeSlot: TimeSlot) => {
    if (!timeSlot.available) return;
    
    const dateTimeString = `${selectedDate}T${timeSlot.time}`;
    onTimeSelect(dateTimeString);
  };

  const isSelected = (timeSlot: TimeSlot) => {
    if (!selectedTime) return false;
    const currentDateTime = `${selectedDate}T${timeSlot.time}`;
    return selectedTime === currentDateTime;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">Please select a date first</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="font-medium text-gray-900">
          Available Time Slots for {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Service duration: {serviceDuration} minutes
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
        {availableSlots.map((slot) => (
          <Button
            key={slot.time}
            variant={isSelected(slot) ? 'primary' : slot.available ? 'outline' : 'outline'}
            size="sm"
            onClick={() => handleTimeSlotClick(slot)}
            disabled={!slot.available}
            className={`
              ${!slot.available 
                ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' 
                : slot.available 
                  ? 'hover:bg-blue-50 hover:border-blue-300' 
                  : ''
              }
              ${isSelected(slot) ? 'bg-blue-600 text-white border-blue-600' : ''}
            `}
          >
            {slot.time}
          </Button>
        ))}
      </div>

      {availableSlots.filter(slot => slot.available).length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500">No available time slots for this date</p>
          <p className="text-sm text-gray-400 mt-1">Please select a different date</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
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
    </Card>
  );
} 