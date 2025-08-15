#!/usr/bin/env node

import { AsyncLocalStorageBenchmark } from './benchmark.js';
import { MemoryProfiler } from './memory-test.js';
import { ReportGenerator } from './report-generator.js';
import { generateDocumentationSite } from './generate-docs.js';

const COMMANDS = {
  benchmark: 'Run performance benchmarks',
  memory: 'Run memory profiling tests',
  report: 'Generate reports from existing results',
  docs: 'Generate documentation site',
  all: 'Run all tests and generate reports',
  help: 'Show this help message'
};

function showHelp() {
  console.log('AsyncLocalStorage Performance Analysis Tool\n');
  console.log('Usage: npm start [command] or node src/index.js [command]\n');
  console.log('Commands:');
  
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
  
  console.log('\nExamples:');
  console.log('  npm start benchmark    # Run performance benchmarks');
  console.log('  npm start all          # Run complete analysis');
  console.log('  ./test-versions.sh     # Test across Node.js versions');
  console.log('\nFor multi-version testing, use the test-versions.sh script.');
}

async function runBenchmark() {
  console.log('🚀 Running AsyncLocalStorage performance benchmarks...\n');
  const benchmark = new AsyncLocalStorageBenchmark();
  await benchmark.runBenchmarks();
}

async function runMemoryTests() {
  console.log('🧠 Running AsyncLocalStorage memory profiling...\n');
  const profiler = new MemoryProfiler();
  await profiler.runMemoryTests();
}

async function generateReports() {
  console.log('📊 Generating performance reports...\n');
  const generator = new ReportGenerator();
  await generator.generateReports();
}

async function generateDocs() {
  console.log('📚 Generating documentation site...\n');
  await generateDocumentationSite();
}

async function runAll() {
  console.log('🎯 Running complete AsyncLocalStorage analysis...\n');
  console.log('This will run benchmarks, memory tests, and generate reports.\n');
  
  try {
    await runBenchmark();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await runMemoryTests();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await generateReports();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await generateDocs();
    
    console.log('\n🎉 Complete analysis finished!');
    console.log('📁 Results available in: ./results/');
    console.log('🌐 Documentation available in: ./docs/');
    console.log('🚀 Start local server: npm run serve-docs');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2] || 'help';
  
  console.log(`AsyncLocalStorage Performance Analysis - Node.js ${process.version}\n`);
  
  switch (command.toLowerCase()) {
    case 'benchmark':
    case 'bench':
      await runBenchmark();
      break;
      
    case 'memory':
    case 'mem':
      await runMemoryTests();
      break;
      
    case 'report':
    case 'reports':
      await generateReports();
      break;
      
    case 'docs':
    case 'documentation':
      await generateDocs();
      break;
      
    case 'all':
    case 'complete':
      await runAll();
      break;
      
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error('❌ Application error:', error.message);
  process.exit(1);
});
