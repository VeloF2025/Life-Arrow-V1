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
  getDoc
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Client, Appointment } from '@/types';

// Define TreatmentCentre type if it's not exported from @/types
interface TreatmentCentre {
  id?: string;
  name: string;
  address?: string;
  [key: string]: any;
}

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
      // Use the correct collection name 'centres' instead of 'treatmentCentres'
      const centresRef = collection(db, 'centres');
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
  },
  
  /**
   * Find client by name or ID number
   * Used for auto-matching scans to clients
   */
  findByNameOrId: async (identifier: string): Promise<Client | null> => {
    try {
      if (!identifier) return null;
      
      console.log(`Attempting to find client with identifier: ${identifier}`);
      
      // Clean up the identifier - remove any trailing characters that might be part of the filename
      const cleanIdentifier = identifier.trim();
      
      // First try to find by ID number (exact match)
      if (/^\d{10,13}$/.test(cleanIdentifier)) {
        console.log(`Searching for client by ID number: ${cleanIdentifier}`);
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('idNumber', '==', cleanIdentifier));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const client = { id: doc.id, ...doc.data() } as Client;
          console.log(`Found client by ID: ${client.firstName} ${client.lastName}`);
          return client;
        }
      }
      
      // If not found by ID, try to find by name
      // Split the identifier into name parts
      const nameParts = cleanIdentifier.split(' ').filter(part => part.trim().length > 0);
      
      if (nameParts.length > 0) {
        console.log(`Searching for client by name parts: ${nameParts.join(', ')}`);
        // Get all clients
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef);
        const querySnapshot = await getDocs(q);
        
        const clients = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            _score: 0 // Add score property for matching
          };
        });
        
        // Score each client based on name match
        const scoredClients = clients.map(client => {
          let score = 0;
          // Use type assertion to ensure TypeScript knows these properties exist
          const typedClient = client as Client & { _score: number };
          const firstName = ((typedClient.firstName as string) || '').toLowerCase();
          const lastName = ((typedClient.lastName as string) || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`;
          
          // Check for exact match of full name
          const identifierLower = cleanIdentifier.toLowerCase();
          if (fullName === identifierLower) {
            score += 10; // High score for exact full name match
          } else if (`${lastName} ${firstName}` === identifierLower) {
            score += 9; // High score for exact full name match in reverse order
          }
          
          // Check each name part against the client's name
          nameParts.forEach(part => {
            const partLower = part.toLowerCase();
            if (fullName.includes(partLower)) {
              score += 1;
              
              // Boost score for exact matches of first or last name
              if (firstName === partLower || lastName === partLower) {
                score += 3;
              }
              
              // Boost score for starts with matches
              if (firstName.startsWith(partLower) || lastName.startsWith(partLower)) {
                score += 2;
              }
            }
          });
          
          return { ...client, _score: score };
        });
        
        // Filter clients with a score > 0 and sort by score (highest first)
        const matchedClients = scoredClients
          .filter(client => client._score > 0)
          .sort((a, b) => b._score - a._score);
        
        // Return the best match if any
        if (matchedClients.length > 0) {
          const bestMatch = { ...matchedClients[0] };
          // Remove the score property using a type-safe approach
          const { _score, ...clientWithoutScore } = bestMatch;
          // Type assertion to ensure TypeScript knows these properties exist
          const typedClient = clientWithoutScore as Client;
          console.log(`Found best matching client: ${typedClient.firstName || ''} ${typedClient.lastName || ''} (score: ${_score})`);
          return typedClient;
        }
      }
      
      console.log(`No matching client found for identifier: ${identifier}`);
      return null;
    } catch (error) {
      console.error('Error finding client by name or ID:', error);
      return null;
    }
  }
};

export default clientService;
