import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { format } from 'date-fns';
import { scanService } from '../api/scanService';
import { useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { UserPlusIcon, TrashIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ClientSelectionModal } from './ClientSelectionModal';
import toast from 'react-hot-toast';
import type { Scan } from '@/types';
import { Dialog, Transition } from '@headlessui/react';

interface ScanDetailProps {
  scan: Scan;
  onClose?: () => void;
  onScanUpdate?: (updatedScan: Scan) => void;
}

export const ScanDetail: React.FC<ScanDetailProps> = ({ scan, onClose, onScanUpdate }) => {
  const [clientIdentifier, setClientIdentifier] = useState<string | null>(null);
  const [extractedDate, setExtractedDate] = useState<string | null>(null);
  const [isClientSelectionModalOpen, setIsClientSelectionModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnmatching, setIsUnmatching] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const extractInformationFromFile = (filename: string): { identifier: string | null; date: string | null } => {
      if (!filename) return { identifier: null, date: null };

      let identifier: string | null = null;
      let date: string | null = null;

      const commonFilePatterns = /^(data|scan|export|report|result|test|backup|delphidata|output)\.(csv|txt|json|xlsx)$/i;
      if (commonFilePatterns.test(filename)) {
        return { identifier: null, date: null };
      }

      const clientDatePattern = /([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)\s+(\d{4}-\d{1,2}-\d{1,2})/;
      const clientDateMatch = filename.match(clientDatePattern);
      if (clientDateMatch && clientDateMatch[1]) {
        identifier = clientDateMatch[1].trim();
        const extractedDateStr = clientDateMatch[2];
        const dateParts = extractedDateStr.split('-');
        date = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
        return { identifier, date };
      }

      const dateMatch = filename.match(/(\d{4}-\d{1,2}-\d{1,2})/);
      if (dateMatch && dateMatch[1]) {
        const dateParts = dateMatch[1].split('-');
        date = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
        const beforeDate = filename.split(dateMatch[1])[0].trim();
        if (beforeDate && beforeDate.length > 0) {
          identifier = beforeDate.replace(/\s+$/, '');
        }
      }

      if (!identifier) {
        const hyphenParts = filename.split('-');
        if (hyphenParts.length > 1) {
          const firstPart = hyphenParts[0].trim();
          if (firstPart && firstPart.length > 0 && !/^\d+$/.test(firstPart)) {
            identifier = firstPart;
          }
        }
      }
      
      if (!identifier) {
        const generalDateMatch = filename.match(/\d{2,4}[\s-_]\d{1,2}[\s-_]\d{1,2}/);
        if (generalDateMatch) {
            const beforeDate = filename.split(generalDateMatch[0])[0].trim();
            if (beforeDate && beforeDate.length > 0) {
                identifier = beforeDate.replace(/\s+$/, '');
            }
        }
      }

      if (!identifier) {
        if (!/^\d+$/.test(filename) && filename.length > 0) {
          const withoutExtension = filename.replace(/\.[^.]+$/, '');
          identifier = withoutExtension;
        }
      }

      return { identifier, date };
    };

    const extractClientInfoFromRawDataJson = (): { identifier: string | null; date: string | null } => {
      if (!scan.rawDataJson) return { identifier: null, date: null };

      try {
        const rawData = typeof scan.rawDataJson === 'string' ? JSON.parse(scan.rawDataJson) : scan.rawDataJson;
        
        // Handle structured object format
        if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
          let identifier: string | null = null;
          let date: string | null = null;
          
          if (rawData.Client?.Name) identifier = rawData.Client.Name;
          else if (rawData.client?.name) identifier = rawData.client.name;
          else if (rawData.ClientName) identifier = rawData.ClientName;
          else if (rawData.clientName) identifier = rawData.clientName;

          if (rawData.Date) {
            const parsedDate = new Date(rawData.Date);
            if (!isNaN(parsedDate.getTime())) {
              date = format(parsedDate, 'yyyy-MM-dd');
            }
          }
          // If we found something, return it.
          if (identifier || date) {
            return { identifier, date };
          }
        }
        
        // Handle array of arrays format (from screenshot)
        if (Array.isArray(rawData) && rawData.length >= 3 && Array.isArray(rawData[2]) && typeof rawData[2][0] === 'string') {
          const potentialClientInfoString = rawData[2][0];
          // Reuse the filename parsing logic on this embedded string
          return extractInformationFromFile(potentialClientInfoString);
        }

        return { identifier: null, date: null };
      } catch (error) {
        console.error('Error parsing rawDataJson for client info:', error);
        return { identifier: null, date: null };
      }
    };

    let finalIdentifier: string | null = null;
    let finalDate: string | null = null;

    // 1. Prioritize rawDataJson for both identifier and date
    const rawDataInfo = extractClientInfoFromRawDataJson();
    finalIdentifier = rawDataInfo.identifier;
    finalDate = rawDataInfo.date;

    // 2. Fallback to filename if info is missing
    if (!finalIdentifier || !finalDate) {
      const { identifier: filenameIdentifier, date: filenameDate } = extractInformationFromFile(scan.originalFilename || scan.fileIdentifier || '');
      if (!finalIdentifier) {
        finalIdentifier = filenameIdentifier;
      }
      if (!finalDate) {
        finalDate = filenameDate;
      }
    }

    // 3. Set the state with the determined values
    setClientIdentifier(finalIdentifier || scan.clientName || 'Unknown');
    setExtractedDate(finalDate);

    // 4. Trigger update if necessary
    if (onScanUpdate && (clientIdentifier !== finalIdentifier || extractedDate !== finalDate)) {
      onScanUpdate({ ...scan, clientName: finalIdentifier || scan.clientName });
    }

  }, [scan, scan.rawDataJson, onScanUpdate, clientIdentifier, extractedDate]);

  const formatDate = (dateValue: any) => {
    if (extractedDate) return extractedDate;

    if (!dateValue) return 'N/A';
    try {
      if (dateValue instanceof Timestamp) {
        return format(dateValue.toDate(), 'yyyy-MM-dd');
      } else if (dateValue instanceof Date) {
        return format(dateValue, 'yyyy-MM-dd');
      } else if (typeof dateValue === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return format(date, 'yyyy-MM-dd');
        }
      }
      return String(dateValue);
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const formatCreatedAt = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    try {
      if (dateValue instanceof Timestamp) {
        return format(dateValue.toDate(), 'yyyy-MM-dd HH:mm');
      } else if (dateValue instanceof Date) {
        return format(dateValue, 'yyyy-MM-dd HH:mm');
      } else if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        return format(date, 'yyyy-MM-dd HH:mm');
      }
      return String(dateValue);
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const getStatusBadgeClass = (status: Scan['status']) => {
    switch (status) {
      case 'matched': return 'bg-green-100 text-green-800';
      case 'unmatched': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleAssignToClient = async (clientId: string) => {
    if (!scan?.id) return;
    setIsAssigning(true);
    try {
      await scanService.assignScanToClient(scan.id, clientId);
      toast.success('Scan successfully assigned!');
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: [`scan-${scan.id}`] });
      if (onScanUpdate) {
        onScanUpdate({ ...scan, clientId, status: 'matched' });
      }
      setIsClientSelectionModalOpen(false);
    } catch (error) {
      console.error('Error assigning scan to client:', error);
      toast.error('Failed to assign scan. See console for details.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnmatchScan = async () => {
    if (!scan?.id) return;
    setShowUnmatchConfirm(false);
    setIsUnmatching(true);
    try {
      // Ensure we're accessing the method correctly
      if (typeof scanService.unmatchScan === 'function') {
        await scanService.unmatchScan(scan.id);
        toast.success('Scan successfully unmatched.');
        queryClient.invalidateQueries({ queryKey: ['scans'] });
        queryClient.invalidateQueries({ queryKey: [`scan-${scan.id}`] });
        if (onScanUpdate) {
          const updatedScan = { ...scan, status: 'unmatched' } as any;
          delete updatedScan.clientId;
          delete updatedScan.clientName;
          onScanUpdate(updatedScan);
        }
      } else {
        throw new Error('unmatchScan method not found in scanService');
      }
    } catch (error) {
      console.error('Error unmatching scan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unmatch scan.');
    } finally {
      setIsUnmatching(false);
    }
  };
  
  const openUnmatchConfirm = () => {
    setShowUnmatchConfirm(true);
  };

  const handleDeleteScan = async () => {
    if (!scan?.id) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      // Ensure we're accessing the method correctly
      if (typeof scanService.deleteScan === 'function') {
        await scanService.deleteScan(scan.id);
        toast.success('Scan successfully deleted.');
        queryClient.invalidateQueries({ queryKey: ['scans'] });
        if (onClose) onClose();
      } else {
        throw new Error('deleteScan method not found in scanService');
      }
    } catch (error) {
      console.error('Error deleting scan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete scan.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const openDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };
  
  const processedScanData = useMemo(() => {
    if (scan.rawDataJson) {
      try {
        const data = typeof scan.rawDataJson === 'string' 
          ? JSON.parse(scan.rawDataJson) 
          : scan.rawDataJson;

        if (!data) return [];

        // Case A: data.pathData exists (structured object)
        if (data.pathData && Array.isArray(data.pathData) && data.pathData.length > 0) {
          return data.pathData;
        }

        // Case B: Reconstruct from separate arrays (pathIds, descriptions, values)
        if (data.pathIds && data.values && Array.isArray(data.pathIds) && Array.isArray(data.values)) {
          const descriptions = data.descriptions || [];
          return data.pathIds.map((pathId: any, index: number) => ({
            pathId,
            description: descriptions[index] || '',
            value: data.values[index],
          }));
        }
        
        // Case C: Data is an array of arrays (CSV-like structure)
        // Assumes format: [ [headers...], [descriptions...], [values...] ]
        if (Array.isArray(data) && data.length >= 3) {
            const pathIds = data[0].slice(1).map((id: string) => Number(id));
            const descriptions = data[1].slice(1);
            const values = data[2].slice(1).map((val: string) => (val ? (Number(val) > 0 ? 1 : 0) : 0));
            
            return pathIds.map((pathId: number, index: number) => ({
              pathId,
              description: descriptions[index] || '',
              value: values[index]
            }));
        }

      } catch (e) {
        console.error("Error parsing or processing rawDataJson:", e);
      }
    }

    // Return empty array if no data is found or processed
    return [];
  }, [scan.rawDataJson]);

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Scan Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details for scan ID: {scan.id}</p>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
              {scan.status === 'matched' && (
                <button
                  onClick={openUnmatchConfirm}
                  disabled={isUnmatching || isDeleting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                >
                  <XCircleIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                  {isUnmatching ? 'Unmatching...' : 'Unmatch'}
                </button>
              )}
              <button
                onClick={openDeleteConfirm}
                disabled={isDeleting || isUnmatching}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <TrashIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          {/* Client Name / Identifier */}
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Client</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
              <span>{clientIdentifier || 'Unassigned'}</span>
              {!scan.clientId && (
                <button 
                  onClick={() => setIsClientSelectionModalOpen(true)} 
                  className="ml-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Assign to client"
                >
                  <UserPlusIcon className="h-5 w-5" />
                </button>
              )}
            </dd>
          </div>

          {/* Scan Date */}
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Scan Date</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatDate(scan.scanDate)}
              {extractedDate && (
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Extracted
                </span>
              )}
            </dd>
          </div>

          {/* Scan Time */}
          {scan.scanTime && (
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Scan Time</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{scan.scanTime}</dd>
            </div>
          )}
          
          {/* Status */}
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(scan.status)}`}>
                {scan.status || 'unknown'}
              </span>
            </dd>
          </div>
          
          {/* Created At */}
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatCreatedAt(scan.createdAt)}</dd>
          </div>
          
          {/* File Identifier */}
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">File Identifier</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{scan.fileIdentifier || 'N/A'}</dd>
          </div>
        </dl>
      </div>
      
      {/* Scan Data Table */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Scan Data</h3>
        <div className="mt-4 flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedScanData.length > 0 ? (
                      processedScanData.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.pathId || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.value === 1 ? 1 : 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No scan data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClientSelectionModal
        isOpen={isClientSelectionModalOpen}
        onClose={() => setIsClientSelectionModalOpen(false)}
        onClientSelected={handleAssignToClient}
        isLoading={isAssigning}
      />
      </div>
      
      {/* Delete Confirmation Modal */}
      <Transition.Root show={showDeleteConfirm} as={Fragment}>
        <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={setShowDeleteConfirm}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                    Delete Scan
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to permanently delete this scan and all associated data? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteScan}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
      </Transition.Root>
      
      {/* Unmatch Confirmation Modal */}
      <Transition.Root show={showUnmatchConfirm} as={Fragment}>
        <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={setShowUnmatchConfirm}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                    Unmatch Scan
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to unmatch this scan? This will delete any existing analysis results.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleUnmatchScan}
                >
                  Unmatch
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowUnmatchConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
      </Transition.Root>
    </>
  );
};
