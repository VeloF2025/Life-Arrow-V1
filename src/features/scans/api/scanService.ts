import { collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, orderBy, Timestamp, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Scan, ScanValue } from '@/types';

const SCANS_COLLECTION = 'scans';
const SCAN_VALUES_COLLECTION = 'scan_values';
const UNMATCHED_BASKET_COLLECTION = 'unmatched_basket';

export const scanService = {  
  // Assign a scan to a client
  async assignScanToClient(scanId: string, clientId: string): Promise<void> {
    try {
      const scanRef = doc(db, SCANS_COLLECTION, scanId);
      
      // Update the scan with the client ID and change status to matched
      await updateDoc(scanRef, {
        clientId: clientId,
        status: 'matched',
        updatedAt: Timestamp.now().toDate().toISOString()
      });
      
      // Remove from unmatched basket if it exists there
      const unmatchedBasketRef = collection(db, UNMATCHED_BASKET_COLLECTION);
      const q = query(unmatchedBasketRef, where('scanId', '==', scanId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error assigning scan to client:', error);
      throw error;
    }
  },

  // Create a new scan with separate field values and auto-match to client if possible
  async createScan(scanData: Omit<Scan, 'id' | 'createdAt' | 'updatedAt'>, clientIdentifier?: string): Promise<string> {
    try {
      const timestamp = Timestamp.now();
      const timestampStr = timestamp.toDate().toISOString();
      
      // If we have a client identifier but no clientId, try to find a matching client
      if (clientIdentifier && !scanData.clientId) {
        console.log(`Attempting to match scan to client with identifier: ${clientIdentifier}`);
        try {
          // Import dynamically to avoid circular dependencies
          const { clientService } = await import('../../clients/api/clientService');
          const matchedClient = await clientService.findByNameOrId(clientIdentifier);
          
          if (matchedClient && matchedClient.id) {
            console.log(`Successfully matched scan to client: ${matchedClient.firstName || ''} ${matchedClient.lastName || ''} (${matchedClient.id})`);
            scanData.clientId = matchedClient.id;
            scanData.status = 'matched';
            scanData.personName = `${matchedClient.firstName || ''} ${matchedClient.lastName || ''}`.trim() || null;
          }
        } catch (error) {
          console.error('Error auto-matching client:', error);
        }
      }
      
      // Prepare the main scan document
      const scanWithTimestamps = {
        ...scanData,
        createdAt: timestampStr,
        updatedAt: timestampStr
      };
      
      // Create the main scan document
      const docRef = await addDoc(collection(db, SCANS_COLLECTION), scanWithTimestamps);
      const scanId = docRef.id;
      
      // If the scan is unmatched, add it to the unmatched basket
      if (scanData.status === 'unmatched') {
        await this.addToUnmatchedBasket(scanId);
        
        // Log the client identifier for debugging if available
        if (clientIdentifier) {
          console.log(`Unmatched scan ${scanId} has client identifier: ${clientIdentifier}`);
        }
      }
      
      // Extract path data from rawDataJson and create separate records
      if (scanData.rawDataJson) {
        let pathData = [];
        
        // Handle different formats of rawDataJson
        if (typeof scanData.rawDataJson === 'string') {
          try {
            const parsed = JSON.parse(scanData.rawDataJson);
            if (parsed.pathData) {
              pathData = parsed.pathData;
            } else if (parsed.pathIds && parsed.values) {
              // Reconstruct from separate arrays
              const { pathIds, descriptions, values } = parsed;
              pathData = pathIds.map((pathId: number | string, index: number) => ({
                pathId,
                description: descriptions?.[index] || '',
                value: values[index]
              }));
            }
          } catch (e) {
            console.error('Error parsing rawDataJson:', e);
          }
        } else if (scanData.rawDataJson.pathData) {
          pathData = scanData.rawDataJson.pathData;
        } else if (scanData.rawDataJson.pathIds && scanData.rawDataJson.values) {
          // Reconstruct from separate arrays
          const { pathIds, descriptions, values } = scanData.rawDataJson;
          pathData = pathIds.map((pathId: number | string, index: number) => ({
            pathId,
            description: descriptions?.[index] || '',
            value: values[index]
          }));
        }
        
        // Use a batch to create individual records for each path value
        const batch = writeBatch(db);
        let count = 0;
        const maxBatchSize = 500; // Firestore batch limit
        
        for (const item of pathData) {
          const scanValue = {
            scanId,
            pathId: item.pathId,
            description: item.description || '',
            value: item.value,
            createdAt: timestampStr
          };
          
          const scanValueRef = doc(collection(db, SCAN_VALUES_COLLECTION));
          batch.set(scanValueRef, scanValue);
          
          count++;
          
          // Commit batch when it reaches the limit and start a new one
          if (count >= maxBatchSize) {
            await batch.commit();
            count = 0;
          }
        }
        
        // Commit any remaining items
        if (count > 0) {
          await batch.commit();
        }
      }
      
      return scanId;
    } catch (error) {
      console.error('Error creating scan:', error);
      throw error;
    }
  },

  // Get all scans
  async getAllScans(): Promise<Scan[]> {
    try {
      const q = query(collection(db, SCANS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Scan));
    } catch (error) {
      console.error('Error getting all scans:', error);
      throw error;
    }
  },

  // Get scan by ID
  async getScanById(id: string): Promise<Scan | null> {
    try {
      const docRef = doc(db, SCANS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Scan;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting scan by ID:', error);
      throw error;
    }
  },

  // Get scans by client ID
  async getScansByClientId(clientId: string): Promise<Scan[]> {
    try {
      const q = query(collection(db, SCANS_COLLECTION), where('clientId', '==', clientId), orderBy('scanDate', 'desc'));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Scan));
    } catch (error) {
      console.error('Error getting scans by user ID:', error);
      throw error;
    }
  },

  // Get unmatched scans
  async getUnmatchedScans(): Promise<Scan[]> {
    try {
      // First get all the unmatchedScans entries
      const unmatchedScansSnapshot = await getDocs(collection(db, UNMATCHED_BASKET_COLLECTION));
      
      // If there are no unmatched scans, return empty array
      if (unmatchedScansSnapshot.empty) {
        return [];
      }
      
      // Extract the scanIds
      const scanIds = unmatchedScansSnapshot.docs.map(doc => doc.data().scanId);
      
      // Fetch the actual scan documents
      const scans: Scan[] = [];
      
      // Use Promise.all to fetch all scans in parallel
      await Promise.all(scanIds.map(async (scanId) => {
        const scanDoc = await getDoc(doc(db, SCANS_COLLECTION, scanId));
        if (scanDoc.exists()) {
          const scanData = scanDoc.data() as Omit<Scan, 'id'>;
          scans.push({
            ...scanData,
            id: scanDoc.id
          } as Scan);
        }
      }));
      
      return scans;
    } catch (error) {
      console.error('Error getting unmatched scans:', error);
      throw error;
    }
  },

  // Update scan status
  async updateScanStatus(id: string, status: Scan['status']): Promise<void> {
    try {
      const timestamp = Timestamp.now();
      await updateDoc(doc(db, SCANS_COLLECTION, id), {
        status,
        updatedAt: timestamp.toDate().toISOString()
      });
    } catch (error) {
      console.error('Error updating scan status:', error);
      throw error;
    }
  },

  // Add a scan to the unmatched basket for later assignment
  async addToUnmatchedBasket(scanId: string): Promise<void> {
    try {
      await addDoc(collection(db, UNMATCHED_BASKET_COLLECTION), {
        scanId,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding scan to unmatched basket:', error);
      throw error;
    }
  },

  // Save scan values
  async saveScanValues(scanValues: Omit<ScanValue, 'id' | 'createdAt'>[]): Promise<void> {
    try {
      const timestamp = Timestamp.now();
      const timestampStr = timestamp.toDate().toISOString();
      
      // Use batch writes for better performance
      const batch = writeBatch(db);
      let count = 0;
      const maxBatchSize = 500; // Firestore batch limit
      
      for (const value of scanValues) {
        const scanValueRef = doc(collection(db, SCAN_VALUES_COLLECTION));
        batch.set(scanValueRef, {
          ...value,
          createdAt: timestampStr
        });
        
        count++;
        
        // Commit batch when it reaches the limit and start a new one
        if (count >= maxBatchSize) {
          await batch.commit();
          count = 0;
        }
      }
      
      // Commit any remaining items
      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Error saving scan values:', error);
      throw error;
    }
  },

  // Get scan values by scan ID
  async getScanValuesByScanId(scanId: string): Promise<ScanValue[]> {
    try {
      const q = query(
        collection(db, SCAN_VALUES_COLLECTION),
        where('scanId', '==', scanId)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ScanValue));
    } catch (error) {
      console.error('Error getting scan values:', error);
      throw error;
    }
  },

  // Get scan values with calculated formulas
  async getScanValuesWithFormulas(scanId: string): Promise<{
    rawValues: ScanValue[];
    derivedValues: {
      totalSum: number;
      positivePercentage: number;
      categoryCounts: Record<string, number>;
    };
    valuesByPathId: Record<string | number, ScanValue>;
  }> {
    try {
      // Get all scan values for this scan
      const scanValues = await this.getScanValuesByScanId(scanId);
      
      // Create a map of values by pathId for easy lookup
      const valuesByPathId = scanValues.reduce((acc: Record<string | number, ScanValue>, value) => {
        acc[value.pathId] = value;
        return acc;
      }, {});
      
      // Calculate derived values
      const derivedValues = {
        // Sum of all values
        totalSum: scanValues.reduce((sum, value) => sum + (value.value as number), 0),
        
        // Percentage of positive values (value === 1)
        positivePercentage: scanValues.length > 0 
          ? (scanValues.filter(v => v.value === 1).length / scanValues.length) * 100 
          : 0,
          
        // Count by category (assuming pathIds follow a pattern)
        categoryCounts: scanValues.reduce((counts: Record<string, number>, value) => {
          // Extract category from pathId (e.g., if pathId is like 'cat1_123', extract 'cat1')
          const category = String(value.pathId).split('_')[0] || 'unknown';
          counts[category] = (counts[category] || 0) + (value.value as number);
          return counts;
        }, {})
      };
      
      return {
        rawValues: scanValues,
        derivedValues,
        valuesByPathId
      };
    } catch (error) {
      console.error('Error calculating scan formulas:', error);
      throw error;
    }
  },

  // Delete a scan and all related data
  async deleteScan(scanId: string): Promise<void> {
    try {
      // Use batched writes for better performance and atomicity
      const batch = writeBatch(db);
      
      // 1. Delete the scan document
      const scanRef = doc(db, SCANS_COLLECTION, scanId);
      batch.delete(scanRef);
      
      // 2. Delete all scan values associated with this scan
      const scanValuesQuery = query(
        collection(db, SCAN_VALUES_COLLECTION),
        where('scanId', '==', scanId)
      );
      const scanValuesSnapshot = await getDocs(scanValuesQuery);
      
      // Add each scan value deletion to the batch
      scanValuesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 3. Delete any unmatched basket entries related to this scan
      const unmatchedQuery = query(
        collection(db, UNMATCHED_BASKET_COLLECTION),
        where('scanId', '==', scanId)
      );
      const unmatchedSnapshot = await getDocs(unmatchedQuery);
      
      // Add each unmatched basket entry deletion to the batch
      unmatchedSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Commit the batch
      await batch.commit();
      
      console.log(`Successfully deleted scan ${scanId} and all related data`);
    } catch (error) {
      console.error('Error deleting scan:', error);
      throw error;
    }
  }
};
