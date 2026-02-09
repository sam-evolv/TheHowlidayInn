#!/usr/bin/env node

/**
 * Maintenance Mode Control Script
 * Usage:
 *   node maintenance.mjs on     - Turn maintenance mode ON
 *   node maintenance.mjs off    - Turn maintenance mode OFF
 *   node maintenance.mjs status - Check current status
 */

import { readFileSync, writeFileSync } from 'node:fs';

const MAINT_FILE = '.maintenance';
const command = process.argv[2];

if (!command) {
  console.log('Usage: node maintenance.mjs [on|off|status]');
  process.exit(1);
}

switch (command.toLowerCase()) {
  case 'on':
    writeFileSync(MAINT_FILE, 'on');
    console.log('✅ Maintenance mode: ON');
    console.log('Public now sees: /public/maintenance.html');
    console.log('\nStaff bypass: Visit /?admin=<YOUR_TOKEN>');
    console.log('\nRestart the server to apply changes (if running)');
    break;
    
  case 'off':
    writeFileSync(MAINT_FILE, 'off');
    console.log('✅ Maintenance mode: OFF');
    console.log('Site is now fully public');
    console.log('\nRestart the server to apply changes (if running)');
    break;
    
  case 'status':
    try {
      const state = readFileSync(MAINT_FILE, 'utf8').trim();
      console.log('Maintenance mode:', state.toUpperCase());
    } catch {
      console.log('Maintenance mode: OFF (file not found)');
    }
    break;
    
  default:
    console.log('Unknown command:', command);
    console.log('Usage: node maintenance.mjs [on|off|status]');
    process.exit(1);
}
