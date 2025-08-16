# AsyncLocalStorage Benchmark System

This document explains how to use the comprehensive benchmark system for testing AsyncLocalStorage performance across multiple Node.js versions with multiple iterations.

## 🚀 Quick Start

### 1. Test the Setup
```bash
npm run test-setup
```

### 2. Run Benchmarks for All Versions
```bash
# Run 10 iterations for each configured Node.js version
npm run all-versions 10

# Or run a different number of iterations
npm run all-versions 5
```

### 3. Run Individual Version Benchmarks
```bash
# Run 10 iterations for the current Node.js version
npm run multi-iteration 10

# Or run a different number of iterations
npm run multi-iteration 5
```

### 4. Generate Reports
```bash
# Generate version comparison reports
npm run compare-versions

# Generate additional performance reports
npm run generate-report
```

### 5. Build and Deploy
```bash
# Build the React application with results
npm run build

# Deploy to GitHub Pages (if configured)
npm run deploy
```

## 📊 System Overview

The benchmark system consists of several components:

### Core Scripts
- **`scripts/run-multi-iterations.js`** - Runs multiple iterations for a single Node.js version
- **`scripts/run-all-versions.js`** - Orchestrates benchmarks across all configured versions
- **`src/version-comparison.js`** - Generates comprehensive comparison reports
- **`src/report-generator.js`** - Creates additional performance analysis reports

### Configuration
- **`config/node-versions.json`** - Defines which Node.js versions to test and their metadata
- **`.github/workflows/benchmark.yml`** - GitHub Actions workflow for automated testing
- **`.github/workflows/pages.yml`** - GitHub Actions workflow for site deployment

## 🔧 Configuration

### Node.js Versions
Edit `config/node-versions.json` to:
- Add/remove Node.js versions to test
- Mark versions as active/inactive
- Add descriptions and metadata
- Configure version sets for different testing scenarios

Example:
```json
{
  "versions": {
    "16": {
      "exact": "16.20.2",
      "major": "16",
      "description": "LTS - First version with AsyncLocalStorage stable",
      "lts": true,
      "active": true
    }
  }
}
```

### GitHub Actions
The workflow automatically:
1. Reads all active versions from `node-versions.json`
2. Runs benchmarks for each version with specified iterations
3. Generates comparison reports
4. Deploys results to GitHub Pages

## 📁 Results Structure

After running benchmarks, results are organized as:

```
results/
├── versions/
│   ├── node_16.20.2/
│   │   ├── iteration_01/
│   │   │   ├── benchmark_*.json
│   │   │   └── memory_*.json
│   │   ├── iteration_02/
│   │   ├── ...
│   │   ├── iteration_10/
│   │   └── iteration-summary.json
│   ├── node_18.19.1/
│   ├── node_20.11.0/
│   └── ...
├── all-versions-summary.json
└── comparison-results.json
```

## 🎯 Use Cases

### Development Testing
```bash
# Quick test with current Node.js version
npm run multi-iteration 3

# Test specific version
NODE_VERSION=20.11.0 npm run multi-iteration 5
```

### Comprehensive Analysis
```bash
# Full test suite across all versions
npm run all-versions 10

# Generate detailed reports
npm run compare-versions
npm run generate-report
```

### CI/CD Integration
The GitHub Actions workflow automatically:
- Runs on pushes to main/develop branches
- Runs on pull requests
- Runs weekly on Sundays
- Can be manually triggered with custom parameters

## 📈 Reports and Output

### Version Comparison Report
- Performance metrics across all versions
- Statistical analysis of iterations
- Memory usage patterns
- Performance evolution trends

### Performance Reports
- Detailed benchmark breakdowns
- Memory leak analysis
- Context integrity validation
- Cross-version performance regression detection

### GitHub Pages Site
- Interactive React application
- Real-time data visualization
- Performance comparison charts
- Historical trend analysis

## 🛠️ Troubleshooting

### Common Issues

1. **Node.js Version Mismatch**
   ```bash
   # Verify current version
   node --version
   
   # Use nvm to switch versions
   nvm use 20.11.0
   ```

2. **Missing Dependencies**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Permission Issues**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.js
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=8192 scripts/run-multi-iterations.js
   ```

### Debug Mode
```bash
# Run with verbose output
DEBUG=* npm run multi-iteration 3

# Check individual components
npm run test-setup
```

## 🔄 Workflow Integration

### Local Development
1. Make changes to benchmark code
2. Test locally: `npm run multi-iteration 3`
3. Commit and push changes
4. GitHub Actions automatically runs full test suite

### Continuous Integration
1. Push to main branch triggers workflow
2. All configured versions are tested
3. Results are compared and analyzed
4. Reports are generated and deployed
5. GitHub Pages site is updated

### Manual Triggers
- Use GitHub Actions "workflow_dispatch" to manually run benchmarks
- Customize number of iterations per version
- Control memory test execution

## 📚 Advanced Usage

### Custom Version Sets
```bash
# Test only LTS versions
npm run all-versions 10 --lts-only

# Test specific version range
npm run all-versions 5 --versions=18,20,22
```

### Performance Profiling
```bash
# Run with detailed profiling
npm run multi-iteration 5 --profile

# Memory leak detection
npm run multi-iteration 3 --memory-focus
```

### Export and Analysis
```bash
# Export results for external analysis
npm run export-results --format=csv

# Generate custom reports
npm run custom-report --template=enterprise
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
