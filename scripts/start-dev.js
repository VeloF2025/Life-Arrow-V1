#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, prefix, message) {
  console.log(`${color}${colors.bright}[${prefix}]${colors.reset} ${message}`);
}

function startProcess(command, args, color, prefix) {
  const process = spawn(command, args, {
    stdio: 'pipe',
    shell: true
  });

  process.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => log(color, prefix, line));
  });

  process.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => log(colors.red, prefix, line));
  });

  return process;
}

async function main() {
  log(colors.cyan, 'SETUP', 'Starting Life Arrow development environment...');
  
  // Check if we have a Firebase project configured
  try {
    const { execSync } = require('child_process');
    execSync('firebase use --add', { stdio: 'ignore' });
  } catch (error) {
    log(colors.yellow, 'WARN', 'No Firebase project configured. Using emulators in demo mode.');
  }

  // Start Firebase emulators
  log(colors.blue, 'FIREBASE', 'Starting Firebase emulators...');
  const firebaseProcess = startProcess(
    'firebase',
    ['emulators:start', '--project=demo-project'],
    colors.blue,
    'FIREBASE'
  );

  // Wait a bit for emulators to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start Vite dev server
  log(colors.green, 'VITE', 'Starting Vite development server...');
  const viteProcess = startProcess(
    'npm',
    ['run', 'dev'],
    colors.green,
    'VITE'
  );

  // Handle process termination
  process.on('SIGINT', () => {
    log(colors.yellow, 'SHUTDOWN', 'Shutting down development environment...');
    firebaseProcess.kill();
    viteProcess.kill();
    process.exit(0);
  });

  log(colors.cyan, 'READY', 'Development environment is starting up!');
  log(colors.cyan, 'INFO', 'Vite dev server: http://localhost:5173');
  log(colors.cyan, 'INFO', 'Firebase emulator UI: http://localhost:4000');
  log(colors.cyan, 'INFO', 'Press Ctrl+C to stop all services');
}

main().catch(console.error); 