# AsyncLocalStorage Performance Benchmarks

Performance benchmarks for AsyncLocalStorage overhead analysis across Node.js versions.

## Overview

This project provides comprehensive performance analysis of AsyncLocalStorage across different Node.js versions, helping developers understand the performance implications of using AsyncLocalStorage in their applications.

## Features

- **Performance Analysis**: Compare AsyncLocalStorage overhead across Node.js versions
- **Memory Analysis**: Analyze memory usage patterns and detect potential leaks
- **Interactive Charts**: Visualize performance data with Chart.js
- **Version Comparison**: Compare results across Node.js 16.20.2 through 24.6.0
- **GitHub Pages Ready**: Deploy directly to GitHub Pages for easy sharing

## React App

The React application provides an interactive interface to explore the benchmark results:

- **Overview**: Summary of all benchmark results
- **Performance**: Performance comparison charts across Node.js versions
- **Memory**: Memory usage analysis and comparison
- **Version Analysis**: Detailed analysis of specific versions
- **Recommendations**: Best practices and usage recommendations

### Data Loading

The app loads benchmark data directly from JSON files in the `results/` directory:

1. **Data Index**: `public/data-index.json` maps Node.js versions to their benchmark and memory test files
2. **Benchmark Files**: Located in `results/versions/node_X_X_X/` directories
3. **Memory Files**: Memory test results for each version

### Chart Components

- **PerformanceChart**: Displays performance overhead comparisons
- **MemoryChart**: Shows memory usage patterns
- **Toggle between line and bar charts**
- **Responsive design** for different screen sizes

## Development

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/tobrien/async-node-stats.git
cd async-node-stats

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### GitHub Pages

The app is configured for GitHub Pages deployment:

1. **Base Path**: Configured for `/async-node-stats/` repository path
2. **Static Assets**: All benchmark data is served as static files
3. **SPA Routing**: Handles client-side routing properly

### Manual Deployment

To deploy to other static hosting:

1. Run `npm run build`
2. Upload the `dist/` directory contents
3. Ensure the `results/` directory is accessible
4. Update the base path in `vite.config.js` if needed

## Data Structure

### Benchmark Files

Each benchmark file contains:

```json
{
  "nodeVersion": "v24.6.0",
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
  "nodeVersion": "v24.6.0",
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Author

Tim O'Brien - [GitHub](https://github.com/tobrien)