import React, { useState } from 'react';
import type { Scan } from '../types';
import { format } from 'date-fns';
import { EyeIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface ScanListProps {
  scans: Scan[];
  onViewScan: (scan: Scan) => void;
  onAssignScan?: (scan: Scan) => void;
  onDeleteScan?: (scan: Scan) => void;
}

export const ScanList: React.FC<ScanListProps> = ({
  scans,
  onViewScan,
  onAssignScan,
  onDeleteScan
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const filteredScans = scans.filter(scan => {
    if (filterStatus === 'all') return true;
    return scan.status === filterStatus;
  });

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

  const formatTime = (timeValue: any) => {
    try {
      // Handle Firestore timestamp objects
      if (timeValue && typeof timeValue === 'object' && timeValue.seconds) {
        return format(new Date(timeValue.seconds * 1000), 'HH:mm');
      }
      // Handle string times
      if (typeof timeValue === 'string') {
        return timeValue;
      }
      // Handle Date objects
      if (timeValue instanceof Date) {
        return format(timeValue, 'HH:mm');
      }
      return 'Invalid Time';
    } catch (error) {
      return 'Invalid Time';
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-4 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Scans</h3>
        <div>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Details</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredScans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No scans found
                </td>
              </tr>
            ) : (
              filteredScans.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-indigo-600 truncate">
                        {scan.originalFilename}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        ID: {scan.fileIdentifier}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(scan.scanDate)} {formatTime(scan.scanTime)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scan.userId || 'Not matched'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scan.uploadSource || 'manual'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        scan.status
                      )}`}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => onViewScan(scan)}
                        className="text-primary-500 hover:text-primary-700"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      {scan.status === 'unmatched' && onAssignScan && (
                        <button
                          type="button"
                          onClick={() => onAssignScan(scan)}
                          className="text-primary-500 hover:text-primary-700"
                          title="Assign to client"
                        >
                          <UserPlusIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                      
                      {onDeleteScan && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this scan? This action cannot be undone.')) {
                              onDeleteScan(scan);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete scan"
                        >
                          <TrashIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
