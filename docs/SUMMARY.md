# AsyncLocalStorage Performance Summary

Generated on: 2025-08-16T03:38:04.349Z

## Version Coverage

**Comprehensive Testing Across 11 Node.js Versions:**
- **LTS Versions:** 16.20.2, 18.19.1, 20.0.0, 20.11.0, 24.0.0, 24.6.0
- **Current Versions:** 21.0.0, 21.7.3, 22.0.0, 22.18.0, 23.0.0

**Testing Strategy:** Early releases (x.0.0) + latest stable versions for comprehensive coverage

## Benchmark Types

This project provides **two distinct types of benchmarks** to give you a complete picture of AsyncLocalStorage performance:

### 1. Simple AsyncLocalStorage Overhead Tests
**Purpose:** Measure the basic performance cost of using AsyncLocalStorage in isolation
**What it tests:**
- Basic AsyncLocalStorage.run() overhead
- Nested AsyncLocalStorage contexts (one inside another)
- Impact of data size (1KB, 10KB, 100KB, 1MB, 10MB)
- Performance with and without async operations
- Context switching overhead (Node.js v24+ AsyncContextFrame)

**Example code pattern:**
```javascript
// Simple test - measures basic overhead
const als = new AsyncLocalStorage();
als.run({ userId: 123 }, () => {
  // Do work and access context
  const context = als.getStore();
});

// Nested test - measures nested context overhead  
als.run({ requestId: 'req-1' }, () => {
  als.run({ userId: 123 }, () => {
    // Nested context access
  });
});
```

### 2. Advanced Distributed System Tests
**Purpose:** Measure AsyncLocalStorage performance in complex, real-world distributed applications
**What it tests:**
- Multi-tenant rate limiter simulation with 2000+ tenants
- Worker thread performance and context isolation
- Cluster mode (multi-process) performance
- Context propagation across process boundaries
- High-concurrency scenarios (5000+ RPS)
- Real-world latency patterns (database calls, API calls, Redis operations)

**Example scenario:** SaaS platform handling thousands of concurrent users with rate limiting, user context, and distributed tracing

## Latest Benchmark Results

**Node.js Version:** v22.0.0
**Platform:** darwin arm64
**Test Date:** 2025-08-16T03:31:45.933Z

### Simple AsyncLocalStorage Overhead Results

*Results from basic overhead tests will be displayed here*

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

### Simple Overhead Recommendations

*Recommendations for basic AsyncLocalStorage usage will be displayed here*

### Distributed System Recommendations

✅ **Excellent distributed performance** - AsyncLocalStorage maintains perfect context isolation across processes/workers.

✅ **Minimal distributed overhead** - AsyncLocalStorage scales efficiently across your distributed architecture.