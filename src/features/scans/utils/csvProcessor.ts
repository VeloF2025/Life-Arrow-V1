import type { Scan, ScanValue } from '../types';
import { clientService } from '../../clients/api/clientService';

/**
 * Process a CSV file for scan data
 * @param file The CSV file to process
 * @returns Promise with the processed scan data
 */
export const processScanFile = async (file: File): Promise<{
  scan: Omit<Scan, 'id' | 'createdAt' | 'updatedAt'>;
  scanValues: Omit<ScanValue, 'id' | 'scanId' | 'createdAt'>[];
  clientIdentifier?: string;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const csvContent = event.target?.result as string;
        if (!csvContent) {
          throw new Error('Failed to read CSV file');
        }
        
        // Parse CSV content
        const lines = csvContent.split('\n');
        // Parse headers for potential future use
        lines[0].split(',').map(header => header.trim());
        
        // Extract file identifier (assuming it's in the first data row, first column)
        // Use the original filename if available, as it preserves special characters
        const fileIdentifier = file.name || lines[1].split(',')[0].trim();
        
        // Extract client identifier and scan date from filename
        // Format examples: 
        // - "RIANA RAATH 2024-11-26T8_52^004_brv.txt" (name-based)
        // - "7802035087081 2024-11-26T8_52^004_brv.txt" (ID-based)
        let clientIdentifier = '';
        let extractedScanDate = '';
        
        if (fileIdentifier) {
          // Try to extract date in format YYYY-MM-DD from the filename
          const dateMatch = fileIdentifier.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch && dateMatch[1]) {
            extractedScanDate = dateMatch[1];
          }
          
          // Extract client identifier (everything before the date)
          if (extractedScanDate) {
            const parts = fileIdentifier.split(extractedScanDate)[0].trim();
            clientIdentifier = parts.replace(/\s+$/, ''); // Remove trailing spaces
          } else {
            // If no date found, take the first part before any T or _ or ^
            const parts = fileIdentifier.split(/[T_^]/);
            clientIdentifier = parts[0].trim();
          }
        }
        
        // Extract scan date and time (assuming specific format in CSV)
        const dateTimeRow = lines.find(line => line.includes('Date,Time'));
        let scanDate = extractedScanDate || new Date().toISOString().split('T')[0];
        let scanTime = new Date().toISOString().split('T')[1].split('.')[0];
        
        if (dateTimeRow) {
          const dateTimeParts = dateTimeRow.split(',');
          if (dateTimeParts.length >= 3) {
            // Only use CSV date if we couldn't extract from filename
            if (!extractedScanDate) {
              scanDate = dateTimeParts[1].trim();
            }
            scanTime = dateTimeParts[2].trim();
          }
        }
        
        // Process data rows to extract values
        const scanValues: Omit<ScanValue, 'id' | 'scanId' | 'createdAt'>[] = [];
        
        // Start from row 2 (skip headers and any metadata rows)
        for (let i = 2; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',');
          if (values.length < 2) continue;
          
          const pathId = parseInt(values[0], 10);
          if (isNaN(pathId)) continue;
          
          // Normalize value to binary (0 or 1)
          const rawValue = values[1].trim().toLowerCase();
          const value = rawValue === 'yes' || rawValue === 'true' || rawValue === '1' ? 1 : 0;
          
          scanValues.push({
            pathId,
            description: values[2]?.trim() || '', // Add description from the third column if available
            value: value as 0 | 1,
            updatedAt: new Date().toISOString() // Add required updatedAt field
          });
        }
        
        // Check if we can extract a user ID from the client identifier
        let userId = null;
        
        if (clientIdentifier) {
          // First check if it's an ID number (all digits, typically 13 digits for SA ID)
          if (/^\d{10,13}$/.test(clientIdentifier)) {
            // It's likely an ID number, use it directly
            userId = clientIdentifier;
          } else {
            // It's likely a name, try to extract user ID from format like "user-123" or similar
            const userIdMatch = clientIdentifier.match(/user[\s-_]?(\d+)/i);
            if (userIdMatch && userIdMatch[1]) {
              userId = userIdMatch[1];
            }
          }
          
          // If we still don't have a userId, try to find a matching client
          if (!userId) {
            try {
              // Try to find a client by name or ID
              const matchedClient = await clientService.findByNameOrId(clientIdentifier);
              if (matchedClient && matchedClient.id) {
                userId = matchedClient.id;
                console.log(`Auto-matched scan to client: ${matchedClient.firstName || ''} ${matchedClient.lastName || ''} (${matchedClient.id})`);
              }
            } catch (error) {
              console.error('Error auto-matching client:', error);
            }
          }
        }
        
        // Create scan object
        const scan: Omit<Scan, 'id' | 'createdAt' | 'updatedAt'> = {
          fileIdentifier,
          personName: null,
          originalFilename: file.name,
          uploadSource: 'manual',
          scanDate,
          scanTime,
          userId: userId || null,
          status: userId ? 'matched' : 'unmatched',
          rawDataJson: JSON.stringify(lines.map(line => line.split(','))),
        };
        
        resolve({ scan, scanValues, clientIdentifier: clientIdentifier || undefined });
      } catch (error) {
        console.error('Error processing CSV file:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Extract user ID from file identifier
 * @param fileIdentifier The file identifier string
 * @returns The extracted user ID or null if not found
 */
export const extractUserIdFromFileIdentifier = (fileIdentifier: string): string | null => {
  // This is a placeholder implementation - adjust based on your actual identifier format
  const userIdMatch = fileIdentifier.match(/user-(\w+)/i);
  return userIdMatch && userIdMatch[1] ? userIdMatch[1] : null;
};

/**
 * Validate if a file is a valid CSV file
 * @param file The file to validate
 * @returns True if the file is a valid CSV, false otherwise
 */
export const isValidCsvFile = (file: File): boolean => {
  return file.type === 'text/csv' || file.name.endsWith('.csv');
};
