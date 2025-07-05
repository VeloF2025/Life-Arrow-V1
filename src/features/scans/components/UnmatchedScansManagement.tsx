import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scanService } from '../api/scanService';
import type { Scan } from '../types';
import { ClientSelectionModal } from './ClientSelectionModal';
import { format } from 'date-fns';
import { UserPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const UnmatchedScansManagement: React.FC = () => {
  const [isClientSelectionModalOpen, setIsClientSelectionModalOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch unmatched scans
  const { data: unmatchedScans, isLoading, error } = useQuery({
    queryKey: ['unmatched-scans'],
    queryFn: () => scanService.getUnmatchedScans(),
  });

  // Clear success message after 3 seconds
  useEffect(() => {
    if (assignmentSuccess) {
      const timer = setTimeout(() => {
        setAssignmentSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [assignmentSuccess]);

  const handleAssignClick = (scan: Scan) => {
    setSelectedScan(scan);
    setIsClientSelectionModalOpen(true);
  };

  const handleAssignToClient = async (clientId: string) => {
    if (!selectedScan?.id) return;
    
    setIsAssigning(true);
    try {
      await scanService.assignScanToClient(selectedScan.id, clientId);
      
      // Invalidate queries to refresh the scans list
      queryClient.invalidateQueries({ queryKey: ['unmatched-scans'] });
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      
      setIsClientSelectionModalOpen(false);
      setAssignmentSuccess(`Scan successfully assigned to client ID: ${clientId}`);
    } catch (error) {
      console.error('Error assigning scan to client:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  // Extract client identifier from filename
  const extractClientIdentifier = (fileIdentifier: string): string => {
    // Try to extract date in format YYYY-MM-DD from the filename
    const dateMatch = fileIdentifier.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch && dateMatch[1]) {
      const extractedDate = dateMatch[1];
      const parts = fileIdentifier.split(extractedDate)[0].trim();
      return parts.replace(/\s+$/, ''); // Remove trailing spaces
    } else {
      // If no date found, take the first part before any T or _ or ^
      const parts = fileIdentifier.split(/[T_^]/);
      return parts[0].trim();
    }
  };

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

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading unmatched scans...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading unmatched scans</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Unmatched Scans Management
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Assign unmatched scans to clients
        </p>
        
        {assignmentSuccess && (
          <div className="mt-2 flex items-center text-sm text-green-600">
            <CheckCircleIcon className="h-5 w-5 mr-1" />
            {assignmentSuccess}
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200">
        {unmatchedScans && unmatchedScans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Extracted Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scan Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {unmatchedScans.map((scan) => {
                  const clientIdentifier = scan.fileIdentifier ? extractClientIdentifier(scan.fileIdentifier) : null;
                  
                  return (
                    <tr key={scan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {scan.originalFilename || scan.fileIdentifier || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {clientIdentifier || 'Not extracted'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(scan.scanDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(scan.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          onClick={() => handleAssignClick(scan)}
                        >
                          <UserPlusIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                          Assign to Client
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No unmatched scans found
          </div>
        )}
      </div>
      
      <ClientSelectionModal
        isOpen={isClientSelectionModalOpen}
        onClose={() => setIsClientSelectionModalOpen(false)}
        onClientSelected={handleAssignToClient}
        isLoading={isAssigning}
      />
    </div>
  );
};
