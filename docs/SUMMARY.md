# AsyncLocalStorage Performance Comparison Across Node.js Versions

Generated on: Fri Aug 15 11:26:36 PDT 2025

## Tested Versions
- Node.js 16.20.2
- Node.js 18.19.1
- Node.js 20.11.0
- Node.js 21.7.3
- Node.js 22.0.0

## Test Results

Each version was tested with the same benchmark suite including:
- Performance benchmarks with varying data sizes
- Memory usage profiling
- Concurrent operation testing
- Memory leak detection

### Performance Summary

#### Node.js 16.20.2

**Benchmark Results:**
```
============================================================
Node.js Version: v16.20.2
Average AsyncLocalStorage Overhead: -0.07%
Average Nested ALS Overhead: 73.57%
Total Memory Overhead: -1.50MB

Recommendations:
✅ AsyncLocalStorage overhead is minimal for most use cases
⚠️  Nested AsyncLocalStorage calls significantly increase overhead
```

**Memory Results:**
```
============================================================
Average memory overhead: 81.91%
Memory leak analysis: ✅ No leak detected
Average growth per operation cycle: 0.10MB
Max concurrent operations tested: 500
Memory usage at max concurrency: 8.28MB
```

#### Node.js 18.19.1

**Benchmark Results:**
```
============================================================
Node.js Version: v18.19.1
Average AsyncLocalStorage Overhead: 4.03%
Average Nested ALS Overhead: 70.58%
Total Memory Overhead: -13.27MB

Recommendations:
✅ AsyncLocalStorage overhead is minimal for most use cases
⚠️  Nested AsyncLocalStorage calls significantly increase overhead
```

**Memory Results:**
```
============================================================
Average memory overhead: 100.16%
Memory leak analysis: ✅ No leak detected
Average growth per operation cycle: 0.09MB
Max concurrent operations tested: 500
Memory usage at max concurrency: 8.24MB
```

#### Node.js 20.11.0

**Benchmark Results:**
```
============================================================
Node.js Version: v20.11.0
Average AsyncLocalStorage Overhead: 1.75%
Average Nested ALS Overhead: 67.82%
Total Memory Overhead: -3.84MB

Recommendations:
✅ AsyncLocalStorage overhead is minimal for most use cases
⚠️  Nested AsyncLocalStorage calls significantly increase overhead
```

**Memory Results:**
```
============================================================
Average memory overhead: 209.41%
Memory leak analysis: ✅ No leak detected
Average growth per operation cycle: 0.03MB
Max concurrent operations tested: 500
Memory usage at max concurrency: 8.32MB
```

#### Node.js 21.7.3

**Benchmark Results:**
```
============================================================
Node.js Version: v21.7.3
Average AsyncLocalStorage Overhead: -0.30%
Average Nested ALS Overhead: 70.73%
Total Memory Overhead: 19.38MB

Recommendations:
✅ AsyncLocalStorage overhead is minimal for most use cases
⚠️  Nested AsyncLocalStorage calls significantly increase overhead
```

**Memory Results:**
```
============================================================
Average memory overhead: 89.83%
Memory leak analysis: ✅ No leak detected
Average growth per operation cycle: 0.10MB
Max concurrent operations tested: 500
Memory usage at max concurrency: 8.33MB
```

#### Node.js 22.0.0

**Benchmark Results:**
```
============================================================
Node.js Version: v22.0.0
Average AsyncLocalStorage Overhead: -0.11%
Average Nested ALS Overhead: 55.80%
Total Memory Overhead: -7.02MB

Recommendations:
✅ AsyncLocalStorage overhead is minimal for most use cases
⚠️  Nested AsyncLocalStorage calls significantly increase overhead
```

**Memory Results:**
```
============================================================
Average memory overhead: 146.99%
Memory leak analysis: ✅ No leak detected
Average growth per operation cycle: 0.03MB
Max concurrent operations tested: 500
Memory usage at max concurrency: 8.36MB
```


## Recommendations

Based on the test results:

1. **Performance**: Compare the overhead percentages across versions
2. **Memory Usage**: Look at memory growth patterns and leak detection
3. **Stability**: Check for any version-specific issues or crashes

## Raw Data

All raw test data is available in the version-specific directories:
- `results/versions/node_16.20.2/`
- `results/versions/node_18.19.1/`
- `results/versions/node_20.11.0/`
- `results/versions/node_21.7.3/`
- `results/versions/node_22.0.0/`
