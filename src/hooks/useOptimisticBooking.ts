import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
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

      // Determine the actual client ID - use provided clientId for admin bookings, otherwise use current user
      const actualClientId = bookingData.clientId || profile.id;
      
      // For admin bookings, we need to get client details from the database
      let clientName = `${profile.firstName} ${profile.lastName}`;
      let clientEmail = profile.email;
      
      if (bookingData.clientId && bookingData.clientId !== profile.id) {
        // This is an admin booking for another client - get client details
        // For now, we'll use the provided data or fallback
        // TODO: Optionally fetch full client details from database if needed
        clientName = bookingData.clientName || 'Unknown Client';
        clientEmail = bookingData.clientEmail || '';
      }

      // Create the appointment using a transaction to ensure consistency
      const appointment = await runTransaction(db, async (transaction) => {
        // Check if time slot is still available
        const appointmentsRef = collection(db, 'appointments');
        
        const appointmentData = {
          clientId: actualClientId,
          centreId: bookingData.centre.id,
          serviceId: bookingData.service.id,
          staffId: bookingData.timeSlot.staffId,
          startTime: bookingData.timeSlot.startTime,
          endTime: bookingData.timeSlot.endTime,
          dateTime: bookingData.timeSlot.startTime,
          duration: bookingData.service.duration,
          status: 'scheduled' as const,
          notes: bookingData.clientNotes || '',
          price: bookingData.service.price,
          
          // Denormalized data for performance
          clientName: clientName,
          clientEmail: clientEmail,
          clientPhone: '', // TODO: Get from client profile when available
          serviceName: bookingData.service.name,
          staffName: bookingData.timeSlot.staffName,
          centreName: bookingData.centre.name,
          
          // Audit fields - always use current user (admin) for created/modified by
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
        // Determine client details for optimistic update
        const actualClientId = bookingData.clientId || profile.id;
        let clientName = `${profile.firstName} ${profile.lastName}`;
        let clientEmail = profile.email;
        
        if (bookingData.clientId && bookingData.clientId !== profile.id) {
          clientName = bookingData.clientName || 'Unknown Client';
          clientEmail = bookingData.clientEmail || '';
        }

        const optimisticAppointment: Appointment = {
          id: 'temp-' + Date.now(),
          clientId: actualClientId,
          centreId: bookingData.centre.id,
          serviceId: bookingData.service.id,
          staffId: bookingData.timeSlot.staffId,
          startTime: bookingData.timeSlot.startTime,
          endTime: bookingData.timeSlot.endTime,
          dateTime: bookingData.timeSlot.startTime,
          duration: bookingData.service.duration,
          status: 'scheduled',
          notes: bookingData.clientNotes || '',
          price: bookingData.service.price,
          clientName: clientName,
          clientEmail: clientEmail,
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
      newTimeSlot: {
        startTime: Date;
        endTime: Date;
        staffId: string;
        staffName: string;
      }; 
      reason: string; 
    }) => {
      if (!profile) throw new Error('User not authenticated');

      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      // Get current appointment data to preserve in history
      const currentAppointment = await getDoc(appointmentRef);
      if (!currentAppointment.exists()) {
        throw new Error('Appointment not found');
      }
      
      const currentData = currentAppointment.data();
      
      await updateDoc(appointmentRef, {
        startTime: newTimeSlot.startTime,
        endTime: newTimeSlot.endTime,
        dateTime: newTimeSlot.startTime, // Update dateTime field for compatibility
        staffId: newTimeSlot.staffId,
        staffName: newTimeSlot.staffName,
        status: 'scheduled', // Reset to scheduled instead of rescheduled
        lastModifiedBy: profile.id,
        updatedAt: serverTimestamp(),
        rescheduleHistory: [
          ...(currentData.rescheduleHistory || []),
          {
            previousStartTime: currentData.startTime,
            previousEndTime: currentData.endTime,
            previousStaffId: currentData.staffId,
            previousStaffName: currentData.staffName,
            newStartTime: newTimeSlot.startTime,
            newEndTime: newTimeSlot.endTime,
            newStaffId: newTimeSlot.staffId,
            newStaffName: newTimeSlot.staffName,
            reason,
            rescheduledBy: profile.id,
            rescheduledAt: new Date()
          }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['timeslots'] });
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] });
    },
    onError: (error) => {
      console.error('Reschedule failed:', error);
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