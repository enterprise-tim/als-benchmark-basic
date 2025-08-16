#!/bin/bash

# AsyncLocalStorage Performance Testing Across Node.js Versions
# This script uses NVM to test performance across multiple Node.js versions
# For detailed analysis of AsyncLocalStorage changes across versions, see:
# docs/NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md
#
# Usage:
#   ./test-versions.sh                    # Test comprehensive set of versions (1 iteration)
#   ./test-versions.sh 24.6.0             # Test a single version (1 iteration)
#   ./test-versions.sh --iterations 5     # Test all versions with 5 iterations each
#   ./test-versions.sh 24.6.0 --iterations 3  # Test single version with 3 iterations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default iterations
ITERATIONS=1

# Function to show available version sets
show_available_sets() {
    local config_file="config/node-versions.json"
    
    if [ -f "$config_file" ]; then
        echo -e "${GREEN}Available version sets in config/node-versions.json:${NC}"
        node -e "
            const config = require('./config/node-versions.json');
            Object.entries(config.sets).forEach(([key, versions]) => {
                console.log(\`  \${key}: \${versions.length} versions\`);
            });
        "
        echo ""
        echo "To use a different set, modify the load_versions() function in this script."
        echo "Current default: comprehensive set"
    else
        echo -e "${YELLOW}Config file not found. Using fallback versions.${NC}"
    fi
}

# Parse command line arguments
parse_arguments() {
    local args=()
    local iterations_arg=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --iterations)
                if [[ -n "$2" && "$2" =~ ^[0-9]+$ ]]; then
                    ITERATIONS="$2"
                    shift 2
                else
                    echo -e "${RED}Error: --iterations requires a positive integer${NC}"
                    exit 1
                fi
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            -*)
                echo -e "${RED}Error: Unknown option $1${NC}"
                show_help
                exit 1
                ;;
            *)
                args+=("$1")
                shift
                ;;
        esac
    done
    
    # Restore positional arguments
    set -- "${args[@]}"
}

# Show help information
show_help() {
    echo "Usage: $0 [version] [--iterations N] [--help]"
    echo ""
    echo "Options:"
    echo "  [version]           Test a specific Node.js version (e.g., 24.6.0)"
    echo "  --iterations N      Run N iterations of each version (default: 1)"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Test all versions from config (1 iteration)"
    echo "  $0 24.6.0                   # Test only Node.js 24.6.0 (1 iteration)"
    echo "  $0 --iterations 5           # Test all versions with 5 iterations each"
    echo "  $0 24.6.0 --iterations 3   # Test Node.js 24.6.0 with 3 iterations"
    echo "  $0 --help                    # Show this help"
    echo ""
    echo "Available version sets in config/node-versions.json:"
    if [ -f "config/node-versions.json" ]; then
        node -e "
            const config = require('./config/node-versions.json');
            Object.entries(config.sets).forEach(([key, versions]) => {
                console.log(\`  \${key}: \${versions.length} versions\`);
            });
        "
        echo ""
        echo "Current default: comprehensive set"
    else
        echo "  Config file not found"
    fi
}

# Node.js versions to test (loaded from centralized config)
# To update versions, edit config/node-versions.json
load_versions() {
    local config_file="config/node-versions.json"
    
    if [ -f "$config_file" ]; then
        # Use centralized configuration from config/node-versions.json
        echo -e "${GREEN}Loading versions from centralized config using Node.js...${NC}"
        
        # Use Node.js to read the config file and output versions
        VERSIONS=($(node -e "
            const config = require('./config/node-versions.json');
            const versions = config.sets.comprehensive.map(key => config.versions[key].exact);
            console.log(versions.join(' '));
        "))
        
        echo -e "${GREEN}Loaded ${#VERSIONS[@]} versions from centralized config (comprehensive set)${NC}"
        echo "Versions to test: ${VERSIONS[*]}"
    else
        # Fallback to hardcoded versions if config file is not available
        echo -e "${YELLOW}Warning: config/node-versions.json not found, using fallback versions${NC}"
        VERSIONS=(
            "16.20.2"   # LTS - First version with AsyncLocalStorage stable
            "18.19.1"   # LTS - Performance improvements and debugger context loss fixes
            "20.0.0"    # LTS - First 20.x release
            "20.11.0"   # LTS - Enhanced async context handling and nested context fixes
            "21.0.0"    # Current - First 21.x release
            "21.7.3"    # Current - Continued optimization for high-concurrency scenarios
            "22.0.0"    # Latest - Foundation for major performance overhaul
            "22.18.0"   # Latest 22.x - Latest stable in 22.x series
            "23.0.0"    # Current - First 23.x release
            "24.0.0"    # Latest LTS - First 24.x release with AsyncContextFrame
            "24.6.0"    # Latest LTS - Revolutionary AsyncContextFrame implementation
        )
        echo -e "${YELLOW}Using fallback hardcoded versions (${#VERSIONS[@]} versions)${NC}"
    fi
}

# Load versions will be called after help check

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

# Check if bc is available for statistics calculations
if ! command -v bc &> /dev/null; then
    echo -e "${YELLOW}Warning: bc not available. Statistics will use basic integer math.${NC}"
    echo "For better statistical analysis, install bc: brew install bc (macOS) or apt-get install bc (Ubuntu)"
    echo ""
fi

# Create results directory
mkdir -p results/versions

# Function to test a specific Node.js version
test_version() {
    local version=$1
    local iteration=$2
    
    echo -e "${YELLOW}Testing Node.js $version (Iteration $iteration)${NC}"
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
    
    # Create version-specific results directory with iteration subdirectory
    local results_dir="results/versions/node_$version"
    if [ $ITERATIONS -gt 1 ]; then
        results_dir="$results_dir/iteration_$iteration"
    fi
    mkdir -p "$results_dir"
    
    # Run benchmarks with optimized flags
    echo "Running performance benchmarks with optimized Node.js flags..."
    local benchmark_flags=$(get_benchmark_node_flags)
    node $benchmark_flags src/benchmark.js 2>&1 | tee "$results_dir/benchmark.log"
    
    # Run memory tests with memory-specific flags
    echo "Running memory tests with memory profiling flags..."
    local memory_flags=$(get_memory_test_node_flags)
    node $memory_flags src/memory-test.js 2>&1 | tee "$results_dir/memory.log"
    
    # Move result files to version-specific directory
    mv results/benchmark_*.json "$results_dir/" 2>/dev/null || true
    mv results/memory_*.json "$results_dir/" 2>/dev/null || true
    
    echo -e "${GREEN}Completed testing Node.js $version (Iteration $iteration)${NC}"
    echo ""
}

# Function to calculate basic statistics from a list of numbers
calculate_stats() {
    local numbers=("$@")
    local count=${#numbers[@]}
    
    if [ $count -eq 0 ]; then
        echo "0,0,0,0,0"  # count, mean, stddev, min, max
        return
    fi
    
    # Calculate sum and min/max
    local sum=0
    local min=${numbers[0]}
    local max=${numbers[0]}
    
    for num in "${numbers[@]}"; do
        sum=$(echo "$sum + $num" | bc -l)
        if (( $(echo "$num < $min" | bc -l) )); then
            min=$num
        fi
        if (( $(echo "$num > $max" | bc -l) )); then
            max=$num
        fi
    done
    
    # Calculate mean
    local mean=$(echo "scale=6; $sum / $count" | bc -l)
    
    # Calculate standard deviation
    local variance_sum=0
    for num in "${numbers[@]}"; do
        local diff=$(echo "$num - $mean" | bc -l)
        local diff_squared=$(echo "$diff * $diff" | bc -l)
        variance_sum=$(echo "$variance_sum + $diff_squared" | bc -l)
    done
    local variance=$(echo "scale=6; $variance_sum / $count" | bc -l)
    local stddev=$(echo "scale=6; sqrt($variance)" | bc -l)
    
    # Calculate coefficient of variation
    local cv=0
    if (( $(echo "$mean != 0" | bc -l) )); then
        cv=$(echo "scale=6; $stddev / $mean * 100" | bc -l)
    fi
    
    echo "$count,$mean,$stddev,$min,$max,$cv"
}

# Function to generate comparison report
generate_report() {
    echo -e "${YELLOW}Generating comparison report...${NC}"
    
    # Create a summary file
    cat > results/versions/SUMMARY.md << EOF
# AsyncLocalStorage Performance Comparison Across Node.js Versions

Generated on: $(date)
Iterations per version: $ITERATIONS

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

EOF

    if [ $ITERATIONS -gt 1 ]; then
        cat >> results/versions/SUMMARY.md << EOF

### Statistical Summary (Across $ITERATIONS Iterations)

This section provides statistical analysis across multiple runs for each version:
- **Mean**: Average performance across all iterations
- **Standard Deviation**: Measure of consistency/variability
- **Min/Max**: Best and worst performance observed
- **Coefficient of Variation**: Relative variability (lower is better)

EOF
    fi

    cat >> results/versions/SUMMARY.md << EOF

### Performance Summary

EOF

    # Extract key metrics from each version's results
    for version in "${VERSIONS[@]}"; do
        local version_dir="results/versions/node_$version"
        if [ -d "$version_dir" ]; then
            echo "#### Node.js $version" >> results/versions/SUMMARY.md
            echo "" >> results/versions/SUMMARY.md
            
            if [ $ITERATIONS -gt 1 ]; then
                echo "**Results across $ITERATIONS iterations:**" >> results/versions/SUMMARY.md
                echo "" >> results/versions/SUMMARY.md
                
                # Process each iteration
                for i in $(seq 1 $ITERATIONS); do
                    local iteration_dir="$version_dir/iteration_$i"
                    if [ -d "$iteration_dir" ]; then
                        echo "**Iteration $i:**" >> results/versions/SUMMARY.md
                        
                        # Try to extract summary from log files
                        if [ -f "$iteration_dir/benchmark.log" ]; then
                            echo "Benchmark Results:" >> results/versions/SUMMARY.md
                            echo '```' >> results/versions/SUMMARY.md
                            grep -A 10 "SUMMARY" "$iteration_dir/benchmark.log" | tail -n +2 >> results/versions/SUMMARY.md || echo "No summary found" >> results/versions/SUMMARY.md
                            echo '```' >> results/versions/SUMMARY.md
                            echo "" >> results/versions/SUMMARY.md
                        fi
                        
                        if [ -f "$iteration_dir/memory.log" ]; then
                            echo "Memory Results:" >> results/versions/SUMMARY.md
                            echo '```' >> results/versions/SUMMARY.md
                            grep -A 10 "MEMORY PROFILING SUMMARY" "$iteration_dir/memory.log" | tail -n +2 >> results/versions/SUMMARY.md || echo "No memory summary found" >> results/versions/SUMMARY.md
                            echo '```' >> results/versions/SUMMARY.md
                            echo "" >> results/versions/SUMMARY.md
                        fi
                    fi
                done
            else
                # Single iteration mode - use old logic
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
        if [ $ITERATIONS -gt 1 ]; then
            echo "- \`results/versions/node_$version/\` (contains iteration subdirectories)" >> results/versions/SUMMARY.md
        else
            echo "- \`results/versions/node_$version/\`" >> results/versions/SUMMARY.md
        fi
    done

    echo -e "${GREEN}Comparison report generated: results/versions/SUMMARY.md${NC}"
}

# Main execution
# Parse command line arguments first
parse_arguments "$@"

# Load versions after help check
load_versions

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
        echo ""
        show_available_sets
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
    echo -e "${YELLOW}Running $ITERATIONS iterations for Node.js $version...${NC}"
    for i in $(seq 1 $ITERATIONS); do
        echo -e "${YELLOW}Iteration $i of $version${NC}"
        if test_version "$version" "$i"; then
            echo -e "${GREEN}✓ Node.js $version iteration $i completed successfully${NC}"
        else
            echo -e "${RED}✗ Node.js $version iteration $i failed${NC}"
        fi
    done
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
if [ $ITERATIONS -gt 1 ]; then
    echo "Each version was tested $ITERATIONS times for statistical reliability"
fi
echo "Results are available in the 'results/versions/' directory"
echo "Summary report: results/versions/SUMMARY.md"
