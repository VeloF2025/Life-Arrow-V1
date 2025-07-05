import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { scanService } from '../api/scanService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Scan } from '../types';
import { UserPlusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { ClientSelectionModal } from './ClientSelectionModal';

interface ScanDetailProps {
  scan: Scan;
  onClose?: () => void;
  onScanUpdate?: (updatedScan: Scan) => void;
}

export const ScanDetail: React.FC<ScanDetailProps> = ({ scan, onClose, onScanUpdate }) => {
  // Extract client identifier from filename if available
  const [clientIdentifier, setClientIdentifier] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract client identifier from the filename
    if (scan.fileIdentifier) {
      const extractClientIdentifier = () => {
        const fileId = scan.fileIdentifier;
        // Try to extract date in format YYYY-MM-DD from the filename
        const dateMatch = fileId.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1]) {
          const extractedDate = dateMatch[1];
          const parts = fileId.split(extractedDate)[0].trim();
          return parts.replace(/\s+$/, ''); // Remove trailing spaces
        } else {
          // If no date found, take the first part before any T or _ or ^
          const parts = fileId.split(/[T_^]/);
          return parts[0].trim();
        }
      };
      
      setClientIdentifier(extractClientIdentifier());
    }
  }, [scan.fileIdentifier]);
  // Fetch scan values with formulas
  const { data: scanData } = useQuery({
    queryKey: ['scanValues', scan.id],
    queryFn: () => scanService.getScanValuesWithFormulas(scan.id || ''),
    enabled: !!scan.id
  });

  const formatDate = (dateValue: any) => {
    try {
      // Handle Firestore timestamp objects
      if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
        return format(new Date(dateValue.seconds * 1000), 'yyyy-MM-dd');
      }
      // Handle string dates
      if (typeof dateValue === 'string') {
        return format(new Date(dateValue), 'yyyy-MM-dd');
      }
      // Handle Date objects
      if (dateValue instanceof Date) {
        return format(dateValue, 'yyyy-MM-dd');
      }
      return 'Invalid Date';
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format time values if needed in the future

  const formatCreatedAt = (dateValue: any) => {
    try {
      // Handle Firestore timestamp objects
      if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
        return format(new Date(dateValue.seconds * 1000), 'yyyy-MM-dd HH:mm:ss');
      }
      // Handle string dates
      if (typeof dateValue === 'string') {
        return format(new Date(dateValue), 'yyyy-MM-dd HH:mm:ss');
      }
      // Handle Date objects
      if (dateValue instanceof Date) {
        return format(dateValue, 'yyyy-MM-dd HH:mm:ss');
      }
      return 'Invalid Date';
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  // Format percentage values if needed in the future

  const getStatusBadgeClass = (status: Scan['status']) => {
    switch (status) {
      case 'matched':
        return 'bg-green-100 text-green-800';
      case 'unmatched':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const [isClientSelectionModalOpen, setIsClientSelectionModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const queryClient = useQueryClient();

  const handleAssignToClient = async (clientId: string) => {
    if (!scan?.id) return;
    
    setIsAssigning(true);
    try {
      await scanService.assignScanToClient(scan.id, clientId);
      // Update the scan in the UI
      const updatedScan = { ...scan, userId: clientId, status: 'matched' as const };
      if (onScanUpdate) {
        onScanUpdate(updatedScan);
      }
      // Invalidate queries to refresh the scans list
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      setIsClientSelectionModalOpen(false);
    } catch (error) {
      console.error('Error assigning scan to client:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Scan Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {scan.originalFilename}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">File Identifier</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {scan.fileIdentifier || 'Not available'}
            </dd>
          </div>
          
          {clientIdentifier && (
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                <div className="flex items-center">
                  <span>Extracted Client Identifier</span>
                  <InformationCircleIcon className="ml-1 h-4 w-4 text-gray-400" title="Automatically extracted from filename" />
                </div>
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <span className="font-medium">{clientIdentifier}</span>
                  {scan.status === 'matched' && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Auto-matched
                    </span>
                  )}
                </div>
              </dd>
            </div>
          )}
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">User ID</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center justify-between">
              <span>{scan.userId || 'Not matched'}</span>
              {(!scan.userId || scan.status === 'unmatched') && (
                <button
                  type="button"
                  onClick={() => setIsClientSelectionModalOpen(true)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isAssigning}
                >
                  {isAssigning ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />
                      Assign to Client
                    </>
                  )}
                </button>
              )}
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Scan Date</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatDate(scan.scanDate)} {typeof scan.scanTime === 'string' ? scan.scanTime : formatDate(scan.scanTime)}
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Upload Source</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {scan.uploadSource}
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 sm:mt-0 sm:col-span-2">
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                    scan.status
                  )}`}
                >
                  {scan.status}
                </span>
                
                {scan.status === 'unmatched' && clientIdentifier && (
                  <span className="ml-3 text-xs text-gray-500">
                    No automatic match found for "{clientIdentifier}"
                  </span>
                )}
              </div>
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatCreatedAt(scan.createdAt)}
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Updated At</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatCreatedAt(scan.updatedAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Scan Data Table */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Scan Data
        </h3>
        <div className="mt-4 max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Path ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                // Get scan data from either the separate collection or the raw JSON
                const getScanData = () => {
                  // If we have data from the separate collection, use that
                  if (scanData?.rawValues && scanData.rawValues.length > 0) {
                    return {
                      pathData: scanData.rawValues,
                      derivedValues: scanData.derivedValues || {},
                      fromSeparateCollection: true
                    };
                  }
                  
                  // Otherwise fall back to the raw data in the scan document
                  if (!scan.rawDataJson) return { pathIds: [], descriptions: [], values: [], pathData: [], derivedValues: {} };
                  
                  try {
                    // Handle case where rawDataJson is a string
                    if (typeof scan.rawDataJson === 'string') {
                      return JSON.parse(scan.rawDataJson);
                    }
                    
                    // Handle case where rawDataJson is already an object
                    return scan.rawDataJson;
                  } catch (err) {
                    console.error('Error parsing scan data:', err);
                    return { pathIds: [], descriptions: [], values: [], pathData: [], derivedValues: {} };
                  }
                };
                
                const parsedData = getScanData();
                const hasPathData = parsedData.pathData && parsedData.pathData.length > 0;
                const hasArrayData = parsedData.pathIds && parsedData.values && parsedData.pathIds.length > 0;
                
                let pathData: any[] = [];
                try {
                  if (hasPathData) {
                    pathData = parsedData.pathData;
                  } else if (hasArrayData) {
                    // Reconstruct pathData from separate arrays
                    const { pathIds, descriptions, values } = parsedData;
                    pathData = pathIds.map((pathId: number, index: number) => ({
                      pathId,
                      description: descriptions[index] || '',
                      value: values[index]
                    }));
                  } else if (Array.isArray(parsedData) && parsedData.length > 0) {
                    // Assume first row is headers, second row is descriptions, third+ rows are data
                    if (parsedData.length >= 3) {
                      const pathIds = parsedData[0].slice(1).map((id: string) => Number(id));
                      const descriptions = parsedData[1].slice(1);
                      const values = parsedData[2].slice(1).map((val: string) => Number(val) > 0 ? 1 : 0);
                      
                      pathData = pathIds.map((pathId: number, index: number) => ({
                        pathId,
                        description: descriptions[index] || '',
                        value: values[index]
                      }));
                    }
                  } 
                  // Handle case where rawDataJson is already an object
                  else if (typeof scan.rawDataJson === 'object' && scan.rawDataJson !== null) {
                    if (Array.isArray(scan.rawDataJson.pathData)) {
                      pathData = scan.rawDataJson.pathData;
                    } else if (scan.rawDataJson.pathIds && scan.rawDataJson.descriptions && scan.rawDataJson.values) {
                      // Reconstruct pathData from separate arrays
                      const { pathIds, descriptions, values } = scan.rawDataJson;
                      pathData = pathIds.map((pathId: number, index: number) => ({
                        pathId,
                        description: descriptions[index] || '',
                        value: values[index]
                      }));
                    }
                  }
                } catch (err) {
                  console.error('Error processing scan data:', err);
                }
                
                if (pathData && pathData.length > 0) {
                  return pathData.map((item: any, index: number) => (
                    <tr key={index} className={item.value === 1 ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.pathId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.value}
                      </td>
                    </tr>
                  ));
                } else {
                  return (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-sm text-center text-gray-500">
                        No scan data available or data is in an unexpected format.
                      </td>
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
      </div>
      <ClientSelectionModal
        isOpen={isClientSelectionModalOpen}
        onClose={() => setIsClientSelectionModalOpen(false)}
        onClientSelected={handleAssignToClient}
      />
    </div>
  );
};
