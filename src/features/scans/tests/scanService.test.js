// Test script for scanService.ts
// This is a manual test script to verify the functionality of the scanService

import { scanService } from '../api/scanService';
import { db } from '../../../lib/firebase';

// Test data
const testScanData = {
  fileName: 'TEST_CLIENT_12345678_20250705.csv',
  fileSize: 1024,
  uploadedBy: 'test-admin',
  status: 'unmatched',
  rawDataJson: JSON.stringify({
    pathData: [
      { pathId: 'test-path-1', description: 'Test Path 1', value: '42' },
      { pathId: 'test-path-2', description: 'Test Path 2', value: '84' }
    ]
  })
};

// Test client data
const testClientId = 'test-client-id';

// Helper function to log test results
const logTest = (testName, success, error = null) => {
  console.log(`\n----- ${testName} -----`);
  if (success) {
    console.log('✅ SUCCESS');
  } else {
    console.log('❌ FAILED');
    if (error) console.error(error);
  }
};

// Run tests
const runTests = async () => {
  console.log('Starting scanService tests...');
  let testScanId;

  try {
    // Test 1: Create a scan with client identifier
    try {
      testScanId = await scanService.createScan(testScanData, '12345678');
      logTest('Create Scan with Client Identifier', !!testScanId);
      console.log('Created scan ID:', testScanId);
    } catch (error) {
      logTest('Create Scan with Client Identifier', false, error);
    }

    // Test 2: Get unmatched scans
    try {
      const unmatchedScans = await scanService.getUnmatchedScans();
      logTest('Get Unmatched Scans', true);
      console.log('Unmatched scans count:', unmatchedScans.length);
      console.log('Unmatched scans:', unmatchedScans);
    } catch (error) {
      logTest('Get Unmatched Scans', false, error);
    }

    // Test 3: Assign scan to client
    if (testScanId) {
      try {
        await scanService.assignScanToClient(testScanId, testClientId);
        logTest('Assign Scan to Client', true);
      } catch (error) {
        logTest('Assign Scan to Client', false, error);
      }

      // Test 4: Verify scan is no longer unmatched
      try {
        const unmatchedScans = await scanService.getUnmatchedScans();
        const stillUnmatched = unmatchedScans.some(scan => scan.id === testScanId);
        logTest('Verify Scan Assignment', !stillUnmatched);
        if (stillUnmatched) {
          console.log('❌ Scan is still in unmatched basket after assignment');
        }
      } catch (error) {
        logTest('Verify Scan Assignment', false, error);
      }
    }

    // Test 5: Clean up - Delete the test scan
    if (testScanId) {
      try {
        await scanService.deleteScan(testScanId);
        logTest('Delete Test Scan', true);
      } catch (error) {
        logTest('Delete Test Scan', false, error);
      }
    }

  } catch (error) {
    console.error('Test suite error:', error);
  }

  console.log('\nTests completed!');
};

// Execute tests
runTests().catch(console.error);

// Export for manual execution
export { runTests };
