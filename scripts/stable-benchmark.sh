#!/bin/bash

# Stable Performance Benchmarking Script
# This script implements multiple strategies to reduce testing variability on local machines

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ITERATIONS=5
WARMUP_ITERATIONS=2
COOLDOWN_SECONDS=10
TEST_TIMEOUT=300  # 5 minutes per test

echo -e "${GREEN}Stable Performance Benchmarking Suite${NC}"
echo "===================================="
echo ""

# Function to check system load and wait if necessary
wait_for_stable_system() {
    echo -e "${YELLOW}Checking system stability...${NC}"
    
    while true; do
        # Check CPU load average (1-minute average)
        local load=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | xargs)
        local cpu_count=$(nproc)
        local load_threshold=$(echo "$cpu_count * 0.5" | bc -l)  # 50% of CPU cores
        
        # Check available memory (percentage)
        local mem_available=$(free | grep '^Mem:' | awk '{printf "%.1f", $7/$2 * 100.0}' 2>/dev/null || echo "90")
        
        echo "Current system load: $load (threshold: $load_threshold)"
        echo "Available memory: $mem_available%"
        
        # Wait if system is under stress
        if (( $(echo "$load > $load_threshold" | bc -l) )) || (( $(echo "$mem_available < 70" | bc -l) )); then
            echo -e "${YELLOW}System under stress, waiting 30 seconds...${NC}"
            sleep 30
        else
            echo -e "${GREEN}System stable, proceeding with tests${NC}"
            break
        fi
    done
}

# Function to configure system for stable testing
configure_system() {
    echo -e "${YELLOW}Configuring system for stable testing...${NC}"
    
    # Kill known resource-heavy processes (with user confirmation)
    local heavy_processes=("chrome" "firefox" "slack" "docker" "code")
    for process in "${heavy_processes[@]}"; do
        if pgrep -f "$process" > /dev/null; then
            echo -e "${YELLOW}Found $process running. Recommend closing for stable results.${NC}"
        fi
    done
    
    # Set environment variables for stable testing
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=8192 --no-warnings"
    export UV_THREADPOOL_SIZE=32  # Conservative thread pool size
    
    # Try to set CPU governor to performance (Linux)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v cpupower &> /dev/null; then
            echo "Setting CPU governor to performance mode..."
            sudo cpupower frequency-set -g performance 2>/dev/null || echo "Could not set CPU governor"
        fi
    fi
    
    # Set process priority
    renice -n -5 $$ 2>/dev/null || echo "Could not set process priority"
    
    # Clear system caches
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sync
        sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches' 2>/dev/null || echo "Could not clear caches"
    fi
    
    echo "System configuration completed."
}

# Function to run a single benchmark iteration with isolation
run_isolated_benchmark() {
    local iteration=$1
    local node_version=$2
    
    echo -e "${BLUE}Running iteration $iteration...${NC}"
    
    # Wait for system stability before each iteration
    wait_for_stable_system
    
    # Force garbage collection before test
    node --expose-gc -e "if (global.gc) { global.gc(); global.gc(); }"
    
    # Brief pause to let system settle
    sleep 3
    
    # Create iteration-specific directory
    local result_dir="results/stable/node_${node_version}/iteration_${iteration}"
    mkdir -p "$result_dir"
    
    # Run benchmark with timeout and capture output
    local start_time=$(date +%s)
    
    timeout $TEST_TIMEOUT node \
        --max-old-space-size=8192 \
        --expose-gc \
        --no-compilation-cache \
        --predictable \
        --single-threaded-gc \
        src/benchmark.js > "$result_dir/output.log" 2>&1
    
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $exit_code -eq 0 ]; then
        echo "  ✓ Iteration $iteration completed in ${duration}s"
        
        # Move benchmark results to iteration directory
        mv results/benchmark_*.json "$result_dir/" 2>/dev/null || true
        
        # Record system stats during test
        cat > "$result_dir/system_stats.json" << EOF
{
  "iteration": $iteration,
  "duration_seconds": $duration,
  "system_load_start": "$(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | xargs)",
  "memory_available_start": "$(free | grep '^Mem:' | awk '{printf "%.1f", $7/$2 * 100.0}' 2>/dev/null || echo "unknown")",
  "timestamp": "$(date -Iseconds)"
}
EOF
        
        return 0
    else
        echo "  ✗ Iteration $iteration failed (exit code: $exit_code)"
        return 1
    fi
}

# Function to calculate statistical metrics from multiple iterations
calculate_statistics() {
    local node_version=$1
    local result_dir="results/stable/node_${node_version}"
    
    echo -e "${YELLOW}Calculating statistics for Node.js $node_version...${NC}"
    
    node --max-old-space-size=4096 -e "
    const fs = require('fs');
    const path = require('path');
    
    const resultDir = '$result_dir';
    const iterations = fs.readdirSync(resultDir)
        .filter(d => d.startsWith('iteration_'))
        .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));
    
    console.log(\`Found \${iterations.length} iterations\`);
    
    const allResults = [];
    const systemStats = [];
    
    for (const iter of iterations) {
        const iterDir = path.join(resultDir, iter);
        
        // Load benchmark results
        const files = fs.readdirSync(iterDir);
        const benchmarkFile = files.find(f => f.startsWith('benchmark_'));
        if (benchmarkFile) {
            const result = JSON.parse(fs.readFileSync(path.join(iterDir, benchmarkFile), 'utf8'));
            allResults.push({iteration: iter, ...result});
        }
        
        // Load system stats
        const statsFile = path.join(iterDir, 'system_stats.json');
        if (fs.existsSync(statsFile)) {
            systemStats.push(JSON.parse(fs.readFileSync(statsFile, 'utf8')));
        }
    }
    
    if (allResults.length === 0) {
        console.log('No valid benchmark results found');
        process.exit(1);
    }
    
    // Calculate statistics for each benchmark
    const benchmarkStats = {};
    const firstResult = allResults[0];
    
    if (firstResult.benchmarks) {
        firstResult.benchmarks.forEach((benchmark, idx) => {
            const name = benchmark.name;
            const overheads = allResults
                .map(r => r.benchmarks[idx]?.overhead?.timePercent)
                .filter(v => v !== undefined && !isNaN(v));
            
            if (overheads.length > 0) {
                const sorted = overheads.slice().sort((a, b) => a - b);
                const mean = overheads.reduce((a, b) => a + b) / overheads.length;
                const variance = overheads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / overheads.length;
                const stddev = Math.sqrt(variance);
                const median = sorted[Math.floor(sorted.length / 2)];
                const q1 = sorted[Math.floor(sorted.length * 0.25)];
                const q3 = sorted[Math.floor(sorted.length * 0.75)];
                const iqr = q3 - q1;
                const min = Math.min(...overheads);
                const max = Math.max(...overheads);
                const cv = (stddev / mean) * 100; // Coefficient of variation
                
                // 95% confidence interval
                const marginOfError = 1.96 * stddev / Math.sqrt(overheads.length);
                const ci95 = [mean - marginOfError, mean + marginOfError];
                
                benchmarkStats[name] = {
                    samples: overheads.length,
                    mean: parseFloat(mean.toFixed(3)),
                    median: parseFloat(median.toFixed(3)),
                    stddev: parseFloat(stddev.toFixed(3)),
                    cv_percent: parseFloat(cv.toFixed(2)),
                    min: parseFloat(min.toFixed(3)),
                    max: parseFloat(max.toFixed(3)),
                    q1: parseFloat(q1.toFixed(3)),
                    q3: parseFloat(q3.toFixed(3)),
                    iqr: parseFloat(iqr.toFixed(3)),
                    ci95_lower: parseFloat(ci95[0].toFixed(3)),
                    ci95_upper: parseFloat(ci95[1].toFixed(3)),
                    raw_values: overheads,
                    stability_rating: cv < 5 ? 'Excellent' : cv < 10 ? 'Good' : cv < 20 ? 'Fair' : 'Poor'
                };
            }
        });
    }
    
    const summary = {
        nodeVersion: '$node_version',
        testDate: new Date().toISOString(),
        totalIterations: allResults.length,
        successfulIterations: allResults.length,
        benchmarkStatistics: benchmarkStats,
        systemStats: systemStats,
        testConfiguration: {
            warmupIterations: $WARMUP_ITERATIONS,
            testIterations: $ITERATIONS,
            cooldownSeconds: $COOLDOWN_SECONDS,
            nodeOptions: process.env.NODE_OPTIONS
        }
    };
    
    const outputFile = path.join(resultDir, 'statistical_analysis.json');
    fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
    
    console.log('\\nStatistical Analysis Summary:');
    console.log('============================');
    Object.entries(benchmarkStats).forEach(([name, stats]) => {
        console.log(\`\\n\${name}:\`);
        console.log(\`  Mean Overhead: \${stats.mean}% ± \${stats.stddev}%\`);
        console.log(\`  Median: \${stats.median}%\`);
        console.log(\`  95% CI: [\${stats.ci95_lower}%, \${stats.ci95_upper}%]\`);
        console.log(\`  Coefficient of Variation: \${stats.cv_percent}%\`);
        console.log(\`  Stability Rating: \${stats.stability_rating}\`);
        console.log(\`  Range: \${stats.min}% - \${stats.max}%\`);
    });
    
    console.log(\`\\nResults saved to: \${outputFile}\`);
    " || {
        echo -e "${RED}Failed to calculate statistics${NC}"
        return 1
    }
}

# Function to run warmup iterations
run_warmup() {
    echo -e "${YELLOW}Running warmup iterations...${NC}"
    
    for i in $(seq 1 $WARMUP_ITERATIONS); do
        echo "Warmup iteration $i/$WARMUP_ITERATIONS"
        
        # Brief warmup run
        timeout 60 node \
            --max-old-space-size=4096 \
            --expose-gc \
            src/benchmark.js > /dev/null 2>&1 || true
        
        # Clean up warmup results
        rm -f results/benchmark_*.json 2>/dev/null || true
        
        sleep 5
    done
    
    echo "Warmup completed"
}

# Main execution function
run_stable_benchmark() {
    local node_version=$(node --version | sed 's/v//')
    
    echo "Testing Node.js version: $node_version"
    echo "Iterations: $ITERATIONS (plus $WARMUP_ITERATIONS warmup)"
    echo ""
    
    # Configure system
    configure_system
    
    # Create results directory
    mkdir -p "results/stable/node_${node_version}"
    
    # Wait for stable system before starting
    wait_for_stable_system
    
    # Run warmup
    run_warmup
    
    # Cool down after warmup
    echo -e "${YELLOW}Cooling down for ${COOLDOWN_SECONDS} seconds...${NC}"
    sleep $COOLDOWN_SECONDS
    
    # Run actual benchmark iterations
    local successful_iterations=0
    
    for i in $(seq 1 $ITERATIONS); do
        echo -e "${BLUE}Starting iteration $i/$ITERATIONS${NC}"
        
        if run_isolated_benchmark $i $node_version; then
            ((successful_iterations++))
        fi
        
        # Cool down between iterations (except last one)
        if [ $i -lt $ITERATIONS ]; then
            echo "Cooling down for $COOLDOWN_SECONDS seconds..."
            sleep $COOLDOWN_SECONDS
        fi
    done
    
    echo ""
    echo -e "${GREEN}Completed $successful_iterations/$ITERATIONS successful iterations${NC}"
    
    if [ $successful_iterations -ge 3 ]; then
        calculate_statistics $node_version
        echo -e "${GREEN}Statistical analysis completed successfully${NC}"
    else
        echo -e "${RED}Insufficient successful iterations for statistical analysis${NC}"
        return 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--iterations)
            ITERATIONS="$2"
            shift 2
            ;;
        -w|--warmup)
            WARMUP_ITERATIONS="$2"
            shift 2
            ;;
        -c|--cooldown)
            COOLDOWN_SECONDS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -i, --iterations N     Number of benchmark iterations (default: $ITERATIONS)"
            echo "  -w, --warmup N         Number of warmup iterations (default: $WARMUP_ITERATIONS)"
            echo "  -c, --cooldown N       Cooldown seconds between iterations (default: $COOLDOWN_SECONDS)"
            echo "  -h, --help             Show this help message"
            echo ""
            echo "Example: $0 --iterations 10 --warmup 3 --cooldown 15"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Verify we have the benchmark script
if [ ! -f "src/benchmark.js" ]; then
    echo -e "${RED}Error: src/benchmark.js not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Show configuration and ask for confirmation
echo "Configuration:"
echo "  Test iterations: $ITERATIONS"
echo "  Warmup iterations: $WARMUP_ITERATIONS"
echo "  Cooldown time: $COOLDOWN_SECONDS seconds"
echo "  Estimated total time: $((($ITERATIONS + $WARMUP_ITERATIONS) * 60 + $ITERATIONS * $COOLDOWN_SECONDS)) seconds"
echo ""

read -p "Continue with stable benchmark testing? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled."
    exit 0
fi

# Run the stable benchmark
run_stable_benchmark
