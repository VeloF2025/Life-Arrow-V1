import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, writeBatch, serverTimestamp, deleteField, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Scan, ScanValue, EpdResult, EpdScores, EbcResult, EbcScores, NormalizedScanDataItem } from '@/types';
import { processEpdAnalysis, processEbcAnalysis } from '../utils/analysisProcessor';

const SCANS_COLLECTION = 'scans';
const SCAN_VALUES_COLLECTION = 'scan_values';
const UNMATCHED_BASKET_COLLECTION = 'unmatched_basket';
const EPD_RESULTS_COLLECTION = 'epdResults';
const EBC_RESULTS_COLLECTION = 'ebcResults';

export const scanService = {  
  // Assign a scan to a client and trigger analysis
  // Normalizes raw scan data from various possible formats into a consistent structure.
  _normalizeScanData(rawDataJson: any): NormalizedScanDataItem[] {
    if (!rawDataJson) return [];
    try {
      const data = typeof rawDataJson === 'string' ? JSON.parse(rawDataJson) : rawDataJson;
      if (!data) return [];

      // Case A: Data is already structured with pathData
      if (data.pathData && Array.isArray(data.pathData)) {
        return data.pathData.map((item: any) => ({ ...item, value: Number(item.value) || 0 }));
      }

      // Case B: Reconstruct from separate arrays
      if (data.pathIds && data.values && Array.isArray(data.pathIds)) {
        const descriptions = data.descriptions || [];
        return data.pathIds.map((pathId: any, index: number) => ({
          pathId: Number(pathId),
          description: descriptions[index] || '',
          value: Number(data.values[index]) || 0,
        }));
      }

      // Case C: Data is an array of arrays (CSV-like)
      if (Array.isArray(data) && data.length >= 3) {
        const pathIds = data[0].slice(1).map((id: string) => Number(id));
        const descriptions = data[1].slice(1);
        const values = data[2].slice(1).map((val: string) => Number(val) || 0);
        return pathIds.map((pathId: number, index: number) => ({
          pathId,
          description: descriptions[index] || '',
          value: values[index],
        }));
      }
    } catch (e) {
      console.error('Error parsing rawDataJson for analysis:', e);
    }
    return [];
  },

  async assignScanToClient(scanId: string, clientId: string): Promise<void> {
    const scanRef = doc(db, SCANS_COLLECTION, scanId);

    try {
        // First, update the scan document to reflect the new status.
        await updateDoc(scanRef, {
            clientId,
            status: 'matched',
            updatedAt: serverTimestamp(),
        });
        console.log(`Scan ${scanId} status updated to 'matched' for client ${clientId}.`);

        // Fetch the processed scan values for analysis.
        const scanValuesQuery = query(collection(db, SCAN_VALUES_COLLECTION), where('scanId', '==', scanId));
        const scanValuesSnapshot = await getDocs(scanValuesQuery);

        let normalizedData: NormalizedScanDataItem[] = [];

        if (scanValuesSnapshot.empty) {
            console.warn(`No scan values found in scan_values collection for scan ${scanId}. Attempting to extract from rawDataJson.`);
            
            // Try to get the scan document to extract rawDataJson
            const scanDoc = await getDoc(scanRef);
            if (!scanDoc.exists()) {
                console.error(`Scan ${scanId} does not exist.`);
                return;
            }
            
            const scanData = scanDoc.data() as Scan;
            if (scanData.rawDataJson) {
                console.log(`Found rawDataJson for scan ${scanId}. Extracting scan values.`);
                
                // Extract and normalize data from rawDataJson
                try {
                    normalizedData = this._normalizeScanData(scanData.rawDataJson);
                    
                    if (normalizedData.length > 0) {
                        console.log(`Successfully extracted ${normalizedData.length} scan values from rawDataJson.`);
                        
                        // Save the extracted values to scan_values collection
                        const timestamp = Timestamp.now();
                        const timestampStr = timestamp.toDate().toISOString();
                        const scanValues = normalizedData.map(item => ({
                            scanId,
                            pathId: item.pathId,
                            description: item.description || '',
                            value: item.value,
                            updatedAt: timestampStr
                        }));
                        
                        await this.saveScanValues(scanValues);
                        console.log(`Saved ${scanValues.length} scan values to database for scan ${scanId}.`);
                    } else {
                        console.error(`Failed to extract scan values from rawDataJson for scan ${scanId}.`);
                        return;
                    }
                } catch (error) {
                    console.error(`Error extracting scan values from rawDataJson for scan ${scanId}:`, error);
                    return;
                }
            } else {
                console.error(`No rawDataJson found for scan ${scanId}. Analysis will be skipped.`);
                return;
            }
        } else {
            normalizedData = scanValuesSnapshot.docs.map(doc => {
                const data = doc.data();
                return { pathId: data.pathId, description: data.description, value: data.value };
            });
        }

        // --- Trigger EPD and EBC analysis ---
        console.log(`Starting analysis for scan ${scanId}...`);
        const epdScores = processEpdAnalysis(normalizedData);
        await this.createEpdResult(scanId, clientId, epdScores);
        console.log(`EPD results created for scan ${scanId}.`);

        const ebcScores = processEbcAnalysis(epdScores);
        await this.createEbcResult(scanId, clientId, ebcScores);
        console.log(`EBC results created for scan ${scanId}.`);

        // Remove from unmatched basket
        const unmatchedQuery = query(collection(db, UNMATCHED_BASKET_COLLECTION), where('scanId', '==', scanId));
        const unmatchedSnapshot = await getDocs(unmatchedQuery);
        if (!unmatchedSnapshot.empty) {
            const batch = writeBatch(db);
            unmatchedSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log(`Removed scan ${scanId} from unmatched basket.`);
        }

        console.log(`Successfully assigned and analyzed scan ${scanId} for client ${clientId}.`);
    } catch (error) {
        console.error(`[ASSIGN_SCAN_FAILURE] Error assigning scan ${scanId} to client ${clientId}:`, error);
        // Attempt to revert the status to avoid inconsistent state
        await updateDoc(scanRef, { status: 'unmatched', clientId: deleteField() });
        throw new Error('Failed to assign scan. See console for details.');
    }
  },

  // Create a new scan with separate field values and auto-match to client if possible
  async createScan(scanData: Omit<Scan, 'id' | 'createdAt' | 'updatedAt'>, clientIdentifier?: string): Promise<string> {
    try {
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Create the main scan document
      const docRef = await addDoc(collection(db, SCANS_COLLECTION), scanWithTimestamps);
      const scanId = docRef.id;
      
      // If the scan is matched, trigger the full assignment and analysis process
      if (scanData.clientId) {
        console.log(`Scan auto-assigned to client ${scanData.clientId} during creation.`);
        // Trigger the full assignment and analysis process
        await this.assignScanToClient(scanId, scanData.clientId);
      } else {
        // If no client is found, add to unmatched basket
        await this.addToUnmatchedBasket(scanId);
      }  
      
      // Log the client identifier for debugging if available
      if (clientIdentifier) {
        console.log(`Unmatched scan ${scanId} has client identifier: ${clientIdentifier}`);
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
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
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

  // Delete a scan and all its related data
  async deleteScan(scanId: string): Promise<void> {
    console.log(`[DELETE_SCAN_INIT] Initiating deletion for scan ${scanId}.`);
    
    try {
      // First, verify the scan exists
      const scanRef = doc(db, SCANS_COLLECTION, scanId);
      console.log(`[DELETE_SCAN_DEBUG] Getting scan document from ${SCANS_COLLECTION}/${scanId}`);
      const scanDoc = await getDoc(scanRef);
      
      if (!scanDoc.exists()) {
        console.error(`[DELETE_SCAN_ERROR] Scan ${scanId} does not exist.`);
        throw new Error(`Scan with ID ${scanId} not found.`);
      }
      
      console.log(`[DELETE_SCAN_DEBUG] Scan exists:`, scanDoc.data());
      
      // Create a new batch for the deletion operations
      const batch = writeBatch(db);
      
      // Add the scan document to the batch for deletion
      batch.delete(scanRef);
      console.log(`[DELETE_SCAN_PROGRESS] Added scan document to deletion batch.`);
      
      // Collections to delete related documents from
      const collectionsToDeleteFrom = [
        SCAN_VALUES_COLLECTION,
        EPD_RESULTS_COLLECTION,
        EBC_RESULTS_COLLECTION,
        UNMATCHED_BASKET_COLLECTION,
      ];
      
      // Process each collection separately
      let totalDocumentsToDelete = 0;
      for (const collectionName of collectionsToDeleteFrom) {
        try {
          console.log(`[DELETE_SCAN_PROGRESS] Querying ${collectionName} for documents with scanId: ${scanId}`);
          const q = query(collection(db, collectionName), where('scanId', '==', scanId));
          
          try {
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
              console.log(`[DELETE_SCAN_INFO] No documents found in ${collectionName} for scanId: ${scanId}`);
              continue;
            }
            
            console.log(`[DELETE_SCAN_PROGRESS] Found ${snapshot.docs.length} documents in ${collectionName} to delete.`);
            totalDocumentsToDelete += snapshot.docs.length;
            
            snapshot.docs.forEach(docSnapshot => {
              console.log(`[DELETE_SCAN_DEBUG] Adding document ${docSnapshot.id} from ${collectionName} to deletion batch`);
              batch.delete(docSnapshot.ref);
            });
          } catch (queryError) {
            console.error(`[DELETE_SCAN_ERROR] Error querying ${collectionName}:`, queryError);
            throw queryError; // Re-throw to be caught by the outer try-catch
          }
        } catch (error) {
          console.warn(`[DELETE_SCAN_WARN] Could not query ${collectionName} for scanId ${scanId}. This might be due to a missing index, but deletion will proceed.`, error);
        }
      }
      
      console.log(`[DELETE_SCAN_DEBUG] Committing batch with ${totalDocumentsToDelete + 1} documents (including main scan)`);
      
      // Commit the batch
      try {
        await batch.commit();
        console.log(`[DELETE_SCAN_SUCCESS] Successfully deleted scan ${scanId} and all related data.`);
      } catch (commitError) {
        console.error(`[DELETE_SCAN_ERROR] Error committing batch:`, commitError);
        throw commitError; // Re-throw to be caught by the outer try-catch
      }
    } catch (error) {
      console.error(`[DELETE_SCAN_FAILURE] Failed to delete scan ${scanId}.`, error);
      throw new Error(`Failed to delete scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Unmatch a scan from a client
  async unmatchScan(scanId: string): Promise<void> {
    console.log(`[UNMATCH_SCAN_INIT] Initiating unmatch for scan ${scanId}.`);
    
    try {
      // First, verify the scan exists
      const scanRef = doc(db, SCANS_COLLECTION, scanId);
      console.log(`[UNMATCH_SCAN_DEBUG] Getting scan document from ${SCANS_COLLECTION}/${scanId}`);
      const scanDoc = await getDoc(scanRef);
      
      if (!scanDoc.exists()) {
        console.error(`[UNMATCH_SCAN_ERROR] Scan ${scanId} does not exist.`);
        throw new Error(`Scan with ID ${scanId} not found.`);
      }
      
      console.log(`[UNMATCH_SCAN_DEBUG] Scan exists:`, scanDoc.data());
      
      // Create a new batch for the operations
      const batch = writeBatch(db);
      
      // Update the scan document to remove client association
      console.log(`[UNMATCH_SCAN_DEBUG] Updating scan document to remove client association`);
      batch.update(scanRef, {
          clientId: deleteField(),
          clientName: deleteField(),
          status: 'unmatched',
          updatedAt: serverTimestamp(),
      });

      // Collections to delete related documents from
      const collectionsToDeleteFrom = [EPD_RESULTS_COLLECTION, EBC_RESULTS_COLLECTION];
      
      // Process each collection separately
      let totalDocumentsToDelete = 0;
      for (const collectionName of collectionsToDeleteFrom) {
        try {
          console.log(`[UNMATCH_SCAN_PROGRESS] Querying ${collectionName} for documents with scanId: ${scanId}`);
          const q = query(collection(db, collectionName), where('scanId', '==', scanId));
          
          try {
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
              console.log(`[UNMATCH_SCAN_INFO] No documents found in ${collectionName} for scanId: ${scanId}`);
              continue;
            }
            
            console.log(`[UNMATCH_SCAN_PROGRESS] Found ${snapshot.docs.length} documents in ${collectionName} to delete.`);
            totalDocumentsToDelete += snapshot.docs.length;
            
            snapshot.docs.forEach(docSnapshot => {
              console.log(`[UNMATCH_SCAN_DEBUG] Adding document ${docSnapshot.id} from ${collectionName} to deletion batch`);
              batch.delete(docSnapshot.ref);
            });
          } catch (queryError) {
            console.error(`[UNMATCH_SCAN_ERROR] Error querying ${collectionName}:`, queryError);
            throw queryError; // Re-throw to be caught by the outer try-catch
          }
        } catch (error) {
          console.warn(`[UNMATCH_SCAN_WARN] Could not query ${collectionName} for scanId ${scanId}. This might be due to a missing index, but unmatch will proceed.`, error);
        }
      }
      
      console.log(`[UNMATCH_SCAN_DEBUG] Committing batch with ${totalDocumentsToDelete} documents to delete and 1 document to update`);
      
      // Commit the batch
      try {
        await batch.commit();
        console.log(`[UNMATCH_SCAN_SUCCESS] Successfully unmatched scan ${scanId} and deleted related analysis results.`);
      } catch (commitError) {
        console.error(`[UNMATCH_SCAN_ERROR] Error committing batch:`, commitError);
        throw commitError; // Re-throw to be caught by the outer try-catch
      }
    } catch (error) {
      console.error(`[UNMATCH_SCAN_FAILURE] Failed to unmatch scan ${scanId}.`, error);
      throw new Error(`Failed to unmatch scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Create a new EPD analysis result
  async createEpdResult(scanId: string, clientId: string, scores: EpdScores): Promise<string> {
    const epdResult: Omit<EpdResult, 'id'> = {
      scanId,
      clientId,
      scores,
      analysisVersion: '1.0',
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, EPD_RESULTS_COLLECTION), epdResult);
    return docRef.id;
  },

  // Create a new EBC analysis result
  async createEbcResult(scanId: string, clientId: string, scores: EbcScores): Promise<string> {
    const ebcResult: Omit<EbcResult, 'id'> = {
      scanId,
      clientId,
      scores,
      analysisVersion: '1.0',
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, EBC_RESULTS_COLLECTION), ebcResult);
    return docRef.id;
  },

  // Get all EPD results
  async getEpdResults(): Promise<EpdResult[]> {
    try {
      const q = query(collection(db, EPD_RESULTS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as EpdResult)
      );
    } catch (error) {
      console.error('Error getting EPD results:', error);
      throw new Error('Failed to fetch EPD results.');
    }
  },

  // Get a single EBC result for a given scan ID
  async getEbcResultByScanId(scanId: string): Promise<EbcResult | null> {
    if (!scanId) return null;
    try {
      const q = query(collection(db, EBC_RESULTS_COLLECTION), where('scanId', '==', scanId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log(`No EBC result found for scanId: ${scanId}`);
        return null;
      }
      // Assuming one EBC result per scan
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as EbcResult;
    } catch (error) {
      console.error(`Error getting EBC result for scan ${scanId}:`, error);
      throw new Error('Failed to fetch EBC result.');
    }
  },
};
