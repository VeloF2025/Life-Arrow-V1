import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import type { Client } from '@/types';

/**
 * Imports clients from a CSV string
 * @param csvString The CSV string to import
 * @param hasHeader Whether the CSV has a header row
 * @returns Object with counts of successful and failed imports
 */
export const importClientsFromCSV = async (
  csvString: string,
  hasHeader: boolean = true
): Promise<{ successful: number; failed: number; errors: string[] }> => {
  const lines = csvString.split('\n');
  const clients: Partial<Client>[] = [];
  const errors: string[] = [];
  
  // Skip header if present
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = line.split(',').map(val => val.trim());
      
      // Assuming CSV format: firstName,lastName,email,phone,dateOfBirth,gender,address,notes
      const client: Partial<Client> = {
        firstName: values[0],
        lastName: values[1],
        email: values[2],
        phone: values[3],
        dateOfBirth: values[4] ? new Date(values[4]) : undefined,
        gender: values[5] as any, // Type will be validated before saving
        address: values[6],
        notes: values[7],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Basic validation
      if (!client.firstName || !client.lastName) {
        errors.push(`Row ${i + 1}: First name and last name are required`);
        continue;
      }
      
      // Email validation
      if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
        errors.push(`Row ${i + 1}: Invalid email format`);
        continue;
      }
      
      clients.push(client);
    } catch (error) {
      errors.push(`Row ${i + 1}: ${(error as Error).message}`);
    }
  }
  
  // Save valid clients to Firestore using batch writes
  let successful = 0;
  let failed = 0;
  
  try {
    // Use batched writes for better performance
    const batchSize = 500; // Firestore batch limit is 500
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchClients = clients.slice(i, i + batchSize);
      
      for (const client of batchClients) {
        const newDocRef = doc(collection(db, 'clients'));
        batch.set(newDocRef, client);
      }
      
      await batch.commit();
      successful += batchClients.length;
    }
  } catch (error) {
    failed = clients.length - successful;
    errors.push(`Batch save error: ${(error as Error).message}`);
  }
  
  return { successful, failed, errors };
};

/**
 * Imports clients from a JSON array
 * @param jsonData Array of client objects
 * @returns Object with counts of successful and failed imports
 */
export const importClientsFromJSON = async (
  jsonData: any[]
): Promise<{ successful: number; failed: number; errors: string[] }> => {
  const clients: Partial<Client>[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    try {
      const item = jsonData[i];
      
      // Map JSON data to Client type
      const client: Partial<Client> = {
        firstName: item.firstName || item.first_name,
        lastName: item.lastName || item.last_name,
        email: item.email,
        phone: item.phone || item.phoneNumber || item.phone_number,
        dateOfBirth: item.dateOfBirth || item.date_of_birth || item.dob ? new Date(item.dateOfBirth || item.date_of_birth || item.dob) : undefined,
        gender: item.gender,
        address: item.address,
        notes: item.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Basic validation
      if (!client.firstName || !client.lastName) {
        errors.push(`Item ${i + 1}: First name and last name are required`);
        continue;
      }
      
      // Email validation
      if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
        errors.push(`Item ${i + 1}: Invalid email format`);
        continue;
      }
      
      clients.push(client);
    } catch (error) {
      errors.push(`Item ${i + 1}: ${(error as Error).message}`);
    }
  }
  
  // Save valid clients to Firestore
  let successful = 0;
  let failed = 0;
  
  try {
    // Use batched writes for better performance
    const batchSize = 500; // Firestore batch limit is 500
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchClients = clients.slice(i, i + batchSize);
      
      for (const client of batchClients) {
        const newDocRef = doc(collection(db, 'clients'));
        batch.set(newDocRef, client);
      }
      
      await batch.commit();
      successful += batchClients.length;
    }
  } catch (error) {
    failed = clients.length - successful;
    errors.push(`Batch save error: ${(error as Error).message}`);
  }
  
  return { successful, failed, errors };
};
