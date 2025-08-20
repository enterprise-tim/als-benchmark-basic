#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ReportGenerator {
  constructor() {
    this.resultsDir = path.join(process.cwd(), 'public', 'results');
    this.outputDir = path.join(process.cwd(), 'docs');
  }

  async run() {
    console.log('📊 Starting performance report generation...');
    
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Load all benchmark and memory results
      const benchmarkResults = await this.loadBenchmarkResults();
      const memoryResults = await this.loadMemoryResults();
      
      if (benchmarkResults.length === 0 && memoryResults.length === 0) {
        console.log('⚠️  No results found for report generation');
        return;
      }
      
      console.log(`📊 Found ${benchmarkResults.length} benchmark results and ${memoryResults.length} memory results`);
      
      // Generate comprehensive report
      const report = this.generateComprehensiveReport(benchmarkResults, memoryResults);
      
      // Save report
      await this.saveReport(report);
      
      // Generate performance summary
      const summary = this.generatePerformanceSummary(benchmarkResults, memoryResults);
      await this.saveSummary(summary);
      
      console.log('✅ Performance report generation completed');
      
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      throw error;
    }
  }

  async loadBenchmarkResults() {
    const results = [];
    
    try {
      const files = await this.findFiles('benchmark_*.json');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const data = JSON.parse(content);
          
          const version = this.extractVersion(file, data);
          
          results.push({
            file,
            version,
            data,
            timestamp: data.timestamp || new Date().toISOString()
          });
        } catch (error) {
          console.warn(`⚠️  Could not load ${file}:`, error.message);
        }
      }
      
      results.sort((a, b) => this.compareVersions(a.version, b.version));
      
    } catch (error) {
      console.warn('⚠️  Could not read benchmark results:', error.message);
    }
    
    return results;
  }

  async loadMemoryResults() {
    const results = [];
    
    try {
      const files = await this.findFiles('memory_*.json');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const data = JSON.parse(content);
          
          const version = this.extractVersion(file, data);
          
          results.push({
            file,
            version,
            data,
            timestamp: data.timestamp || new Date().toISOString()
          });
        } catch (error) {
          console.warn(`⚠️  Could not load ${file}:`, error.message);
        }
      }
      
      results.sort((a, b) => this.compareVersions(a.version, b.version));
      
    } catch (error) {
      console.warn('⚠️  Could not read memory results:', error.message);
    }
    
    return results;
  }

  async findFiles(pattern) {
    const files = [];
    
    try {
      const entries = await fs.readdir(this.resultsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.match(pattern.replace('*', '.*'))) {
          files.push(path.join(this.resultsDir, entry.name));
        } else if (entry.isDirectory()) {
          const subFiles = await this.findFilesInDirectory(path.join(this.resultsDir, entry.name), pattern);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not read results directory:', error.message);
    }
    
    return files;
  }

  async findFilesInDirectory(dirPath, pattern) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.match(pattern.replace('*', '.*'))) {
          files.push(path.join(dirPath, entry.name));
        } else if (entry.isDirectory()) {
          const subFiles = await this.findFilesInDirectory(path.join(dirPath, entry.name), pattern);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // Ignore errors for subdirectories
    }
    
    return files;
  }

  extractVersion(filePath, data) {
    const filename = path.basename(filePath);
    const versionMatch = filename.match(/(?:benchmark|memory)_v(\d+_\d+_\d+)/);
    
    if (versionMatch) {
      return versionMatch[1].replace(/_/g, '.');
    }
    
    if (data.nodeVersion) {
      return data.nodeVersion.replace('v', '');
    }
    
    return 'unknown';
  }

  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    return 0;
  }

  generateComprehensiveReport(benchmarkResults, memoryResults) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalBenchmarkResults: benchmarkResults.length,
        totalMemoryResults: memoryResults.length,
        versionsTested: [...new Set([
          ...benchmarkResults.map(r => r.version),
          ...memoryResults.map(r => r.version)
        ])].sort(this.compareVersions.bind(this))
      },
      benchmarkAnalysis: this.analyzeBenchmarks(benchmarkResults),
      memoryAnalysis: this.analyzeMemory(memoryResults),
      recommendations: this.generateRecommendations(benchmarkResults, memoryResults),
      performanceTrends: this.analyzePerformanceTrends(benchmarkResults)
    };

    return report;
  }

  analyzeBenchmarks(results) {
    const analysis = {
      versionPerformance: {},
      benchmarkTypes: {},
      overheadDistribution: {
        low: 0,    // 0-5%
        medium: 0, // 5-15%
        high: 0    // >15%
      },
      bestVersions: [],
      worstVersions: []
    };

    const versionStats = {};

    for (const result of results) {
      if (!versionStats[result.version]) {
        versionStats[result.version] = {
          overheads: [],
          nestedOverheads: [],
          memoryOverheads: [],
          benchmarkCount: 0
        };
      }

      if (result.data.benchmarks) {
        for (const benchmark of result.data.benchmarks) {
          // Track benchmark types
          const type = benchmark.name;
          if (!analysis.benchmarkTypes[type]) {
            analysis.benchmarkTypes[type] = {
              count: 0,
              averageOverhead: 0,
              totalOverhead: 0
            };
          }
          analysis.benchmarkTypes[type].count++;
          analysis.benchmarkTypes[type].totalOverhead += benchmark.overhead?.timePercent || 0;

          // Collect version statistics
          if (benchmark.overhead?.timePercent !== undefined) {
            versionStats[result.version].overheads.push(benchmark.overhead.timePercent);
            versionStats[result.version].benchmarkCount++;
          }

          if (benchmark.overhead?.nestedTimePercent !== undefined) {
            versionStats[result.version].nestedOverheads.push(benchmark.overhead.nestedTimePercent);
          }

          if (benchmark.overhead?.memoryRSSBytes !== undefined) {
            versionStats[result.version].memoryOverheads.push(benchmark.overhead.memoryRSSBytes / 1024 / 1024);
          }
        }
      }
    }

    // Calculate averages and categorize overhead
    for (const [version, stats] of Object.entries(versionStats)) {
      const avgOverhead = stats.overheads.length > 0 
        ? stats.overheads.reduce((a, b) => a + b, 0) / stats.overheads.length 
        : 0;

      analysis.versionPerformance[version] = {
        averageOverhead: avgOverhead,
        averageNestedOverhead: stats.nestedOverheads.length > 0 
          ? stats.nestedOverheads.reduce((a, b) => a + b, 0) / stats.nestedOverheads.length 
          : 0,
        averageMemoryOverhead: stats.memoryOverheads.length > 0 
          ? stats.memoryOverheads.reduce((a, b) => a + b, 0) / stats.memoryOverheads.length 
          : 0,
        benchmarkCount: stats.benchmarkCount
      };

      // Categorize overhead
      if (avgOverhead <= 5) {
        analysis.overheadDistribution.low++;
      } else if (avgOverhead <= 15) {
        analysis.overheadDistribution.medium++;
      } else {
        analysis.overheadDistribution.high++;
      }
    }

    // Calculate benchmark type averages
    for (const [type, stats] of Object.entries(analysis.benchmarkTypes)) {
      stats.averageOverhead = stats.totalOverhead / stats.count;
    }

    // Find best and worst versions
    const sortedVersions = Object.entries(analysis.versionPerformance)
      .sort(([,a], [,b]) => a.averageOverhead - b.averageOverhead);

    if (sortedVersions.length > 0) {
      analysis.bestVersions = sortedVersions.slice(0, 3).map(([version]) => version);
      analysis.worstVersions = sortedVersions.slice(-3).reverse().map(([version]) => version);
    }

    return analysis;
  }

  analyzeMemory(results) {
    const analysis = {
      versionMemoryUsage: {},
      memoryLeakDetection: {},
      memoryEfficiency: {}
    };

    for (const result of results) {
      if (result.data.memoryTests) {
        const memoryStats = {
          totalTests: result.data.memoryTests.length,
          averageOverhead: 0,
          totalOverhead: 0,
          leakDetected: false
        };

        for (const test of result.data.memoryTests) {
          if (test.overhead?.heapUsed !== undefined) {
            memoryStats.totalOverhead += test.overhead.heapUsed;
          }
        }

        if (memoryStats.totalTests > 0) {
          memoryStats.averageOverhead = memoryStats.totalOverhead / memoryStats.totalTests;
        }

        // Check for memory leaks
        if (result.data.memoryLeakTest) {
          memoryStats.leakDetected = result.data.memoryLeakTest.analysis?.potentialLeak || false;
        }

        analysis.versionMemoryUsage[result.version] = memoryStats;
      }
    }

    return analysis;
  }

  generateRecommendations(benchmarkResults, memoryResults) {
    const recommendations = {
      nodeVersion: {},
      performance: {},
      memory: {},
      general: []
    };

    // Analyze best performing versions
    const versionPerformance = {};
    for (const result of benchmarkResults) {
      if (!versionPerformance[result.version]) {
        versionPerformance[result.version] = { overheads: [] };
      }
      
      if (result.data.benchmarks) {
        for (const benchmark of result.data.benchmarks) {
          if (benchmark.overhead?.timePercent !== undefined) {
            versionPerformance[result.version].overheads.push(benchmark.overhead.timePercent);
          }
        }
      }
    }

    // Calculate averages and find best versions
    const versionAverages = Object.entries(versionPerformance)
      .map(([version, stats]) => ({
        version,
        averageOverhead: stats.overheads.length > 0 
          ? stats.overheads.reduce((a, b) => a + b, 0) / stats.overheads.length 
          : 0
      }))
      .sort((a, b) => a.averageOverhead - b.averageOverhead);

    if (versionAverages.length > 0) {
      const bestVersion = versionAverages[0];
      const worstVersion = versionAverages[versionAverages.length - 1];

      recommendations.nodeVersion.best = bestVersion.version;
      recommendations.nodeVersion.worst = worstVersion.version;
      recommendations.nodeVersion.improvement = worstVersion.averageOverhead - bestVersion.averageOverhead;

      if (bestVersion.averageOverhead <= 5) {
        recommendations.performance.overhead = 'excellent';
        recommendations.general.push('AsyncLocalStorage overhead is minimal and suitable for most applications');
      } else if (bestVersion.averageOverhead <= 15) {
        recommendations.performance.overhead = 'good';
        recommendations.general.push('AsyncLocalStorage overhead is acceptable for most use cases');
      } else {
        recommendations.performance.overhead = 'high';
        recommendations.general.push('Consider AsyncLocalStorage overhead carefully for high-performance applications');
      }
    }

    // Memory recommendations
    const memoryVersions = new Set(memoryResults.map(r => r.version));
    if (memoryVersions.size > 0) {
      recommendations.memory.testedVersions = Array.from(memoryVersions);
      recommendations.general.push('Memory profiling data available for detailed analysis');
    }

    return recommendations;
  }

  analyzePerformanceTrends(results) {
    const trends = {
      versionProgression: [],
      performanceEvolution: 'stable'
    };

    // Sort results by version
    const sortedResults = results.sort((a, b) => this.compareVersions(a.version, b.version));

    for (const result of sortedResults) {
      let avgOverhead = 0;
      let count = 0;

      if (result.data.benchmarks) {
        for (const benchmark of result.data.benchmarks) {
          if (benchmark.overhead?.timePercent !== undefined) {
            avgOverhead += benchmark.overhead.timePercent;
            count++;
          }
        }
      }

      if (count > 0) {
        trends.versionProgression.push({
          version: result.version,
          averageOverhead: avgOverhead / count,
          timestamp: result.timestamp
        });
      }
    }

    // Determine performance evolution
    if (trends.versionProgression.length >= 2) {
      const firstHalf = trends.versionProgression.slice(0, Math.ceil(trends.versionProgression.length / 2));
      const secondHalf = trends.versionProgression.slice(Math.ceil(trends.versionProgression.length / 2));

      const firstAvg = firstHalf.reduce((sum, v) => sum + v.averageOverhead, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, v) => sum + v.averageOverhead, 0) / secondHalf.length;

      if (secondAvg < firstAvg * 0.8) {
        trends.performanceEvolution = 'improving';
      } else if (secondAvg > firstAvg * 1.2) {
        trends.performanceEvolution = 'degrading';
      }
    }

    return trends;
  }

  generatePerformanceSummary(benchmarkResults, memoryResults) {
    const summary = {
      generatedAt: new Date().toISOString(),
      totalResults: benchmarkResults.length + memoryResults.length,
      versionsTested: [...new Set([
        ...benchmarkResults.map(r => r.version),
        ...memoryResults.map(r => r.version)
      ])].sort(this.compareVersions.bind(this)),
      latestResults: this.getLatestResults(benchmarkResults, memoryResults),
      keyMetrics: this.calculateKeyMetrics(benchmarkResults, memoryResults)
    };

    return summary;
  }

  getLatestResults(benchmarkResults, memoryResults) {
    const allResults = [...benchmarkResults, ...memoryResults];
    const latestByVersion = {};

    for (const result of allResults) {
      if (!latestByVersion[result.version] || 
          new Date(result.timestamp) > new Date(latestByVersion[result.version].timestamp)) {
        latestByVersion[result.version] = result;
      }
    }

    return Object.values(latestByVersion);
  }

  calculateKeyMetrics(benchmarkResults, memoryResults) {
    const metrics = {
      averageOverhead: 0,
      bestVersion: null,
      worstVersion: null,
      memoryEfficiency: 'unknown'
    };

    const versionOverheads = {};

    for (const result of benchmarkResults) {
      if (!versionOverheads[result.version]) {
        versionOverheads[result.version] = { overheads: [] };
      }

      if (result.data.benchmarks) {
        for (const benchmark of result.data.benchmarks) {
          if (benchmark.overhead?.timePercent !== undefined) {
            versionOverheads[result.version].overheads.push(benchmark.overhead.timePercent);
          }
        }
      }
    }

    const versionAverages = Object.entries(versionOverheads)
      .map(([version, stats]) => ({
        version,
        average: stats.overheads.length > 0 
          ? stats.overheads.reduce((a, b) => a + b, 0) / stats.overheads.length 
          : 0
      }))
      .sort((a, b) => a.average - b.average);

    if (versionAverages.length > 0) {
      metrics.averageOverhead = versionAverages.reduce((sum, v) => sum + v.average, 0) / versionAverages.length;
      metrics.bestVersion = versionAverages[0];
      metrics.worstVersion = versionAverages[versionAverages.length - 1];
    }

    return metrics;
  }

  async saveReport(report) {
    const filePath = path.join(this.outputDir, 'performance-report.json');
    await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    console.log(`📄 Saved performance report to: ${filePath}`);
  }

  async saveSummary(summary) {
    const filePath = path.join(this.outputDir, 'performance-summary.json');
    await fs.writeFile(filePath, JSON.stringify(summary, null, 2));
    console.log(`📄 Saved performance summary to: ${filePath}`);
  }
}

// Main execution
async function main() {
  try {
    const generator = new ReportGenerator();
    await generator.run();
    process.exit(0);
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ReportGenerator };
