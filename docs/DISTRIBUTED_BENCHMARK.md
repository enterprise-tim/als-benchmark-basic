# Distributed System Benchmark: Multi-Tenant Rate Limiter

## Overview

This benchmark simulates a **real-world distributed system** - specifically, a multi-tenant rate limiter that might be used in a SaaS platform. It tests AsyncLocalStorage (ALS) performance in complex, production-like scenarios that go far beyond simple micro-benchmarks.

The benchmark implements the same system two ways:
1. **ALS-based**: Using AsyncLocalStorage for automatic context propagation
2. **Non-ALS**: Using explicit context passing through every function call

## What Does It Simulate?

### The System: Distributed Rate Limiter

Imagine a large SaaS platform with thousands of tenants, where each tenant has:
- **Token bucket rate limiting** (e.g., 50 requests/second with burst to 150)
- **Two enforcement modes**:
  - **Soft mode**: Allow over-limit requests but track as "debt"
  - **Punitive mode**: Hard reject over-limit requests
- **Dynamic configuration**: Modes can change mid-request
- **Distributed state**: Rate limit data stored in Redis

### The Challenge

Every layer of the application stack needs access to:
- Current tenant ID
- Rate limit decision (ok/wait/reject)
- Current enforcement mode
- Request deadlines
- Retry policies

In a real system, this context must flow through:
- HTTP handlers
- GraphQL/REST resolvers
- Database adapters
- External API clients
- Stream processors
- Background queues
- Logging and metrics

## Architecture

### Request Flow

```
HTTP Request
    ↓
Rate Limiter (Redis)
    ↓
Request Handler
    ↓
Fan-out to 12 parallel operations:
    ├── 3 DB Calls
    ├── 2 External API Calls (with retry)
    ├── 2 Stream Pipelines
    └── 1 Queue Operation
    ↓
Response Aggregation
```

### Key Components

1. **DistributedTokenBucket**: Simulates Redis-backed rate limiting
2. **Request Handlers**: ALS and Non-ALS implementations
3. **Traffic Generators**: Create realistic load patterns
4. **Mode Flipper**: Simulates dynamic configuration changes
5. **Metrics Collector**: Tracks performance and correctness

## Implementation Details

### ALS-Based Implementation

With AsyncLocalStorage, context flows automatically through async operations:

```javascript
class ALSRequestHandler {
  constructor(tokenBucket) {
    this.als = new AsyncLocalStorage();
    this.tokenBucket = tokenBucket;
  }

  async handleRequest(req) {
    const { tenantId, reqId, units } = req;
    
    // Reserve tokens from rate limiter
    const reservation = await this.tokenBucket.reserve(tenantId, units);
    
    // Create context that will flow automatically
    const ctx = {
      reqId,
      tenantId,
      mode: reservation.mode,
      reservation,
      deadlines: { atMs: Date.now() + 300 }, // 300ms deadline
      retryPolicy: { enabled: reservation.mode === 'soft' },
    };

    // Subscribe to mode changes
    const unsubscribe = this.tokenBucket.subscribe(tenantId, (newMode) => {
      const store = this.als.getStore();
      if (store && store.reqId === reqId) {
        store.mode = newMode;
        store.retryPolicy.enabled = newMode === 'soft';
      }
    });

    try {
      // Run request in ALS context - context flows automatically!
      return await this.als.run(ctx, async () => {
        return await this.executeRequestGraph();
      });
    } finally {
      unsubscribe();
    }
  }

  async executeRequestGraph() {
    // Context is automatically available
    const ctx = this.als.getStore();
    
    // Fan-out to parallel operations
    const operations = [
      this.simulateDBCall(0),
      this.simulateDBCall(1),
      this.simulateDBCall(2),
      this.simulateAPICall(0),
      this.simulateAPICall(1),
      this.simulateStreamPipeline(0),
      this.simulateStreamPipeline(1),
      this.simulateQueueOperation(),
    ];

    return await Promise.allSettled(operations);
  }

  async simulateDBCall(index) {
    // Context automatically available - no parameters needed!
    const ctx = this.als.getStore();
    
    await this.simulateLatency('dbCall');
    
    return { 
      type: 'db', 
      index, 
      tenantId: ctx.tenantId // Got it from ALS!
    };
  }

  async simulateStreamPipeline(index) {
    const ctx = this.als.getStore();
    
    return new Promise((resolve, reject) => {
      const source = new Transform({
        transform: (chunk, encoding, callback) => {
          // Context still available in stream transform!
          const store = this.als?.getStore();
          if (!store || store.reqId !== ctx.reqId) {
            console.error('Context lost in stream!');
          }
          callback(null, chunk);
        }
      });

      // ... rest of pipeline setup
    });
  }
}
```

### Non-ALS Implementation

Without AsyncLocalStorage, context must be explicitly passed everywhere:

```javascript
class NonALSRequestHandler {
  constructor(tokenBucket) {
    this.tokenBucket = tokenBucket;
  }

  async handleRequest(req) {
    const { tenantId, reqId, units } = req;
    
    const reservation = await this.tokenBucket.reserve(tenantId, units);
    
    // Create context that must be manually passed
    const ctx = {
      reqId,
      tenantId,
      mode: reservation.mode,
      reservation,
      deadlines: { atMs: Date.now() + 300 },
      retryPolicy: { enabled: reservation.mode === 'soft' },
      modeSource: this.tokenBucket, // For dynamic lookups
    };

    // Note: Can't easily update ctx in callbacks
    const unsubscribe = this.tokenBucket.subscribe(tenantId, (newMode) => {
      // Context updates won't propagate to existing calls
      // Each function must check modeSource for current value
    });

    try {
      // Must pass ctx explicitly to every function
      return await this.executeRequestGraph(ctx);
    } finally {
      unsubscribe();
    }
  }

  async executeRequestGraph(ctx) {  // ctx parameter required
    // Must pass ctx to every operation
    const operations = [
      this.simulateDBCall(ctx, 0),
      this.simulateDBCall(ctx, 1),
      this.simulateDBCall(ctx, 2),
      this.simulateAPICall(ctx, 0),
      this.simulateAPICall(ctx, 1),
      this.simulateStreamPipeline(ctx, 0),
      this.simulateStreamPipeline(ctx, 1),
      this.simulateQueueOperation(ctx),
    ];

    return await Promise.allSettled(operations);
  }

  async simulateDBCall(ctx, index) {  // ctx parameter required
    // Must check current mode from source
    const currentMode = ctx.modeSource.modes.get(ctx.tenantId);
    
    await this.simulateLatency('dbCall');
    
    return { 
      type: 'db', 
      index, 
      tenantId: ctx.tenantId 
    };
  }

  async simulateStreamPipeline(ctx, index) {  // ctx parameter required
    return new Promise((resolve, reject) => {
      // Must create wrapper to propagate context
      const withCtx = (fn) => {
        return (...args) => fn(ctx, ...args);
      };

      const source = new Transform({
        transform: withCtx((ctx, chunk, encoding, callback) => {
          // Had to wrap to get ctx in here
          if (ctx.tenantId !== ctx.originalTenantId) {
            console.error('Context corrupted!');
          }
          callback(null, chunk);
        })
      });

      // ... rest of pipeline setup
    });
  }

  async simulateAPICall(ctx, index, retryCount = 0) {  // ctx parameter required
    try {
      if (Math.random() < 0.02) throw new Error('API Error');
      
      await this.simulateLatency('apiCall');
      return { type: 'api', index };
      
    } catch (error) {
      // Must check current mode for retry decision
      const currentMode = ctx.modeSource.modes.get(ctx.tenantId);
      if (currentMode === 'soft' && retryCount < 2) {
        // Recursive call must pass ctx
        return this.simulateAPICall(ctx, index, retryCount + 1);
      }
      throw error;
    }
  }
}
```

## Key Differences

### Developer Experience

**ALS-based:**
- ✅ Clean function signatures
- ✅ Context automatically flows through async boundaries
- ✅ Works seamlessly with third-party libraries
- ✅ No risk of forgetting to pass context
- ❌ "Magic" behavior can be confusing
- ❌ Performance overhead (varies by Node.js version)

**Non-ALS:**
- ✅ Explicit data flow is clear
- ✅ No hidden performance costs
- ✅ Easier to debug context issues
- ❌ Every function needs ctx parameter
- ❌ Easy to forget passing context
- ❌ Wrapper functions needed for callbacks
- ❌ Third-party integration is painful

### Performance Characteristics

The benchmark measures:

1. **Throughput**: Requests per second
2. **Latency**: p50, p95, p99, p99.9 percentiles
3. **Context Integrity**: 
   - How often context is lost or corrupted
   - Cross-tenant contamination detection
4. **Memory Usage**: RSS and heap consumption
5. **CPU Usage**: Processing overhead

## Traffic Patterns

The benchmark tests three realistic traffic patterns:

### 1. Steady State (5K RPS)
- Consistent load across 2000 tenants
- Zipf distribution (some tenants more active)
- Tests baseline performance

### 2. Burst Pattern
- Every 20 seconds: 3x traffic spike for 10 seconds
- Tests behavior under sudden load
- Simulates flash sales or viral content

### 3. Surge Pattern
- Gradual ramp: 1K → 15K RPS over 30s
- Hold at peak for 30s
- Gradual ramp down
- Tests scaling behavior

## Dynamic Behavior

### Mode Flipping
- 10% of tenants flip between soft/punitive every 5 seconds
- 1% of requests experience mid-flight mode changes
- Tests context update propagation

### Fault Injection
- Redis latency: 2-5ms base, spikes to 20ms
- API failures: 2% error rate
- Network jitter simulation
- Tests error handling and retries

## Context Integrity Probes

The system validates context at 15 strategic points:

1. HTTP entry
2. Router
3. Resolver entry (x2)
4. DB pre-operation
5. DB post-operation
6. API pre-call
7. API post-call
8. Stream transform
9. Retry scheduler
10. Queue enqueue
11. Logger
12. Metrics collector
13. Response pre-send
14. Response post-send

Each probe checks:
- Context exists
- All required fields present
- Tenant ID hasn't changed
- Mode is current
- Deadlines are respected

## Metrics and Analysis

### Success Criteria

A benchmark run **passes** if:
- ✅ Zero cross-tenant contamination
- ✅ Context integrity errors < 0.000001% (1 per million)
- ✅ Token accounting accurate within 0.1%
- ✅ Deadline violations < 0.01%
- ✅ p99 latency < 2x median

### What the Results Tell You

**High context error rate?**
- ALS implementation has bugs
- Context lost across async boundaries
- Third-party library integration issues

**Performance degradation?**
- ALS overhead impacting throughput
- Memory pressure from context storage
- GC overhead from object allocation

**Different results between modes?**
- Single process: Pure Node.js behavior
- Cluster: IPC overhead, process isolation
- Workers: Shared memory benefits, thread coordination

## Running the Benchmark

### Quick Test (10 seconds)
```bash
node src/benchmark.js --distributed --quick
```

### Full Test (30 seconds)
```bash
node src/benchmark.js --distributed
```

### Surge Traffic Pattern
```bash
node src/benchmark.js --distributed --surge
```

### Complete Test Matrix
```bash
# Tests all combinations of:
# - ALS vs Non-ALS
# - Single/Cluster/Worker modes  
# - Steady/Burst/Surge traffic
node src/benchmark-runner.js --all-modes --all-profiles
```

## Interpreting Results

### Example Output
```
DISTRIBUTED SYSTEM BENCHMARK
Testing AsyncLocalStorage in a realistic multi-tenant rate limiter scenario

Running ALS benchmark...
Duration: 30.00s
Throughput: 4,827.43 req/s
Latencies: p50=42ms, p95=89ms, p99=124ms, p99.9=198ms
Context Errors: 0 (0.000000%)
Cross-tenant Contamination: 0

Running NON-ALS benchmark...
Duration: 30.00s
Throughput: 5,102.11 req/s
Latencies: p50=38ms, p95=82ms, p99=115ms, p99.9=187ms
Context Errors: 0 (0.000000%)
Cross-tenant Contamination: 0
Explicit Propagation Edges: 487,329

COMPARISON SUMMARY
Throughput:
  ALS: 4,827.43 req/s
  Non-ALS: 5,102.11 req/s
  Difference: -5.38%

Latency (p99):
  ALS: 124ms
  Non-ALS: 115ms
  Overhead: 7.83%
```

### What to Look For

1. **Overhead < 10%**: ALS is suitable for most applications
2. **Zero context errors**: Implementation is correct
3. **Consistent performance**: No degradation over time
4. **Low memory growth**: No memory leaks

## Conclusion

This benchmark provides a realistic assessment of AsyncLocalStorage performance in production-like scenarios. It helps answer critical questions:

- What's the real performance cost of ALS?
- Will ALS work reliably in complex async scenarios?
- How does ALS perform under load?
- Is the developer experience worth the overhead?

By comparing ALS and Non-ALS implementations of the same complex system, you can make an informed decision about whether AsyncLocalStorage is right for your application.
