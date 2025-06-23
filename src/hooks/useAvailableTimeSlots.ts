import { useQuery } from '@tanstack/react-query';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface TimeSlot {
  id: string;
  centreId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  price: number;
  staffName: string;
  serviceName: string;
}

export const useAvailableTimeSlots = (
  centreId: string | undefined,
  serviceId: string | undefined,
  selectedDate: Date | undefined,
  staffId?: string | undefined
) => {
  return useQuery({
    queryKey: ['timeslots', centreId, serviceId, selectedDate?.toDateString(), staffId],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!centreId || !serviceId || !selectedDate || !staffId) {
        return [];
      }

      try {
        // Get staff member
        const staffRef = collection(db, 'staff');
        const staffSnapshot = await getDocs(staffRef);
        
        const staff = staffSnapshot.docs.find(doc => doc.id === staffId);
        if (!staff) {
          console.log('Staff member not found:', staffId);
          return [];
        }

        const staffData = staff.data();
        const staffName = `${staffData.firstName} ${staffData.lastName}`;

        // Get service
        const servicesRef = collection(db, 'services');
        const servicesSnapshot = await getDocs(servicesRef);
        
        const service = servicesSnapshot.docs.find(doc => doc.id === serviceId);
        if (!service) {
          console.log('Service not found:', serviceId);
          return [];
        }

        const serviceData = service.data();

        // Generate simple time slots (9 AM to 5 PM, 30-minute slots)
        const slots: TimeSlot[] = [];
        const baseDate = new Date(selectedDate);
        
        for (let hour = 9; hour < 17; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const startTime = new Date(baseDate);
            startTime.setHours(hour, minute, 0, 0);
            
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + (serviceData.duration || 30));
            
            // Only show future time slots
            if (startTime > new Date()) {
              slots.push({
                id: `${staffId}-${startTime.getTime()}`,
                centreId,
                staffId,
                serviceId,
                startTime,
                endTime,
                isAvailable: true,
                price: serviceData.price || 0,
                staffName,
                serviceName: serviceData.name
              });
            }
          }
        }

        console.log(`Generated ${slots.length} time slots for ${staffName}`);
        return slots;
      } catch (error) {
        console.error('Error generating time slots:', error);
        return [];
      }
    },
    refetchInterval: 30000,
    enabled: !!(centreId && serviceId && selectedDate && staffId),
    staleTime: 15000
  });
}; 