import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { ScanFileUpload } from './ScanFileUpload';
import { ScanList } from './ScanList';
import { ScanDetail } from './ScanDetail';
import { scanService } from '../api/scanService';
import type { Scan } from '@/types';
import { clientService } from '../../clients/api/clientService';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const ScanManagement: React.FC = () => {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch all scans
  const { data: scans = [], isLoading, error } = useQuery({
    queryKey: ['scans'],
    queryFn: scanService.getAllScans
  });

  // Fetch clients for assignment
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const fetchedClients = await clientService.getAll();
        setClients(fetchedClients);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    if (isAssignModalOpen) {
      fetchClients();
    }
  }, [isAssignModalOpen]);

  // Assign scan to client mutation
  const assignScanMutation = useMutation({
    mutationFn: ({ scanId, userId }: { scanId: string; userId: string }) => 
      scanService.assignScanToClient(scanId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      setIsAssignModalOpen(false);
      setSelectedScan(null);
      setSelectedClientId('');
      setUploadSuccess('Scan assigned successfully');
      setTimeout(() => setUploadSuccess(null), 3000);
    },
    onError: (error) => {
      console.error('Error assigning scan:', error);
      setUploadError('Failed to assign scan');
      setTimeout(() => setUploadError(null), 3000);
    }
  });

  // Delete scan mutation
  const deleteScanMutation = useMutation({
    mutationFn: (scanId: string) => {
      console.log('[DELETE_MUTATION] Starting delete mutation for scanId:', scanId);
      return scanService.deleteScan(scanId);
    },
    onSuccess: (_, scanId) => {
      console.log('[DELETE_MUTATION] Delete successful for scanId:', scanId);
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      // Use toast for better visibility
      toast.success('Scan deleted successfully');
      setUploadSuccess('Scan deleted successfully');
      setTimeout(() => setUploadSuccess(null), 3000);
    },
    onError: (error, scanId) => {
      console.error(`[DELETE_MUTATION] Error deleting scan ${scanId}:`, error);
      // Use toast for better visibility
      toast.error(`Failed to delete scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadError('Failed to delete scan');
      setTimeout(() => setUploadError(null), 3000);
    }
  });

  const unmatchScanMutation = useMutation({
    mutationFn: (scanId: string) => {
      console.log('[UNMATCH_MUTATION] Starting unmatch mutation for scanId:', scanId);
      return scanService.unmatchScan(scanId);
    },
    onSuccess: (_, scanId) => {
      console.log('[UNMATCH_MUTATION] Unmatch successful for scanId:', scanId);
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      // Use toast for better visibility
      toast.success('Scan unmatched successfully');
      setUploadSuccess('Scan unmatched successfully');
      setTimeout(() => setUploadSuccess(null), 3000);
    },
    onError: (error, scanId) => {
      console.error(`[UNMATCH_MUTATION] Error unmatching scan ${scanId}:`, error);
      // Use toast for better visibility
      toast.error(`Failed to unmatch scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadError('Failed to unmatch scan');
      setTimeout(() => setUploadError(null), 3000);
    },
  });

  const handleViewScan = (scan: Scan) => {
    setSelectedScan(scan);
    setIsDetailModalOpen(true);
  };

  const handleAssignScan = (scan: Scan) => {
    setSelectedScan(scan);
    setIsAssignModalOpen(true);
  };

  // These handlers are used by the ScanDetail component
  // Keep them here for consistency and potential future use in the list view
  const handleDeleteScan = (scan: Scan) => {
    console.log('[SCAN_MANAGEMENT] handleDeleteScan called with scan:', scan);
    if (scan.id) {
      console.log('[SCAN_MANAGEMENT] Calling deleteScanMutation with scanId:', scan.id);
      deleteScanMutation.mutate(scan.id);
    } else {
      console.error('[SCAN_MANAGEMENT] Cannot delete scan: No scan ID provided');
    }
  };

  // This handler is used by the ScanDetail component
  const handleUnmatchScan = (scan: Scan) => {
    console.log('[SCAN_MANAGEMENT] handleUnmatchScan called with scan:', scan);
    if (scan.id) {
      console.log('[SCAN_MANAGEMENT] Calling unmatchScanMutation with scanId:', scan.id);
      unmatchScanMutation.mutate(scan.id);
    } else {
      console.error('[SCAN_MANAGEMENT] Cannot unmatch scan: No scan ID provided');
    }
  };

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['scans'] });
    setUploadSuccess('Scan uploaded successfully');
    setTimeout(() => setUploadSuccess(null), 3000);
  };

  const handleUploadError = (error: Error) => {
    setUploadError(error.message);
    setTimeout(() => setUploadError(null), 3000);
  };

  const handleAssignSubmit = () => {
    if (!selectedScan?.id || !selectedClientId) return;
    
    assignScanMutation.mutate({
      scanId: selectedScan.id,
      userId: selectedClientId
    });
  };

  const filteredScans = scans.filter(scan => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();

    const fileIdentifierMatch = scan.fileIdentifier?.toLowerCase().includes(searchLower) ?? false;
    const originalFilenameMatch = scan.originalFilename?.toLowerCase().includes(searchLower) ?? false;
    const clientIdMatch = scan.clientId?.toLowerCase().includes(searchLower) ?? false;
    const clientNameMatch = scan.clientName?.toLowerCase().includes(searchLower) ?? false;

    return fileIdentifierMatch || originalFilenameMatch || clientIdMatch || clientNameMatch;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scan Management</h1>
        <p className="text-gray-600">Upload and manage scan files</p>
      </div>

      {/* Alerts */}
      {uploadError && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="rounded-md bg-green-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {uploadSuccess}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Scan File</h2>
          <p className="text-gray-600 mb-4">Upload a CSV file with scan data.</p>
          <ScanFileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            placeholder="Search scans..."
            className="pl-10 pr-4 py-2 block w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['scans'] })}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Scans List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading scans...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">
            Error loading scans. Please try again.
          </p>
        </div>
      ) : (
        <ScanList 
          scans={filteredScans} 
          onViewScan={handleViewScan} 
          onAssignScan={handleAssignScan}
        />
      )}

      {/* Scan Detail Modal */}
      <Transition show={isDetailModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={() => setIsDetailModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
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
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                {selectedScan && (
                  <ScanDetail
                    scan={selectedScan}
                    onClose={() => setIsDetailModalOpen(false)}
                  />
                )}
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Assign Scan Modal */}
      <Transition show={isAssignModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={() => setIsAssignModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
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
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title
                      as="h3"
                      className="text-lg leading-6 font-medium text-gray-900"
                    >
                      Assign Scan to Client
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Select a client to assign this scan to.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="client"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Client
                  </label>
                  <select
                    id="client"
                    name="client"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                    onClick={handleAssignSubmit}
                    disabled={!selectedClientId}
                  >
                    Assign
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={() => setIsAssignModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
