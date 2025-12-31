# AsyncLocalStorage Performance Benchmarks

Performance benchmarks for AsyncLocalStorage overhead analysis across Node.js versions.

## Overview

This project provides comprehensive performance analysis of AsyncLocalStorage across different Node.js versions, helping developers understand the performance implications of using AsyncLocalStorage in their applications.

## Features

- **Performance Analysis**: Compare AsyncLocalStorage overhead across Node.js versions
- **Memory Analysis**: Analyze memory usage patterns and detect potential leaks
- **Version Comparison**: Compare results across Node.js 16.20.2 through 25.2.1
- **Automated Testing**: GitHub Actions workflow for continuous benchmark execution
- **Release Management**: Automatic release creation with benchmark results

## Development

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/tobrien/als-benchmark-basic.git
cd als-benchmark-basic

# Install dependencies
npm install
```

### Running Benchmarks

```bash
# Run performance benchmarks
npm run benchmark

# Run memory tests
npm run memory-test

# Run both benchmarks and memory tests
npm run test-all

# Run optimized benchmarks (with additional flags)
npm run benchmark-optimized

# Run verbose memory tests
npm run memory-test-verbose
```

### Multi-iteration Testing

```bash
# Run multiple iterations for more accurate results
npm run multi-iteration
```

## GitHub Actions

The project includes automated benchmark execution via GitHub Actions:

### Workflow Triggers

- **Push to `performance-test` branch**: Runs benchmarks on all configured Node.js versions
- **Weekly Schedule**: Runs every Sunday at 2 AM UTC
- **Manual Dispatch**: Can be triggered manually with custom parameters

### Workflow Features

- **Matrix Strategy**: Tests multiple Node.js versions in parallel
- **Memory Testing**: Optional memory profiling tests
- **Artifact Upload**: Results are uploaded as GitHub artifacts
- **Release Creation**: Automatic release creation with benchmark results

### Configuration

Benchmark parameters can be configured via workflow dispatch inputs:

- `iterations`: Number of iterations per version (default: 2)
- `run_memory_tests`: Whether to run memory profiling tests (default: true)

## Data Structure

### Benchmark Files

Each benchmark file contains:

```json
{
  "nodeVersion": "v24.12.0",
  "platform": "darwin",
  "arch": "arm64",
  "timestamp": "2025-08-16T13:57:48.747Z",
  "benchmarks": [
    {
      "name": "Small Data",
      "overhead": {
        "timePercent": -10.43,
        "nestedTimePercent": 208.00,
        "memoryRSSBytes": 1048576
      }
    }
  ]
}
```

### Memory Files

Each memory file contains:

```json
{
  "nodeVersion": "v24.12.0",
  "memoryTests": [
    {
      "objectSizeKB": 1,
      "overhead": {
        "heapUsed": 192
      }
    }
  ]
}
```

## Results

Benchmark results are automatically published as GitHub releases containing:

- Raw benchmark data for each tested Node.js version
- Memory profiling results
- Performance metrics and timing data
- Release manifest with metadata

### Accessing Results

1. Go to the [Releases](https://github.com/tobrien/als-benchmark-basic/releases) page
2. Download the latest `benchmark-results.tar.gz` file
3. Extract the archive to access the benchmark data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Author

Tim O'Brien - [GitHub](https://github.com/tobrien)TEST
