# Benchmark Data Setup

This document explains how to set up benchmark data for the AsyncLocalStorage Performance Analysis application.

## Overview

The application expects benchmark data to be stored in a specific structure and referenced by a `data-index.json` file. This allows the application to dynamically load performance data for different Node.js versions.

## Data Structure

### 1. Data Index File (`data-index.json`)

The `data-index.json` file maps Node.js versions to their corresponding benchmark and memory test files:

```json
{
  "versions": {
    "24.6.0": {
      "benchmark": "benchmark_v24_6_0_1755352715978.json",
      "memory": "memory_v24_6_0_1755352739076.json"
    }
  }
}
```

### 2. File Naming Convention

- **Benchmark files**: `benchmark_v{version}_{timestamp}.json`
- **Memory files**: `memory_v{version}_{timestamp}.json`
- **Version format**: Use dots (e.g., "24.6.0")
- **Timestamp**: Unix timestamp in milliseconds

### 3. Directory Structure

```
public/
├── data-index.json
└── results/
    └── versions/
        ├── node_16.20.2/
        │   ├── benchmark_v16_20_2_1755282128371.json
        │   └── memory_v16_20_2_1755283972331.json
        ├── node_18.19.1/
        │   ├── benchmark_v18_19_1_1755282128371.json
        │   └── memory_v18_19_1_1755283972331.json
        └── ...
```

## Data Format

### Benchmark Data Format

```json
{
  "nodeVersion": "v24.6.0",
  "platform": "darwin",
  "arch": "arm64",
  "timestamp": "2025-01-15T00:00:00.000Z",
  "benchmarks": [
    {
      "name": "Small Data",
      "config": {
        "iterations": 10000,
        "dataSize": 5,
        "asyncOps": false
      },
      "withoutALS": {
        "duration": 1663.01,
        "memoryDelta": {
          "rss": 1048576,
          "heapUsed": 524288,
          "heapTotal": 2097152,
          "external": 0
        },
        "results": 10000
      },
      "withALS": {
        "duration": 1697.90,
        "memoryDelta": {
          "rss": 2473984,
          "heapUsed": 786432,
          "heapTotal": 2621440,
          "external": 0
        },
        "results": 10000
      },
      "nestedALS": {
        "duration": 7797.51,
        "memoryDelta": {
          "rss": 5242880,
          "heapUsed": 1572864,
          "heapTotal": 4194304,
          "external": 0
        },
        "results": 2000
      },
      "overhead": {
        "timePercent": 2.10,
        "nestedTimePercent": 368.88,
        "memoryRSSBytes": 1425408,
        "memoryHeapBytes": 262144
      }
    }
  ]
}
```

### Memory Data Format

```json
{
  "nodeVersion": "v24.6.0",
  "platform": "darwin",
  "arch": "arm64",
  "timestamp": "2025-01-15T00:00:00.000Z",
  "memoryTests": [
    {
      "objectSizeKB": 1,
      "withoutALS": {
        "heapUsed": 524288,
        "heapTotal": 2097152,
        "external": 0
      },
      "withALS": {
        "heapUsed": 786432,
        "heapTotal": 2621440,
        "external": 0
      },
      "overhead": {
        "heapUsed": 262144
      }
    }
  ]
}
```

## Setting Up Benchmark Data

### Option 1: Run Benchmarks

1. Use the scripts in the `scripts/` directory to run benchmarks:
   ```bash
   cd scripts
   ./run-all-versions.js
   ```

2. Ensure the results are saved to the `results/` directory

3. Update the `data-index.json` file with the correct filenames

### Option 2: Manual Setup

1. Create the directory structure:
   ```bash
   mkdir -p public/results/versions/node_24.6.0
   ```

2. Place your benchmark and memory JSON files in the appropriate directories

3. Update `data-index.json` to reference your files

4. Ensure the JSON files follow the expected format

## Troubleshooting

### Common Issues

1. **"No benchmark data available" message**
   - Check that `data-index.json` exists in the `public/` directory
   - Verify the file paths in the index are correct
   - Ensure the JSON files exist and are valid

2. **404 errors when loading data**
   - Check the base path configuration in `src/services/benchmarkData.js`
   - Verify the GitHub Pages repository name is correct
   - Ensure files are committed and deployed to GitHub Pages

3. **Invalid JSON errors**
   - Validate your JSON files using a JSON validator
   - Check that the data structure matches the expected format

### Debug Mode

The application includes a debug function that can help troubleshoot data loading issues:

```javascript
import { debugDataLoading } from '../services/benchmarkData'

// Debug a specific version
await debugDataLoading('24.6.0')
```

This will log detailed information about the data loading process to the browser console.

## Deployment

When deploying to GitHub Pages:

1. Ensure all benchmark data files are committed to the repository
2. The `public/` directory contents will be served at the root of your GitHub Pages site
3. Update the base path in `getBasePath()` function if your repository name changes

## Example Files

- `public/results/example_benchmark.json` - Example benchmark data structure
- `public/data-index.json` - Example data index file
