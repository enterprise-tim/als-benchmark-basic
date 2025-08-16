import { AsyncLocalStorage } from 'async_hooks';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import { Worker } from 'worker_threads';
import cluster from 'cluster';

/**
 * AsyncLocalStorage Performance Benchmark Suite
 * 
 * WHAT IS ASYNCLOCALSTORAGE?
 * AsyncLocalStorage is a Node.js API that allows you to store data that is 
 * automatically propagated through asynchronous call chains. It's similar to 
 * thread-local storage in other languages, but for Node.js's single-threaded 
 * event loop with async operations.
 * 
 * WHAT DOES THIS BENCHMARK TEST?
 * This benchmark suite measures the performance overhead of using AsyncLocalStorage
 * compared to not using it. It tests various scenarios that developers commonly
 * encounter in production applications:
 * 
 * TRADITIONAL TESTS:
 * 1. BASELINE PERFORMANCE: Operations without AsyncLocalStorage
 * 2. ALS OVERHEAD: The same operations wrapped in AsyncLocalStorage.run()
 * 3. NESTED CONTEXTS: Multiple levels of AsyncLocalStorage nesting
 * 4. DATA SIZE IMPACT: How object size affects performance
 * 5. ASYNC OPERATION IMPACT: Performance with real async operations
 * 
 * NEW: ASYNCCONTEXTFRAME-SPECIFIC TESTS (Node.js v24+):
 * 6. HIGH-FREQUENCY CONTEXT SWITCHING: Rapid context creation/switching performance
 * 7. CONCURRENT CONTEXT OPERATIONS: Context isolation under high concurrency
 * 8. CONTEXT PROPAGATION STRESS: Deep async chains with context passing
 * 
 * ASYNCCONTEXTFRAME PERFORMANCE FOCUS:
 * Node.js v24.0.0 introduced AsyncContextFrame, a complete rewrite of AsyncLocalStorage
 * that provides dramatic performance improvements. The new tests specifically target:
 * - Context switching overhead (major improvement in v24+)
 * - Concurrent operation performance and context mixing issues
 * - Async propagation efficiency through deep call chains
 * 
 * WHY IS THIS IMPORTANT?
 * AsyncLocalStorage enables powerful patterns like:
 * - Request tracing in web applications
 * - User context propagation
 * - Distributed tracing
 * - Logging context preservation
 * 
 * But it came with significant performance overhead in pre-v24 versions. This benchmark 
 * helps you understand both the traditional overhead AND the dramatic improvements
 * in Node.js v24+ with AsyncContextFrame.
 * 
 * TEST SCENARIOS EXPLAINED:
 * - Small Data (5 properties): Simulates lightweight request context
 * - Medium Data (50 properties): Simulates detailed user/request metadata  
 * - Large Data (500 properties): Simulates complex application state
 * - With/Without Async: Tests both sync and async operation patterns
 * - Nested ALS: Tests the impact of nested AsyncLocalStorage contexts
 * - Context Switching: Rapid context creation/destruction (v24+ focus)
 * - Concurrent Operations: High concurrency with context isolation (v24+ focus)
 * - Propagation Stress: Deep async chains with context passing (v24+ focus)
 */
class AsyncLocalStorageBenchmark {
  constructor() {
    this.als = new AsyncLocalStorage();
    this.results = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
      benchmarks: []
    };
  }

  /**
   * Simulates CPU-intensive work to create realistic load
   * 
   * PURPOSE: This creates actual computational work that would be present
   * in real applications, allowing us to measure AsyncLocalStorage overhead
   * in the context of meaningful work being done.
   * 
   * @param {number} iterations - Number of mathematical operations to perform
   * @returns {number} - Computed result (prevents optimization)
   */
  heavyComputation(iterations = 10000) {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
    }
    return sum;
  }

  /**
   * Simulates real-world asynchronous operations
   * 
   * PURPOSE: Tests AsyncLocalStorage performance when async operations are
   * involved, which is the primary use case. This simulates I/O operations,
   * database calls, HTTP requests, etc.
   * 
   * @param {number} delay - Milliseconds to delay (simulates I/O latency)
   * @returns {Promise<number>} - Random result after async work
   */
  async asyncWork(delay = 1) {
    return new Promise(resolve => {
      setTimeout(() => {
        this.heavyComputation(1000);
        resolve(Math.random());
      }, delay);
    });
  }

  /**
   * Creates test data objects of varying sizes
   * 
   * PURPOSE: Tests how the size of stored data affects AsyncLocalStorage
   * performance. Real applications store different amounts of data in context:
   * - Small: Basic user ID, request ID
   * - Medium: User profile, request metadata  
   * - Large: Complex application state, detailed tracking info
   * 
   * The nested structure simulates real-world data complexity.
   * 
   * @param {number} size - Number of properties to create
   * @returns {Object} - Test data object with nested structure
   */
  createTestData(size) {
    const data = {
      id: Math.random().toString(36),
      timestamp: Date.now(),
      metadata: {}
    };

    // Add varying amounts of data
    for (let i = 0; i < size; i++) {
      data.metadata[`key_${i}`] = {
        value: `value_${i}_${Math.random().toString(36)}`,
        nested: {
          level1: `nested_value_${i}`,
          level2: {
            deep: `deep_value_${i}`,
            array: new Array(10).fill(0).map((_, idx) => `array_item_${idx}`)
          }
        }
      };
    }
    
    return data;
  }

  /**
   * Baseline performance test without AsyncLocalStorage
   * 
   * WHAT IT TESTS: Raw performance of operations without any AsyncLocalStorage
   * overhead. This establishes the baseline against which we measure ALS overhead.
   * 
   * SIMULATES: Traditional applications that pass context explicitly through
   * function parameters or store it in modules/globals.
   * 
   * @param {number} iterations - Number of operations to perform
   * @param {number} dataSize - Size of data objects to create
   * @param {boolean} asyncOps - Whether to include async operations
   * @returns {Object} - Performance metrics (duration, memory usage)
   */
  async benchmarkWithoutALS(iterations, dataSize, asyncOps = false) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let results = [];
    
    for (let i = 0; i < iterations; i++) {
      const data = this.createTestData(dataSize);
      
      if (asyncOps) {
        await this.asyncWork();
      }
      
      this.heavyComputation();
      results.push(data.id);
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      results: results.length
    };
  }

  /**
   * Performance test with AsyncLocalStorage
   * 
   * WHAT IT TESTS: Performance when using AsyncLocalStorage to store and
   * retrieve context data. This is the core use case for ALS.
   * 
   * SIMULATES: Modern applications using AsyncLocalStorage for:
   * - Request context in web servers
   * - User session propagation
   * - Distributed tracing data
   * - Logging context
   * 
   * KEY BEHAVIORS TESTED:
   * - als.run() method overhead
   * - als.getStore() retrieval overhead  
   * - Context propagation through async boundaries
   * 
   * @param {number} iterations - Number of operations to perform
   * @param {number} dataSize - Size of data objects to store
   * @param {boolean} asyncOps - Whether to include async operations
   * @returns {Object} - Performance metrics (duration, memory usage)
   */
  async benchmarkWithALS(iterations, dataSize, asyncOps = false) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let results = [];
    
    for (let i = 0; i < iterations; i++) {
      const data = this.createTestData(dataSize);
      
      await this.als.run(data, async () => {
        if (asyncOps) {
          await this.asyncWork();
        }
        
        this.heavyComputation();
        
        // Access the stored data multiple times to simulate real usage
        const storedData = this.als.getStore();
        if (storedData) {
          results.push(storedData.id);
        }
      });
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      results: results.length
    };
  }

  /**
   * Performance test with nested AsyncLocalStorage contexts
   * 
   * WHAT IT TESTS: Performance impact when AsyncLocalStorage contexts are
   * nested within each other. This is common in complex applications where
   * different layers add their own context.
   * 
   * REAL-WORLD SCENARIOS:
   * - Web framework sets request context
   * - Authentication middleware adds user context  
   * - Database layer adds transaction context
   * - Business logic adds operation context
   * 
   * WHY THIS MATTERS: Each level of nesting adds overhead. This test helps
   * identify when nesting becomes prohibitively expensive.
   * 
   * NESTING STRUCTURE:
   * als.run(data1, () => {
   *   als.run(data2, () => {
   *     als.run(data3, () => {
   *       // actual work happens here
   *     })
   *   })
   * })
   * 
   * @param {number} iterations - Number of operations to perform
   * @param {number} dataSize - Size of data objects to store
   * @param {number} nestingLevel - Depth of AsyncLocalStorage nesting
   * @returns {Object} - Performance metrics (duration, memory usage)
   */
  async benchmarkNestedALS(iterations, dataSize, nestingLevel = 3) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let results = [];
    
    const nestedRun = async (level, data) => {
      if (level <= 0) {
        this.heavyComputation();
        const storedData = this.als.getStore();
        if (storedData) {
          results.push(storedData.id);
        }
        return;
      }
      
      const nestedData = { ...data, level, nested: Math.random() };
      await this.als.run(nestedData, async () => {
        await this.asyncWork();
        await nestedRun(level - 1, nestedData);
      });
    };
    
    for (let i = 0; i < iterations; i++) {
      const data = this.createTestData(dataSize);
      await this.als.run(data, async () => {
        await nestedRun(nestingLevel, data);
      });
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      results: results.length
    };
  }

  /**
   * High-frequency context switching test specifically designed for AsyncContextFrame
   * 
   * WHAT THIS TARGETS: AsyncContextFrame's main improvement is dramatically reduced
   * overhead for context switching operations. This test hammers context switching
   * to highlight the performance difference between traditional async hooks and
   * AsyncContextFrame implementation.
   * 
   * @param {number} iterations - Number of rapid context switches to perform
   * @returns {Object} - Performance metrics focused on context switching
   */
  async benchmarkHighFrequencyContextSwitching(iterations = 50000) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let results = [];
    
    // Rapidly switch between different contexts
    for (let i = 0; i < iterations; i++) {
      const contextData = { id: i, timestamp: Date.now() };
      
      await this.als.run(contextData, async () => {
        // Immediate context retrieval - tests context switching overhead
        const stored = this.als.getStore();
        if (stored) {
          results.push(stored.id);
        }
        
        // Nested context switch within the same iteration
        const nestedData = { ...stored, nested: true };
        await this.als.run(nestedData, async () => {
          const nestedStored = this.als.getStore();
          if (nestedStored && nestedStored.nested) {
            results.push(`nested_${nestedStored.id}`);
          }
        });
      });
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      contextSwitchesPerSecond: (iterations * 2) / ((endTime - startTime) / 1000),
      results: results.length
    };
  }

  /**
   * Concurrent context operations test for AsyncContextFrame improvements
   * 
   * WHAT THIS TARGETS: AsyncContextFrame fixes context mixing issues during
   * concurrent operations and improves performance under high concurrency.
   * This test specifically exercises concurrent context creation and access.
   * 
   * @param {number} concurrency - Number of concurrent operations
   * @param {number} operationsPerConcurrency - Operations per concurrent task
   * @returns {Object} - Performance metrics for concurrent context operations
   */
  async benchmarkConcurrentContextOperations(concurrency = 100, operationsPerConcurrency = 100) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const promises = [];
    
    for (let c = 0; c < concurrency; c++) {
      const promise = (async () => {
        const results = [];
        
        for (let i = 0; i < operationsPerConcurrency; i++) {
          const contextData = { 
            concurrency: c, 
            operation: i, 
            timestamp: Date.now(),
            data: this.createTestData(5) // Small data for speed
          };
          
          await this.als.run(contextData, async () => {
            // Simulate async work that could cause context mixing
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
            
            const stored = this.als.getStore();
            if (stored && stored.concurrency === c && stored.operation === i) {
              results.push(`${stored.concurrency}-${stored.operation}`);
            } else {
              // Context mixing detected
              results.push('CONTEXT_MIXING_ERROR');
            }
          });
        }
        
        return results;
      })();
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const flatResults = results.flat();
    const contextMixingErrors = flatResults.filter(r => r === 'CONTEXT_MIXING_ERROR').length;
    const totalOperations = concurrency * operationsPerConcurrency;
    
    return {
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      totalOperations,
      successfulOperations: totalOperations - contextMixingErrors,
      contextMixingErrors,
      operationsPerSecond: totalOperations / ((endTime - startTime) / 1000),
      results: flatResults.length
    };
  }

  /**
   * Context propagation stress test for AsyncContextFrame
   * 
   * WHAT THIS TARGETS: Tests rapid context propagation through multiple
   * async boundaries, which is where AsyncContextFrame shows major improvements.
   * This simulates microservice-style async chains with context passing.
   * 
   * @param {number} chains - Number of async chains to run
   * @param {number} depth - Depth of each async chain
   * @returns {Object} - Performance metrics for context propagation
   */
  async benchmarkContextPropagationStress(chains = 1000, depth = 10) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const asyncChain = async (level, maxLevel, contextData) => {
      if (level >= maxLevel) {
        const stored = this.als.getStore();
        return stored ? stored.id : null;
      }
      
      // Simulate async operation at each level
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Add to context at each level
      const newContextData = { ...contextData, level, timestamp: Date.now() };
      
      return await this.als.run(newContextData, async () => {
        return await asyncChain(level + 1, maxLevel, newContextData);
      });
    };
    
    const promises = [];
    
    for (let i = 0; i < chains; i++) {
      const initialContext = { 
        chainId: i, 
        startTime: Date.now(),
        data: this.createTestData(3) // Minimal data for speed
      };
      
      const promise = this.als.run(initialContext, async () => {
        return await asyncChain(0, depth, initialContext);
      });
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const successfulChains = results.filter(r => r !== null).length;
    const totalAsyncOperations = chains * depth;
    
    return {
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      totalAsyncOperations,
      successfulChains,
      avgChainDepth: depth,
      operationsPerSecond: totalAsyncOperations / ((endTime - startTime) / 1000),
      results: results.length
    };
  }

  // Note: Distributed system benchmark removed - not needed for current analysis

  /**
   * Runs the complete AsyncLocalStorage benchmark suite
   * 
   * ENHANCED FOR ASYNCCONTEXTFRAME TESTING:
   * This version includes the original tests PLUS new tests specifically designed
   * to highlight AsyncContextFrame performance improvements in Node.js v24+:
   * 
   * NEW TESTS:
   * 7. HIGH-FREQUENCY CONTEXT SWITCHING: Rapid context creation/switching
   * 8. CONCURRENT CONTEXT OPERATIONS: High concurrency with context isolation
   * 9. CONTEXT PROPAGATION STRESS: Deep async chains with context passing
   * 
   * These new tests specifically target the areas where AsyncContextFrame
   * provides the most dramatic performance improvements compared to the
   * traditional async hooks implementation.
   * 
   * ORIGINAL TEST MATRIX: 6 different test scenarios to cover
   * common real-world usage patterns:
   * 
   * 1. SMALL DATA (5 properties, 10K iterations)
   *    - Simulates: Basic request tracking (user ID, request ID, timestamp)
   *    - Tests: Minimal overhead scenario
   * 
   * 2. SMALL DATA + ASYNC (5 properties, 5K iterations, with I/O)
   *    - Simulates: API calls with lightweight context  
   *    - Tests: Async propagation overhead
   * 
   * 3. MEDIUM DATA (50 properties, 5K iterations)
   *    - Simulates: User profiles, request metadata, session data
   *    - Tests: Moderate data size impact
   * 
   * 4. MEDIUM DATA + ASYNC (50 properties, 2.5K iterations, with I/O)
   *    - Simulates: Database operations with rich context
   *    - Tests: Combined data size + async overhead
   * 
   * 5. LARGE DATA (500 properties, 1K iterations) 
   *    - Simulates: Complex application state, detailed audit trails
   *    - Tests: Large object storage impact
   * 
   * 6. LARGE DATA + ASYNC (500 properties, 500 iterations, with I/O)
   *    - Simulates: Heavy processing with comprehensive context
   *    - Tests: Worst-case overhead scenario
   * 
   * For each scenario, we measure:
   * - Without ALS: Baseline performance
   * - With ALS: Standard AsyncLocalStorage usage  
   * - Nested ALS: Multiple context layers (reduced iterations)
   * 
   * The varying iteration counts ensure reasonable test completion time
   * while maintaining statistical significance.
   */
  async runBenchmarks() {
    console.log(`Starting AsyncLocalStorage benchmarks on Node.js ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log('=' .repeat(60));

    const testConfigs = [
      { name: 'Small Data', iterations: 10000, dataSize: 5, asyncOps: false },
      { name: 'Small Data + Async', iterations: 5000, dataSize: 5, asyncOps: true },
      { name: 'Medium Data', iterations: 5000, dataSize: 50, asyncOps: false },
      { name: 'Medium Data + Async', iterations: 2500, dataSize: 50, asyncOps: true },
      { name: 'Large Data', iterations: 1000, dataSize: 500, asyncOps: false },
      { name: 'Large Data + Async', iterations: 500, dataSize: 500, asyncOps: true },
    ];

    // NEW: AsyncContextFrame-specific tests for Node.js v24+ performance analysis
    const asyncContextFrameTests = [
      { name: 'High-Frequency Context Switching', test: 'contextSwitching', iterations: 50000 },
      { name: 'Concurrent Context Operations', test: 'concurrent', concurrency: 100, operationsPerConcurrency: 100 },
      { name: 'Context Propagation Stress', test: 'propagation', chains: 1000, depth: 10 },
    ];

    for (const config of testConfigs) {
      console.log(`\nTesting: ${config.name}`);
      console.log(`Iterations: ${config.iterations}, Data Size: ${config.dataSize}, Async: ${config.asyncOps}`);
      
      // Warm up
      await this.benchmarkWithoutALS(10, config.dataSize, config.asyncOps);
      await this.benchmarkWithALS(10, config.dataSize, config.asyncOps);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Benchmark without ALS
      console.log('  Running without AsyncLocalStorage...');
      const withoutALS = await this.benchmarkWithoutALS(
        config.iterations, 
        config.dataSize, 
        config.asyncOps
      );
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Benchmark with ALS
      console.log('  Running with AsyncLocalStorage...');
      const withALS = await this.benchmarkWithALS(
        config.iterations, 
        config.dataSize, 
        config.asyncOps
      );
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Benchmark nested ALS
      console.log('  Running with nested AsyncLocalStorage...');
      const nestedALS = await this.benchmarkNestedALS(
        Math.floor(config.iterations / 5), 
        config.dataSize
      );
      
      const overheadPercent = ((withALS.duration - withoutALS.duration) / withoutALS.duration) * 100;
      const nestedOverheadPercent = ((nestedALS.duration - withoutALS.duration) / withoutALS.duration) * 100;
      
      const benchmark = {
        name: config.name,
        config,
        withoutALS,
        withALS,
        nestedALS,
        overhead: {
          timePercent: overheadPercent,
          nestedTimePercent: nestedOverheadPercent,
          memoryRSSBytes: withALS.memoryDelta.rss - withoutALS.memoryDelta.rss,
          memoryHeapBytes: withALS.memoryDelta.heapUsed - withoutALS.memoryDelta.heapUsed
        }
      };
      
      this.results.benchmarks.push(benchmark);
      
      console.log(`  Results:`);
      console.log(`    Without ALS: ${withoutALS.duration.toFixed(2)}ms`);
      console.log(`    With ALS: ${withALS.duration.toFixed(2)}ms`);
      console.log(`    Nested ALS: ${nestedALS.duration.toFixed(2)}ms`);
      console.log(`    Overhead: ${overheadPercent.toFixed(2)}%`);
      console.log(`    Nested Overhead: ${nestedOverheadPercent.toFixed(2)}%`);
      console.log(`    Memory Overhead (RSS): ${(benchmark.overhead.memoryRSSBytes / 1024 / 1024).toFixed(2)}MB`);
    }

    // Run AsyncContextFrame-specific tests (especially valuable for Node.js v24+)
    console.log('\n' + '=' .repeat(60));
    console.log('ASYNCCONTEXTFRAME PERFORMANCE TESTS');
    console.log('=' .repeat(60));
    console.log('These tests target specific improvements in Node.js v24.0.0+ AsyncContextFrame implementation:');
    
    for (const testConfig of asyncContextFrameTests) {
      console.log(`\nTesting: ${testConfig.name}`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      let testResult;
      let testName = testConfig.name;
      
      switch (testConfig.test) {
        case 'contextSwitching':
          console.log(`  Running high-frequency context switching (${testConfig.iterations} switches)...`);
          testResult = await this.benchmarkHighFrequencyContextSwitching(testConfig.iterations);
          break;
          
        case 'concurrent':
          console.log(`  Running concurrent context operations (${testConfig.concurrency} concurrent, ${testConfig.operationsPerConcurrency} ops each)...`);
          testResult = await this.benchmarkConcurrentContextOperations(testConfig.concurrency, testConfig.operationsPerConcurrency);
          break;
          
        case 'propagation':
          console.log(`  Running context propagation stress test (${testConfig.chains} chains, depth ${testConfig.depth})...`);
          testResult = await this.benchmarkContextPropagationStress(testConfig.chains, testConfig.depth);
          break;
          
        default:
          console.log(`  Unknown test type: ${testConfig.test}`);
          continue;
      }
      
      const benchmark = {
        name: testName,
        type: 'asyncContextFrame',
        config: testConfig,
        result: testResult
      };
      
      this.results.benchmarks.push(benchmark);
      
      console.log(`  Results:`);
      console.log(`    Duration: ${testResult.duration.toFixed(2)}ms`);
      
      if (testResult.contextSwitchesPerSecond) {
        console.log(`    Context Switches/sec: ${testResult.contextSwitchesPerSecond.toFixed(0)}`);
      }
      
      if (testResult.operationsPerSecond) {
        console.log(`    Operations/sec: ${testResult.operationsPerSecond.toFixed(0)}`);
      }
      
      if (testResult.contextMixingErrors !== undefined) {
        console.log(`    Context Mixing Errors: ${testResult.contextMixingErrors} (${((testResult.contextMixingErrors / testResult.totalOperations) * 100).toFixed(2)}%)`);
      }
      
      if (testResult.successfulChains !== undefined) {
        console.log(`    Successful Chains: ${testResult.successfulChains}/${testConfig.chains} (${((testResult.successfulChains / testConfig.chains) * 100).toFixed(2)}%)`);
      }
      
      console.log(`    Memory Usage (RSS): ${(testResult.memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Note: Distributed system benchmark removed - not needed for current analysis
    
    // Save results
    await this.saveResults();
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('SUMMARY');
    console.log('=' .repeat(60));
    
    // Separate traditional benchmarks from AsyncContextFrame tests
    const traditionalBenchmarks = this.results.benchmarks.filter(b => !b.type || b.type !== 'asyncContextFrame');
    const asyncContextFrameBenchmarks = this.results.benchmarks.filter(b => b.type === 'asyncContextFrame');
    
    if (traditionalBenchmarks.length > 0) {
      const avgOverhead = traditionalBenchmarks.reduce((sum, b) => sum + (b.overhead?.timePercent || 0), 0) / traditionalBenchmarks.length;
      const avgNestedOverhead = traditionalBenchmarks.reduce((sum, b) => sum + (b.overhead?.nestedTimePercent || 0), 0) / traditionalBenchmarks.length;
      const totalMemoryOverhead = traditionalBenchmarks.reduce((sum, b) => sum + (b.overhead?.memoryRSSBytes || 0), 0);
      
      console.log(`Node.js Version: ${this.results.nodeVersion}`);
      console.log(`Average AsyncLocalStorage Overhead: ${avgOverhead.toFixed(2)}%`);
      console.log(`Average Nested ALS Overhead: ${avgNestedOverhead.toFixed(2)}%`);
      console.log(`Total Memory Overhead: ${(totalMemoryOverhead / 1024 / 1024).toFixed(2)}MB`);
      
      console.log('\nTraditional Usage Recommendations:');
      if (avgOverhead < 5) {
        console.log('✅ AsyncLocalStorage overhead is minimal for most use cases');
      } else if (avgOverhead < 15) {
        console.log('⚠️  AsyncLocalStorage has moderate overhead - consider for high-throughput applications');
      } else {
        console.log('❌ AsyncLocalStorage has significant overhead - use with caution');
      }
      
      if (avgNestedOverhead > avgOverhead * 2) {
        console.log('⚠️  Nested AsyncLocalStorage calls significantly increase overhead');
      }
    }
    
    // AsyncContextFrame performance summary
    if (asyncContextFrameBenchmarks.length > 0) {
      console.log('\nAsyncContextFrame Performance Results:');
      
      const contextSwitchingTest = asyncContextFrameBenchmarks.find(b => b.config?.test === 'contextSwitching');
      if (contextSwitchingTest) {
        console.log(`Context Switching Performance: ${contextSwitchingTest.result.contextSwitchesPerSecond.toFixed(0)} switches/sec`);
      }
      
      const concurrentTest = asyncContextFrameBenchmarks.find(b => b.config?.test === 'concurrent');
      if (concurrentTest) {
        const errorRate = (concurrentTest.result.contextMixingErrors / concurrentTest.result.totalOperations) * 100;
        console.log(`Concurrent Operations: ${concurrentTest.result.operationsPerSecond.toFixed(0)} ops/sec, Context Mixing Errors: ${errorRate.toFixed(2)}%`);
      }
      
      const propagationTest = asyncContextFrameBenchmarks.find(b => b.config?.test === 'propagation');
      if (propagationTest) {
        const successRate = (propagationTest.result.successfulChains / propagationTest.config.chains) * 100;
        console.log(`Context Propagation: ${propagationTest.result.operationsPerSecond.toFixed(0)} async ops/sec, Success Rate: ${successRate.toFixed(2)}%`);
      }
      
      console.log('\nAsyncContextFrame Analysis:');
      if (this.results.nodeVersion.startsWith('v24.') || parseInt(this.results.nodeVersion.substring(1)) >= 24) {
        console.log('🚀 Node.js v24+ detected - these results show AsyncContextFrame performance improvements');
        console.log('📊 Compare these metrics with older Node.js versions to see the dramatic improvements');
      } else {
        console.log('📋 Running on pre-v24 Node.js - these results use traditional async hooks implementation');
        console.log('🔄 Run the same tests on Node.js v24+ to see AsyncContextFrame performance improvements');
      }
    }
  }

  async saveResults() {
    const resultsDir = path.join(process.cwd(), 'public', 'results');
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const filename = `benchmark_${this.results.nodeVersion.replace(/\./g, '_')}_${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${filepath}`);
  }
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new AsyncLocalStorageBenchmark();
  benchmark.runBenchmarks().catch(console.error);
}

export { AsyncLocalStorageBenchmark };
