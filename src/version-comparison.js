import fs from 'fs/promises';
import path from 'path';

async function generateVersionComparison() {
  const resultsDir = path.join(process.cwd(), 'results', 'versions');
  const docsDir = path.join(process.cwd(), 'docs');
  
  // Ensure docs directory exists
  await fs.mkdir(docsDir, { recursive: true });
  
  // Read all version directories
  const versionDirs = await fs.readdir(resultsDir);
  const nodeVersionDirs = versionDirs.filter(dir => dir.startsWith('node_') && dir !== 'SUMMARY.md');
  
  console.log(`Found ${nodeVersionDirs.length} Node.js versions to compare:`, nodeVersionDirs);
  
  const comparisonData = {
    generatedAt: new Date().toISOString(),
    versions: [],
    performance: {
      overheadByVersion: [],
      nestedOverheadByVersion: [],
      memoryByVersion: []
    },
    charts: {
      performanceChart: null,
      memoryChart: null,
      versionComparisonChart: null
    }
  };
  
  // Process each version
  for (const versionDir of nodeVersionDirs.sort()) {
    const versionPath = path.join(resultsDir, versionDir);
    
    try {
      // Find the benchmark JSON file
      const files = await fs.readdir(versionPath);
      const benchmarkFile = files.find(f => f.startsWith('benchmark_') && f.endsWith('.json'));
      const memoryFile = files.find(f => f.startsWith('memory_') && f.endsWith('.json'));
      
      if (!benchmarkFile) {
        console.log(`No benchmark file found for ${versionDir}`);
        continue;
      }
      
      // Read benchmark data
      const benchmarkPath = path.join(versionPath, benchmarkFile);
      const benchmarkContent = await fs.readFile(benchmarkPath, 'utf8');
      const benchmarkData = JSON.parse(benchmarkContent);
      
      // Read memory data if available
      let memoryData = null;
      if (memoryFile) {
        const memoryPath = path.join(versionPath, memoryFile);
        const memoryContent = await fs.readFile(memoryPath, 'utf8');
        memoryData = JSON.parse(memoryContent);
      }
      
      // Extract version number
      const nodeVersion = benchmarkData.nodeVersion;
      console.log(`Processing ${nodeVersion}...`);
      
      // Filter benchmarks to only include standard overhead benchmarks (exclude asyncContextFrame types)
      const standardBenchmarks = benchmarkData.benchmarks.filter(b => b.overhead && typeof b.overhead.timePercent === 'number');
      
      if (standardBenchmarks.length === 0) {
        console.log(`No standard benchmarks found for ${versionDir}`);
        continue;
      }
      
      // Calculate averages
      const avgOverhead = standardBenchmarks.reduce((sum, b) => sum + b.overhead.timePercent, 0) / standardBenchmarks.length;
      const avgNestedOverhead = standardBenchmarks.reduce((sum, b) => sum + b.overhead.nestedTimePercent, 0) / standardBenchmarks.length;
      const totalMemoryOverhead = standardBenchmarks.reduce((sum, b) => sum + b.overhead.memoryRSSBytes, 0) / 1024 / 1024; // Convert to MB
      
      const versionInfo = {
        version: nodeVersion,
        cleanVersion: nodeVersion.replace('v', ''),
        avgOverhead: parseFloat(avgOverhead.toFixed(2)),
        avgNestedOverhead: parseFloat(avgNestedOverhead.toFixed(2)),
        memoryOverheadMB: parseFloat(totalMemoryOverhead.toFixed(2)),
        benchmarkCount: standardBenchmarks.length,
        testDate: benchmarkData.timestamp,
        benchmarks: standardBenchmarks.map(b => ({
          name: b.name,
          overhead: b.overhead.timePercent,
          nestedOverhead: b.overhead.nestedTimePercent,
          memoryMB: b.overhead.memoryRSSBytes / 1024 / 1024
        }))
      };
      
      if (memoryData) {
        versionInfo.memoryAnalysis = {
          avgMemoryOverhead: memoryData.memoryLeakTest?.analysis?.avgGrowthPerIterationBytes || 0,
          maxConcurrentOps: memoryData.concurrencyTest?.maxSuccessfulConcurrency || 0,
          memoryAtMaxConcurrency: memoryData.concurrencyTest?.memoryAtMaxConcurrency?.rss || 0,
          leakDetected: memoryData.memoryLeakTest?.analysis?.potentialLeak || false
        };
      }
      
      comparisonData.versions.push(versionInfo);
      comparisonData.performance.overheadByVersion.push({
        version: nodeVersion,
        overhead: avgOverhead
      });
      comparisonData.performance.nestedOverheadByVersion.push({
        version: nodeVersion,
        overhead: avgNestedOverhead
      });
      comparisonData.performance.memoryByVersion.push({
        version: nodeVersion,
        memory: totalMemoryOverhead
      });
      
    } catch (error) {
      console.error(`Error processing ${versionDir}:`, error.message);
    }
  }
  
  // Sort versions
  comparisonData.versions.sort((a, b) => {
    const versionA = a.cleanVersion.split('.').map(num => parseInt(num, 10));
    const versionB = b.cleanVersion.split('.').map(num => parseInt(num, 10));
    
    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
      const numA = versionA[i] || 0;
      const numB = versionB[i] || 0;
      if (numA !== numB) {
        return numA - numB;
      }
    }
    return 0;
  });
  
  // Generate chart data
  const versions = comparisonData.versions.map(v => v.cleanVersion);
  const overheads = comparisonData.versions.map(v => v.avgOverhead);
  const nestedOverheads = comparisonData.versions.map(v => v.avgNestedOverhead);
  const memoryOverheads = comparisonData.versions.map(v => v.memoryOverheadMB);
  
  comparisonData.charts.performanceChart = {
    labels: versions,
    datasets: [
      {
        label: 'AsyncLocalStorage Overhead (%)',
        data: overheads,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Nested ALS Overhead (%)',
        data: nestedOverheads,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }
    ]
  };
  
  comparisonData.charts.memoryChart = {
    labels: versions,
    datasets: [
      {
        label: 'Memory Overhead (MB)',
        data: memoryOverheads,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1
      }
    ]
  };
  
  // Create version comparison chart showing improvement trends
  const improvements = comparisonData.versions.map((version, index) => {
    if (index === 0) return 0;
    const previous = comparisonData.versions[index - 1];
    return ((previous.avgOverhead - version.avgOverhead) / Math.abs(previous.avgOverhead)) * 100;
  });
  
  comparisonData.charts.versionComparisonChart = {
    labels: versions,
    datasets: [
      {
        label: 'Performance Improvement (%)',
        data: improvements,
        backgroundColor: improvements.map(i => i >= 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'),
        borderColor: improvements.map(i => i >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'),
        borderWidth: 1
      }
    ]
  };
  
  // Generate analysis and recommendations
  comparisonData.analysis = generateAnalysis(comparisonData.versions);
  
  // Save comparison data
  await fs.writeFile(
    path.join(docsDir, 'version-comparison.json'),
    JSON.stringify(comparisonData, null, 2)
  );
  
  // Update chart-data.json for the main docs
  const chartData = {
    generatedAt: comparisonData.generatedAt,
    performanceChart: comparisonData.charts.performanceChart,
    memoryChart: comparisonData.charts.memoryChart,
    versionComparisonChart: comparisonData.charts.versionComparisonChart
  };
  
  await fs.writeFile(
    path.join(docsDir, 'chart-data.json'),
    JSON.stringify(chartData, null, 2)
  );
  
  console.log('✅ Version comparison data generated');
  console.log(`📊 Compared ${comparisonData.versions.length} Node.js versions`);
  console.log('📁 Files created:');
  console.log('   - docs/version-comparison.json');
  console.log('   - docs/chart-data.json');
  
  return comparisonData;
}

function generateAnalysis(versions) {
  const analysis = {
    bestPerformingVersion: null,
    worstPerformingVersion: null,
    averageOverhead: 0,
    overheadTrend: 'improving', // improving, worsening, stable
    recommendations: [],
    insights: []
  };
  
  if (versions.length === 0) return analysis;
  
  // Find best and worst performing versions
  const sortedByOverhead = [...versions].sort((a, b) => a.avgOverhead - b.avgOverhead);
  analysis.bestPerformingVersion = sortedByOverhead[0];
  analysis.worstPerformingVersion = sortedByOverhead[sortedByOverhead.length - 1];
  
  // Calculate average overhead
  analysis.averageOverhead = versions.reduce((sum, v) => sum + v.avgOverhead, 0) / versions.length;
  
  // Analyze trend
  if (versions.length >= 3) {
    const first = versions[0];
    const last = versions[versions.length - 1];
    const middle = versions[Math.floor(versions.length / 2)];
    
    if (last.avgOverhead < first.avgOverhead) {
      analysis.overheadTrend = 'improving';
    } else if (last.avgOverhead > first.avgOverhead) {
      analysis.overheadTrend = 'worsening';
    } else {
      analysis.overheadTrend = 'stable';
    }
  }
  
  // Generate insights
  analysis.insights.push(
    `AsyncLocalStorage performance varies by ${(analysis.worstPerformingVersion.avgOverhead - analysis.bestPerformingVersion.avgOverhead).toFixed(2)}% between Node.js versions`
  );
  
  if (analysis.overheadTrend === 'improving') {
    analysis.insights.push('Performance has generally improved in newer Node.js versions');
  }
  
  const lowOverheadVersions = versions.filter(v => Math.abs(v.avgOverhead) < 2);
  if (lowOverheadVersions.length > 0) {
    analysis.insights.push(`${lowOverheadVersions.length} version(s) show minimal AsyncLocalStorage overhead (<2%)`);
  }
  
  const highNestedOverhead = versions.filter(v => v.avgNestedOverhead > 50);
  if (highNestedOverhead.length > 0) {
    analysis.insights.push(`Nested AsyncLocalStorage calls add significant overhead (>50%) across all tested versions`);
  }
  
  // Generate recommendations
  analysis.recommendations.push('✅ AsyncLocalStorage is generally safe to use in production with minimal overhead');
  
  if (analysis.bestPerformingVersion.version !== versions[versions.length - 1].version) {
    analysis.recommendations.push(`🔧 Consider using Node.js ${analysis.bestPerformingVersion.version} for optimal AsyncLocalStorage performance`);
  } else {
    analysis.recommendations.push('🔧 Latest Node.js version provides optimal AsyncLocalStorage performance');
  }
  
  analysis.recommendations.push('⚠️ Avoid deeply nested AsyncLocalStorage contexts to minimize performance impact');
  
  if (analysis.averageOverhead < 5) {
    analysis.recommendations.push('📊 AsyncLocalStorage overhead is acceptable for most production workloads');
  } else {
    analysis.recommendations.push('🚨 Consider performance implications for high-throughput applications');
  }
  
  return analysis;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateVersionComparison().catch(console.error);
}

export { generateVersionComparison };
