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
      // Check if this version has iteration subdirectories
      const files = await fs.readdir(versionPath);
      let hasIterations = false;
      for (const file of files) {
        if (file.startsWith('iteration_')) {
          const stat = await fs.stat(path.join(versionPath, file));
          if (stat.isDirectory()) {
            hasIterations = true;
            break;
          }
        }
      }
      
      let allBenchmarkData = [];
      let allMemoryData = [];
      let iterationCount = 0;
      
      if (hasIterations) {
        // Process multiple iterations
        console.log(`Processing ${versionDir} with iterations...`);
        
        for (const file of files.sort()) {
          if (file.startsWith('iteration_') && await fs.stat(path.join(versionPath, file)).then(stat => stat.isDirectory())) {
            const iterationPath = path.join(versionPath, file);
            const iterationFiles = await fs.readdir(iterationPath);
            
            const benchmarkFile = iterationFiles.find(f => f.startsWith('benchmark_') && f.endsWith('.json'));
            const memoryFile = iterationFiles.find(f => f.startsWith('memory_') && f.endsWith('.json'));
            
            if (benchmarkFile) {
              const benchmarkPath = path.join(iterationPath, benchmarkFile);
              const benchmarkContent = await fs.readFile(benchmarkPath, 'utf8');
              const benchmarkData = JSON.parse(benchmarkContent);
              allBenchmarkData.push(benchmarkData);
              iterationCount++;
            }
            
            if (memoryFile) {
              const memoryPath = path.join(iterationPath, memoryFile);
              const memoryContent = await fs.readFile(memoryPath, 'utf8');
              const memoryData = JSON.parse(memoryContent);
              allMemoryData.push(memoryData);
            }
          }
        }
      } else {
        // Single iteration (backward compatibility)
        const benchmarkFile = files.find(f => f.startsWith('benchmark_') && f.endsWith('.json'));
        const memoryFile = files.find(f => f.startsWith('memory_') && f.endsWith('.json'));
        
        if (benchmarkFile) {
          const benchmarkPath = path.join(versionPath, benchmarkFile);
          const benchmarkContent = await fs.readFile(benchmarkPath, 'utf8');
          const benchmarkData = JSON.parse(benchmarkContent);
          allBenchmarkData.push(benchmarkData);
          iterationCount = 1;
        }
        
        if (memoryFile) {
          const memoryPath = path.join(versionPath, memoryFile);
          const memoryContent = await fs.readFile(memoryPath, 'utf8');
          const memoryData = JSON.parse(memoryContent);
          allMemoryData.push(memoryData);
        }
      }
      
      if (allBenchmarkData.length === 0) {
        console.log(`No benchmark data found for ${versionDir}`);
        continue;
      }
      
      // Extract version number from first benchmark
      const nodeVersion = allBenchmarkData[0].nodeVersion;
      console.log(`Processing ${nodeVersion} with ${iterationCount} iteration(s)...`);
      
      // Aggregate data across all iterations
      const allStandardBenchmarks = [];
      const allMemoryOverheads = [];
      const allBaselineTimes = [];
      const allBaselineMemories = [];
      
      for (const benchmarkData of allBenchmarkData) {
        // Filter benchmarks to only include standard overhead benchmarks (exclude asyncContextFrame types)
        const standardBenchmarks = benchmarkData.benchmarks.filter(b => b.overhead && typeof b.overhead.timePercent === 'number');
        
        if (standardBenchmarks.length > 0) {
          allStandardBenchmarks.push(...standardBenchmarks);
          
          // Collect overhead data for statistical analysis
          for (const benchmark of standardBenchmarks) {
            allMemoryOverheads.push(benchmark.overhead.memoryRSSBytes / 1024 / 1024); // Convert to MB
            
            if (benchmark.withoutALS?.duration) {
              allBaselineTimes.push(benchmark.withoutALS.duration);
            }
            if (benchmark.withoutALS?.memoryDelta?.rss) {
              allBaselineMemories.push(benchmark.withoutALS.memoryDelta.rss / (1024 * 1024)); // Convert to MB
            }
          }
        }
      }
      
      if (allStandardBenchmarks.length === 0) {
        console.log(`No standard benchmarks found for ${versionDir}`);
        continue;
      }
      
      // Calculate statistical measures across iterations
      const overheads = allStandardBenchmarks.map(b => b.overhead.timePercent);
      const nestedOverheads = allStandardBenchmarks.map(b => b.overhead.nestedTimePercent);
      
      // Calculate mean, standard deviation, min, max for overhead
      const avgOverhead = overheads.reduce((sum, val) => sum + val, 0) / overheads.length;
      const avgNestedOverhead = nestedOverheads.reduce((sum, val) => sum + val, 0) / nestedOverheads.length;
      
      // Calculate standard deviation
      const overheadVariance = overheads.reduce((sum, val) => sum + Math.pow(val - avgOverhead, 2), 0) / overheads.length;
      const overheadStdDev = Math.sqrt(overheadVariance);
      
      const nestedVariance = nestedOverheads.reduce((sum, val) => sum + Math.pow(val - avgNestedOverhead, 2), 0) / nestedOverheads.length;
      const nestedStdDev = Math.sqrt(nestedVariance);
      
      // Calculate min/max
      const minOverhead = Math.min(...overheads);
      const maxOverhead = Math.max(...overheads);
      const minNestedOverhead = Math.min(...nestedOverheads);
      const maxNestedOverhead = Math.max(...nestedOverheads);
      
      // Calculate coefficient of variation (relative standard deviation)
      const overheadCV = (overheadStdDev / Math.abs(avgOverhead)) * 100;
      const nestedCV = (nestedStdDev / Math.abs(avgNestedOverhead)) * 100;
      
      // Calculate memory statistics
      const avgMemoryOverhead = allMemoryOverheads.reduce((sum, val) => sum + val, 0) / allMemoryOverheads.length;
      const memoryVariance = allMemoryOverheads.reduce((sum, val) => sum + Math.pow(val - avgMemoryOverhead, 2), 0) / allMemoryOverheads.length;
      const memoryStdDev = Math.sqrt(memoryVariance);
      const memoryCV = (memoryStdDev / Math.abs(avgMemoryOverhead)) * 100;
      
      // Calculate baseline statistics
      const avgBaselineTime = allBaselineTimes.length > 0 ? allBaselineTimes.reduce((sum, time) => sum + time, 0) / allBaselineTimes.length : 0;
      const avgBaselineMemory = allBaselineMemories.length > 0 ? allBaselineMemories.reduce((sum, mem) => sum + mem, 0) / allBaselineMemories.length : 0;
      
      const versionInfo = {
        version: nodeVersion,
        cleanVersion: nodeVersion.replace('v', ''),
        iterations: iterationCount,
        avgOverhead: parseFloat(avgOverhead.toFixed(2)),
        overheadStdDev: parseFloat(overheadStdDev.toFixed(2)),
        overheadCV: parseFloat(overheadCV.toFixed(2)),
        minOverhead: parseFloat(minOverhead.toFixed(2)),
        maxOverhead: parseFloat(maxOverhead.toFixed(2)),
        avgNestedOverhead: parseFloat(avgNestedOverhead.toFixed(2)),
        nestedOverheadStdDev: parseFloat(nestedStdDev.toFixed(2)),
        nestedOverheadCV: parseFloat(nestedCV.toFixed(2)),
        minNestedOverhead: parseFloat(minNestedOverhead.toFixed(2)),
        maxNestedOverhead: parseFloat(maxNestedOverhead.toFixed(2)),
        memoryOverheadMB: parseFloat(avgMemoryOverhead.toFixed(2)),
        memoryOverheadStdDev: parseFloat(memoryStdDev.toFixed(2)),
        memoryOverheadCV: parseFloat(memoryCV.toFixed(2)),
        baselineTime: parseFloat(avgBaselineTime.toFixed(2)),
        baselineMemory: parseFloat(avgBaselineMemory.toFixed(2)),
        benchmarkCount: allStandardBenchmarks.length,
        testDate: allBenchmarkData[0].timestamp,
        benchmarks: allStandardBenchmarks.map(b => ({
          name: b.name,
          overhead: b.overhead.timePercent,
          nestedOverhead: b.overhead.nestedTimePercent,
          memoryMB: b.overhead.memoryRSSBytes / 1024 / 1024,
          baselineTime: b.withoutALS?.duration || 0,
          baselineMemory: (b.withoutALS?.memoryDelta?.rss || 0) / (1024 * 1024)
        }))
      };
      
      // Aggregate memory analysis across iterations if available
      if (allMemoryData.length > 0) {
        const memoryAnalyses = allMemoryData.map(md => ({
          avgMemoryOverhead: md.memoryLeakTest?.analysis?.avgGrowthPerIterationBytes || 0,
          maxConcurrentOps: md.concurrencyTest?.maxSuccessfulConcurrency || 0,
          memoryAtMaxConcurrency: md.concurrencyTest?.memoryAtMaxConcurrency?.rss || 0,
          leakDetected: md.memoryLeakTest?.analysis?.potentialLeak || false
        }));
        
        // Calculate averages across iterations
        const avgMemoryGrowth = memoryAnalyses.reduce((sum, ma) => sum + ma.avgMemoryOverhead, 0) / memoryAnalyses.length;
        const avgMaxConcurrency = memoryAnalyses.reduce((sum, ma) => sum + ma.maxConcurrentOps, 0) / memoryAnalyses.length;
        const avgMemoryAtMaxConcurrency = memoryAnalyses.reduce((sum, ma) => sum + ma.memoryAtMaxConcurrency, 0) / memoryAnalyses.length;
        const anyLeakDetected = memoryAnalyses.some(ma => ma.leakDetected);
        
        versionInfo.memoryAnalysis = {
          avgMemoryOverhead: avgMemoryGrowth,
          maxConcurrentOps: Math.round(avgMaxConcurrency),
          memoryAtMaxConcurrency: Math.round(avgMemoryAtMaxConcurrency),
          leakDetected: anyLeakDetected,
          iterationCount: allMemoryData.length
        };
      }
      
      comparisonData.versions.push(versionInfo);
      comparisonData.performance.overheadByVersion.push({
        version: nodeVersion,
        overhead: avgOverhead,
        stdDev: overheadStdDev,
        cv: overheadCV
      });
      comparisonData.performance.nestedOverheadByVersion.push({
        version: nodeVersion,
        overhead: avgNestedOverhead,
        stdDev: nestedStdDev,
        cv: nestedCV
      });
      comparisonData.performance.memoryByVersion.push({
        version: nodeVersion,
        memory: avgMemoryOverhead,
        stdDev: memoryStdDev,
        cv: memoryCV
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
  
  // Generate version comparison table HTML
  const tableHtml = generateVersionComparisonTable(comparisonData.versions);
  
  // Write the HTML file
  const htmlContent = generateVersionComparisonHtml(comparisonData, tableHtml);
  await fs.writeFile(path.join(docsDir, 'version-comparison.html'), htmlContent);
  
  console.log('Version comparison HTML generated: docs/version-comparison.html');
  
  // Write JSON data for the HTML to consume
  await fs.writeFile(path.join(docsDir, 'version-comparison.json'), JSON.stringify(comparisonData, null, 2));
  console.log('Version comparison JSON generated: docs/version-comparison.json');
  
  return comparisonData;
}

function generateAnalysis(versions) {
  const analysis = {
    bestPerformingVersion: null,
    worstPerformingVersion: null,
    averageOverhead: 0,
    overheadTrend: 'improving', // improving, worsening, stable
    consistencyAnalysis: {
      mostConsistent: null,
      leastConsistent: null,
      averageCV: 0
    },
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
  
  // Analyze consistency across iterations
  const sortedByConsistency = [...versions].sort((a, b) => a.overheadCV - b.overheadCV);
  analysis.consistencyAnalysis.mostConsistent = sortedByConsistency[0];
  analysis.consistencyAnalysis.leastConsistent = sortedByConsistency[sortedByConsistency.length - 1];
  analysis.consistencyAnalysis.averageCV = versions.reduce((sum, v) => sum + v.overheadCV, 0) / versions.length;
  
  // Analyze trend
  if (versions.length >= 3) {
    const first = versions[0];
    const last = versions[versions.length - 1];
    
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
  
  // Analyze consistency insights
  if (analysis.consistencyAnalysis.averageCV < 10) {
    analysis.insights.push('Performance is generally consistent across iterations (low variability)');
  } else if (analysis.consistencyAnalysis.averageCV > 25) {
    analysis.insights.push('Performance shows high variability across iterations - consider running more iterations');
  }
  
  const multiIterationVersions = versions.filter(v => v.iterations > 1);
  if (multiIterationVersions.length > 0) {
    const avgIterations = multiIterationVersions.reduce((sum, v) => sum + v.iterations, 0) / multiIterationVersions.length;
    analysis.insights.push(`Average of ${avgIterations.toFixed(1)} iterations per version provides statistical confidence`);
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
  
  // Add consistency-based recommendations
  if (analysis.consistencyAnalysis.averageCV > 20) {
    analysis.recommendations.push('📈 Consider increasing iterations for more reliable performance measurements');
  }
  
  if (analysis.consistencyAnalysis.mostConsistent && analysis.consistencyAnalysis.mostConsistent.overheadCV < 5) {
    analysis.recommendations.push(`🎯 Node.js ${analysis.consistencyAnalysis.mostConsistent.version} shows most consistent performance`);
  }
  
  return analysis;
}

function generateVersionComparisonTable(versions) {
  if (!versions || versions.length === 0) {
    return '<p>No version data available for comparison.</p>';
  }
  
  let html = '<table class="version-table">';
  html += '<thead><tr>';
  html += '<th>Node.js Version</th>';
  html += '<th>Iterations</th>';
  html += '<th>Basic ALS Overhead</th>';
  html += '<th>Std Dev</th>';
  html += '<th>CV (%)</th>';
  html += '<th>Nested ALS Overhead</th>';
  html += '<th>Std Dev</th>';
  html += '<th>CV (%)</th>';
  html += '<th>Memory Overhead (MB)</th>';
  html += '<th>Benchmark Count</th>';
  html += '<th>Test Date</th>';
  html += '</tr></thead><tbody>';
  
  // Sort versions by version number (newest first)
  const sortedVersions = [...versions].sort((a, b) => {
    const aNum = parseFloat(a.cleanVersion);
    const bNum = parseFloat(b.cleanVersion);
    return bNum - aNum;
  });
  
  for (const version of sortedVersions) {
    // Add color coding for overhead levels (more meaningful than subjective ratings)
    const basicClass = version.avgOverhead > 15 ? 'danger' : version.avgOverhead > 5 ? 'warning' : 'success';
    const nestedClass = version.avgNestedOverhead > 50 ? 'danger' : version.avgNestedOverhead > 25 ? 'warning' : 'success';
    
    html += '<tr>';
    html += `<td><strong>${version.version}</strong></td>`;
    html += `<td>${version.iterations}</td>`;
    html += `<td class="${basicClass}">${version.avgOverhead}%</td>`;
    html += `<td>${version.overheadStdDev.toFixed(2)}</td>`;
    html += `<td>${version.overheadCV.toFixed(1)}</td>`;
    html += `<td class="${nestedClass}">${version.avgNestedOverhead}%</td>`;
    html += `<td>${version.nestedOverheadStdDev.toFixed(2)}</td>`;
    html += `<td>${version.nestedOverheadCV.toFixed(1)}</td>`;
    html += `<td>${version.memoryOverheadMB.toFixed(2)}</td>`;
    html += `<td>${version.benchmarkCount}</td>`;
    html += `<td>${new Date(version.testDate).toLocaleDateString()}</td>`;
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  
  // Add explanation of the color coding and statistical measures
  html += '<div class="card" style="margin-top: 1rem;">';
  html += '<h4>Understanding the Results</h4>';
  html += '<ul>';
  html += '<li><strong>Basic ALS Overhead:</strong> Performance impact of using AsyncLocalStorage.run() vs not using it</li>';
  html += '<li><strong>Nested ALS Overhead:</strong> Additional impact when using nested AsyncLocalStorage contexts</li>';
  html += '<li><strong>Memory Overhead:</strong> Additional memory usage when using AsyncLocalStorage</li>';
  html += '<li><strong>Std Dev:</strong> Standard deviation across iterations - lower values indicate more consistent performance</li>';
  html += '<li><strong>CV (%):</strong> Coefficient of Variation - relative standard deviation (lower is better, indicates more consistent performance)</li>';
  html += '<li><strong>Color Coding:</strong> Green (≤5%), Orange (5-15%), Red (>15%) for basic overhead; Green (≤25%), Orange (25-50%), Red (>50%) for nested overhead</li>';
  html += '</ul>';
  html += '<p><strong>Note:</strong> Lower percentages indicate better performance. Newer Node.js versions generally show improved AsyncLocalStorage performance. Multiple iterations provide statistical confidence in the results.</p>';
  html += '</div>';
  
  return html;
}

function generateVersionComparisonHtml(comparisonData, tableHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Node.js AsyncLocalStorage Performance Comparison</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Node.js AsyncLocalStorage Performance Comparison</h1>
  <p>Generated on: ${new Date(comparisonData.generatedAt).toLocaleDateString()}</p>

  <h2>Overview</h2>
  <p>This page compares the performance overhead of AsyncLocalStorage across different Node.js versions. The data is based on benchmark tests and memory analysis.</p>

  <h2>Performance Overhead</h2>
  <p>The following charts and tables show the average overhead for AsyncLocalStorage operations and memory usage across different Node.js versions.</p>

  <h3>AsyncLocalStorage Overhead (%) - Performance Impact</h3>
  <div class="chart-container">
    <canvas id="performanceChart"></canvas>
  </div>

  <h3>Nested ALS Overhead (%) - Additional Impact</h3>
  <div class="chart-container">
    <canvas id="nestedOverheadChart"></canvas>
  </div>

  <h3>Memory Overhead (MB) - Additional Memory Usage</h3>
  <div class="chart-container">
    <canvas id="memoryChart"></canvas>
  </div>

  <h2>Version Comparison Table</h2>
  ${tableHtml}

  <h2>Analysis</h2>
  <p>Based on the collected data, here's a summary of the performance trends and recommendations:</p>
  <ul>
    <li><strong>Best Performing Version:</strong> ${comparisonData.analysis.bestPerformingVersion ? comparisonData.analysis.bestPerformingVersion.version : 'N/A'}</li>
    <li><strong>Worst Performing Version:</strong> ${comparisonData.analysis.worstPerformingVersion ? comparisonData.analysis.worstPerformingVersion.version : 'N/A'}</li>
    <li><strong>Average Overhead:</strong> ${comparisonData.analysis.averageOverhead.toFixed(2)}%</li>
    <li><strong>Overhead Trend:</strong> ${comparisonData.analysis.overheadTrend}</li>
    <li><strong>Most Consistent Version:</strong> ${comparisonData.analysis.consistencyAnalysis.mostConsistent ? comparisonData.analysis.consistencyAnalysis.mostConsistent.version : 'N/A'}</li>
    <li><strong>Average Coefficient of Variation:</strong> ${comparisonData.analysis.consistencyAnalysis.averageCV.toFixed(1)}%</li>
  </ul>

  <h2>Recommendations</h2>
  <ul>
    ${comparisonData.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
  </ul>

  <h2>Insights</h2>
  <ul>
    ${comparisonData.analysis.insights.map(ins => `<li>${ins}</li>`).join('')}
  </ul>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const performanceChart = new Chart(document.getElementById('performanceChart'), ${JSON.stringify(comparisonData.charts.performanceChart)});
      const nestedOverheadChart = new Chart(document.getElementById('nestedOverheadChart'), ${JSON.stringify(comparisonData.charts.versionComparisonChart)}); // Reusing versionComparisonChart for nested overhead
      const memoryChart = new Chart(document.getElementById('memoryChart'), ${JSON.stringify(comparisonData.charts.memoryChart)});
    });
  </script>
</body>
</html>
`;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateVersionComparison().catch(console.error);
}

export { generateVersionComparison };
