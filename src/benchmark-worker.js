import { parentPort, workerData } from 'worker_threads';
import { runBenchmark } from './benchmark-distributed.js';

/**
 * Worker thread implementation for distributed benchmark
 * Runs the benchmark in an isolated thread and reports results back to main thread
 */
async function runWorkerBenchmark() {
  const { variant, options } = workerData;
  
  console.log(`Worker ${options.workerId} starting ${variant} benchmark...`);
  
  try {
    // Run the benchmark
    const result = await runBenchmark(variant, options);
    
    // Add worker-specific metadata
    result.workerId = options.workerId;
    result.workerCount = options.workerCount;
    result.threadId = process.pid;
    
    // Send results back to main thread
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({ 
      error: error.message,
      workerId: options.workerId,
      variant,
    });
  }
}

// Start the benchmark
runWorkerBenchmark();
