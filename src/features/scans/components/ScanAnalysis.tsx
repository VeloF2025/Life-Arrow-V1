import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scanService } from '../api/scanService';
import type { Scan } from '@/types';
import { ScanDetail } from './ScanDetail';
import { format } from 'date-fns';

const ScanAnalysis: React.FC = () => {
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  const { data: scans, isLoading, error } = useQuery<Scan[]>({ 
    queryKey: ['scans'], 
    queryFn: scanService.getAllScans 
  });

  const matchedScans = useMemo(() => {
    if (!scans) return [];
    return scans.filter(scan => scan.status === 'matched' && scan.clientId);
  }, [scans]);

  if (isLoading) {
    return <div className="text-center py-10">Loading scans...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error fetching scans: {error.message}</div>;
  }

  return (
    <div className="flex space-x-6">
      {/* Left Panel: List of Matched Scans */}
      <div className="w-1/3 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Matched Scans</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Select a scan to process and analyze.
          </p>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200 h-[60vh] overflow-y-auto">
            {matchedScans.length > 0 ? (
              matchedScans.map(scan => (
                <li 
                  key={scan.id} 
                  onClick={() => setSelectedScan(scan)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedScan?.id === scan.id ? 'bg-blue-50' : ''
                  }`}>
                  <div className="font-medium text-gray-800">{scan.clientName || scan.fileIdentifier}</div>
                  <div className="text-sm text-gray-500">
                    {scan.scanDate ? format(new Date(scan.scanDate.toString()), 'yyyy-MM-dd') : 'No date'}
                  </div>
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-gray-500">No matched scans found.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Right Panel: Scan Details or Placeholder */}
      <div className="w-2/3">
        {selectedScan ? (
          <ScanDetail scan={selectedScan} />
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Select a Scan</h3>
              <p className="mt-1 text-sm text-gray-500">Choose a scan from the list to view its details and begin analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanAnalysis;
