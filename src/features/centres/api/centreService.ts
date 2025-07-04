import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TreatmentCentre } from '@/types';

export const centreService = {
  getAll: async (): Promise<TreatmentCentre[]> => {
    const centresRef = collection(db, 'centres');
    const q = query(centresRef);
    const querySnapshot = await getDocs(q);
    const centres = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TreatmentCentre[];
    return centres;
  },
};
