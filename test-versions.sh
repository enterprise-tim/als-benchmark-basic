#!/bin/bash

# AsyncLocalStorage Performance Testing Across Node.js Versions
# This script uses NVM to test performance across multiple Node.js versions
# For detailed analysis of AsyncLocalStorage changes across versions, see:
# docs/NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md
#
# Usage:
#   ./test-versions.sh           # Test all supported versions
#   ./test-versions.sh 24.6.0    # Test a single version

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Node.js versions to test (loaded from centralized config)
# To update versions, edit config/node-versions.json
load_versions() {
    if [ -f "scripts/get-node-versions.js" ]; then
        # Use centralized configuration
        mapfile -t VERSIONS < <(node scripts/get-node-versions.js list all)
        echo -e "${GREEN}Loaded ${#VERSIONS[@]} versions from centralized config${NC}"
    else
        # Fallback to hardcoded versions if config script is not available
        VERSIONS=(
            "16.20.2"   # LTS - First version with AsyncLocalStorage stable
            "18.19.1"   # LTS - Performance improvements
            "20.11.0"   # LTS - Latest stable
            "21.7.3"    # Current - Latest features
            "22.18.0"   # Latest 22.x - Latest stable in 22.x series
            "24.6.0"    # Latest LTS - Most recent
        )
        echo -e "${YELLOW}Using fallback hardcoded versions${NC}"
    fi
}

# Load versions at startup
load_versions

# Node.js Performance Tuning Configuration
# These settings ensure consistent and optimal performance testing across versions
setup_node_performance_tuning() {
    echo -e "${YELLOW}Configuring Node.js performance tuning settings...${NC}"
    
    # NODE_OPTIONS with only allowed flags
    export NODE_OPTIONS="--max-old-space-size=8192 --no-warnings"
    
    # Environment variables for optimal performance
    export UV_THREADPOOL_SIZE=128        # Increase thread pool for I/O operations
    export NODE_ENV=production           # Production mode optimizations
    export NODE_NO_WARNINGS=1           # Suppress warnings for cleaner output
    
    # Disable CPU frequency scaling (if running on Linux/macOS with appropriate permissions)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Attempting to set CPU governor to performance mode..."
        sudo cpupower frequency-set -g performance 2>/dev/null || echo "Could not set CPU governor (requires sudo)"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS detected - CPU frequency scaling handled by system"
    fi
    
    # Set process priority for more consistent timing
    renice -n -10 $$ 2>/dev/null || echo "Could not set process priority (requires sudo)"
    
    # Disable swap to prevent memory from being swapped out during testing
    if command -v swapoff &> /dev/null; then
        echo "Attempting to disable swap for testing..."
        sudo swapoff -a 2>/dev/null || echo "Could not disable swap (requires sudo)"
    fi
    
    echo "Performance tuning configuration applied:"
    echo "  - NODE_OPTIONS: $NODE_OPTIONS"
    echo "  - UV_THREADPOOL_SIZE: $UV_THREADPOOL_SIZE"
    echo "  - NODE_ENV: $NODE_ENV"
    echo ""
}

# Additional V8 flags for specific test scenarios (passed directly to node, not via NODE_OPTIONS)
get_benchmark_node_flags() {
    echo "--max-old-space-size=8192 --expose-gc --no-compilation-cache --predictable --single-threaded-gc"
}

get_memory_test_node_flags() {
    echo "--max-old-space-size=8192 --expose-gc --trace-gc --trace-gc-verbose"
}

# Cleanup function to restore system settings
cleanup_performance_tuning() {
    echo -e "${YELLOW}Restoring system settings...${NC}"
    
    # Re-enable swap if it was disabled
    if command -v swapon &> /dev/null; then
        echo "Re-enabling swap..."
        sudo swapon -a 2>/dev/null || echo "Could not re-enable swap"
    fi
    
    # Restore CPU governor on Linux
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Restoring CPU governor to ondemand..."
        sudo cpupower frequency-set -g ondemand 2>/dev/null || echo "Could not restore CPU governor"
    fi
    
    echo "System cleanup completed."
}

# Setup trap to ensure cleanup on exit
trap cleanup_performance_tuning EXIT

echo -e "${GREEN}AsyncLocalStorage Performance Testing Suite${NC}"
echo "=========================================="
echo ""

# Source NVM first
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Check if NVM is available after sourcing
if ! type nvm &> /dev/null; then
    echo -e "${RED}Error: NVM is not installed or not available${NC}"
    echo "Please install NVM: https://github.com/nvm-sh/nvm"
    echo "Or make sure it's properly configured in your shell profile"
    exit 1
fi

# Create results directory
mkdir -p results/versions

# Function to test a specific Node.js version
test_version() {
    local version=$1
    echo -e "${YELLOW}Testing Node.js $version${NC}"
    echo "----------------------------------------"
    
    # Install and use the specified version
    nvm install $version
    nvm use $version
    
    # Verify the version
    local current_version=$(node --version)
    echo "Current Node.js version: $current_version"
    
    # Install dependencies if needed (for the first run)
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Create version-specific results directory
    mkdir -p "results/versions/node_$version"
    
    # Run benchmarks with optimized flags
    echo "Running performance benchmarks with optimized Node.js flags..."
    local benchmark_flags=$(get_benchmark_node_flags)
    node $benchmark_flags src/benchmark.js 2>&1 | tee "results/versions/node_$version/benchmark.log"
    
    # Run memory tests with memory-specific flags
    echo "Running memory tests with memory profiling flags..."
    local memory_flags=$(get_memory_test_node_flags)
    node $memory_flags src/memory-test.js 2>&1 | tee "results/versions/node_$version/memory.log"
    
    # Move result files to version-specific directory
    mv results/benchmark_*.json "results/versions/node_$version/" 2>/dev/null || true
    mv results/memory_*.json "results/versions/node_$version/" 2>/dev/null || true
    
    echo -e "${GREEN}Completed testing Node.js $version${NC}"
    echo ""
}

# Function to generate comparison report
generate_report() {
    echo -e "${YELLOW}Generating comparison report...${NC}"
    
    # Create a summary file
    cat > results/versions/SUMMARY.md << EOF
# AsyncLocalStorage Performance Comparison Across Node.js Versions

Generated on: $(date)

## Tested Versions
EOF

    for version in "${VERSIONS[@]}"; do
        echo "- Node.js $version" >> results/versions/SUMMARY.md
    done

    cat >> results/versions/SUMMARY.md << EOF

## Test Results

Each version was tested with the same benchmark suite including:
- Performance benchmarks with varying data sizes
- Memory usage profiling
- Concurrent operation testing
- Memory leak detection

### Performance Summary

EOF

    # Extract key metrics from each version's results
    for version in "${VERSIONS[@]}"; do
        local version_dir="results/versions/node_$version"
        if [ -d "$version_dir" ]; then
            echo "#### Node.js $version" >> results/versions/SUMMARY.md
            echo "" >> results/versions/SUMMARY.md
            
            # Try to extract summary from log files
            if [ -f "$version_dir/benchmark.log" ]; then
                echo "**Benchmark Results:**" >> results/versions/SUMMARY.md
                echo '```' >> results/versions/SUMMARY.md
                grep -A 10 "SUMMARY" "$version_dir/benchmark.log" | tail -n +2 >> results/versions/SUMMARY.md || echo "No summary found" >> results/versions/SUMMARY.md
                echo '```' >> results/versions/SUMMARY.md
                echo "" >> results/versions/SUMMARY.md
            fi
            
            if [ -f "$version_dir/memory.log" ]; then
                echo "**Memory Results:**" >> results/versions/SUMMARY.md
                echo '```' >> results/versions/SUMMARY.md
                grep -A 10 "MEMORY PROFILING SUMMARY" "$version_dir/memory.log" | tail -n +2 >> results/versions/SUMMARY.md || echo "No memory summary found" >> results/versions/SUMMARY.md
                echo '```' >> results/versions/SUMMARY.md
                echo "" >> results/versions/SUMMARY.md
            fi
        fi
    done

    cat >> results/versions/SUMMARY.md << EOF

## Recommendations

Based on the test results:

1. **Performance**: Compare the overhead percentages across versions
2. **Memory Usage**: Look at memory growth patterns and leak detection
3. **Stability**: Check for any version-specific issues or crashes

## Node.js Version Analysis

For detailed information about AsyncLocalStorage changes across these Node.js versions,
including code-level modifications and links to the Node.js repository, see:
[AsyncLocalStorage Changes Analysis](../NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md)

## Performance Tuning Applied

Each version was tested with the following optimizations:

### V8 Flags (Applied Directly to Node.js Commands)
- \`--max-old-space-size=8192\`: Increased heap size for memory-intensive tests
- \`--expose-gc\`: Manual garbage collection control for consistent memory measurements
- \`--no-compilation-cache\`: Ensure fresh compilation for fair comparison
- \`--single-threaded-gc\`: Deterministic garbage collection timing
- \`--predictable\`: Enable predictable mode for consistent benchmarking
- \`--trace-gc\`: Detailed garbage collection logging for memory tests
- \`--trace-gc-verbose\`: Extra verbose GC information for memory analysis

### Environment Settings
- \`NODE_OPTIONS="--max-old-space-size=8192 --no-warnings"\`: Basic Node.js options
- \`UV_THREADPOOL_SIZE=128\`: Increased thread pool for I/O operations
- \`NODE_ENV=production\`: Production optimizations enabled
- \`NODE_NO_WARNINGS=1\`: Suppress warnings for cleaner output
- CPU governor set to performance mode (Linux)
- Process priority elevated for consistent timing
- Swap disabled to prevent memory paging during tests

## Raw Data

All raw test data is available in the version-specific directories:
EOF

    for version in "${VERSIONS[@]}"; do
        echo "- \`results/versions/node_$version/\`" >> results/versions/SUMMARY.md
    done

    echo -e "${GREEN}Comparison report generated: results/versions/SUMMARY.md${NC}"
}

# Main execution
if [ $# -eq 1 ]; then
    # Single version mode
    SINGLE_VERSION="$1"
    
    # Check if the provided version is in our supported list
    if [[ " ${VERSIONS[*]} " =~ " ${SINGLE_VERSION} " ]]; then
        echo "Testing AsyncLocalStorage performance for Node.js $SINGLE_VERSION"
        VERSIONS_TO_TEST=("$SINGLE_VERSION")
    else
        echo -e "${RED}Error: Version $SINGLE_VERSION is not in the supported versions list.${NC}"
        echo "Supported versions: ${VERSIONS[*]}"
        exit 1
    fi
else
    # Multi-version mode (default)
    echo "This script will test AsyncLocalStorage performance across multiple Node.js versions."
    VERSIONS_TO_TEST=("${VERSIONS[@]}")
fi

echo "The following versions will be tested: ${VERSIONS_TO_TEST[*]}"
echo ""

# Setup performance tuning before starting tests
setup_node_performance_tuning

read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled."
    exit 0
fi

# Store the original Node.js version
original_version=$(node --version 2>/dev/null || echo "none")

# Test each version
for version in "${VERSIONS_TO_TEST[@]}"; do
    if test_version "$version"; then
        echo -e "${GREEN}✓ Node.js $version completed successfully${NC}"
    else
        echo -e "${RED}✗ Node.js $version failed${NC}"
    fi
done

# Generate comparison report
generate_report

# Restore original Node.js version if it existed
if [ "$original_version" != "none" ]; then
    echo -e "${YELLOW}Restoring original Node.js version: $original_version${NC}"
    nvm use ${original_version#v} 2>/dev/null || echo "Could not restore original version"
fi

# Cleanup performance tuning settings
cleanup_performance_tuning

echo ""
echo -e "${GREEN}All tests completed!${NC}"
echo "Results are available in the 'results/versions/' directory"
echo "Summary report: results/versions/SUMMARY.md"
