import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TREATMENT_CENTRES } from '../lib/constants';

/**
 * Initialize treatment centres in Firestore if they don't exist
 * This ensures we have the centres from constants as a fallback
 */
export async function initializeTreatmentCentres(): Promise<void> {
  try {
    // Check if centres collection exists and has documents
    const centresRef = collection(db, 'treatmentCentres');
    const snapshot = await getDocs(centresRef);
    
    // If no centres exist, add them from constants
    if (snapshot.empty) {
      console.log('No treatment centres found in database. Adding from constants...');
      
      // Add each centre from constants
      const addPromises = TREATMENT_CENTRES.map(async (centreName) => {
        await addDoc(centresRef, {
          name: centreName,
          active: true,
          createdAt: new Date()
        });
      });
      
      await Promise.all(addPromises);
      console.log(`Successfully added ${TREATMENT_CENTRES.length} treatment centres to database`);
    } else {
      console.log(`Found ${snapshot.size} existing treatment centres in database`);
    }
  } catch (error) {
    console.error('Error initializing treatment centres:', error);
  }
}
