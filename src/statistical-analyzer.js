import fs from 'fs/promises';
import path from 'path';

/**
 * Statistical Analysis Tool for AsyncLocalStorage Benchmark Results
 * 
 * This tool provides comprehensive statistical analysis of benchmark results
 * to help identify reliable performance patterns and detect outliers.
 */
class StatisticalAnalyzer {
  constructor() {
    this.results = [];
    this.analysis = {
      timestamp: new Date().toISOString(),
      summary: {},
      outlierDetection: {},
      trends: {},
      recommendations: []
    };
  }

  /**
   * Load benchmark results from multiple iterations/runs
   */
  async loadResults(resultsDir) {
    console.log(`Loading results from: ${resultsDir}`);
    
    try {
      const entries = await fs.readdir(resultsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(resultsDir, entry.name);
          await this.loadResultsFromDirectory(dirPath, entry.name);
        } else if (entry.name.endsWith('.json') && entry.name.startsWith('benchmark_')) {
          const filePath = path.join(resultsDir, entry.name);
          await this.loadResultFile(filePath, 'single_run');
        }
      }
      
      console.log(`Loaded ${this.results.length} benchmark results`);
    } catch (error) {
      console.error(`Error loading results: ${error.message}`);
      throw error;
    }
  }

  async loadResultsFromDirectory(dirPath, dirName) {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('benchmark_')) {
          const filePath = path.join(dirPath, file);
          await this.loadResultFile(filePath, dirName);
        }
      }
    } catch (error) {
      console.warn(`Could not load from directory ${dirPath}: ${error.message}`);
    }
  }

  async loadResultFile(filePath, source) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      this.results.push({
        source,
        filePath,
        ...data
      });
    } catch (error) {
      console.warn(`Could not load file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Calculate comprehensive statistics for a dataset
   */
  calculateStatistics(values) {
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const n = values.length;
    
    // Basic statistics
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);
    
    // Percentiles
    const median = this.percentile(sorted, 50);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);
    
    // Range and IQR
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;
    const iqr = q3 - q1;
    
    // Coefficient of variation
    const cv = (stddev / mean) * 100;
    
    // Confidence intervals
    const marginOfError95 = 1.96 * stddev / Math.sqrt(n);
    const marginOfError99 = 2.576 * stddev / Math.sqrt(n);
    
    // Outlier detection using IQR method
    const outlierThresholdLower = q1 - 1.5 * iqr;
    const outlierThresholdUpper = q3 + 1.5 * iqr;
    const outliers = values.filter(v => v < outlierThresholdLower || v > outlierThresholdUpper);
    
    // Skewness (measure of asymmetry)
    const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / stddev, 3), 0) / n;
    
    // Kurtosis (measure of tail heaviness)
    const kurtosis = values.reduce((sum, val) => sum + Math.pow((val - mean) / stddev, 4), 0) / n - 3;

    return {
      count: n,
      mean: parseFloat(mean.toFixed(4)),
      median: parseFloat(median.toFixed(4)),
      stddev: parseFloat(stddev.toFixed(4)),
      variance: parseFloat(variance.toFixed(4)),
      cv_percent: parseFloat(cv.toFixed(2)),
      min: parseFloat(min.toFixed(4)),
      max: parseFloat(max.toFixed(4)),
      range: parseFloat(range.toFixed(4)),
      q1: parseFloat(q1.toFixed(4)),
      q3: parseFloat(q3.toFixed(4)),
      iqr: parseFloat(iqr.toFixed(4)),
      p95: parseFloat(p95.toFixed(4)),
      p99: parseFloat(p99.toFixed(4)),
      skewness: parseFloat(skewness.toFixed(4)),
      kurtosis: parseFloat(kurtosis.toFixed(4)),
      confidence_interval_95: {
        lower: parseFloat((mean - marginOfError95).toFixed(4)),
        upper: parseFloat((mean + marginOfError95).toFixed(4))
      },
      confidence_interval_99: {
        lower: parseFloat((mean - marginOfError99).toFixed(4)),
        upper: parseFloat((mean + marginOfError99).toFixed(4))
      },
      outliers: {
        count: outliers.length,
        percentage: parseFloat((outliers.length / n * 100).toFixed(2)),
        values: outliers.map(v => parseFloat(v.toFixed(4))),
        thresholds: {
          lower: parseFloat(outlierThresholdLower.toFixed(4)),
          upper: parseFloat(outlierThresholdUpper.toFixed(4))
        }
      }
    };
  }

  percentile(sorted, p) {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    if (lower < 0) return sorted[0];
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Analyze benchmark results across different test scenarios
   */
  analyzeBenchmarks() {
    console.log('Analyzing benchmark results...');
    
    // Group results by benchmark type and Node.js version
    const groupedResults = {};
    
    for (const result of this.results) {
      const nodeVersion = result.nodeVersion || 'unknown';
      
      if (!groupedResults[nodeVersion]) {
        groupedResults[nodeVersion] = {};
      }
      
      if (result.benchmarks && Array.isArray(result.benchmarks)) {
        for (const benchmark of result.benchmarks) {
          const benchmarkName = benchmark.name;
          
          if (!groupedResults[nodeVersion][benchmarkName]) {
            groupedResults[nodeVersion][benchmarkName] = {
              overheadValues: [],
              nestedOverheadValues: [],
              memoryValues: [],
              durationValues: []
            };
          }
          
          // Collect overhead values
          if (benchmark.overhead && typeof benchmark.overhead.timePercent === 'number') {
            groupedResults[nodeVersion][benchmarkName].overheadValues.push(benchmark.overhead.timePercent);
          }
          
          if (benchmark.overhead && typeof benchmark.overhead.nestedTimePercent === 'number') {
            groupedResults[nodeVersion][benchmarkName].nestedOverheadValues.push(benchmark.overhead.nestedTimePercent);
          }
          
          if (benchmark.overhead && typeof benchmark.overhead.memoryRSSBytes === 'number') {
            groupedResults[nodeVersion][benchmarkName].memoryValues.push(benchmark.overhead.memoryRSSBytes);
          }
          
          // Collect duration values
          if (benchmark.withALS && typeof benchmark.withALS.duration === 'number') {
            groupedResults[nodeVersion][benchmarkName].durationValues.push(benchmark.withALS.duration);
          }
        }
      }
    }
    
    // Calculate statistics for each group
    for (const [nodeVersion, benchmarks] of Object.entries(groupedResults)) {
      this.analysis.summary[nodeVersion] = {};
      
      for (const [benchmarkName, data] of Object.entries(benchmarks)) {
        this.analysis.summary[nodeVersion][benchmarkName] = {
          overhead: this.calculateStatistics(data.overheadValues),
          nestedOverhead: this.calculateStatistics(data.nestedOverheadValues),
          memory: this.calculateStatistics(data.memoryValues),
          duration: this.calculateStatistics(data.durationValues)
        };
      }
    }
  }

  /**
   * Detect and analyze outliers across all results
   */
  detectOutliers() {
    console.log('Detecting outliers...');
    
    for (const [nodeVersion, benchmarks] of Object.entries(this.analysis.summary)) {
      if (!this.analysis.outlierDetection[nodeVersion]) {
        this.analysis.outlierDetection[nodeVersion] = {};
      }
      
      for (const [benchmarkName, stats] of Object.entries(benchmarks)) {
        this.analysis.outlierDetection[nodeVersion][benchmarkName] = {
          overhead: stats.overhead?.outliers || null,
          nestedOverhead: stats.nestedOverhead?.outliers || null,
          memory: stats.memory?.outliers || null,
          duration: stats.duration?.outliers || null
        };
      }
    }
  }

  /**
   * Generate reliability recommendations based on statistical analysis
   */
  generateRecommendations() {
    console.log('Generating recommendations...');
    
    const recommendations = [];
    
    for (const [nodeVersion, benchmarks] of Object.entries(this.analysis.summary)) {
      for (const [benchmarkName, stats] of Object.entries(benchmarks)) {
        if (stats.overhead) {
          const cv = stats.overhead.cv_percent;
          const outlierPercent = stats.overhead.outliers.percentage;
          
          if (cv > 20) {
            recommendations.push({
              type: 'high_variability',
              nodeVersion,
              benchmark: benchmarkName,
              metric: 'overhead',
              cv_percent: cv,
              message: `High variability in ${benchmarkName} for Node.js ${nodeVersion} (CV: ${cv}%). Consider more iterations or system isolation.`
            });
          }
          
          if (outlierPercent > 20) {
            recommendations.push({
              type: 'many_outliers',
              nodeVersion,
              benchmark: benchmarkName,
              metric: 'overhead',
              outlier_percent: outlierPercent,
              message: `Many outliers in ${benchmarkName} for Node.js ${nodeVersion} (${outlierPercent}%). System may be unstable during testing.`
            });
          }
          
          if (cv < 5 && outlierPercent < 5) {
            recommendations.push({
              type: 'reliable_results',
              nodeVersion,
              benchmark: benchmarkName,
              metric: 'overhead',
              cv_percent: cv,
              outlier_percent: outlierPercent,
              message: `Excellent reliability for ${benchmarkName} on Node.js ${nodeVersion}. Results are highly consistent.`
            });
          }
        }
      }
    }
    
    this.analysis.recommendations = recommendations;
  }

  /**
   * Generate a comprehensive report
   */
  generateReport() {
    const report = {
      title: 'AsyncLocalStorage Benchmark Statistical Analysis',
      generated: this.analysis.timestamp,
      summary: {
        totalResults: this.results.length,
        nodeVersions: Object.keys(this.analysis.summary),
        reliabilityOverview: this.getReliabilityOverview()
      },
      detailedAnalysis: this.analysis.summary,
      outlierAnalysis: this.analysis.outlierDetection,
      recommendations: this.analysis.recommendations,
      methodology: {
        description: 'Statistical analysis of AsyncLocalStorage benchmark results',
        metrics: [
          'Mean and median overhead percentages',
          'Standard deviation and coefficient of variation',
          'Confidence intervals (95% and 99%)',
          'Outlier detection using IQR method',
          'Distribution analysis (skewness and kurtosis)'
        ],
        reliabilityCriteria: {
          excellent: 'CV < 5% and outliers < 5%',
          good: 'CV < 10% and outliers < 10%',
          fair: 'CV < 20% and outliers < 20%',
          poor: 'CV >= 20% or outliers >= 20%'
        }
      }
    };
    
    return report;
  }

  getReliabilityOverview() {
    const overview = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };
    
    for (const benchmarks of Object.values(this.analysis.summary)) {
      for (const stats of Object.values(benchmarks)) {
        if (stats.overhead) {
          const cv = stats.overhead.cv_percent;
          const outlierPercent = stats.overhead.outliers.percentage;
          
          if (cv < 5 && outlierPercent < 5) {
            overview.excellent++;
          } else if (cv < 10 && outlierPercent < 10) {
            overview.good++;
          } else if (cv < 20 && outlierPercent < 20) {
            overview.fair++;
          } else {
            overview.poor++;
          }
        }
      }
    }
    
    return overview;
  }

  /**
   * Save analysis results to files
   */
  async saveAnalysis(outputDir = 'results/analysis') {
    console.log(`Saving analysis to: ${outputDir}`);
    
    try {
      await fs.mkdir(outputDir, { recursive: true });
      
      // Save detailed analysis
      const report = this.generateReport();
      await fs.writeFile(
        path.join(outputDir, 'statistical_analysis.json'),
        JSON.stringify(report, null, 2)
      );
      
      // Save summary CSV for spreadsheet analysis
      await this.saveSummaryCSV(path.join(outputDir, 'summary.csv'));
      
      // Save recommendations as markdown
      await this.saveRecommendationsMarkdown(path.join(outputDir, 'recommendations.md'));
      
      console.log('Analysis saved successfully');
    } catch (error) {
      console.error(`Error saving analysis: ${error.message}`);
      throw error;
    }
  }

  async saveSummaryCSV(filePath) {
    const csvLines = ['Node Version,Benchmark,Mean Overhead,Std Dev,CV%,95% CI Lower,95% CI Upper,Outliers%,Reliability'];
    
    for (const [nodeVersion, benchmarks] of Object.entries(this.analysis.summary)) {
      for (const [benchmarkName, stats] of Object.entries(benchmarks)) {
        if (stats.overhead) {
          const s = stats.overhead;
          const reliability = s.cv_percent < 5 && s.outliers.percentage < 5 ? 'Excellent' :
                            s.cv_percent < 10 && s.outliers.percentage < 10 ? 'Good' :
                            s.cv_percent < 20 && s.outliers.percentage < 20 ? 'Fair' : 'Poor';
          
          csvLines.push([
            nodeVersion,
            benchmarkName,
            s.mean,
            s.stddev,
            s.cv_percent,
            s.confidence_interval_95.lower,
            s.confidence_interval_95.upper,
            s.outliers.percentage,
            reliability
          ].join(','));
        }
      }
    }
    
    await fs.writeFile(filePath, csvLines.join('\n'));
  }

  async saveRecommendationsMarkdown(filePath) {
    let content = '# AsyncLocalStorage Benchmark Recommendations\n\n';
    content += `Generated: ${this.analysis.timestamp}\n\n`;
    
    const byType = {};
    for (const rec of this.analysis.recommendations) {
      if (!byType[rec.type]) {
        byType[rec.type] = [];
      }
      byType[rec.type].push(rec);
    }
    
    for (const [type, recs] of Object.entries(byType)) {
      content += `## ${type.replace(/_/g, ' ').toUpperCase()}\n\n`;
      
      for (const rec of recs) {
        content += `- **${rec.nodeVersion} - ${rec.benchmark}**: ${rec.message}\n`;
      }
      
      content += '\n';
    }
    
    await fs.writeFile(filePath, content);
  }

  /**
   * Run complete analysis
   */
  async analyze(resultsDir = 'results') {
    console.log('Starting statistical analysis...');
    
    await this.loadResults(resultsDir);
    this.analyzeBenchmarks();
    this.detectOutliers();
    this.generateRecommendations();
    await this.saveAnalysis();
    
    console.log('Analysis complete!');
    
    // Print summary to console
    const report = this.generateReport();
    console.log('\n=== RELIABILITY SUMMARY ===');
    console.log(`Total results analyzed: ${report.summary.totalResults}`);
    console.log(`Node.js versions: ${report.summary.nodeVersions.join(', ')}`);
    console.log('\nReliability distribution:');
    console.log(`  Excellent: ${report.summary.reliabilityOverview.excellent}`);
    console.log(`  Good: ${report.summary.reliabilityOverview.good}`);
    console.log(`  Fair: ${report.summary.reliabilityOverview.fair}`);
    console.log(`  Poor: ${report.summary.reliabilityOverview.poor}`);
    
    console.log('\nKey recommendations:');
    for (const rec of this.analysis.recommendations.slice(0, 5)) {
      console.log(`  - ${rec.message}`);
    }
  }
}

// Run analysis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new StatisticalAnalyzer();
  
  const resultsDir = process.argv[2] || 'results';
  analyzer.analyze(resultsDir).catch(console.error);
}

export { StatisticalAnalyzer };
