import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  collection,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { format } from 'date-fns';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { staffService } from '../../staff/api/staffService';
import { clientService } from '../../clients/api/clientService';
import { centreService } from '../../centres/api/centreService';
import { serviceService } from '../../services/api/serviceService';

// Mock toast until react-toastify is properly installed
const toast = {
  success: (message: string) => console.log('SUCCESS:', message),
  error: (message: string) => console.error('ERROR:', message)
};

// UI Components
const Select: React.FC<SelectProps> = ({ value, onChange, options, placeholder, disabled = false, className }) => (
  <select 
    value={value} 
    onChange={(e) => onChange && onChange(e.target.value)}
    disabled={disabled}
    className={className || "w-full p-2 border rounded"}
  >
    <option value="" disabled>{placeholder || 'Please select...'}</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const Input: React.FC<InputProps> = ({ type = 'text', value = '', onChange, placeholder, disabled = false, className, name, defaultValue }) => (
  <input
    type={type}
    value={value}
    defaultValue={defaultValue}
    name={name}
    onChange={(e) => onChange && onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className={className || "w-full p-2 border rounded"}
  />
);

const TextArea: React.FC<TextAreaProps> = ({ value = '', onChange, placeholder, disabled = false, className, name, rows = 4 }) => (
  <textarea
    value={value}
    name={name}
    onChange={(e) => onChange && onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className={className || "w-full p-2 border rounded"}
    rows={rows}
  />
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Availability and TimeSlot interfaces (as in db-schema)
interface TimeSlot {
  isAvailable: boolean;
  start: string;
  end: string;
}

interface Availability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

// Define types with fullName property
interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userId?: string;
}

interface EnrichedClient extends Client {
  fullName?: string;
}

interface StaffMember {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  centreIds?: string[];
  availability?: Availability;
}

interface EnrichedStaffMember extends StaffMember {
  fullName?: string;
}

interface TreatmentCentre {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

// Component props types
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{value: string; label: string}>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

interface InputProps {
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  label?: string;
  required?: boolean;
  defaultValue?: string;
  min?: string;
}

interface TextAreaProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  rows?: number;
  label?: string;
  required?: boolean;
}

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

interface AppointmentManagementProps {
  initialClientId?: string;
  onAppointmentBooked?: () => void;
  clientMode?: boolean;
}

// Helper function to convert "HH:mm" to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Generate available time slots based on staff availability and existing appointments
const generateAvailableSlots = (
  availability: Availability,
  existingAppointments: Appointment[],
  serviceDuration: number,
  selectedDate: string
): string[] => {
  if (!selectedDate || !availability) return [];
  const dayName = format(new Date(selectedDate.replace(/-/g, '/')), 'eeee').toLowerCase() as keyof Availability;
  const staffWorkingHours = availability[dayName];

  if (!staffWorkingHours || staffWorkingHours.every(slot => !slot.isAvailable)) {
    return []; // Staff not available on this day
  }

  const bookedTimeRanges = existingAppointments.map(appt => {
    const start = timeToMinutes(appt.time);
    const end = start + (appt.duration || serviceDuration);
    return { start, end };
  });

  const availableSlotsList: string[] = [];
  const slotIncrement = 15; // Check for a slot every 15 minutes

  staffWorkingHours.forEach(workSlot => {
    if (!workSlot.isAvailable) return;

    const workStart = timeToMinutes(workSlot.start);
    const workEnd = timeToMinutes(workSlot.end);

    for (let slotStart = workStart; slotStart + serviceDuration <= workEnd; slotStart += slotIncrement) {
      const slotEnd = slotStart + serviceDuration;

      const isOverlapping = bookedTimeRanges.some(booked =>
        (slotStart < booked.end && slotEnd > booked.start)
      );

      if (!isOverlapping) {
        const hours = Math.floor(slotStart / 60).toString().padStart(2, '0');
        const minutes = (slotStart % 60).toString().padStart(2, '0');
        availableSlotsList.push(`${hours}:${minutes}`);
      }
    }
  });

  return [...new Set(availableSlotsList)];
};
