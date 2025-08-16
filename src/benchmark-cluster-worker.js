import cluster from 'cluster';
import { runBenchmark } from './benchmark-distributed.js';

/**
 * Cluster worker implementation for distributed benchmark
 * Runs the benchmark in a separate process and reports results back to primary
 */
async function runClusterWorkerBenchmark() {
  // Parse command line arguments instead of environment variables
  const args = process.argv.slice(2);
  const variantIndex = args.indexOf('--variant');
  const optionsIndex = args.indexOf('--options');
  
  if (variantIndex === -1 || optionsIndex === -1) {
    console.error('Missing required arguments: --variant and --options');
    process.exit(1);
  }
  
  const variant = args[variantIndex + 1];
  const options = JSON.parse(args[optionsIndex + 1]);
  
  console.log(`Cluster worker (PID: ${process.pid}) starting ${variant} benchmark...`);
  
  try {
    // Run the benchmark
    const result = await runBenchmark(variant, {
      ...options,
      processId: process.pid,
    });
    
    // Send results back to primary process
    process.send(result);
    
    // Exit gracefully
    process.exit(0);
  } catch (error) {
    console.error(`Cluster worker error: ${error.message}`);
    process.exit(1);
  }
}

// Start the benchmark if this is a worker
if (cluster.isWorker) {
  runClusterWorkerBenchmark();
}
