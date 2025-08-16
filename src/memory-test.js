import { AsyncLocalStorage } from 'async_hooks';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

class MemoryProfiler {
  constructor() {
    this.als = new AsyncLocalStorage();
    this.results = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
      memoryTests: []
    };
  }

  // Get detailed memory usage
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers || 0
    };
  }

  // Force garbage collection multiple times
  forceGC() {
    if (global.gc) {
      // Run GC multiple times to ensure cleanup
      for (let i = 0; i < 5; i++) {
        global.gc();
      }
    }
  }

  // Create data of specific memory size (approximately)
  createMemoryData(targetSizeKB) {
    const targetSize = targetSizeKB * 1024;
    const chunkSize = 100; // bytes per property
    const numProperties = Math.floor(targetSize / chunkSize);
    
    const data = { id: Math.random().toString(36) };
    
    for (let i = 0; i < numProperties; i++) {
      // Create string of approximately chunkSize bytes
      data[`prop_${i}`] = 'x'.repeat(chunkSize - 20); // account for property name overhead
    }
    
    return data;
  }

  // Test memory usage with varying object sizes
  async testMemoryUsageBySize() {
    console.log('\n=== Memory Usage by Object Size ===');
    
    const sizes = [1, 10, 100, 1000, 10000]; // KB
    
    for (const sizeKB of sizes) {
      console.log(`\nTesting object size: ${sizeKB}KB`);
      
      // Test without AsyncLocalStorage
      this.forceGC();
      await new Promise(resolve => setTimeout(resolve, 100)); // Let GC settle
      
      const beforeWithout = this.getMemoryUsage();
      const testData = this.createMemoryData(sizeKB);
      
      // Simulate usage without ALS
      let results = [];
      for (let i = 0; i < 100; i++) {
        const data = { ...testData, iteration: i };
        results.push(data.id);
      }
      
      const afterWithout = this.getMemoryUsage();
      
      // Test with AsyncLocalStorage
      this.forceGC();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const beforeWith = this.getMemoryUsage();
      results = [];
      
      for (let i = 0; i < 100; i++) {
        const data = { ...testData, iteration: i };
        await this.als.run(data, async () => {
          const storedData = this.als.getStore();
          if (storedData) {
            results.push(storedData.id);
          }
        });
      }
      
      const afterWith = this.getMemoryUsage();
      
      const memoryTest = {
        objectSizeKB: sizeKB,
        withoutALS: {
          before: beforeWithout,
          after: afterWithout,
          delta: {
            rss: afterWithout.rss - beforeWithout.rss,
            heapUsed: afterWithout.heapUsed - beforeWithout.heapUsed,
            heapTotal: afterWithout.heapTotal - beforeWithout.heapTotal
          }
        },
        withALS: {
          before: beforeWith,
          after: afterWith,
          delta: {
            rss: afterWith.rss - beforeWith.rss,
            heapUsed: afterWith.heapUsed - beforeWith.heapUsed,
            heapTotal: afterWith.heapTotal - beforeWith.heapTotal
          }
        }
      };
      
      memoryTest.overhead = {
        rss: memoryTest.withALS.delta.rss - memoryTest.withoutALS.delta.rss,
        heapUsed: memoryTest.withALS.delta.heapUsed - memoryTest.withoutALS.delta.heapUsed,
        heapTotal: memoryTest.withALS.delta.heapTotal - memoryTest.withoutALS.delta.heapTotal
      };
      
      this.results.memoryTests.push(memoryTest);
      
      console.log(`  Without ALS - Heap: ${(memoryTest.withoutALS.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  With ALS - Heap: ${(memoryTest.withALS.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Overhead - Heap: ${(memoryTest.overhead.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  // Test memory leaks over time
  async testMemoryLeaks() {
    console.log('\n=== Memory Leak Detection ===');
    
    const iterations = 10;
    const operationsPerIteration = 1000;
    
    console.log(`Running ${iterations} iterations of ${operationsPerIteration} operations each`);
    
    const memorySnapshots = [];
    
    for (let iteration = 0; iteration < iterations; iteration++) {
      this.forceGC();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const beforeIteration = this.getMemoryUsage();
      
      // Perform operations with AsyncLocalStorage
      for (let op = 0; op < operationsPerIteration; op++) {
        const data = this.createMemoryData(10); // 10KB objects
        
        await this.als.run(data, async () => {
          // Simulate some async work
          await new Promise(resolve => setTimeout(resolve, 1));
          const stored = this.als.getStore();
          if (stored) {
            // Access the data to ensure it's used
            const _ = stored.id.length;
          }
        });
      }
      
      this.forceGC();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterIteration = this.getMemoryUsage();
      
      const snapshot = {
        iteration,
        before: beforeIteration,
        after: afterIteration,
        growth: {
          rss: afterIteration.rss - beforeIteration.rss,
          heapUsed: afterIteration.heapUsed - beforeIteration.heapUsed,
          heapTotal: afterIteration.heapTotal - beforeIteration.heapTotal
        }
      };
      
      memorySnapshots.push(snapshot);
      
      console.log(`  Iteration ${iteration + 1}: Heap growth ${(snapshot.growth.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Analyze for memory leaks
    const totalGrowth = memorySnapshots.reduce((sum, snapshot) => sum + snapshot.growth.heapUsed, 0);
    const avgGrowthPerIteration = totalGrowth / iterations;
    
    console.log(`\nMemory Leak Analysis:`);
    console.log(`  Total heap growth: ${(totalGrowth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Average growth per iteration: ${(avgGrowthPerIteration / 1024 / 1024).toFixed(2)}MB`);
    
    if (avgGrowthPerIteration > 1024 * 1024) { // 1MB
      console.log(`  ⚠️  Potential memory leak detected (${(avgGrowthPerIteration / 1024 / 1024).toFixed(2)}MB/iteration)`);
    } else {
      console.log(`  ✅ No significant memory leak detected`);
    }
    
    this.results.memoryLeakTest = {
      snapshots: memorySnapshots,
      analysis: {
        totalGrowthBytes: totalGrowth,
        avgGrowthPerIterationBytes: avgGrowthPerIteration,
        potentialLeak: avgGrowthPerIteration > 1024 * 1024
      }
    };
  }

  // Test concurrent AsyncLocalStorage usage
  async testConcurrentUsage() {
    console.log('\n=== Concurrent Usage Test ===');
    
    const concurrentOperations = [10, 50, 100, 500];
    
    for (const concurrency of concurrentOperations) {
      console.log(`\nTesting ${concurrency} concurrent operations`);
      
      this.forceGC();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const beforeConcurrent = this.getMemoryUsage();
      const startTime = performance.now();
      
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        const promise = this.als.run(this.createMemoryData(10), async () => {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          
          const stored = this.als.getStore();
          if (stored) {
            return stored.id;
          }
        });
        
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      this.forceGC();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterConcurrent = this.getMemoryUsage();
      
      const concurrentTest = {
        concurrency,
        duration: endTime - startTime,
        memoryBefore: beforeConcurrent,
        memoryAfter: afterConcurrent,
        memoryGrowth: {
          rss: afterConcurrent.rss - beforeConcurrent.rss,
          heapUsed: afterConcurrent.heapUsed - beforeConcurrent.heapUsed,
          heapTotal: afterConcurrent.heapTotal - beforeConcurrent.heapTotal
        },
        successfulOperations: results.filter(r => r).length
      };
      
      console.log(`  Duration: ${concurrentTest.duration.toFixed(2)}ms`);
      console.log(`  Memory growth: ${(concurrentTest.memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Success rate: ${(concurrentTest.successfulOperations / concurrency * 100).toFixed(2)}%`);
      
      if (!this.results.concurrentTests) {
        this.results.concurrentTests = [];
      }
      this.results.concurrentTests.push(concurrentTest);
    }
  }

  async runMemoryTests() {
    console.log(`Starting memory profiling on Node.js ${process.version}`);
    console.log(`Initial memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log('=' .repeat(60));

    await this.testMemoryUsageBySize();
    await this.testMemoryLeaks();
    await this.testConcurrentUsage();
    
    await this.saveResults();
    this.printMemorySummary();
  }

  printMemorySummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('MEMORY PROFILING SUMMARY');
    console.log('=' .repeat(60));
    
    // Memory usage by size summary
    if (this.results.memoryTests.length > 0) {
      const avgOverhead = this.results.memoryTests.reduce((sum, test) => {
        const overheadPercent = test.withoutALS.delta.heapUsed > 0 
          ? (test.overhead.heapUsed / test.withoutALS.delta.heapUsed) * 100 
          : 0;
        return sum + overheadPercent;
      }, 0) / this.results.memoryTests.length;
      
      console.log(`Average memory overhead: ${avgOverhead.toFixed(2)}%`);
    }
    
    // Memory leak summary
    if (this.results.memoryLeakTest) {
      const analysis = this.results.memoryLeakTest.analysis;
      console.log(`Memory leak analysis: ${analysis.potentialLeak ? '⚠️  Potential leak' : '✅ No leak detected'}`);
      console.log(`Average growth per operation cycle: ${(analysis.avgGrowthPerIterationBytes / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Concurrent usage summary
    if (this.results.concurrentTests) {
      const maxConcurrency = Math.max(...this.results.concurrentTests.map(t => t.concurrency));
      const maxConcurrencyTest = this.results.concurrentTests.find(t => t.concurrency === maxConcurrency);
      console.log(`Max concurrent operations tested: ${maxConcurrency}`);
      console.log(`Memory usage at max concurrency: ${(maxConcurrencyTest.memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  async saveResults() {
    const resultsDir = path.join(process.cwd(), 'public', 'results');
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const filename = `memory_${this.results.nodeVersion.replace(/\./g, '_')}_${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\nMemory test results saved to: ${filepath}`);
  }
}

// Run memory tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const profiler = new MemoryProfiler();
  profiler.runMemoryTests().catch(console.error);
}

export { MemoryProfiler };
