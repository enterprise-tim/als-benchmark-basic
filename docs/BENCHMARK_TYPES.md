# Benchmark Types Explained

This document clearly explains the two different types of benchmarks provided by this project and when to use each one.

## Overview

The AsyncLocalStorage performance analysis project provides **two distinct types of benchmarks** to give you a complete picture of performance characteristics:

1. **Simple AsyncLocalStorage Overhead Tests** - Basic performance measurements
2. **Advanced Distributed System Tests** - Complex real-world scenario testing

## Node.js Versions Tested

This project tests AsyncLocalStorage performance across **11 comprehensive Node.js versions** that provide both focused analysis and granular testing coverage:

### Key Milestone Versions (Analysis Focus)
- **Node.js v16.20.2** (LTS) - First version with AsyncLocalStorage stable
- **Node.js v18.19.1** (LTS) - Performance improvements and debugger context loss fixes
- **Node.js v20.11.0** (LTS) - Enhanced async context handling and nested context fixes
- **Node.js v21.7.3** (Current) - Continued optimization for high-concurrency scenarios
- **Node.js v22.0.0** (Latest) - Foundation for major performance overhaul
- **Node.js v24.6.0** (Latest LTS) - Revolutionary AsyncContextFrame implementation

### Early Release Versions (Granular Testing)
- **Node.js v20.0.0** (LTS) - First 20.x release for baseline comparison
- **Node.js v21.0.0** (Current) - First 21.x release for feature introduction testing
- **Node.js v22.18.0** (Latest) - Latest stable in 22.x series for regression testing
- **Node.js v23.0.0** (Current) - First 23.x release for latest features
- **Node.js v24.0.0** (Latest LTS) - First 24.x release with AsyncContextFrame introduction

### Key AsyncLocalStorage Issues Addressed

The versions tested address several critical AsyncLocalStorage issues:

- **[Issue #43148](https://github.com/nodejs/node/issues/43148)** - Debugger context loss fix in v18
- **[Issue #45848](https://github.com/nodejs/node/issues/45848)** - Nested async context propagation in v20
- **[Issue #34493](https://github.com/nodejs/node/issues/34493)** - 97% performance degradation issue
- **[Issue #58204](https://github.com/nodejs/node/issues/58204)** - AsyncResource behavior changes in v24
- **[PR #55552](https://github.com/nodejs/node/pull/55552)** - AsyncContextFrame implementation in v24

For detailed analysis of these changes, see [NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md](./NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md).

## 1. Simple AsyncLocalStorage Overhead Tests

### Purpose
Measure the basic performance cost of using AsyncLocalStorage in isolation, similar to the code examples in the `nested-als.html` documentation.

### What It Tests
- **Basic Overhead**: Simple `AsyncLocalStorage.run()` operations
- **Nested Contexts**: Multiple levels of AsyncLocalStorage nesting
- **Data Size Impact**: Performance with different object sizes (1KB to 10MB)
- **Async Operations**: Performance with and without async operations
- **Context Switching**: Rapid context creation/destruction (Node.js v24+ focus)

### Code Examples
```javascript
// Basic test - measures simple overhead
const als = new AsyncLocalStorage();
als.run({ userId: 123 }, () => {
  const context = als.getStore();
  // Do work here
});

// Nested test - measures nested context overhead
als.run({ requestId: 'req-1' }, () => {
  als.run({ userId: 123 }, () => {
    als.run({ feature: 'premium' }, () => {
      // All three contexts are active
      const request = als.getStore(); // Gets feature context
    });
  });
});
```

### When to Use
- **Development**: Understanding basic AsyncLocalStorage performance
- **Code Review**: Evaluating performance impact of context usage
- **Architecture**: Deciding between single vs. nested contexts
- **Node.js Version Selection**: Understanding performance differences across versions

### Output
- Basic overhead percentages
- Nested context overhead percentages
- Memory usage impact
- Performance recommendations

## 2. Advanced Distributed System Tests

### Purpose
Measure AsyncLocalStorage performance in complex, real-world distributed applications that closely mirror production environments.

### What It Tests
- **Multi-Tenant Architecture**: 2000+ concurrent tenants
- **High Concurrency**: 5000+ requests per second
- **Worker Threads**: Context isolation across threads
- **Cluster Mode**: Context propagation across processes
- **Real-World Patterns**: Rate limiting, distributed tracing, user context
- **Latency Patterns**: Database calls, API calls, Redis operations

### Test Scenario
The distributed benchmark simulates a **SaaS platform** with:
- Multiple tenant isolation
- Distributed rate limiting with token buckets
- User context propagation across async boundaries
- Worker thread and cluster mode processing
- High-concurrency request handling

### Code Architecture
```javascript
// Simplified version of what the distributed benchmark tests
class MultiTenantRateLimiter {
  constructor() {
    this.als = new AsyncLocalStorage();
  }

  async processRequest(tenantId, request) {
    return this.als.run({ tenantId, requestId: request.id }, async () => {
      // Context is automatically available to all async operations
      const rateLimit = await this.checkRateLimit(tenantId);
      const userContext = await this.getUserContext(request.userId);
      
      // Process request with full context available
      return this.handleRequest(request, rateLimit, userContext);
    });
  }
}
```

### When to Use
- **Production Planning**: Understanding AsyncLocalStorage in distributed systems
- **Architecture Design**: Planning multi-process/multi-thread applications
- **Performance Tuning**: Optimizing high-concurrency scenarios
- **Enterprise Applications**: Large-scale SaaS or microservice architectures

### Output
- Throughput measurements (requests per second)
- Latency percentiles (P50, P95, P99)
- Context isolation error rates
- Distributed overhead measurements
- Worker thread and cluster performance

## Key Differences

| Aspect | Simple Tests | Advanced Tests |
|--------|--------------|----------------|
| **Complexity** | Low - isolated operations | High - complex distributed scenarios |
| **Scope** | Single process, single thread | Multi-process, multi-thread |
| **Realism** | Synthetic workloads | Production-like scenarios |
| **Use Case** | Development, code review | Production planning, architecture |
| **Performance Focus** | Basic overhead measurement | System-level performance |
| **Context Usage** | Simple, nested contexts | Complex context propagation |

## Running the Benchmarks

### Simple Overhead Tests
```bash
npm run benchmark
```
- Fast execution (seconds to minutes)
- Low resource requirements
- Good for development and testing

### Advanced Distributed Tests
```bash
npm run benchmark-distributed
```
- Longer execution (minutes to hours)
- Higher resource requirements
- Good for production planning

## Interpreting Results

### Simple Tests
- **0-5% overhead**: Excellent performance
- **5-15% overhead**: Good performance
- **15-50% overhead**: Moderate impact
- **50%+ overhead**: High impact (avoid if possible)

### Advanced Tests
- **High throughput**: Good distributed performance
- **Low latency**: Efficient context propagation
- **Low error rates**: Good context isolation
- **Minimal overhead**: Efficient distributed scaling

## Recommendations

1. **Start with Simple Tests**: Understand basic overhead before diving into complexity
2. **Use Advanced Tests for Production**: When planning distributed architectures
3. **Compare Across Versions**: Both test types show Node.js version differences
4. **Focus on Your Use Case**: Choose the benchmark type that matches your needs

## Conclusion

Both benchmark types are valuable and complementary:
- **Simple tests** give you the foundation understanding
- **Advanced tests** prepare you for production complexity

Use both to get a complete picture of AsyncLocalStorage performance in your specific use case.
