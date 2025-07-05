/**
 * Life Arrow V1 - Full Scan Workflow Test
 * 
 * This script tests the complete scan management workflow including:
 * 1. Creating a test scan
 * 2. Verifying it appears in the unmatched basket
 * 3. Assigning it to a client
 * 4. Verifying it's removed from the unmatched basket
 * 5. Cleaning up by deleting the test scan
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { scanService } from '../api/scanService';

// Initialize Firebase (replace with your config if running standalone)
const firebaseConfig = {
  // This will use the config from the environment when run in the app context
  // If running standalone, you'll need to provide your Firebase config here
};

try {
  initializeApp(firebaseConfig);
} catch (error) {
  console.log('Firebase already initialized');
}

const db = getFirestore();

// Test configuration
const TEST_CLIENT_ID = 'test_client_123'; // Replace with a real client ID for testing

/**
 * Run the full scan workflow test
 */
async function runFullScanWorkflowTest() {
  console.log('🧪 Starting Full Scan Workflow Test');
  console.log('-----------------------------------');
  
  let testScanId = null;
  
  try {
    // Step 1: Create a test scan (unmatched)
    console.log('Step 1: Creating test unmatched scan...');
    const testScan = {
      fileIdentifier: 'TEST_ID_12345',
      originalFilename: 'test_scan_workflow.csv',
      uploadSource: 'manual',
      scanDate: new Date(),
      scanTime: new Date().toLocaleTimeString(),
      status: 'unmatched',
      rawDataJson: JSON.stringify({
        pathIds: [1000, 1001, 1002],
        descriptions: ['Test1', 'Test2', 'Test3'],
        values: [0, 1, 0]
      })
    };
    
    testScanId = await scanService.createScan(testScan);
    console.log(`✅ Test scan created with ID: ${testScanId}`);
    
    // Step 2: Verify it appears in the unmatched basket
    console.log('\nStep 2: Verifying scan appears in unmatched basket...');
    const unmatchedScans = await scanService.getUnmatchedScans();
    const foundScan = unmatchedScans.find(scan => scan.id === testScanId);
    
    if (foundScan) {
      console.log('✅ Test scan found in unmatched basket');
      console.log(`   File: ${foundScan.originalFilename}`);
      console.log(`   Identifier: ${foundScan.fileIdentifier}`);
      console.log(`   Status: ${foundScan.status}`);
    } else {
      console.error('❌ Test scan NOT found in unmatched basket');
      throw new Error('Test scan not found in unmatched basket');
    }
    
    // Step 3: Assign scan to a client
    console.log('\nStep 3: Assigning scan to client...');
    await scanService.assignScanToClient(testScanId, TEST_CLIENT_ID);
    console.log(`✅ Scan assigned to client: ${TEST_CLIENT_ID}`);
    
    // Step 4: Verify it's removed from the unmatched basket
    console.log('\nStep 4: Verifying scan is removed from unmatched basket...');
    const updatedUnmatchedScans = await scanService.getUnmatchedScans();
    const stillFound = updatedUnmatchedScans.find(scan => scan.id === testScanId);
    
    if (!stillFound) {
      console.log('✅ Test scan successfully removed from unmatched basket');
    } else {
      console.error('❌ Test scan still found in unmatched basket after assignment');
      throw new Error('Test scan still in unmatched basket after assignment');
    }
    
    // Step 5: Clean up by deleting the test scan
    console.log('\nStep 5: Cleaning up by deleting test scan...');
    await scanService.deleteScan(testScanId);
    console.log('✅ Test scan deleted successfully');
    
    console.log('\n✅✅✅ Full Scan Workflow Test PASSED ✅✅✅');
    
  } catch (error) {
    console.error('\n❌❌❌ Test FAILED ❌❌❌');
    console.error(`Error: ${error.message}`);
    
    // Attempt cleanup if test failed but scan was created
    if (testScanId) {
      console.log('\nAttempting to clean up test scan...');
      try {
        await scanService.deleteScan(testScanId);
        console.log('✅ Test scan deleted during cleanup');
      } catch (cleanupError) {
        console.error(`Failed to clean up test scan: ${cleanupError.message}`);
      }
    }
  }
}

// Run the test
runFullScanWorkflowTest();

export { runFullScanWorkflowTest };
