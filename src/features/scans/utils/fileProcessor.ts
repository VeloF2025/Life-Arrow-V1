/**
 * Utility functions for processing scan files
 */

/**
 * Parse CSV content into a 2D array
 * @param csvContent - Raw CSV content as string
 * @returns 2D array of CSV data
 */
export const parseCSV = (csvContent: string): string[][] => {
  // Split by lines and handle different line endings
  const lines = csvContent.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');
  
  return lines.map(line => {
    // Handle quoted values with commas inside them
    const result: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    result.push(currentValue);
    return result;
  });
};

/**
 * Extract user ID from file identifier
 * @param fileId - File identifier string (e.g., "7802035087081 2025-4-20T21_10^004_brv.txt")
 * @returns Extracted user ID or null if not found
 */
export const extractUserId = (fileId: string): string | null => {
  const userIdMatch = fileId.match(/^(\d+)/);
  return userIdMatch ? userIdMatch[1] : null;
};

/**
 * Extract date from file identifier
 * @param fileId - File identifier string
 * @returns Date string in YYYY-MM-DD format or null if not found
 */
export const extractDateFromFileId = (fileId: string): string | null => {
  // Format: {USER_ID} {DATE}T{TIME}^{SEQUENCE}_{SUFFIX}.txt
  // Example: 7802035087081 2025-4-20T21_10^004_brv.txt
  const dateMatch = fileId.match(/\d{4}-\d{1,2}-\d{1,2}/);
  
  if (dateMatch) {
    const dateParts = dateMatch[0].split('-');
    const year = dateParts[0];
    const month = dateParts[1].padStart(2, '0');
    const day = dateParts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

/**
 * Extract time from file identifier
 * @param fileId - File identifier string
 * @returns Time string in HH:MM format or null if not found
 */
export const extractTimeFromFileId = (fileId: string): string | null => {
  // Format: {USER_ID} {DATE}T{TIME}^{SEQUENCE}_{SUFFIX}.txt
  // Example: 7802035087081 2025-4-20T21_10^004_brv.txt
  const timeMatch = fileId.match(/T(\d{1,2})_(\d{1,2})/);
  
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  return null;
};

/**
 * Normalize scan values to ensure they are binary (0 or 1)
 * @param value - Input value
 * @returns 0 or 1
 */
export const normalizeScanValue = (value: any): 0 | 1 => {
  const numValue = Number(value);
  return numValue > 0 ? 1 : 0;
};

/**
 * Process a scan file and extract all necessary data
 * @param csvContent - Raw CSV content
 * @param filename - Original filename
 * @returns Processed scan data
 */
export const processScanFile = (csvContent: string, filename: string) => {
  try {
    // Parse CSV content
    const rows = parseCSV(csvContent);
    
    if (rows.length < 3) {
      throw new Error('Invalid CSV format: file must have at least 3 rows');
    }
    
    // Extract file identifier from A3 (row index 2, column index 0)
    const fileId = rows[2][0];
    
    // Check if fileId is a numeric ID or a name
    const userId = extractUserId(fileId);
    let personName = null;
    
    // If no numeric userId was found, assume the A3 cell contains a person's name
    if (!userId) {
      personName = fileId.trim();
    }
    
    // Extract Path IDs (Row 1, from column B onwards)
    const pathIds = rows[0].slice(1).map(id => {
      // Try to convert to number, if not possible, keep as string
      const numId = Number(id);
      return isNaN(numId) ? id : numId;
    });
    
    // Extract descriptions (Row 2, from column B onwards)
    const descriptions = rows[1].slice(1);
    
    // Extract values (Row 3, from column B onwards)
    const rawValues = rows[2].slice(1);
    
    // Normalize values: convert any value > 0 to 1, ensure only 0 or 1
    const normalizedValues = rawValues.map(value => normalizeScanValue(value));
    
    // Extract date and time
    const scanDate = extractDateFromFileId(fileId) || new Date().toISOString().split('T')[0];
    const scanTime = extractTimeFromFileId(fileId) || new Date().toISOString().split('T')[1].substring(0, 5);
    
    // Create path data mapping
    const pathData = pathIds.map((pathId, index) => ({
      pathId,
      description: descriptions[index] || '',
      value: normalizedValues[index]
    }));
    
    return {
      fileIdentifier: fileId,
      userId,
      personName,  // Add person name field for manual assignment
      originalFilename: filename,
      uploadSource: 'manual' as const,
      scanDate,
      scanTime,
      status: userId ? 'matched' as const : 'unmatched' as const,
      assignmentType: userId ? 'auto' as const : 'manual' as const,
      rawDataJson: {
        pathIds,
        descriptions,
        values: normalizedValues,
        pathData
      }
    };
  } catch (error) {
    console.error('Error processing scan file:', error);
    throw error;
  }
};
