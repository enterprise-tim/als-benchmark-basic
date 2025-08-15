import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ReportGenerator {
  constructor() {
    this.resultsDir = path.join(process.cwd(), 'results');
    this.outputDir = path.join(process.cwd(), 'docs');
  }

  async generateReports() {
    console.log('Generating comprehensive performance reports...');
    
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Load all benchmark and memory test results
    const benchmarkFiles = await this.findFiles(this.resultsDir, 'benchmark_*.json');
    const memoryFiles = await this.findFiles(this.resultsDir, 'memory_*.json');
    
    console.log(`Found ${benchmarkFiles.length} benchmark files and ${memoryFiles.length} memory files`);
    
    // Parse all results
    const benchmarkResults = await this.loadResults(benchmarkFiles);
    const memoryResults = await this.loadResults(memoryFiles);
    
    // Generate different reports
    await this.generateSummaryReport(benchmarkResults, memoryResults);
    await this.generateDetailedReport(benchmarkResults, memoryResults);
    await this.generateComparisonReport(benchmarkResults);
    await this.generateVisualizationData(benchmarkResults, memoryResults);
    
    console.log(`Reports generated in ${this.outputDir}`);
  }

  async findFiles(dir, pattern) {
    try {
      const files = await fs.readdir(dir, { recursive: true });
      const patternRegex = new RegExp(pattern.replace('*', '.*'));
      
      return files
        .filter(file => patternRegex.test(path.basename(file)))
        .map(file => path.join(dir, file));
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error.message);
      return [];
    }
  }

  async loadResults(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const data = JSON.parse(content);
        results.push({
          ...data,
          filePath: file,
          fileName: path.basename(file)
        });
      } catch (error) {
        console.warn(`Could not load ${file}:`, error.message);
      }
    }
    
    return results;
  }

  async generateSummaryReport(benchmarkResults, memoryResults) {
    const latestBenchmark = benchmarkResults
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    const latestMemory = memoryResults
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!latestBenchmark && !latestMemory) {
      console.warn('No results found to generate summary report');
      return;
    }

    let report = `# AsyncLocalStorage Performance Summary\n\n`;
    report += `Generated on: ${new Date().toISOString()}\n\n`;

    if (latestBenchmark) {
      report += `## Latest Benchmark Results\n\n`;
      report += `**Node.js Version:** ${latestBenchmark.nodeVersion}\n`;
      report += `**Platform:** ${latestBenchmark.platform} ${latestBenchmark.arch}\n`;
      report += `**Test Date:** ${latestBenchmark.timestamp}\n\n`;

      const avgOverhead = latestBenchmark.benchmarks.reduce((sum, b) => sum + b.overhead.timePercent, 0) / latestBenchmark.benchmarks.length;
      const avgNestedOverhead = latestBenchmark.benchmarks.reduce((sum, b) => sum + b.overhead.nestedTimePercent, 0) / latestBenchmark.benchmarks.length;

      report += `### Performance Overview\n\n`;
      report += `- **Average AsyncLocalStorage Overhead:** ${avgOverhead.toFixed(2)}%\n`;
      report += `- **Average Nested ALS Overhead:** ${avgNestedOverhead.toFixed(2)}%\n`;
      report += `- **Performance Impact:** ${this.getPerformanceAssessment(avgOverhead)}\n\n`;

      report += `### Detailed Results\n\n`;
      report += `| Test Case | ALS Overhead | Nested Overhead | Memory Impact |\n`;
      report += `|-----------|--------------|-----------------|---------------|\n`;

      for (const benchmark of latestBenchmark.benchmarks) {
        const memoryMB = (benchmark.overhead.memoryRSSBytes / 1024 / 1024).toFixed(2);
        report += `| ${benchmark.name} | ${benchmark.overhead.timePercent.toFixed(2)}% | ${benchmark.overhead.nestedTimePercent.toFixed(2)}% | ${memoryMB}MB |\n`;
      }
    }

    if (latestMemory) {
      report += `\n## Latest Memory Analysis\n\n`;
      
      if (latestMemory.memoryLeakTest) {
        const analysis = latestMemory.memoryLeakTest.analysis;
        report += `### Memory Leak Detection\n\n`;
        report += `- **Status:** ${analysis.potentialLeak ? '⚠️ Potential leak detected' : '✅ No leak detected'}\n`;
        report += `- **Average Growth per Cycle:** ${(analysis.avgGrowthPerIterationBytes / 1024 / 1024).toFixed(2)}MB\n`;
        report += `- **Total Test Growth:** ${(analysis.totalGrowthBytes / 1024 / 1024).toFixed(2)}MB\n\n`;
      }

      if (latestMemory.memoryTests) {
        report += `### Memory Usage by Object Size\n\n`;
        report += `| Object Size | Memory Overhead | Overhead % |\n`;
        report += `|-------------|-----------------|------------|\n`;

        for (const test of latestMemory.memoryTests) {
          const overheadMB = (test.overhead.heapUsed / 1024 / 1024).toFixed(2);
          const overheadPercent = test.withoutALS.delta.heapUsed > 0 
            ? ((test.overhead.heapUsed / test.withoutALS.delta.heapUsed) * 100).toFixed(2)
            : '0';
          report += `| ${test.objectSizeKB}KB | ${overheadMB}MB | ${overheadPercent}% |\n`;
        }
      }
    }

    report += `\n## Recommendations\n\n`;
    report += this.generateRecommendations(latestBenchmark, latestMemory);

    await fs.writeFile(path.join(this.outputDir, 'SUMMARY.md'), report);
    console.log('Summary report generated: docs/SUMMARY.md');
  }

  getPerformanceAssessment(overhead) {
    if (overhead < 5) return '✅ Minimal - Safe for most use cases';
    if (overhead < 15) return '⚠️ Moderate - Consider for high-throughput apps';
    return '❌ Significant - Use with caution';
  }

  generateRecommendations(benchmarkResult, memoryResult) {
    let recommendations = [];

    if (benchmarkResult) {
      const avgOverhead = benchmarkResult.benchmarks.reduce((sum, b) => sum + b.overhead.timePercent, 0) / benchmarkResult.benchmarks.length;
      
      if (avgOverhead < 5) {
        recommendations.push('✅ **AsyncLocalStorage is suitable for your use case** - Overhead is minimal across all test scenarios.');
      } else if (avgOverhead < 15) {
        recommendations.push('⚠️ **Use AsyncLocalStorage with consideration** - Moderate overhead detected. Profile your specific use case.');
        recommendations.push('💡 **Optimization tips:**\n  - Minimize data stored in AsyncLocalStorage\n  - Avoid deeply nested async operations when possible\n  - Consider alternatives for high-frequency operations');
      } else {
        recommendations.push('❌ **AsyncLocalStorage may not be suitable** - Significant overhead detected.');
        recommendations.push('🔍 **Consider alternatives:**\n  - Manual context passing\n  - Request-scoped dependency injection\n  - Thread-local storage alternatives');
      }

      const nestedOverhead = benchmarkResult.benchmarks.reduce((sum, b) => sum + b.overhead.nestedTimePercent, 0) / benchmarkResult.benchmarks.length;
      if (nestedOverhead > avgOverhead * 2) {
        recommendations.push('⚠️ **Avoid deeply nested AsyncLocalStorage calls** - Nesting significantly increases overhead.');
      }
    }

    if (memoryResult && memoryResult.memoryLeakTest && memoryResult.memoryLeakTest.analysis.potentialLeak) {
      recommendations.push('🚨 **Memory leak detected** - Monitor your AsyncLocalStorage usage for proper cleanup.');
      recommendations.push('🔧 **Memory optimization:**\n  - Ensure AsyncLocalStorage contexts are properly cleaned up\n  - Avoid storing large objects unnecessarily\n  - Regular monitoring in production environments');
    }

    if (recommendations.length === 0) {
      recommendations.push('📊 **Run more comprehensive tests** - Generate both benchmark and memory test results for complete analysis.');
    }

    return recommendations.map(rec => `${rec}\n`).join('\n');
  }

  async generateDetailedReport(benchmarkResults, memoryResults) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalBenchmarkRuns: benchmarkResults.length,
        totalMemoryTests: memoryResults.length,
        nodeVersionsTested: [...new Set([...benchmarkResults.map(r => r.nodeVersion), ...memoryResults.map(r => r.nodeVersion)])]
      },
      benchmarkResults: benchmarkResults.map(result => ({
        nodeVersion: result.nodeVersion,
        platform: result.platform,
        arch: result.arch,
        timestamp: result.timestamp,
        benchmarks: result.benchmarks,
        fileName: result.fileName
      })),
      memoryResults: memoryResults.map(result => ({
        nodeVersion: result.nodeVersion,
        platform: result.platform,
        arch: result.arch,
        timestamp: result.timestamp,
        memoryTests: result.memoryTests,
        memoryLeakTest: result.memoryLeakTest,
        concurrentTests: result.concurrentTests,
        fileName: result.fileName
      }))
    };

    await fs.writeFile(
      path.join(this.outputDir, 'detailed-results.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('Detailed report generated: docs/detailed-results.json');
  }

  async generateComparisonReport(benchmarkResults) {
    if (benchmarkResults.length < 2) {
      console.log('Not enough benchmark results for comparison report');
      return;
    }

    // Group by Node.js version
    const versionGroups = {};
    benchmarkResults.forEach(result => {
      if (!versionGroups[result.nodeVersion]) {
        versionGroups[result.nodeVersion] = [];
      }
      versionGroups[result.nodeVersion].push(result);
    });

    const comparison = {
      generatedAt: new Date().toISOString(),
      versions: Object.keys(versionGroups).sort(),
      comparisons: []
    };

    // Get the latest result for each version
    for (const version of comparison.versions) {
      const latestResult = versionGroups[version]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      const avgOverhead = latestResult.benchmarks.reduce((sum, b) => sum + b.overhead.timePercent, 0) / latestResult.benchmarks.length;
      const avgNestedOverhead = latestResult.benchmarks.reduce((sum, b) => sum + b.overhead.nestedTimePercent, 0) / latestResult.benchmarks.length;
      const totalMemoryOverhead = latestResult.benchmarks.reduce((sum, b) => sum + b.overhead.memoryRSSBytes, 0);

      comparison.comparisons.push({
        nodeVersion: version,
        avgOverheadPercent: avgOverhead,
        avgNestedOverheadPercent: avgNestedOverhead,
        totalMemoryOverheadBytes: totalMemoryOverhead,
        testResults: latestResult.benchmarks.map(b => ({
          name: b.name,
          overheadPercent: b.overhead.timePercent,
          nestedOverheadPercent: b.overhead.nestedTimePercent,
          memoryOverheadBytes: b.overhead.memoryRSSBytes
        }))
      });
    }

    await fs.writeFile(
      path.join(this.outputDir, 'version-comparison.json'),
      JSON.stringify(comparison, null, 2)
    );
    console.log('Version comparison report generated: docs/version-comparison.json');
  }

  async generateVisualizationData(benchmarkResults, memoryResults) {
    const chartData = {
      generatedAt: new Date().toISOString(),
      performanceChart: {
        labels: [],
        datasets: [{
          label: 'AsyncLocalStorage Overhead (%)',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      memoryChart: {
        labels: [],
        datasets: [{
          label: 'Memory Overhead (MB)',
          data: [],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      }
    };

    // Group and average by Node.js version
    const versionGroups = {};
    benchmarkResults.forEach(result => {
      if (!versionGroups[result.nodeVersion]) {
        versionGroups[result.nodeVersion] = { benchmarks: [], memory: [] };
      }
      versionGroups[result.nodeVersion].benchmarks.push(result);
    });

    memoryResults.forEach(result => {
      if (!versionGroups[result.nodeVersion]) {
        versionGroups[result.nodeVersion] = { benchmarks: [], memory: [] };
      }
      versionGroups[result.nodeVersion].memory.push(result);
    });

    for (const [version, data] of Object.entries(versionGroups)) {
      chartData.performanceChart.labels.push(version);
      
      if (data.benchmarks.length > 0) {
        const avgOverhead = data.benchmarks.reduce((sum, result) => {
          const benchmarkAvg = result.benchmarks.reduce((s, b) => s + b.overhead.timePercent, 0) / result.benchmarks.length;
          return sum + benchmarkAvg;
        }, 0) / data.benchmarks.length;
        
        chartData.performanceChart.datasets[0].data.push(avgOverhead.toFixed(2));
      } else {
        chartData.performanceChart.datasets[0].data.push(0);
      }

      chartData.memoryChart.labels.push(version);
      
      if (data.memory.length > 0) {
        const avgMemoryOverhead = data.memory.reduce((sum, result) => {
          if (result.memoryTests && result.memoryTests.length > 0) {
            const memoryAvg = result.memoryTests.reduce((s, test) => s + test.overhead.heapUsed, 0) / result.memoryTests.length;
            return sum + memoryAvg;
          }
          return sum;
        }, 0) / data.memory.length;
        
        chartData.memoryChart.datasets[0].data.push((avgMemoryOverhead / 1024 / 1024).toFixed(2));
      } else {
        chartData.memoryChart.datasets[0].data.push(0);
      }
    }

    await fs.writeFile(
      path.join(this.outputDir, 'chart-data.json'),
      JSON.stringify(chartData, null, 2)
    );
    console.log('Chart data generated: docs/chart-data.json');
  }
}

// Run report generation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ReportGenerator();
  generator.generateReports().catch(console.error);
}

export { ReportGenerator };
