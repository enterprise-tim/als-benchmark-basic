#!/usr/bin/env node

/**
 * Node.js Version Configuration Helper
 * 
 * This script reads the centralized Node.js version configuration and outputs
 * versions in various formats for different tools and scripts.
 * 
 * Usage:
 *   node scripts/get-node-versions.js [format] [set]
 * 
 * Formats:
 *   - bash-array: Bash array format for test-versions.sh
 *   - yaml-array: YAML array format for GitHub workflows
 *   - csv: Comma-separated values
 *   - json: JSON array
 *   - docker-major: Major versions only for Docker
 * 
 * Sets:
 *   - all: All active versions
 *   - lts_only: Only LTS versions
 *   - enterprise: Enterprise testing versions
 *   - basic: Basic testing versions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'node-versions.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function getVersions(set = 'all', format = 'exact') {
    const versionKeys = config.sets[set] || config.sets.all;
    
    return versionKeys.map(key => {
        const version = config.versions[key];
        if (!version || !version.active) return null;
        
        switch (format) {
            case 'exact':
                return version.exact;
            case 'major':
                return version.major;
            case 'major-x':
                return version.major + '.x';
            default:
                return version.exact;
        }
    }).filter(Boolean);
}

function formatOutput(versions, format) {
    switch (format) {
        case 'bash-array':
            return versions.map(v => `    "${v}"`).join('\n');
            
        case 'yaml-array':
            return versions.map(v => `        - ${v}`).join('\n');
            
        case 'yaml-inline':
            return `[${versions.join(', ')}]`;
            
        case 'csv':
            return versions.join(',');
            
        case 'json':
            return JSON.stringify(versions, null, 2);
            
        case 'docker-major':
            return versions.map(v => v.split('.')[0]).join(' ');
            
        default:
            return versions.join('\n');
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const outputFormat = args[0] || 'json';
const versionSet = args[1] || 'all';

// Handle special cases
if (outputFormat === 'help' || outputFormat === '--help') {
    console.log(`
Node.js Version Configuration Helper

Usage: node scripts/get-node-versions.js [format] [set]

Formats:
  bash-array    - Bash array format for test-versions.sh
  yaml-array    - YAML array format (multi-line)
  yaml-inline   - YAML inline array format
  csv           - Comma-separated values
  json          - JSON array (default)
  docker-major  - Major versions only for Docker
  list          - Simple newline-separated list

Sets:
  all           - All active versions (default)
  lts_only      - Only LTS versions
  enterprise    - Enterprise testing versions
  basic         - Basic testing versions

Examples:
  node scripts/get-node-versions.js bash-array all
  node scripts/get-node-versions.js csv enterprise
  node scripts/get-node-versions.js yaml-inline lts_only
`);
    process.exit(0);
}

// Special handling for different output needs
let versions;
let format = outputFormat;

switch (outputFormat) {
    case 'bash-array':
        versions = getVersions(versionSet, 'exact');
        break;
        
    case 'yaml-array':
    case 'yaml-inline':
        versions = getVersions(versionSet, 'exact');
        break;
        
    case 'docker-major':
        versions = getVersions(versionSet, 'major');
        break;
        
    case 'github-matrix':
        versions = getVersions(versionSet, 'major-x');
        format = 'yaml-inline';
        break;
        
    default:
        versions = getVersions(versionSet, 'exact');
}

// Output the result
console.log(formatOutput(versions, format));

// If requested, also show metadata
if (process.env.SHOW_METADATA === 'true') {
    console.error(`\n# Metadata:`);
    console.error(`# Last updated: ${config.metadata.last_updated}`);
    console.error(`# Set: ${versionSet}`);
    console.error(`# Count: ${versions.length} versions`);
}
