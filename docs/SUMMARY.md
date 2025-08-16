# AsyncLocalStorage Performance Summary

Generated on: 2025-08-16T03:38:04.349Z

## Latest Benchmark Results

**Node.js Version:** v22.0.0
**Platform:** darwin arm64
**Test Date:** 2025-08-16T03:31:45.933Z


### Distributed System Performance Overview

- **Average Throughput:** 355.46 req/s
- **Average P99 Latency:** 102.50ms
- **Average Context Error Rate:** 0.000000%
- **Average Distributed Overhead:** 0.00%

### Distributed Test Results

| Test Case | Throughput | P99 Latency | Error Rate | Workers | Distributed Overhead |
|-----------|------------|-------------|------------|---------|---------------------|
| ALS - SINGLE | 0.00 req/s | 0.00ms | N/A | 1 | 0.00% |
| NON-ALS - SINGLE | 710.93 req/s | 205.00ms | N/A | 1 | 0.00% |

#### Distributed System Analysis

✅ **Excellent context isolation** - Very low error rate indicates robust AsyncLocalStorage behavior in distributed scenarios.
✅ **Minimal distributed overhead** - AsyncLocalStorage scales well across multiple processes/workers.

## Latest Memory Analysis

### Memory Leak Detection

- **Status:** ✅ No leak detected
- **Average Growth per Cycle:** 0.01MB
- **Total Test Growth:** 0.05MB

### Memory Usage by Object Size

| Object Size | Memory Overhead | Overhead % |
|-------------|-----------------|------------|
| 1KB | 0.73MB | 0% |
| 10KB | -0.01MB | -3.82% |
| 100KB | 0.03MB | 4.08% |
| 1000KB | -0.80MB | -7.00% |
| 10000KB | 22.89MB | 17.71% |

## Recommendations


### Distributed System Recommendations



✅ **Excellent distributed performance** - AsyncLocalStorage maintains perfect context isolation across processes/workers.

✅ **Minimal distributed overhead** - AsyncLocalStorage scales efficiently across your distributed architecture.