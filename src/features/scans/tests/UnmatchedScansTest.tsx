import React, { useState } from 'react';
import { UnmatchedScansManagement } from '../components/UnmatchedScansManagement';
import { scanService } from '../api/scanService';
import { Button } from '../../../components/ui/Button';
import { toast } from 'react-hot-toast';
import type { Scan } from '../types';

// Test component to verify UnmatchedScansManagement functionality
export const UnmatchedScansTest: React.FC = () => {
  const [isCreatingTestScan, setIsCreatingTestScan] = useState(false);
  const [testScanId, setTestScanId] = useState<string | null>(null);
  const [testScan, setTestScan] = useState<Scan | null>(null);

  // Create a test unmatched scan
  const createTestScan = async () => {
    try {
      setIsCreatingTestScan(true);
      
      // Generate a random ID for the test client
      const randomId = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      
      // Get current date and time for scan metadata
      const now = new Date();
      const scanDate = now.toISOString().split('T')[0];
      const scanTime = now.toTimeString().split(' ')[0];
      const filename = `TEST_CLIENT_${randomId}_${scanDate.replace(/-/g, '')}.csv`;
      
      // Create test scan data matching the Scan interface requirements
      const testScanData = {
        fileIdentifier: randomId,
        userId: null, // Will be set when assigned to a client
        originalFilename: filename,
        uploadSource: 'manual' as const,
        scanDate,
        scanTime,
        status: 'unmatched' as const,
        rawDataJson: JSON.stringify({
          pathData: [
            { pathId: 'test-path-1', description: 'Test Path 1', value: '42' },
            { pathId: 'test-path-2', description: 'Test Path 2', value: '84' }
          ]
        })
      };
      
      // Create the scan with the random ID as client identifier
      const scanId = await scanService.createScan(testScanData, randomId);
      setTestScanId(scanId);
      
      // Store the complete scan data for reference
      setTestScan({
        ...testScanData,
        id: scanId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      toast.success(`Test scan created with ID: ${scanId}`);
    } catch (error) {
      console.error('Error creating test scan:', error);
      toast.error(`Failed to create test scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingTestScan(false);
    }
  };

  // Delete the test scan
  const deleteTestScan = async () => {
    if (!testScanId) return;
    
    try {
      await scanService.deleteScan(testScanId);
      toast.success(`Test scan deleted: ${testScanId}`);
      setTestScanId(null);
      setTestScan(null);
    } catch (error) {
      console.error('Error deleting test scan:', error);
      toast.error(`Failed to delete test scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">Unmatched Scans Test Controls</h2>
        <div className="flex space-x-4">
          <Button
            onClick={createTestScan}
            isLoading={isCreatingTestScan}
            disabled={isCreatingTestScan}
          >
            Create Test Unmatched Scan
          </Button>
          
          <Button
            onClick={deleteTestScan}
            variant="danger"
            disabled={!testScanId}
          >
            Delete Test Scan
          </Button>
        </div>
        
        {testScan && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm">
              <span className="font-medium">Test Scan ID:</span> {testScan.id}
            </p>
            <p className="text-sm mt-1">
              <span className="font-medium">File:</span> {testScan.originalFilename}
            </p>
            <p className="text-sm mt-1">
              <span className="font-medium">Client Identifier:</span> {testScan.fileIdentifier}
            </p>
            <p className="text-sm mt-1">
              <span className="font-medium">Status:</span> {testScan.status}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This scan should appear in the unmatched scans list below.
              After assigning it to a client, it should disappear from the list.
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Unmatched Scans Management</h2>
        <UnmatchedScansManagement />
      </div>
    </div>
  );
};

export default UnmatchedScansTest;
