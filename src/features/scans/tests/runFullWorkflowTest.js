/**
 * Life Arrow V1 - Full Scan Workflow Test Runner
 * 
 * This script runs the full scan workflow test to verify the complete
 * unmatched scan management process.
 */

import { runFullScanWorkflowTest } from './fullScanWorkflowTest.js';

console.log('Starting Full Scan Workflow Test Runner...');
console.log('==========================================');

runFullScanWorkflowTest()
  .then(() => {
    console.log('Test runner completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
