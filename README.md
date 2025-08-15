# AsyncLocalStorage Performance Analysis

A comprehensive performance testing suite for Node.js AsyncLocalStorage, designed to measure overhead across different versions and usage patterns.

## 🎯 Purpose

This project helps answer the critical question: **"What is the overhead of using AsyncLocalStorage, and is there anything I should be worried about?"**

## 🚀 Features

- **Performance Benchmarks**: Compare execution time with and without AsyncLocalStorage
- **Memory Profiling**: Analyze memory usage and detect potential leaks
- **Multi-Version Testing**: Test across different Node.js versions using NVM
- **Concurrent Testing**: Evaluate performance under concurrent load
- **Automated Reporting**: Generate comprehensive reports and visualizations
- **GitHub Integration**: Automated testing and GitHub Pages deployment
- **CI/CD Ready**: GitHub Actions workflows for continuous testing

## 📊 What Gets Tested

### Performance Benchmarks
- Small, medium, and large data objects
- Synchronous and asynchronous operations
- Nested AsyncLocalStorage contexts
- Varying iteration counts to measure scalability

### Memory Analysis
- Memory usage by object size
- Memory leak detection over time
- Concurrent operation memory impact
- Garbage collection effectiveness

### Cross-Version Analysis
- Node.js 16.x through 22.x
- Performance evolution over versions
- Regression detection
- Optimization improvements

## 🛠 Installation

```bash
git clone https://github.com/tobrien/async-node-stats.git
cd async-node-stats
npm install
```

## 🏃‍♂️ Quick Start

### Run All Tests
```bash
npm start all
```

### Individual Test Categories
```bash
# Performance benchmarks only
npm run benchmark

# Memory profiling only
npm run memory-test

# Generate reports from existing results
npm run generate-report
```

### Multi-Version Testing
Test across multiple Node.js versions using NVM:
```bash
./test-versions.sh
```

This will automatically:
1. Install and test Node.js versions 16.20.2, 18.19.1, 20.11.0, 21.7.3, and 22.0.0
2. Run benchmarks and memory tests for each version
3. Generate a comprehensive comparison report

## 📈 Understanding the Results

### Performance Metrics
- **Overhead Percentage**: How much slower operations are with AsyncLocalStorage
- **Memory Impact**: Additional memory usage in MB
- **Nested Overhead**: Performance impact of nested AsyncLocalStorage contexts

### Interpretation Guidelines
- **< 5% overhead**: ✅ Minimal impact, safe for most use cases
- **5-15% overhead**: ⚠️ Moderate impact, consider for high-throughput applications
- **> 15% overhead**: ❌ Significant impact, use with caution

### Memory Analysis
- **Memory Growth**: Indicates potential memory leaks
- **Concurrent Impact**: Memory usage under load
- **GC Effectiveness**: How well garbage collection handles AsyncLocalStorage

## 📊 Sample Results

Here's what you can expect to see:

```
=== Performance Summary ===
Node.js Version: v20.11.0
Average AsyncLocalStorage Overhead: 3.2%
Average Nested ALS Overhead: 8.7%
Total Memory Overhead: 2.4MB

Recommendations:
✅ AsyncLocalStorage is suitable for your use case
```

## 🔧 Configuration

### Custom Test Parameters
Edit the test configurations in `src/benchmark.js`:

```javascript
const testConfigs = [
  { name: 'Small Data', iterations: 10000, dataSize: 5, asyncOps: false },
  { name: 'Custom Test', iterations: 5000, dataSize: 100, asyncOps: true },
  // Add your own configurations
];
```

### Node.js Versions
Modify the versions tested in `test-versions.sh`:

```bash
VERSIONS=(
    "16.20.2"
    "18.19.1" 
    "20.11.0"
    "22.0.0"
    # Add more versions
)
```

## 📁 Project Structure

```
async-node-stats/
├── src/
│   ├── benchmark.js       # Core performance benchmarks
│   ├── memory-test.js     # Memory profiling tests
│   ├── report-generator.js # Report generation
│   ├── generate-docs.js   # Documentation site generator
│   └── index.js          # Main CLI interface
├── .github/workflows/
│   ├── benchmark.yml     # Automated testing
│   └── pages.yml         # GitHub Pages deployment
├── results/              # Test results (JSON)
├── docs/                # Generated documentation
├── test-versions.sh     # Multi-version testing script
└── README.md
```

## 🤖 GitHub Actions Integration

This project includes automated testing workflows:

### Benchmark Workflow
- Triggers on push, PR, and weekly schedule
- Tests across Node.js 16.x, 18.x, 20.x, 22.x
- Generates performance summaries
- Detects performance regressions in PRs

### GitHub Pages Deployment
- Automatically deploys results to GitHub Pages
- Updates documentation site with latest results
- Provides web-based visualization of results

## 📊 Results Visualization

The project generates several types of output:

### JSON Data Files
- `benchmark_*.json` - Raw performance data
- `memory_*.json` - Memory profiling results
- `detailed-results.json` - Combined analysis
- `version-comparison.json` - Cross-version comparison

### Reports
- `SUMMARY.md` - Human-readable summary
- Interactive HTML dashboard
- Charts and visualizations

### GitHub Pages Site
Access your results at: `https://[username].github.io/async-node-stats`

## 🧪 Use Cases

### Development Teams
- Evaluate AsyncLocalStorage adoption impact
- Set performance budgets and alerts
- Track performance over time

### Library Authors
- Measure overhead of AsyncLocalStorage-based features
- Document performance characteristics
- Validate optimizations

### DevOps Teams
- Monitor performance in CI/CD pipelines
- Detect performance regressions
- Validate Node.js upgrade impact

## 🔍 Example Scenarios

### Scenario 1: Basic Web Application
```javascript
// Test with typical request context data
const requestData = {
  userId: 12345,
  sessionId: 'abc123',
  requestId: 'req-456',
  metadata: { /* ... */ }
};

await als.run(requestData, async () => {
  // Your application logic
  await processRequest();
});
```

### Scenario 2: Microservice with Tracing
```javascript
// Test with distributed tracing context
const traceData = {
  traceId: 'trace-789',
  spanId: 'span-012',
  baggage: { /* ... */ },
  // Potentially large context objects
};
```

### Scenario 3: High-Frequency Operations
```javascript
// Test impact on high-throughput scenarios
for (let i = 0; i < 100000; i++) {
  await als.run(contextData, async () => {
    await quickOperation();
  });
}
```

## 🤝 Contributing

Contributions are welcome! Please consider:

1. **New Test Scenarios**: Add realistic use cases
2. **Additional Metrics**: Propose new measurements
3. **Visualization Improvements**: Enhance the reporting
4. **Platform Support**: Test on different environments
5. **Documentation**: Improve guides and examples

## 📋 Requirements

- **Node.js**: 16.0.0 or higher
- **NVM**: For multi-version testing
- **Git**: For version control and workflows

## 🛣 Roadmap

- [ ] Platform-specific testing (Windows, macOS, Linux)
- [ ] Container-based testing environments
- [ ] Integration with popular frameworks (Express, Fastify, etc.)
- [ ] Real-world application benchmarks
- [ ] Performance regression alerting
- [ ] Comparative analysis with alternatives

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙋‍♂️ Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Check the generated docs site for detailed results

---

**Made with ❤️ for the Node.js community**

*Helping developers make informed decisions about AsyncLocalStorage usage.*