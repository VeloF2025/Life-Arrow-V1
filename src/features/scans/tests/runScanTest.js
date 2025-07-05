// Script to run scan service tests
import { runTests } from './scanService.test.js';

console.log('Starting scan service test runner...');
runTests()
  .then(() => console.log('Test runner completed'))
  .catch(error => console.error('Test runner error:', error));
