#!/usr/bin/env node

/**
 * Version Consistency Validator
 * 
 * This script checks that all files in the project use consistent Node.js versions
 * from the centralized configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load centralized configuration
const configPath = path.join(__dirname, '..', 'config', 'node-versions.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Get expected versions
const expectedVersions = {
    exact: Object.values(config.versions).filter(v => v.active).map(v => v.exact),
    major: Object.values(config.versions).filter(v => v.active).map(v => v.major),
    enterprise: config.sets.enterprise.map(key => config.versions[key].exact)
};

console.log('🔍 Validating Node.js version consistency...\n');

let issues = [];

// Check GitHub workflows
const workflowFiles = [
    '.github/workflows/performance-tests-enterprise.yml',
    '.github/workflows/benchmark.yml'
];

for (const file of workflowFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for version patterns
        const versionMatches = content.match(/\d+\.\d+\.\d+/g) || [];
        const uniqueVersions = [...new Set(versionMatches)];
        
        console.log(`📄 ${file}:`);
        console.log(`   Found versions: ${uniqueVersions.join(', ')}`);
        
        // Check if any versions are outdated
        const outdated = uniqueVersions.filter(v => {
            // Check if this version exists in our config
            return !expectedVersions.exact.includes(v);
        });
        
        if (outdated.length > 0) {
            issues.push(`${file}: Outdated versions found: ${outdated.join(', ')}`);
            console.log(`   ❌ Outdated: ${outdated.join(', ')}`);
        } else {
            console.log(`   ✅ All versions current`);
        }
        console.log();
    }
}

// Check Docker files
const dockerFiles = [
    'docker-compose.benchmark.yml',
    'Dockerfile.benchmark'
];

for (const file of dockerFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log(`🐳 ${file}:`);
        
        // Look for Node version patterns
        const nodeVersions = content.match(/node:(\d+)/g) || [];
        const versionNumbers = content.match(/NODE_VERSION.*?(\d+)/g) || [];
        
        console.log(`   Node versions: ${nodeVersions.join(', ')}`);
        console.log(`   Version args: ${versionNumbers.join(', ')}`);
        
        // Docker files typically use major versions, so this is informational
        console.log(`   ℹ️  Docker files use major versions (this is normal)`);
        console.log();
    }
}

// Check test-versions.sh
const testVersionsPath = path.join(__dirname, '..', 'test-versions.sh');
if (fs.existsSync(testVersionsPath)) {
    const content = fs.readFileSync(testVersionsPath, 'utf8');
    
    console.log(`🧪 test-versions.sh:`);
    
    if (content.includes('load_versions()')) {
        console.log(`   ✅ Uses centralized configuration`);
    } else {
        console.log(`   ❌ Not using centralized configuration`);
        issues.push('test-versions.sh: Not using centralized configuration');
    }
    console.log();
}

// Summary
console.log('📊 Summary:');
console.log(`   Expected versions: ${expectedVersions.exact.join(', ')}`);
console.log(`   Enterprise set: ${expectedVersions.enterprise.join(', ')}`);

if (issues.length === 0) {
    console.log('\n✅ All version references are consistent!');
    process.exit(0);
} else {
    console.log('\n❌ Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n💡 Run the following to see current centralized versions:');
    console.log('   node scripts/get-node-versions.js json all');
    process.exit(1);
}
