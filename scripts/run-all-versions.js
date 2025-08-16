#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AllVersionsRunner {
  constructor(iterations = 10) {
    this.iterations = iterations;
    this.configPath = path.join(process.cwd(), 'config', 'node-versions.json');
    this.resultsDir = path.join(process.cwd(), 'public', 'results');
  }

  async run() {
    console.log(`🚀 Starting comprehensive benchmark run for all configured Node.js versions`);
    console.log(`📊 Each version will run ${this.iterations} iterations`);
    
    try {
      // Load configuration
      const config = await this.loadConfig();
      console.log(`📋 Loaded configuration with ${Object.keys(config.versions).length} versions`);
      
      // Get active versions
      const activeVersions = this.getActiveVersions(config);
      console.log(`🎯 Found ${activeVersions.length} active versions to test`);
      
      // Run benchmarks for each version
      const results = [];
      for (const versionKey of activeVersions) {
        const version = config.versions[versionKey];
        console.log(`\n🔧 Testing Node.js ${version.exact} (${version.description})`);
        
        try {
          const result = await this.runVersionBenchmark(version, versionKey);
          results.push(result);
          console.log(`✅ ${version.exact} completed successfully`);
        } catch (error) {
          console.error(`❌ ${version.exact} failed:`, error.message);
          results.push({
            version: version.exact,
            versionKey,
            success: false,
            error: error.message
          });
        }
      }
      
      // Generate summary
      await this.generateOverallSummary(results, config);
      
      console.log(`\n🎉 All version benchmarks completed!`);
      console.log(`📊 Results saved to: ${this.resultsDir}`);
      console.log(`📈 Successful versions: ${results.filter(r => r.success).length}/${results.length}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ All versions runner failed:', error);
      throw error;
    }
  }

  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load config from ${this.configPath}: ${error.message}`);
    }
  }

  getActiveVersions(config) {
    return Object.entries(config.versions)
      .filter(([key, version]) => version.active)
      .map(([key, version]) => key)
      .sort((a, b) => {
        const aVersion = config.versions[a].exact;
        const bVersion = config.versions[b].exact;
        return this.compareVersions(aVersion, bVersion);
      });
  }

  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    return 0;
  }

  async runVersionBenchmark(version, versionKey) {
    const startTime = Date.now();
    
    try {
      // Use nvm to switch to the specific Node.js version
      console.log(`  🔄 Switching to Node.js ${version.exact}...`);
      await this.switchNodeVersion(version.exact);
      
      // Verify version
      const currentVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      if (currentVersion !== `v${version.exact}`) {
        throw new Error(`Failed to switch to Node.js ${version.exact}, current: ${currentVersion}`);
      }
      
      console.log(`  ✅ Now running Node.js ${currentVersion}`);
      
      // Run multi-iteration benchmark
      console.log(`  📊 Running ${this.iterations} iterations...`);
      execSync(`npm run multi-iteration ${this.iterations}`, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      const duration = Date.now() - startTime;
      
      return {
        version: version.exact,
        versionKey,
        success: true,
        startTime: new Date(startTime).toISOString(),
        duration,
        description: version.description
      };
      
    } catch (error) {
      throw new Error(`Version ${version.exact} failed: ${error.message}`);
    }
  }

  async switchNodeVersion(version) {
    try {
      // Try to use nvm to switch versions
      execSync(`nvm use ${version}`, { 
        stdio: 'pipe',
        shell: '/bin/bash'
      });
    } catch (error) {
      // If nvm fails, try to use the version directly if it's available
      console.warn(`  ⚠️  nvm switch failed, trying direct execution...`);
      
      // Check if the version is available in PATH
      try {
        execSync(`node --version`, { 
          stdio: 'pipe',
          env: { ...process.env, PATH: `/usr/local/bin:${process.env.PATH}` }
        });
      } catch (directError) {
        throw new Error(`Node.js ${version} not available and nvm switch failed`);
      }
    }
  }

  async generateOverallSummary(results, config) {
    const summary = {
      generatedAt: new Date().toISOString(),
      totalVersions: results.length,
      successfulVersions: results.filter(r => r.success).length,
      failedVersions: results.filter(r => !r.success).length,
      iterationsPerVersion: this.iterations,
      results: results,
      config: {
        source: 'config/node-versions.json',
        lastUpdated: config.metadata?.last_updated,
        totalConfiguredVersions: Object.keys(config.versions).length
      }
    };
    
    const summaryPath = path.join(this.resultsDir, 'all-versions-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📝 Overall summary saved to: ${summaryPath}`);
  }
}

// Main execution
async function main() {
  const iterations = parseInt(process.argv[2]) || 10;
  
  try {
    const runner = new AllVersionsRunner(iterations);
    await runner.run();
    process.exit(0);
  } catch (error) {
    console.error('❌ All versions runner failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
