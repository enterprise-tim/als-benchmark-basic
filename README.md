# AsyncLocalStorage Performance Benchmark Suite

A comprehensive performance testing framework for Node.js AsyncLocalStorage across different execution models and Node.js versions.

## 🚀 NEW: Comprehensive Distributed System Benchmarks

The latest version includes a powerful new distributed benchmark system that really exercises AsyncLocalStorage under extreme conditions:

### **Enhanced ALS Stress Testing**
- **Context Nesting Depth**: Tests up to 20 levels of nested AsyncLocalStorage contexts
- **Context Object Sizes**: Tests with 10, 100, and 1000+ property objects
- **Rapid Context Switching**: Tests up to 10,000 context switches per second
- **Concurrent Context Creation**: Tests up to 100 simultaneous context operations
- **Deep Async Chains**: Tests context propagation through 20+ async operations
- **Memory Pressure Scenarios**: Tests under memory stress conditions
- **Garbage Collection Stress**: Tests during aggressive GC cycles

### **Multi-Execution Mode Testing**
- **Single Process**: Traditional single-threaded performance
- **Worker Threads**: Multi-threaded performance within same process
- **Cluster Mode**: Multi-process performance across process boundaries

### **Traffic Profile Testing**
- **Steady**: Consistent load testing
- **Burst**: Sudden load spikes
- **Surge**: Extreme load conditions

## 📊 Integration with Existing Tools

**The new distributed benchmark is fully integrated** with your existing graphing and comparison system:

✅ **Automatic Result Processing**: Results are saved in the same format as traditional benchmarks  
✅ **Unified Reporting**: Both traditional and distributed results appear in the same reports  
✅ **Graph Integration**: Results automatically appear in your performance charts  
✅ **Version Comparison**: Distributed results are included in version comparisons  
✅ **GitHub Workflows**: CI/CD automatically runs both benchmark types  

## 🛠️ Usage

### Quick Tests
```bash
# Run traditional benchmark only
npm run benchmark

# Run distributed benchmark with enhanced ALS testing
npm run benchmark-distributed

# Quick test (10 seconds)
npm run benchmark-quick

# Full comprehensive test matrix
npm run benchmark-full

# ALS-only stress testing
npm run benchmark-als-stress
```

### Comprehensive Testing
```bash
# Test all execution modes and traffic profiles
npm run benchmark-full

# Test only ALS with all execution modes
npm run benchmark-als-stress

# Run both traditional and distributed tests
npm run test-all-distributed
```

## 📈 What You Get

### **Traditional Benchmark Results**
- AsyncLocalStorage overhead percentages
- Memory usage impact
- Nested context performance
- Single-process performance

### **Distributed Benchmark Results**
- Multi-process/thread performance
- Context isolation verification
- Distributed overhead analysis
- Worker/process scaling metrics
- Context error rates across boundaries

### **Enhanced ALS Insights**
- Context switching performance
- Memory pressure handling
- Garbage collection impact
- Concurrent operation stability
- Deep async chain reliability

## 🔧 Configuration

The distributed benchmark automatically configures comprehensive testing:

```javascript
alsTestScenarios: {
  contextDepth: [1, 5, 10, 20],        // Nesting levels
  contextSize: [10, 100, 1000],         // Object sizes
  contextSwitching: [100, 1000, 10000], // Switch frequency
  concurrentContexts: [10, 50, 100],    // Concurrency levels
  asyncChainDepth: [5, 10, 20],         // Async chain depth
  memoryPressure: true,                  // Memory stress testing
  gcStress: true                         // GC stress testing
}
```

## 📋 GitHub Workflow Integration

The main workflow now runs **both** benchmark types:

1. **Traditional Benchmark**: Baseline performance comparison
2. **Distributed Benchmark**: Enhanced ALS stress testing
3. **Full Matrix**: All execution modes and profiles
4. **Automatic Reporting**: Results integrated into existing graphs

## 🎯 Key Benefits

- **Real-World Testing**: Tests AsyncLocalStorage under production-like conditions
- **Scalability Insights**: Understand performance across different execution models
- **Error Detection**: Identify context isolation issues early
- **Performance Optimization**: Find bottlenecks in distributed scenarios
- **Comprehensive Coverage**: Test edge cases that traditional benchmarks miss

## 📊 Result Integration

All results are automatically:
- Saved in the `results/` directory
- Processed by the report generator
- Included in performance summaries
- Added to version comparison charts
- Available in the documentation

---

## Original Features

The suite also includes traditional AsyncLocalStorage benchmarks:

- **Baseline Performance**: Operations without AsyncLocalStorage
- **ALS Overhead**: The same operations wrapped in AsyncLocalStorage.run()
- **Nested Contexts**: Multiple levels of AsyncLocalStorage nesting
- **Data Size Impact**: How object size affects performance
- **Async Operation Impact**: Performance with real async operations
- **Memory Leak Detection**: Comprehensive memory analysis
- **Version Comparison**: Performance across Node.js versions

## Getting Started

```bash
# Install dependencies
npm install

# Run traditional benchmark
npm run benchmark

# Run distributed benchmark
npm run benchmark-distributed

# Generate reports
npm run generate-report

# Serve documentation
npm run serve-docs
```

## Documentation

- [Performance Summary](docs/SUMMARY.md) - Latest benchmark results
- [Detailed Results](docs/detailed-results.json) - Raw benchmark data
- [Version Comparison](docs/version-comparison.json) - Cross-version analysis
- [Chart Data](docs/chart-data.json) - Visualization data