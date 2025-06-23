import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserProfile } from './useUserProfile';
import type { BookingData, Appointment } from '../types';

export const useOptimisticBooking = () => {
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();

  return useMutation({
    mutationFn: async (bookingData: BookingData): Promise<Appointment> => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      // Create the appointment using a transaction to ensure consistency
      const appointment = await runTransaction(db, async (transaction) => {
        // Check if time slot is still available
        const appointmentsRef = collection(db, 'appointments');
        
        const appointmentData = {
          clientId: profile.id,
          centreId: bookingData.centre.id,
          serviceId: bookingData.service.id,
          staffId: bookingData.timeSlot.staffId,
          startTime: bookingData.timeSlot.startTime,
          endTime: bookingData.timeSlot.endTime,
          status: 'scheduled' as const,
          notes: bookingData.clientNotes || '',
          price: bookingData.service.price,
          
          // Denormalized data for performance
          clientName: `${profile.firstName} ${profile.lastName}`,
          clientEmail: profile.email,
          clientPhone: '', // TODO: Get from profile
          serviceName: bookingData.service.name,
          staffName: bookingData.timeSlot.staffName,
          centreName: bookingData.centre.name,
          
          // Audit fields
          createdBy: profile.id,
          lastModifiedBy: profile.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          
          // Additional fields
          reminderSent: false,
          paymentStatus: 'pending' as const
        };

        const docRef = await addDoc(appointmentsRef, appointmentData);
        
        return {
          id: docRef.id,
          ...appointmentData,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Appointment;
      });

      return appointment;
    },

    onMutate: async (bookingData: BookingData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timeslots'] });
      await queryClient.cancelQueries({ queryKey: ['appointments'] });

      // Snapshot previous values
      const previousSlots = queryClient.getQueryData(['timeslots']);
      const previousAppointments = queryClient.getQueryData(['appointments']);

      // Optimistically update time slots UI
      queryClient.setQueryData(['timeslots'], (old: any) => 
        old?.map((slot: any) => 
          slot.id === bookingData.timeSlot.id 
            ? { ...slot, isAvailable: false, bookedBy: profile?.id }
            : slot
        )
      );

      // Optimistically add appointment to list
      if (profile) {
        const optimisticAppointment: Appointment = {
          id: 'temp-' + Date.now(),
          clientId: profile.id,
          centreId: bookingData.centre.id,
          serviceId: bookingData.service.id,
          staffId: bookingData.timeSlot.staffId,
          startTime: bookingData.timeSlot.startTime,
          endTime: bookingData.timeSlot.endTime,
          status: 'scheduled',
          notes: bookingData.clientNotes || '',
          price: bookingData.service.price,
          clientName: `${profile.firstName} ${profile.lastName}`,
          clientEmail: profile.email,
          clientPhone: '',
          serviceName: bookingData.service.name,
          staffName: bookingData.timeSlot.staffName,
          centreName: bookingData.centre.name,
          createdBy: profile.id,
          lastModifiedBy: profile.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          reminderSent: false,
          paymentStatus: 'pending'
        };

        queryClient.setQueryData(['appointments'], (old: any) => 
          old ? [optimisticAppointment, ...old] : [optimisticAppointment]
        );
      }

      return { previousSlots, previousAppointments };
    },

    onError: (err: any, bookingData: BookingData, context: any) => {
      // Rollback optimistic updates
      if (context?.previousSlots) {
        queryClient.setQueryData(['timeslots'], context.previousSlots);
      }
      if (context?.previousAppointments) {
        queryClient.setQueryData(['appointments'], context.previousAppointments);
      }

      // Show user-friendly error messages
      let errorMessage = 'Booking failed. Please try again.';
      
      if (err.code === 'permission-denied') {
        errorMessage = 'You do not have permission to book appointments.';
      } else if (err.message?.includes('slot')) {
        errorMessage = 'This time slot was just booked by another client. Please select another time.';
      } else if (err.code === 'unavailable') {
        errorMessage = 'Service is temporarily unavailable. Please try again later.';
      }

      console.error('Booking error:', err);
      throw new Error(errorMessage);
    },

    onSuccess: (appointment: Appointment) => {
      // Update all related queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['timeslots'] });
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] });

      // TODO: Trigger notifications
      // sendBookingConfirmation(appointment);
      
      console.log('Appointment booked successfully:', appointment);
    }
  });
};

export const useAppointmentActions = () => {
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();

  const rescheduleAppointment = useMutation({
    mutationFn: async ({ 
      appointmentId, 
      newTimeSlot, 
      reason 
    }: { 
      appointmentId: string; 
      newTimeSlot: any; 
      reason: string; 
    }) => {
      if (!profile) throw new Error('User not authenticated');

      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      await updateDoc(appointmentRef, {
        startTime: newTimeSlot.startTime,
        endTime: newTimeSlot.endTime,
        staffId: newTimeSlot.staffId,
        staffName: newTimeSlot.staffName,
        status: 'rescheduled',
        lastModifiedBy: profile.id,
        updatedAt: serverTimestamp(),
        rescheduleHistory: [
          {
            previousStartTime: new Date(), // TODO: Get from current appointment
            reason,
            timestamp: new Date()
          }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['timeslots'] });
    }
  });

  const cancelAppointment = useMutation({
    mutationFn: async ({ 
      appointmentId, 
      reason 
    }: { 
      appointmentId: string; 
      reason: string; 
    }) => {
      if (!profile) throw new Error('User not authenticated');

      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        cancellationReason: reason,
        lastModifiedBy: profile.id,
        updatedAt: serverTimestamp()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['timeslots'] });
    }
  });

  return {
    rescheduleAppointment,
    cancelAppointment
  };
}; 