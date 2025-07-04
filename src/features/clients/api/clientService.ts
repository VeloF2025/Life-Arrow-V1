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
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Client, TreatmentCentre, Appointment } from '@/types';

export const clientService = {
  /**
   * Get all clients with optional filtering
   */
  getAll: async (searchTerm = '', filterStatus = 'all') => {
    try {
      // Get all clients ordered by lastName
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, orderBy('lastName', 'asc'));
      const querySnapshot = await getDocs(q);
      
      // Convert to client objects
      let clients = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      
      // Apply search filter if provided
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        const searchTerms = searchTermLower.split(' ').filter(term => term.length > 0);
        
        clients = clients.filter(client => {
          // If no search terms (just spaces), return all clients
          if (searchTerms.length === 0) return true;
          
          // Search in all relevant client fields
          const searchableFields = [
            client.firstName,
            client.lastName,
            client.email,
            client.phone,
            client.address,
            client.city,
            client.state,
            client.postalCode,
            client.notes,
            client.occupation,
            client.company
          ];
          
          // Calculate match score for ranking results
          let matchScore = 0;
          
          // Check if all search terms match at least one field
          const allTermsMatch = searchTerms.every(term => {
            let termMatches = false;
            
            // Check each field for the current term
            for (const field of searchableFields) {
              if (field && field.toLowerCase().includes(term)) {
                termMatches = true;
                matchScore++;
                
                // Boost score for exact matches
                if (field.toLowerCase() === term) {
                  matchScore += 2;
                }
                
                // Boost score for name matches
                if ((client.firstName?.toLowerCase() === term) || 
                    (client.lastName?.toLowerCase() === term)) {
                  matchScore += 3;
                }
                
                // Boost score for starts with matches
                if (field.toLowerCase().startsWith(term)) {
                  matchScore += 1;
                }
              }
            }
            
            return termMatches;
          });
          
          // Store the match score on the client for sorting later
          if (allTermsMatch) {
            (client as any)._matchScore = matchScore;
          }
          
          return allTermsMatch;
        });
        
        // Sort results by match score (highest first)
        clients.sort((a, b) => ((b as any)._matchScore || 0) - ((a as any)._matchScore || 0));
      }
      
      // Apply status filter if not 'all'
      if (filterStatus !== 'all') {
        clients = clients.filter(client => client.status === filterStatus);
      }
      
      return clients;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  },

  /**
   * Get a client by ID
   */
  getById: async (id: string): Promise<Client | null> => {
    try {
      const docRef = doc(db, 'clients', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Client;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  },

  /**
   * Create a new client
   */
  create: async (clientData: Partial<Client>, photoFile?: File): Promise<string> => {
    try {
      // Create client document first
      const docRef = await addDoc(collection(db, 'clients'), {
        ...clientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // If photo is provided, upload it
      if (photoFile) {
        const photoUrl = await clientService.uploadPhoto(docRef.id, photoFile);
        
        // Update client with photo URL
        await updateDoc(docRef, {
          photoUrl,
          updatedAt: serverTimestamp()
        });
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },

  /**
   * Update an existing client
   */
  update: async (id: string, clientData: Partial<Client>, photoFile?: File): Promise<void> => {
    try {
      const updateData = {
        ...clientData,
        updatedAt: serverTimestamp()
      };
      
      // If photo is provided, upload it
      if (photoFile) {
        const photoUrl = await clientService.uploadPhoto(id, photoFile);
        updateData.photoUrl = photoUrl;
      }
      
      await updateDoc(doc(db, 'clients', id), updateData);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  /**
   * Delete a client
   */
  delete: async (id: string): Promise<void> => {
    try {
      // Delete client photo if exists
      try {
        const clientDoc = await getDoc(doc(db, 'clients', id));
        const clientData = clientDoc.data();
        
        if (clientData?.photoUrl) {
          // Extract the path from the URL
          const photoPath = clientData.photoUrl.split('clients%2F')[1].split('?')[0];
          if (photoPath) {
            const photoRef = ref(storage, `clients/${photoPath}`);
            await deleteObject(photoRef);
          }
        }
      } catch (photoError) {
        console.error('Error deleting client photo:', photoError);
        // Continue with client deletion even if photo deletion fails
      }
      
      // Delete client document
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  },

  /**
   * Upload client photo
   */
  uploadPhoto: async (clientId: string, file: File): Promise<string> => {
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${clientId}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `clients/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading client photo:', error);
      throw error;
    }
  },

  /**
   * Update client status
   */
  updateStatus: async (id: string, status: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'clients', id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      throw error;
    }
  },

  /**
   * Get all treatment centres
   */
  getCentres: async (): Promise<TreatmentCentre[]> => {
    try {
      const centresRef = collection(db, 'treatmentCentres');
      const q = query(centresRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      
      // Use unknown as intermediate type to safely cast to TreatmentCentre[]
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as TreatmentCentre[];
    } catch (error) {
      console.error('Error fetching treatment centres:', error);
      return [];
    }
  },

  /**
   * Get client appointments
   */
  getClientAppointments: async (clientId: string): Promise<Appointment[]> => {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef, 
        where('clientId', '==', clientId),
        orderBy('scheduledAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      // Use unknown as intermediate type to safely cast to Appointment[]
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JS Date
        scheduledAt: doc.data().scheduledAt?.toDate()
      })) as unknown as Appointment[];
    } catch (error) {
      console.error('Error fetching client appointments:', error);
      return [];
    }
  }
};

export default clientService;
