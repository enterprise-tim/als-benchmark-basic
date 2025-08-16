#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MultiIterationRunner {
  constructor(iterations = 10) {
    this.iterations = iterations;
    this.resultsDir = path.join(process.cwd(), 'public', 'results');
    this.versionsDir = path.join(this.resultsDir, 'versions');
  }

  async run() {
    console.log(`🚀 Starting multi-iteration benchmark run with ${this.iterations} iterations per version`);
    
    // Ensure results directory structure exists
    await this.ensureDirectories();
    
    // Get Node.js version from environment or detect
    const nodeVersion = process.env.NODE_VERSION || await this.detectNodeVersion();
    const versionDir = path.join(this.versionsDir, `node_${nodeVersion}`);
    
    console.log(`📊 Running benchmarks for Node.js ${nodeVersion}`);
    console.log(`📁 Results will be saved to: ${versionDir}`);
    
    // Create version directory
    await fs.mkdir(versionDir, { recursive: true });
    
    // Run iterations
    const results = [];
    for (let i = 1; i <= this.iterations; i++) {
      console.log(`\n🔄 Running iteration ${i}/${this.iterations}...`);
      
      const iterationDir = path.join(versionDir, `iteration_${i.toString().padStart(2, '0')}`);
      await fs.mkdir(iterationDir, { recursive: true });
      
      try {
        const iterationResult = await this.runIteration(i, iterationDir);
        results.push(iterationResult);
        console.log(`✅ Iteration ${i} completed successfully`);
      } catch (error) {
        console.error(`❌ Iteration ${i} failed:`, error.message);
        results.push({ iteration: i, success: false, error: error.message });
      }
    }
    
    // Generate summary
    await this.generateIterationSummary(versionDir, results);
    
    console.log(`\n🎉 Multi-iteration benchmark completed!`);
    console.log(`📊 Results saved to: ${versionDir}`);
    console.log(`📈 Successful iterations: ${results.filter(r => r.success).length}/${this.iterations}`);
    
    return results;
  }

  async ensureDirectories() {
    await fs.mkdir(this.resultsDir, { recursive: true });
    await fs.mkdir(this.versionsDir, { recursive: true });
  }

  async detectNodeVersion() {
    try {
      const version = execSync('node --version', { encoding: 'utf8' }).trim();
      return version.replace('v', '');
    } catch (error) {
      console.warn('Could not detect Node.js version, using default');
      return 'unknown';
    }
  }

  async runIteration(iterationNumber, iterationDir) {
    const startTime = Date.now();
    
    try {
      // Run benchmark
      console.log(`  📊 Running benchmark...`);
      const benchmarkResult = await this.runBenchmark(iterationDir);
      
      // Run memory test
      console.log(`  🧠 Running memory test...`);
      const memoryResult = await this.runMemoryTest(iterationDir);
      
      const duration = Date.now() - startTime;
      
      return {
        iteration: iterationNumber,
        success: true,
        startTime: new Date(startTime).toISOString(),
        duration,
        benchmark: benchmarkResult,
        memory: memoryResult
      };
      
    } catch (error) {
      throw new Error(`Iteration ${iterationNumber} failed: ${error.message}`);
    }
  }

  async runBenchmark(iterationDir) {
    try {
      // Run the standard benchmark (not distributed)
      const result = execSync('npm run benchmark', {
        cwd: process.cwd(),
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Find and copy the latest benchmark result
      const benchmarkFiles = await this.findLatestFiles('results', 'benchmark_*.json');
      if (benchmarkFiles.length > 0) {
        const latestBenchmark = benchmarkFiles[0];
        const targetPath = path.join(iterationDir, path.basename(latestBenchmark));
        await fs.copyFile(latestBenchmark, targetPath);
        
        return {
          file: path.basename(latestBenchmark),
          success: true
        };
      }
      
      return { success: false, error: 'No benchmark results found' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async runMemoryTest(iterationDir) {
    try {
      // Run memory test
      const result = execSync('npm run memory-test', {
        cwd: process.cwd(),
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 5 // 5MB buffer
      });
      
      // Find and copy the latest memory result
      const memoryFiles = await this.findLatestFiles('results', 'memory_*.json');
      if (memoryFiles.length > 0) {
        const latestMemory = memoryFiles[0];
        const targetPath = path.join(iterationDir, path.basename(latestMemory));
        await fs.copyFile(latestMemory, targetPath);
        
        return {
          file: path.basename(latestMemory),
          success: true
        };
      }
      
      return { success: false, error: 'No memory test results found' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async findLatestFiles(dir, pattern) {
    try {
      const files = await fs.readdir(dir);
      const patternRegex = new RegExp(pattern.replace('*', '.*'));
      
      const matchingFiles = files
        .filter(file => patternRegex.test(file))
        .map(file => path.join(dir, file));
      
      // Sort by modification time (newest first)
      const fileStats = await Promise.all(
        matchingFiles.map(async (file) => {
          const stat = await fs.stat(file);
          return { file, mtime: stat.mtime };
        })
      );
      
      return fileStats
        .sort((a, b) => b.mtime - a.mtime)
        .map(stat => stat.file);
        
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error.message);
      return [];
    }
  }

  async generateIterationSummary(versionDir, results) {
    const summary = {
      generatedAt: new Date().toISOString(),
      nodeVersion: process.env.NODE_VERSION || await this.detectNodeVersion(),
      iterations: this.iterations,
      results: results,
      summary: {
        totalIterations: results.length,
        successfulIterations: results.filter(r => r.success).length,
        failedIterations: results.filter(r => !r.success).length,
        averageDuration: results
          .filter(r => r.success && r.duration)
          .reduce((sum, r) => sum + r.duration, 0) / Math.max(1, results.filter(r => r.success).length)
      }
    };
    
    const summaryPath = path.join(versionDir, 'iteration-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📝 Iteration summary saved to: ${summaryPath}`);
  }
}

// Main execution
async function main() {
  const iterations = parseInt(process.argv[2]) || 10;
  
  try {
    const runner = new MultiIterationRunner(iterations);
    await runner.run();
    process.exit(0);
  } catch (error) {
    console.error('❌ Multi-iteration runner failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
