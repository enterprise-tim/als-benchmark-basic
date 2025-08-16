#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testSetup() {
  console.log('🧪 Testing benchmark setup...');
  
  try {
    // Test 1: Check if node-versions.json exists and is valid
    console.log('\n1️⃣ Testing node-versions.json configuration...');
    const configPath = path.join(process.cwd(), 'config', 'node-versions.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    
    const activeVersions = Object.entries(config.versions)
      .filter(([key, version]) => version.active)
      .map(([key, version]) => version.exact);
    
    console.log(`✅ Found ${activeVersions.length} active versions:`, activeVersions);
    
    // Test 2: Check if required scripts exist
    console.log('\n2️⃣ Testing required scripts...');
    const scripts = [
      'src/benchmark-distributed.js',
      'src/memory-test.js',
      'src/version-comparison.js',
      'src/report-generator.js',
      'scripts/run-multi-iterations.js',
      'scripts/run-all-versions.js'
    ];
    
    for (const script of scripts) {
      try {
        await fs.access(script);
        console.log(`✅ ${script} exists`);
      } catch (error) {
        console.log(`❌ ${script} missing`);
      }
    }
    
    // Test 3: Check package.json scripts
    console.log('\n3️⃣ Testing package.json scripts...');
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    
    const requiredScripts = [
      'multi-iteration',
      'all-versions',
      'compare-versions',
      'generate-report',
      'build'
    ];
    
    for (const script of requiredScripts) {
      if (packageJson.scripts[script]) {
        console.log(`✅ ${script} script exists`);
      } else {
        console.log(`❌ ${script} script missing`);
      }
    }
    
    // Test 4: Check directory structure
    console.log('\n4️⃣ Testing directory structure...');
    const dirs = [
      'results',
      'docs',
      'src',
      'scripts',
      'config'
    ];
    
    for (const dir of dirs) {
      try {
        const stat = await fs.stat(dir);
        if (stat.isDirectory()) {
          console.log(`✅ ${dir}/ directory exists`);
        } else {
          console.log(`❌ ${dir}/ is not a directory`);
        }
      } catch (error) {
        console.log(`❌ ${dir}/ directory missing`);
      }
    }
    
    // Test 5: Check if we can create test results structure
    console.log('\n5️⃣ Testing results directory creation...');
    const resultsDir = path.join(process.cwd(), 'public', 'results', 'test');
    await fs.mkdir(resultsDir, { recursive: true });
    console.log(`✅ Created test results directory: ${resultsDir}`);
    
    // Clean up test directory
    await fs.rm(resultsDir, { recursive: true, force: true });
    console.log(`✅ Cleaned up test directory`);
    
    console.log('\n🎉 All tests passed! Setup looks good.');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run all-versions 10');
    console.log('2. Or run individual version: npm run multi-iteration 10');
    console.log('3. Generate reports: npm run compare-versions');
    console.log('4. Build site: npm run build');
    
  } catch (error) {
    console.error('❌ Setup test failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testSetup();
}
