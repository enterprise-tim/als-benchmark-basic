import { Worker } from 'worker_threads';
import cluster from 'cluster';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { runBenchmark, CONFIG } from './benchmark-distributed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Comprehensive benchmark runner for testing AsyncLocalStorage 
 * across different execution models: single process, cluster, and worker threads
 */
class DistributedBenchmarkRunner {
  constructor() {
    this.results = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      benchmarks: [],
      testMatrix: [],
    };
  }

  /**
   * Run benchmark in single process mode
   */
  async runSingleProcess(variant, options) {
    console.log(`\nRunning ${variant.toUpperCase()} benchmark in single process mode...`);
    return await runBenchmark(variant, options);
  }

  /**
   * Run benchmark with worker threads
   */
  async runWorkerThreads(variant, options, workerCount = 4) {
    console.log(`\nRunning ${variant.toUpperCase()} benchmark with ${workerCount} worker threads...`);
    
    const workers = [];
    const results = [];
    
    // Create worker threads
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(path.join(__dirname, 'benchmark-worker.js'), {
        workerData: {
          variant,
          options: {
            ...options,
            workerId: i,
            workerCount,
          }
        }
      });
      
      workers.push(worker);
    }
    
    // Collect results from workers
    return new Promise((resolve, reject) => {
      let completed = 0;
      const workerResults = [];
      
      workers.forEach((worker, index) => {
        worker.on('message', (result) => {
          workerResults[index] = result;
          completed++;
          
          if (completed === workerCount) {
            // Aggregate results
            const aggregated = this.aggregateWorkerResults(workerResults);
            resolve(aggregated);
          }
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });
  }

  /**
   * Run benchmark in cluster mode
   */
  async runCluster(variant, options, clusterSize = 4) {
    if (cluster.isPrimary) {
      console.log(`\nRunning ${variant.toUpperCase()} benchmark with ${clusterSize} cluster workers...`);
      
      const workers = [];
      const results = [];
      
      // Setup cluster
      cluster.setupPrimary({
        exec: path.join(__dirname, 'benchmark-cluster-worker.js'),
        args: ['--variant', variant, '--options', JSON.stringify(options)],
      });
      
      // Fork workers
      for (let i = 0; i < clusterSize; i++) {
        const worker = cluster.fork();
        workers.push(worker);
      }
      
      // Collect results from workers
      return new Promise((resolve, reject) => {
        let completed = 0;
        const workerResults = [];
        
        workers.forEach((worker, index) => {
          worker.on('message', (result) => {
            workerResults[index] = result;
            completed++;
            
            if (completed === clusterSize) {
              // Aggregate results
              const aggregated = this.aggregateWorkerResults(workerResults);
              resolve(aggregated);
            }
          });
          
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`Worker stopped with exit code ${code}`));
            }
          });
        });
      });
    } else {
      // Worker process - run the actual benchmark
      const result = await runBenchmark(variant, options);
      process.send(result);
      process.exit(0);
    }
  }

  /**
   * Aggregate results from multiple workers/processes
   */
  aggregateWorkerResults(workerResults) {
    if (workerResults.length === 0) return null;
    
    // Simple aggregation - average the metrics
    const aggregated = {
      stats: {
        throughput: 0,
        latencies: { p50: 0, p99: 0 },
        contextIntegrityErrors: 0,
        contextErrorRate: 0,
      },
      workerCount: workerResults.length,
    };
    
    let totalThroughput = 0;
    let totalP50 = 0;
    let totalP99 = 0;
    let totalErrors = 0;
    let totalOperations = 0;
    
    workerResults.forEach(result => {
      if (result && result.stats) {
        totalThroughput += result.stats.throughput || 0;
        totalP50 += result.stats.latencies?.p50 || 0;
        totalP99 += result.stats.latencies?.p99 || 0;
        totalErrors += result.stats.contextIntegrityErrors || 0;
        totalOperations += result.stats.totalOperations || 0;
      }
    });
    
    aggregated.stats.throughput = totalThroughput / workerResults.length;
    aggregated.stats.latencies.p50 = totalP50 / workerResults.length;
    aggregated.stats.latencies.p99 = totalP99 / workerResults.length;
    aggregated.stats.contextIntegrityErrors = totalErrors;
    aggregated.stats.contextErrorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    
    return aggregated;
  }

  /**
   * Convert distributed benchmark results to the standard format expected by existing tools
   */
  convertToStandardFormat(testMatrix) {
    const benchmarks = [];
    
    // Group results by variant and execution mode
    const groupedResults = {};
    
    testMatrix.forEach(test => {
      if (!test.success) return;
      
      const key = `${test.variant}-${test.mode}`;
      if (!groupedResults[key]) {
        groupedResults[key] = {
          variant: test.variant,
          mode: test.mode,
          results: []
        };
      }
      groupedResults[key].results.push(test.result);
    });
    
    // Convert each group to a standard benchmark format
    Object.values(groupedResults).forEach(group => {
      const benchmark = {
        name: `${group.variant.toUpperCase()} - ${group.mode.toUpperCase()}`,
        type: 'distributed',
        config: {
          executionMode: group.mode,
          variant: group.variant,
          testCount: group.results.length
        },
        withoutALS: {
          duration: 0, // Not applicable for distributed tests
          memoryDelta: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
          results: 0
        },
        withALS: {
          duration: 0, // Not applicable for distributed tests
          memoryDelta: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
          results: 0
        },
        distributed: {
          avgThroughput: 0,
          avgLatencyP50: 0,
          avgLatencyP99: 0,
          totalContextErrors: 0,
          contextErrorRate: 0,
          workerCount: 0
        },
        overhead: {
          timePercent: 0, // Not applicable for distributed tests
          nestedTimePercent: 0,
          memoryRSSBytes: 0,
          memoryHeapBytes: 0,
          distributedOverhead: 0
        }
      };
      
      // Calculate averages from distributed results
      let totalThroughput = 0;
      let totalP50 = 0;
      let totalP99 = 0;
      let totalErrors = 0;
      let totalOperations = 0;
      let maxWorkers = 0;
      
      group.results.forEach(result => {
        if (result && result.stats) {
          totalThroughput += result.stats.throughput || 0;
          totalP50 += result.stats.latencies?.p50 || 0;
          totalP99 += result.stats.latencies?.p99 || 0;
          totalErrors += result.stats.contextIntegrityErrors || 0;
          totalOperations += result.stats.totalOperations || 0;
          maxWorkers = Math.max(maxWorkers, result.workerCount || 1);
        }
      });
      
      const resultCount = group.results.length;
      benchmark.distributed.avgThroughput = totalThroughput / resultCount;
      benchmark.distributed.avgLatencyP50 = totalP50 / resultCount;
      benchmark.distributed.avgLatencyP99 = totalP99 / resultCount;
      benchmark.distributed.totalContextErrors = totalErrors;
      benchmark.distributed.contextErrorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
      benchmark.distributed.workerCount = maxWorkers;
      
      // Calculate distributed overhead (how much the distributed nature affects performance)
      if (group.mode === 'single') {
        benchmark.overhead.distributedOverhead = 0;
      } else {
        // Compare with single process baseline if available
        const singleBaseline = testMatrix.find(t => 
          t.variant === group.variant && t.mode === 'single' && t.success
        );
        if (singleBaseline && singleBaseline.result.stats) {
          const singleThroughput = singleBaseline.result.stats.throughput || 0;
          const distributedThroughput = benchmark.distributed.avgThroughput;
          if (singleThroughput > 0) {
            benchmark.overhead.distributedOverhead = 
              ((singleThroughput - distributedThroughput) / singleThroughput) * 100;
          }
        }
      }
      
      benchmarks.push(benchmark);
    });
    
    return benchmarks;
  }

  /**
   * Save results in the standard format expected by existing tools
   */
  async saveResults() {
    const resultsDir = path.join(process.cwd(), 'results');
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Convert distributed results to standard format
    this.results.benchmarks = this.convertToStandardFormat(this.results.testMatrix);
    
    const filename = `benchmark_distributed_${this.results.nodeVersion.replace(/\./g, '_')}_${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\nDistributed benchmark results saved to: ${filepath}`);
    
    return filepath;
  }

  /**
   * Run comprehensive test matrix with enhanced ALS testing
   */
  async runTestMatrix(options = {}) {
    const {
      testDurationMs = 30000,
      profiles = ['steady'],
      executionModes = ['single'],
      variants = ['als', 'non-als'],
      clusterSize = 4,
      workerCount = 4,
      enableModeFlips = true
    } = options;

    console.log('Starting comprehensive benchmark test matrix...');
    console.log('Configuration:', {
      testDurationMs,
      profiles,
      executionModes,
      variants,
      clusterSize,
      workerCount,
      enableModeFlips
    });

    // Enhanced ALS testing scenarios
    const enhancedOptions = {
      ...options,
      // Add comprehensive ALS testing parameters
      alsTestScenarios: {
        contextDepth: [1, 5, 10, 20], // Test different nesting depths
        contextSize: [10, 100, 1000], // Test different context object sizes
        contextSwitching: [100, 1000, 10000], // Test context switching frequency
        concurrentContexts: [10, 50, 100], // Test concurrent context creation
        asyncChainDepth: [5, 10, 20], // Test async operation chain depth
        memoryPressure: true, // Enable memory pressure testing
        gcStress: true, // Enable garbage collection stress testing
      }
    };

    for (const profile of profiles) {
      for (const mode of executionModes) {
        for (const variant of variants) {
          try {
            console.log('\n' + '='.repeat(60));
            console.log(`TEST: ${variant.toUpperCase()} - ${mode.toUpperCase()} - ${profile.toUpperCase()}`);
            console.log('='.repeat(60));

            let result;
            const testOptions = {
              ...enhancedOptions,
              profile,
              enableModeFlips,
              testDurationMs
            };

            switch (mode) {
              case 'single':
                result = await this.runSingleProcess(variant, testOptions);
                break;
              case 'worker':
                result = await this.runWorkerThreads(variant, testOptions, workerCount);
                break;
              case 'cluster':
                result = await this.runCluster(variant, testOptions, clusterSize);
                break;
              default:
                throw new Error(`Unknown execution mode: ${mode}`);
            }

            this.results.testMatrix.push({
              profile,
              mode,
              variant,
              success: true,
              result,
              timestamp: new Date().toISOString()
            });

            this.printTestResult(profile, mode, variant, result);

          } catch (error) {
            console.error(`Test failed: ${variant} - ${mode} - ${profile}:`, error.message);
            
            this.results.testMatrix.push({
              profile,
              mode,
              variant,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
    
    // Save results in standard format
    await this.saveResults();
    
    this.printMatrixSummary();
    return this.results;
  }

  printTestResult(profile, mode, variant, result) {
    const stats = result.stats;
    console.log(`\nResults for ${variant.toUpperCase()} - ${mode} - ${profile}:`);
    console.log(`  Throughput: ${stats.throughput.toFixed(2)} req/s`);
    console.log(`  Latency p50: ${stats.latencies.p50}ms`);
    console.log(`  Latency p99: ${stats.latencies.p99}ms`);
    console.log(`  Context Errors: ${stats.contextIntegrityErrors} (${(stats.contextErrorRate * 100).toFixed(6)}%)`);
    
    if (result.workerCount) {
      console.log(`  Workers/Processes: ${result.workerCount}`);
    }
  }

  printMatrixSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST MATRIX SUMMARY');
    console.log('='.repeat(60));
    
    const successful = this.results.testMatrix.filter(t => t.success).length;
    const failed = this.results.testMatrix.filter(t => !t.success).length;
    
    console.log(`Total Tests: ${this.results.testMatrix.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    
    // Group by variant and calculate averages
    const variantStats = {};
    
    this.results.testMatrix
      .filter(t => t.success)
      .forEach(test => {
        const key = `${test.variant}-${test.mode}`;
        if (!variantStats[key]) {
          variantStats[key] = {
            throughputs: [],
            p99s: [],
            errorRates: [],
          };
        }
        
        variantStats[key].throughputs.push(test.result.stats.throughput);
        variantStats[key].p99s.push(test.result.stats.latencies.p99);
        variantStats[key].errorRates.push(test.result.stats.contextErrorRate || 0);
      });
    
    console.log('\nAverage Performance by Variant and Execution Mode:');
    Object.entries(variantStats).forEach(([key, stats]) => {
      const avgThroughput = stats.throughputs.reduce((a, b) => a + b, 0) / stats.throughputs.length;
      const avgP99 = stats.p99s.reduce((a, b) => a + b, 0) / stats.p99s.length;
      const avgErrorRate = stats.errorRates.reduce((a, b) => a + b, 0) / stats.errorRates.length;
      
      console.log(`\n${key.toUpperCase()}:`);
      console.log(`  Avg Throughput: ${avgThroughput.toFixed(2)} req/s`);
      console.log(`  Avg p99 Latency: ${avgP99.toFixed(2)}ms`);
      console.log(`  Avg Error Rate: ${(avgErrorRate * 100).toFixed(6)}%`);
    });
  }
}

// Export the runner
export { DistributedBenchmarkRunner };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new DistributedBenchmarkRunner();
  
  // Parse command line options
  const options = {
    testDurationMs: process.argv.includes('--quick') ? 10000 : 30000,
    profiles: process.argv.includes('--all-profiles') 
      ? ['steady', 'burst', 'surge'] 
      : ['steady'],
    executionModes: process.argv.includes('--all-modes')
      ? ['single', 'cluster', 'worker']
      : ['single'],
    variants: process.argv.includes('--als-only') 
      ? ['als'] 
      : process.argv.includes('--non-als-only')
      ? ['non-als']
      : ['als', 'non-als'],
  };
  
  runner.runTestMatrix(options)
    .then(results => {
      console.log('\nBenchmark completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
