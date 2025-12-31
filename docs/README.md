# AsyncLocalStorage Benchmark Documentation

This directory contains the generated documentation and reports for the AsyncLocalStorage benchmark project.

## Files

### HTML Reports
- **index.html** - Main landing page for GitHub Pages
- **version-comparison.html** - Detailed version comparison with charts and tables
- **styles.css** - Shared stylesheet for all HTML pages

### JSON Data Files
- **version-comparison.json** - Complete benchmark data with statistical analysis
- **performance-report.json** - Comprehensive performance analysis
- **performance-summary.json** - Quick summary of key metrics

### Documentation
- **BENCHMARK_TYPES.md** - Description of different benchmark types
- **COMPREHENSIVE_VERSION_STRATEGY.md** - Version testing strategy
- **DISTRIBUTED_BENCHMARK.md** - Distributed benchmarking approach
- **NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md** - Technical analysis
- **PERFORMANCE_TESTING_INFRASTRUCTURE.md** - Infrastructure details
- **VERSION_MANAGEMENT.md** - Version management approach

## GitHub Pages Deployment

The benchmark workflow automatically deploys results to GitHub Pages after each run:

1. **Benchmark Job** - Runs benchmarks across multiple Node.js versions
2. **Compare Versions Job** - Generates comparison reports and analysis
3. **Create Release Job** - Creates a GitHub release with raw data
4. **Deploy to Pages Job** - Deploys HTML reports to GitHub Pages

### Accessing the Results

Once deployed, the results are available at:
```
https://<username>.github.io/<repository-name>/
```

For this repository:
```
https://tobrien.github.io/als-benchmark-basic/
```

## Local Development

To generate reports locally:

```bash
# Run benchmarks
npm run multi-iteration 2

# Generate version comparison
npm run compare-versions

# Generate performance reports
npm run generate-report
```

Then open `docs/index.html` in your browser to view the results.

## Report Contents

### Version Comparison Report
- Statistical analysis across Node.js versions
- Performance overhead percentages
- Memory usage analysis
- Consistency metrics (standard deviation, coefficient of variation)
- Interactive charts showing trends

### Performance Report
- Detailed benchmark results
- Memory leak detection
- Concurrency test results
- Best and worst performing versions
- Recommendations for production use

### Performance Summary
- Quick overview of key metrics
- Latest benchmark results
- Version-specific highlights

## Updating Documentation

The documentation is automatically regenerated on each benchmark run. To manually update:

1. Modify the source files in `src/` (e.g., `version-comparison.js`, `report-generator.js`)
2. Run the npm scripts to regenerate reports
3. Commit the updated files in `docs/`
4. Push to trigger GitHub Actions workflow

## Data Format

All JSON files follow a consistent structure:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "versions": [
    {
      "version": "vX.Y.Z",
      "iterations": 2,
      "avgOverhead": 5.23,
      "overheadStdDev": 0.45,
      "overheadCV": 8.6,
      "benchmarks": [...]
    }
  ],
  "analysis": {
    "bestPerformingVersion": {...},
    "recommendations": [...],
    "insights": [...]
  }
}
```

## Customization

To customize the GitHub Pages appearance:

1. Edit `docs/index.html` for the main page layout
2. Edit `docs/version-comparison.html` for detailed reports
3. Modify the inline styles or create a separate `styles.css`
4. Update chart configurations in the JavaScript sections

## Troubleshooting

### Pages Not Updating
- Check GitHub Actions workflow status
- Verify GitHub Pages is enabled in repository settings
- Ensure the workflow has `pages: write` permission

### Missing Data
- Verify benchmark jobs completed successfully
- Check artifact uploads in workflow logs
- Ensure `compare-versions` job ran without errors

### Chart Issues
- Charts use Chart.js from CDN
- Ensure internet connection for CDN resources
- Check browser console for JavaScript errors

