import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  deleteDoc, 
  addDoc, 
  updateDoc, 
  where, 
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Appointment, TreatmentCentre } from '@/types';
import type { ServiceDocument, UserDocument } from '@/lib/db-schema';
import { parse, format, addMinutes, isWithinInterval, set } from 'date-fns';

const toAppointment = (doc: any): Appointment => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    startTime: (data.startTime as Timestamp).toDate(),
    endTime: (data.endTime as Timestamp).toDate(),
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
  } as unknown as Appointment;
};

export const appointmentService = {
  /**
   * Get all appointments with optional filtering
   */
  getAll: async (filters?: { centreId?: string, status?: string }): Promise<Appointment[]> => {
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        orderBy('startTime', 'desc')
      );

      const snapshot = await getDocs(appointmentsQuery);
      let appointmentsList = snapshot.docs.map(toAppointment);

      // Apply filters if provided
      if (filters) {
        if (filters.status && filters.status !== 'all') {
          appointmentsList = appointmentsList.filter(apt => apt.status === filters.status);
        }

        if (filters.centreId && filters.centreId !== 'all') {
          appointmentsList = appointmentsList.filter(apt => apt.centreId === filters.centreId);
        }
      }

      return appointmentsList;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  },

  /**
   * Get appointments for a specific client
   */
  getByClientId: async (clientId: string): Promise<Appointment[]> => {
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('clientId', '==', clientId),
        orderBy('startTime', 'desc')
      );

      const snapshot = await getDocs(appointmentsQuery);
      return snapshot.docs.map(toAppointment);
    } catch (error) {
      console.error('Error fetching client appointments:', error);
      throw error;
    }
  },

  /**
   * Get appointments for a specific staff member
   */
  getByStaffId: async (staffId: string): Promise<Appointment[]> => {
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('staffId', '==', staffId),
        orderBy('startTime', 'desc')
      );

      const snapshot = await getDocs(appointmentsQuery);
      return snapshot.docs.map(toAppointment);
    } catch (error) {
      console.error('Error fetching staff appointments:', error);
      throw error;
    }
  },

  /**
   * Create a new appointment
   */
  create: async (appointmentData: Partial<Appointment>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'appointments'), {
        ...appointmentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  },

  /**
   * Update an existing appointment
   */
  update: async (id: string, appointmentData: Partial<Appointment>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        ...appointmentData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  },

  /**
   * Delete an appointment
   */
  delete: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  },

  /**
   * Update appointment status
   */
  updateStatus: async (id: string, status: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  },

  /**
   * Get all treatment centres
   */
  getAvailableSlots: async (date: string, staffId: string, serviceId: string): Promise<string[]> => {
    try {
      // 1. Fetch staff, service, and existing appointments data concurrently
      const staffDocRef = doc(db, 'users', staffId);
      const serviceDocRef = doc(db, 'services', serviceId);

      const selectedDate = parse(date, 'yyyy-MM-dd', new Date());
      const startOfDay = set(selectedDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
      const endOfDay = set(selectedDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('staffId', '==', staffId),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay))
      );

      const [staffDocSnap, serviceDocSnap, appointmentsSnapshot] = await Promise.all([
        getDoc(staffDocRef),
        getDoc(serviceDocRef),
        getDocs(appointmentsQuery)
      ]);

      if (!staffDocSnap.exists() || !serviceDocSnap.exists()) {
        console.error('Staff or Service not found');
        return [];
      }

      const staffData = staffDocSnap.data() as UserDocument;
      const serviceData = serviceDocSnap.data() as ServiceDocument;
      const appointments = appointmentsSnapshot.docs.map(toAppointment);

      // 2. Determine staff's working hours for the selected day
      const dayOfWeek = format(selectedDate, 'eeee').toLowerCase(); // e.g., 'monday'
      const availability = staffData.availability?.[dayOfWeek];

      if (!availability || !availability.length || !availability[0].isAvailable) {
        return []; // Staff not available on this day
      }

      const { start: workStart, end: workEnd } = availability[0]; // Assuming one work period per day for now
      const serviceDuration = serviceData.duration; // in minutes

      // 3. Generate potential time slots
      const potentialSlots: Date[] = [];
      let currentTime = parse(workStart, 'HH:mm', selectedDate);
      const endTime = parse(workEnd, 'HH:mm', selectedDate);

      while (addMinutes(currentTime, serviceDuration) <= endTime) {
        potentialSlots.push(currentTime);
        currentTime = addMinutes(currentTime, 15); // Assuming booking slots are every 15 mins
      }

      // 4. Filter out slots that conflict with existing appointments
      const availableSlots = potentialSlots.filter(slot => {
        const slotStart = slot;
        const slotEnd = addMinutes(slot, serviceDuration);

        return !appointments.some(appt => {
          const apptStart = appt.startTime; // Already a Date object
          const apptEnd = appt.endTime;     // Already a Date object
          // Check for any overlap between the potential slot and an existing appointment
          return isWithinInterval(slotStart, { start: apptStart, end: apptEnd }) ||
                 isWithinInterval(slotEnd, { start: apptStart, end: apptEnd }) ||
                 isWithinInterval(apptStart, { start: slotStart, end: slotEnd });
        });
      });

      // 5. Format the final slots into HH:mm strings
      return availableSlots.map(slot => format(slot, 'HH:mm'));

    } catch (error) {
      console.error('Error fetching available slots:', error);
      return []; // Return empty array on error
    }
  },

  getCentres: async (): Promise<TreatmentCentre[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'centres'));
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as TreatmentCentre[];
    } catch (error) {
      console.error('Error fetching centres:', error);
      throw error;
    }
  }
};

export default appointmentService;
