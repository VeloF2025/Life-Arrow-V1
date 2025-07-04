import { collection, getDocs, query, where, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Service } from '@/types';

export const serviceService = {
  getAll: async (): Promise<Service[]> => {
    const servicesRef = collection(db, 'services');
    const querySnapshot = await getDocs(servicesRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Service[];
  },

  getByCentre: async (centreId: string): Promise<Service[]> => {
    if (!centreId) return [];
    const servicesRef = collection(db, 'services');
    const q = query(servicesRef, where('centreIds', 'array-contains', centreId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Service[];
  },

  create: async (serviceData: Partial<Service>): Promise<string> => {
    const servicesRef = collection(db, 'services');
    const docRef = await addDoc(servicesRef, {
      ...serviceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  update: async (id: string, serviceData: Record<string, any>): Promise<void> => {
    console.log('Service API update called with ID:', id);
    console.log('Service data to update:', serviceData);
    const serviceDoc = doc(db, 'services', id);
    
    // Handle field name mismatches
    const normalizedData = {
      ...serviceData,
      // Ensure staffQualifications is properly set
      ...(serviceData.requiredQualifications && { 
        staffQualifications: serviceData.requiredQualifications 
      }),
      // Ensure requiredEquipment is properly set
      ...(serviceData.equipmentRequired && { 
        requiredEquipment: serviceData.equipmentRequired 
      }),
    };
    
    // Remove any fields that shouldn't be sent to Firestore
    // Firestore doesn't allow undefined values or non-standard fields
    const cleanedData = Object.entries(normalizedData).reduce((acc, [key, value]) => {
      // Skip non-standard fields that might cause issues
      if (['requiredQualifications', 'equipmentRequired'].includes(key)) {
        return acc;
      }
      
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    // Prepare data for Firestore update
    const updateData = {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    };
    console.log('Final update data after normalization:', updateData);
    
    try {
      await updateDoc(serviceDoc, updateData);
      console.log('Update successful in Firestore');
    } catch (error) {
      console.error('Error updating service in Firestore:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const serviceDoc = doc(db, 'services', id);
    await deleteDoc(serviceDoc);
  },
};
