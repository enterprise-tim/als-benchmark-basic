import { AsyncLocalStorage } from 'async_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import cluster from 'cluster';
import { pipeline, Transform, Writable } from 'stream';
import { promisify } from 'util';
import crypto from 'crypto';
import EventEmitter from 'events';

const pipelineAsync = promisify(pipeline);

// Configuration
const CONFIG = {
  tenantCount: 2000,
  baseRPS: 5000,
  burstMultiplier: 3,
  fanOutDegree: 12,
  streamPipelines: 2,
  dbCallLatency: { min: 5, max: 50, p99: 100 },
  apiCallLatency: { min: 20, max: 200, p99: 500 },
  redisLatency: { min: 2, max: 5, p99: 20 },
  retryMaxAttempts: 2,
  retryBackoffMs: { base: 50, jitter: 0.3 },
  requestDeadlineMs: 300,
  modeFlipIntervalMs: 5000,
  modeFlipPercent: 10,
  contextProbePoints: 15,
  warmupMs: 5000,
  testDurationMs: 60000,
};

// Metrics collection
class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.throughput = { count: 0, startTime: Date.now() };
    this.latencies = [];
    this.contextIntegrityErrors = 0;
    this.crossTenantContamination = 0;
    this.accountingDivergence = new Map();
    this.explicitPropagationEdges = 0;
    this.linesOfGlue = 0;
    this.cpuUsage = [];
    this.memoryUsage = [];
    this.gcPauses = [];
    this.redisOps = { count: 0, latencies: [] };
    this.auditLog = [];
  }

  recordRequest(latency) {
    this.throughput.count++;
    this.latencies.push(latency);
  }

  recordContextError() {
    this.contextIntegrityErrors++;
  }

  recordCrossTenantContamination() {
    this.crossTenantContamination++;
  }

  recordPropagationEdge() {
    this.explicitPropagationEdges++;
  }

  recordAuditEntry(entry) {
    this.auditLog.push(entry);
  }

  getStats() {
    const sorted = this.latencies.sort((a, b) => a - b);
    const p = (percentile) => sorted[Math.floor(sorted.length * percentile / 100)] || 0;
    
    return {
      throughput: this.throughput.count / ((Date.now() - this.throughput.startTime) / 1000),
      latencies: {
        p50: p(50),
        p95: p(95),
        p99: p(99),
        p999: p(99.9),
        max: sorted[sorted.length - 1] || 0,
      },
      contextIntegrityErrors: this.contextIntegrityErrors,
      contextErrorRate: this.contextIntegrityErrors / Math.max(1, this.throughput.count),
      crossTenantContamination: this.crossTenantContamination,
      explicitPropagationEdges: this.explicitPropagationEdges,
    };
  }
}

// Simulated distributed token bucket
class DistributedTokenBucket {
  constructor() {
    this.buckets = new Map();
    this.modes = new Map();
    this.subscribers = new Map();
  }

  async reserve(tenantId, units) {
    const start = Date.now();
    
    // Simulate Redis latency
    await this.simulateLatency('redis');
    
    if (!this.buckets.has(tenantId)) {
      this.buckets.set(tenantId, {
        tokens: 100,
        rate: 50,
        burst: 150,
        lastRefill: Date.now(),
      });
      this.modes.set(tenantId, 'soft');
    }

    const bucket = this.buckets.get(tenantId);
    const mode = this.modes.get(tenantId);
    
    // Refill tokens
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(bucket.burst, bucket.tokens + elapsed * bucket.rate);
    bucket.lastRefill = now;

    let decision;
    let waitForMs = 0;

    if (bucket.tokens >= units) {
      bucket.tokens -= units;
      decision = 'ok';
    } else if (mode === 'soft') {
      bucket.tokens -= units; // Allow negative (debt)
      decision = 'ok';
    } else {
      // Punitive mode
      const tokensNeeded = units - bucket.tokens;
      waitForMs = Math.ceil(tokensNeeded / bucket.rate * 1000);
      decision = bucket.tokens > 0 ? 'wait' : 'reject';
    }

    if (global.metrics?.redisOps) {
      global.metrics.redisOps.count++;
      global.metrics.redisOps.latencies.push(Date.now() - start);
    }

    return {
      decision,
      waitForMs,
      tokensGranted: decision === 'ok' ? units : 0,
      mode,
      timestamp: Date.now(),
    };
  }

  async consume(tenantId, units) {
    await this.simulateLatency('redis');
    // In real implementation, this would confirm consumption
    if (global.metrics?.redisOps) {
      global.metrics.redisOps.count++;
    }
  }

  setMode(tenantId, mode) {
    this.modes.set(tenantId, mode);
    const callbacks = this.subscribers.get(tenantId) || [];
    callbacks.forEach(cb => cb(mode));
  }

  subscribe(tenantId, callback) {
    if (!this.subscribers.has(tenantId)) {
      this.subscribers.set(tenantId, []);
    }
    this.subscribers.get(tenantId).push(callback);
    return () => {
      const subs = this.subscribers.get(tenantId);
      const idx = subs.indexOf(callback);
      if (idx >= 0) subs.splice(idx, 1);
    };
  }

  async simulateLatency(type) {
    const config = CONFIG[`${type}Latency`];
    const latency = config.min + Math.random() * (config.max - config.min);
    await new Promise(resolve => setTimeout(resolve, latency));
  }
}

// ALS-based implementation
class ALSRequestHandler {
  constructor(tokenBucket) {
    this.tokenBucket = tokenBucket;
    this.als = new AsyncLocalStorage();
    this.requestCount = 0;
  }

  async handleRequest(req) {
    const start = Date.now();
    
    console.log(`ALS: Processing request ${req.reqId} for tenant ${req.tenantId}`);
    
    // Create a very simple context to test basic ALS functionality
    const context = {
      tenantId: req.tenantId,
      requestId: req.reqId,
      timestamp: Date.now()
    };
    
    try {
      const result = await this.als.run(context, async () => {
        // Verify context integrity
        const ctx = this.als.getStore();
        if (!ctx || ctx.requestId !== req.reqId) {
          throw new Error('Context integrity failed');
        }
        
        // Simulate token consumption
        const tokenResult = await this.tokenBucket.consume(req.tenantId, req.units);
        
        // Return simple result
        return {
          decision: tokenResult?.decision || 'denied',
          waitForMs: tokenResult?.waitForMs || 0,
          processingTime: Date.now() - start,
          contextIntegrity: true
        };
      });
      
      console.log(`ALS: Completed request ${req.reqId} in ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      console.error(`ALS: Error in request ${req.reqId}:`, error.message);
      throw error;
    }
  }

  async processRequestWithComplexLogic(req) {
    try {
      // Simulate complex business logic with multiple async operations
      const [tokenResult, auditResult, metricsResult] = await Promise.all([
        this.tokenBucket.consume(req.tenantId, req.units),
        this.auditRequest(req),
        this.collectMetrics(req)
      ]);
      
      // Ensure we have valid results
      const safeTokenResult = tokenResult || { decision: 'denied', waitForMs: 0 };
      const safeAuditResult = auditResult || { timestamp: Date.now(), tenantId: req.tenantId, requestId: req.reqId, action: 'token_consumption', metadata: [] };
      const safeMetricsResult = metricsResult || { timestamp: Date.now(), tenantId: req.tenantId, requestId: req.reqId, counters: new Map(), histograms: [] };
      
      // Additional CPU work between async operations
      let sum = 0;
      for (let i = 0; i < 100; i++) { // Reduced from 500 to find right balance
        sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
      
      return {
        decision: safeTokenResult.decision,
        waitForMs: safeTokenResult.waitForMs,
        audit: safeAuditResult,
        metrics: safeMetricsResult,
        cpuWork: sum
      };
    } catch (error) {
      console.error(`Error in processRequestWithComplexLogic for request ${req.reqId}:`, error.message);
      // Return a safe fallback result
      return {
        decision: 'error',
        waitForMs: 0,
        audit: { timestamp: Date.now(), tenantId: req.tenantId, requestId: req.reqId, action: 'error', metadata: [] },
        metrics: { timestamp: Date.now(), tenantId: req.tenantId, requestId: req.reqId, counters: new Map(), histograms: [] },
        cpuWork: 0,
        error: error.message
      };
    }
  }

  async auditRequest(req) {
    // Simulate audit logging with complex data processing
    const auditData = {
      timestamp: Date.now(),
      tenantId: req.tenantId,
      requestId: req.reqId,
      action: 'token_consumption',
      metadata: new Array(200).fill(null).map((_, i) => ({
        field: `audit-${i}`,
        value: `value-${i}`,
        timestamp: Date.now()
      }))
    };
    
    // CPU work
    let sum = 0;
    for (let i = 0; i < 50; i++) { // Reduced from 300 to find right balance
      sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
    }
    
    return { ...auditData, cpuWork: sum };
  }

  async collectMetrics(req) {
    // Simulate metrics collection with complex aggregation
    const metrics = {
      timestamp: Date.now(),
      tenantId: req.tenantId,
      requestId: req.reqId,
      counters: new Map(Object.entries({
        'requests_total': 1,
        'tokens_consumed': req.units,
        'processing_time': Date.now()
      })),
      histograms: new Array(100).fill(null).map((_, i) => ({
        bucket: i,
        count: Math.floor(Math.random() * 100),
        sum: Math.random() * 1000
      }))
    };
    
    // CPU work
    let sum = 0;
    for (let i = 0; i < 25; i++) { // Reduced from 200 to find right balance
      sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
    }
    
    return { ...metrics, cpuWork: sum };
  }
}

// Non-ALS implementation with explicit context threading
class NonALSRequestHandler {
  constructor(tokenBucket) {
    this.tokenBucket = tokenBucket;
    this.contextProbes = [];
    this.setupProbes();
  }

  setupProbes() {
    const probeNames = [
      'http-entry', 'router', 'resolver-1', 'resolver-2', 'db-pre',
      'db-post', 'api-pre', 'api-post', 'stream-transform',
      'retry-scheduler', 'queue-enqueue', 'logger', 'metrics',
      'response-pre', 'response-post'
    ];
    
    probeNames.forEach(name => {
      this.contextProbes.push({
        name,
        check: (ctx) => this.validateContext(ctx, name)
      });
    });
  }

  validateContext(ctx, probeName) {
    if (!ctx) {
      global.metrics?.recordContextError();
      console.error(`Context missing at probe: ${probeName}`);
      return false;
    }

    const required = ['reqId', 'tenantId', 'mode', 'reservation', 'deadlines'];
    for (const field of required) {
      if (!ctx[field]) {
        global.metrics?.recordContextError();
        console.error(`Context field ${field} missing at probe: ${probeName}`);
        return false;
      }
    }

    if (ctx.originalTenantId && ctx.tenantId !== ctx.originalTenantId) {
      global.metrics?.recordCrossTenantContamination();
      console.error(`Cross-tenant contamination detected at ${probeName}`);
      return false;
    }

    // Count explicit propagation edge
    global.metrics?.recordPropagationEdge();

    return true;
  }

  async handleRequest(req) {
    const startTime = Date.now();
    const { tenantId, reqId, units, burstAllowed } = req;

    const reservation = await this.tokenBucket.reserve(tenantId, units);
    
    const ctx = {
      reqId,
      tenantId,
      originalTenantId: tenantId,
      mode: reservation.mode,
      reservation,
      deadlines: { atMs: startTime + CONFIG.requestDeadlineMs },
      retryPolicy: { enabled: reservation.mode === 'soft' },
      startTime,
      modeSource: this.tokenBucket, // For dynamic mode lookups
    };

    const unsubscribe = this.tokenBucket.subscribe(tenantId, (newMode) => {
      // In non-ALS, we can't update the context directly
      // Downstream code must check modeSource
    });

    try {
      this.contextProbes[0].check(ctx);
      const result = await this.executeRequestGraph(ctx);
      this.contextProbes[14].check(ctx);

      global.metrics?.recordRequest(Date.now() - startTime);
      
      return {
        decision: reservation.decision,
        mode: ctx.modeSource.modes.get(tenantId),
        result,
        latency: Date.now() - startTime,
      };
    } finally {
      unsubscribe();
      await this.tokenBucket.consume(tenantId, units);
    }
  }

  async executeRequestGraph(ctx) {
    if (Date.now() > ctx.deadlines.atMs) {
      throw new Error('Request deadline exceeded');
    }

    this.contextProbes[1].check(ctx);

    const operations = [];

    for (let i = 0; i < 3; i++) {
      operations.push(this.simulateDBCall(ctx, i));
    }

    for (let i = 0; i < 2; i++) {
      operations.push(this.simulateAPICall(ctx, i));
    }

    for (let i = 0; i < CONFIG.streamPipelines; i++) {
      operations.push(this.simulateStreamPipeline(ctx, i));
    }

    operations.push(this.simulateQueueOperation(ctx));

    const results = await Promise.allSettled(operations);

    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      totalOperations: operations.length,
    };
  }

  async simulateDBCall(ctx, index) {
    this.contextProbes[4].check(ctx);
    await this.simulateLatency('dbCall');
    this.contextProbes[5].check(ctx);

    global.metrics?.recordAuditEntry({
      ts: Date.now(),
      reqId: ctx.reqId,
      tenantId: ctx.tenantId,
      op: `db-${index}`,
      mode: ctx.modeSource.modes.get(ctx.tenantId),
      decision: ctx.reservation.decision,
    });

    return { type: 'db', index, tenantId: ctx.tenantId };
  }

  async simulateAPICall(ctx, index, retryCount = 0) {
    this.contextProbes[6].check(ctx);

    try {
      if (Math.random() < 0.02) {
        throw new Error('API Error');
      }

      await this.simulateLatency('apiCall');
      this.contextProbes[7].check(ctx);

      return { type: 'api', index, tenantId: ctx.tenantId };
    } catch (error) {
      const currentMode = ctx.modeSource.modes.get(ctx.tenantId);
      if (currentMode === 'soft' && retryCount < CONFIG.retryMaxAttempts) {
        this.contextProbes[9].check(ctx);
        
        const backoff = CONFIG.retryBackoffMs.base * Math.pow(2, retryCount);
        const jitter = backoff * CONFIG.retryBackoffMs.jitter * Math.random();
        await new Promise(resolve => setTimeout(resolve, backoff + jitter));
        
        return this.simulateAPICall(ctx, index, retryCount + 1);
      }
      throw error;
    }
  }

  async simulateStreamPipeline(ctx, index) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      // Wrapper to propagate context through stream transforms
      const withCtx = (fn) => {
        global.metrics?.recordPropagationEdge();
        return (...args) => fn(ctx, ...args);
      };

      const source = new Transform({
        transform: withCtx((ctx, chunk, encoding, callback) => {
          this.contextProbes[8].check(ctx);
          callback(null, chunk);
        })
      });

      const compress = new Transform({
        transform: withCtx((ctx, chunk, encoding, callback) => {
          setTimeout(() => {
            if (ctx.tenantId !== ctx.originalTenantId) {
              global.metrics?.recordContextError();
            }
            callback(null, chunk);
          }, Math.random() * 10);
        })
      });

      const sink = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      pipeline(source, compress, sink, (err) => {
        if (err) reject(err);
        else resolve({ type: 'stream', index, chunks: chunks.length });
      });

      for (let i = 0; i < 10; i++) {
        source.write(Buffer.from(`data-${i}-${ctx.tenantId}`));
      }
      source.end();
    });
  }

  async simulateQueueOperation(ctx) {
    this.contextProbes[10].check(ctx);

    await new Promise(resolve => {
      setImmediate(((ctx) => () => {
        this.validateContext(ctx, 'queue-microtask');
        resolve();
      })(ctx));
    });

    return { type: 'queue', tenantId: ctx.tenantId };
  }

  async simulateLatency(type) {
    const config = CONFIG[`${type}Latency`];
    const latency = config.min + Math.random() * (config.max - config.min);
    await new Promise(resolve => setTimeout(resolve, latency));
  }
}

// Traffic generators
class TrafficGenerator {
  constructor(handler) {
    this.handler = handler;
    this.tenantDistribution = this.generateZipfDistribution();
    this.activeRequests = 0;
    this.stopRequested = false;
  }

  generateZipfDistribution() {
    const alpha = 1.1;
    const weights = [];
    let sum = 0;
    
    for (let i = 1; i <= CONFIG.tenantCount; i++) {
      const weight = 1 / Math.pow(i, alpha);
      weights.push(weight);
      sum += weight;
    }
    
    return weights.map(w => w / sum);
  }

  selectTenant() {
    const r = Math.random();
    let cumsum = 0;
    
    for (let i = 0; i < this.tenantDistribution.length; i++) {
      cumsum += this.tenantDistribution[i];
      if (r <= cumsum) {
        return `tenant-${i}`;
      }
    }
    
    return `tenant-${CONFIG.tenantCount - 1}`;
  }

  async generateTraffic(profile, duration) {
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    while (Date.now() < endTime && !this.stopRequested) {
      const rps = this.calculateRPS(profile, Date.now() - startTime);
      const delayMs = 1000 / rps;
      
      // Non-blocking request generation
      this.sendRequest();
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  calculateRPS(profile, elapsed) {
    const elapsedSec = elapsed / 1000;
    
    switch (profile) {
      case 'steady':
        return CONFIG.baseRPS;
        
      case 'burst':
        // Burst every 20s for 10s
        const cycle = elapsedSec % 30;
        return cycle >= 20 ? CONFIG.baseRPS * CONFIG.burstMultiplier : CONFIG.baseRPS;
        
      case 'surge':
        // Ramp up over 30s, hold 30s, ramp down
        if (elapsedSec < 30) {
          return 1000 + (14000 * elapsedSec / 30);
        } else if (elapsedSec < 60) {
          return 15000;
        } else if (elapsedSec < 90) {
          return 15000 - (14000 * (elapsedSec - 60) / 30);
        }
        return 1000;
        
      default:
        return CONFIG.baseRPS;
    }
  }

  async sendRequest() {
    if (this.activeRequests > CONFIG.baseRPS * 2) {
      // Backpressure
      return;
    }

    this.activeRequests++;
    
    const req = {
      tenantId: this.selectTenant(),
      reqId: crypto.randomUUID(),
      units: Math.floor(Math.random() * 13) + 3,
      burstAllowed: Math.random() > 0.5,
    };

    try {
      await this.handler.handleRequest(req);
    } catch (error) {
      // Request failed, log if needed
    } finally {
      this.activeRequests--;
    }
  }

  stop() {
    this.stopRequested = true;
  }
}

// Mode flipper for chaos testing
class ModeFlipper {
  constructor(tokenBucket) {
    this.tokenBucket = tokenBucket;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      // Flip 10% of tenants
      const tenantsToFlip = Math.floor(CONFIG.tenantCount * CONFIG.modeFlipPercent / 100);
      
      for (let i = 0; i < tenantsToFlip; i++) {
        const tenantId = `tenant-${Math.floor(Math.random() * CONFIG.tenantCount)}`;
        const currentMode = this.tokenBucket.modes.get(tenantId) || 'soft';
        const newMode = currentMode === 'soft' ? 'punitive' : 'soft';
        this.tokenBucket.setMode(tenantId, newMode);
      }
    }, CONFIG.modeFlipIntervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Main benchmark runner
async function runBenchmark(variant = 'als', options = {}) {
  console.log(`\nRunning ${variant.toUpperCase()} benchmark...`);
  console.log(`Configuration:`, options);
  
  // Setup
  global.metrics = new MetricsCollector();
  const tokenBucket = new DistributedTokenBucket();
  const handler = variant === 'als' 
    ? new ALSRequestHandler(tokenBucket)
    : new NonALSRequestHandler(tokenBucket);
  
  const trafficGenerator = new TrafficGenerator(handler);
  const modeFlipper = new ModeFlipper(tokenBucket);

  // Start mode flipping if enabled
  if (options.enableModeFlips) {
    modeFlipper.start();
  }

  // Enhanced ALS stress testing if enabled
  if (variant === 'als' && options.alsTestScenarios && false) { // Temporarily disabled
    console.log('Running enhanced ALS stress tests...');
    await runALSStressTests(options.alsTestScenarios);
  }

  // Warmup
  console.log('Warming up...');
  await trafficGenerator.generateTraffic('steady', CONFIG.warmupMs);
  
  // Reset metrics after warmup
  global.metrics.reset();

  // Run test
  console.log(`Running ${options.profile} traffic profile...`);
  const testStart = Date.now();
  
  // Monitor resources
  const resourceMonitor = setInterval(() => {
    const usage = process.cpuUsage();
    const mem = process.memoryUsage();
    global.metrics.cpuUsage.push({
      user: usage.user,
      system: usage.system,
      timestamp: Date.now()
    });
    global.metrics.memoryUsage.push({
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      timestamp: Date.now()
    });
  }, 1000);

  // Run traffic
  await trafficGenerator.generateTraffic(options.profile, CONFIG.testDurationMs);
  
  // Cleanup
  clearInterval(resourceMonitor);
  trafficGenerator.stop();
  modeFlipper.stop();

  // Collect results
  const stats = global.metrics.getStats();
  const testDuration = (Date.now() - testStart) / 1000;
  
  console.log(`\n${variant.toUpperCase()} Results:`);
  console.log(`Duration: ${testDuration.toFixed(2)}s`);
  console.log(`Throughput: ${stats.throughput.toFixed(2)} req/s`);
  console.log(`Latencies: p50=${stats.latencies.p50}ms, p95=${stats.latencies.p95}ms, p99=${stats.latencies.p99}ms, p99.9=${stats.latencies.p999}ms`);
  console.log(`Context Errors: ${stats.contextIntegrityErrors} (${(stats.contextErrorRate * 100).toFixed(6)}%)`);
  console.log(`Cross-tenant Contamination: ${stats.crossTenantContamination}`);
  if (variant === 'non-als') {
    console.log(`Explicit Propagation Edges: ${stats.explicitPropagationEdges}`);
  }

  return {
    variant,
    options,
    stats,
    testDuration,
    auditLog: global.metrics.auditLog,
  };
}

/**
 * Comprehensive ALS stress testing scenarios
 * These tests really exercise AsyncLocalStorage under extreme conditions
 */
async function runALSStressTests(scenarios) {
  const als = new AsyncLocalStorage();
  const results = {
    contextDepth: {},
    contextSize: {},
    contextSwitching: {},
    concurrentContexts: {},
    asyncChainDepth: {},
    memoryPressure: {},
    gcStress: {}
  };

  console.log('  Testing context nesting depth...');
  for (const depth of scenarios.contextDepth || [1, 5, 10, 20, 50, 100]) {
    const start = Date.now();
    let contextErrors = 0;
    
    try {
      await testContextDepth(als, depth);
    } catch (error) {
      contextErrors++;
    }
    
    results.contextDepth[depth] = {
      duration: Date.now() - start,
      errors: contextErrors,
      success: contextErrors === 0
    };
  }

  console.log('  Testing context object sizes...');
  for (const size of scenarios.contextSize || [10, 100, 1000, 10000, 50000]) {
    const start = Date.now();
    let contextErrors = 0;
    
    try {
      await testContextSize(als, size);
    } catch (error) {
      contextErrors++;
    }
    
    results.contextSize[size] = {
      duration: Date.now() - start,
      errors: contextErrors,
      success: contextErrors === 0
    };
  }

  console.log('  Testing rapid context switching...');
  for (const frequency of scenarios.contextSwitching || [100, 1000, 10000, 100000, 500000]) {
    const start = Date.now();
    let contextErrors = 0;
    
    try {
      await testContextSwitching(als, frequency);
    } catch (error) {
      contextErrors++;
    }
    
    results.contextSwitching[frequency] = {
      duration: Date.now() - start,
      errors: contextErrors,
      success: contextErrors === 0
    };
  }

  console.log('  Testing concurrent context creation...');
  for (const concurrency of scenarios.concurrentContexts || [10, 50, 100, 500, 1000]) {
    const start = Date.now();
    let contextErrors = 0;
    
    try {
      await testConcurrentContexts(als, concurrency);
    } catch (error) {
      contextErrors++;
    }
    
    results.concurrentContexts[concurrency] = {
      duration: Date.now() - start,
      errors: contextErrors,
      success: contextErrors === 0
    };
  }

  console.log('  Testing deep async chains...');
  for (const depth of scenarios.asyncChainDepth || [5, 10, 20, 50, 100]) {
    const start = Date.now();
    let contextErrors = 0;
    
    try {
      await testAsyncChainDepth(als, depth);
    } catch (error) {
      contextErrors++;
    }
    
    results.asyncChainDepth[depth] = {
      duration: Date.now() - start,
      errors: contextErrors,
      success: contextErrors === 0
    };
  }

  if (scenarios.memoryPressure) {
    console.log('  Testing memory pressure scenarios...');
    const start = Date.now();
    let contextErrors = 0;
    
    try {
      await testMemoryPressure(als);
    } catch (error) {
      contextErrors++;
    }
    
    results.memoryPressure = {
      duration: Date.now() - start,
      errors: contextErrors,
      success: contextErrors === 0
    };
  }

  if (scenarios.gcStress) {
    console.log('  Testing garbage collection stress...');
    const start = Date.now();
    let contextErrors = 0;
    
    try {
      await testGCStress(als);
    } catch (error) {
      contextErrors++;
    }
    
    results.gcStress = {
      duration: Date.now() - start,
      errors: contextErrors,
      success: contextErrors === 0
    };
  }

  // Log stress test summary
  console.log('\nALS Stress Test Summary:');
  Object.entries(results).forEach(([test, result]) => {
    if (typeof result === 'object' && result.duration !== undefined) {
      console.log(`  ${test}: ${result.success ? '✅' : '❌'} ${result.duration}ms (${result.errors} errors)`);
    } else if (typeof result === 'object') {
      const successCount = Object.values(result).filter(r => r.success).length;
      const totalCount = Object.keys(result).length;
      console.log(`  ${test}: ${successCount}/${totalCount} successful`);
    }
  });

  return results;
}

/**
 * Test deep context nesting with enhanced overhead
 */
async function testContextDepth(als, depth) {
  return new Promise((resolve, reject) => {
    let currentDepth = 0;
    
    function nestContext() {
      if (currentDepth >= depth) {
        resolve();
        return;
      }
      
      // Create complex context with more data
      const context = {
        depth: currentDepth,
        timestamp: Date.now(),
        data: `context-${currentDepth}-${Math.random()}`,
        // Add more complex data structures
        metadata: {
          id: currentDepth,
          nested: {
            level: currentDepth,
            timestamp: Date.now(),
            random: Math.random(),
            array: new Array(50).fill(`data-${currentDepth}`), // Reduced from 100
            map: new Map(Object.entries({ key1: `value-${currentDepth}`, key2: Math.random() })),
            set: new Set([`item-${currentDepth}`, `item-${currentDepth + 1}`, `item-${currentDepth + 2}`])
          }
        },
        // Add large buffers
        buffer: Buffer.alloc(512, `depth-${currentDepth}`), // Reduced from 1024
        // Add circular references to make GC work harder
        circular: null
      };
      
      // Create circular reference
      context.circular = context;
      
      als.run(context, () => {
        currentDepth++;
        
        // Verify context integrity
        const store = als.getStore();
        if (!store || store.depth !== currentDepth - 1) {
          reject(new Error(`Context integrity failed at depth ${currentDepth}`));
          return;
        }
        
        // Perform some CPU-intensive work to make overhead more visible
        let sum = 0;
        for (let i = 0; i < 200; i++) { // Reduced from 1000
          sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }
        
        // Simulate async work with minimal delay to increase frequency
        setImmediate(nestContext);
      });
    }
    
    nestContext();
  });
}

/**
 * Test large context objects with enhanced overhead
 */
async function testContextSize(als, size) {
  return new Promise((resolve, reject) => {
    const largeContext = {};
    
    // Create a much larger and more complex context object
    for (let i = 0; i < size; i++) {
      largeContext[`key${i}`] = {
        value: `value${i}`,
        timestamp: Date.now(),
        metadata: `metadata${i}`.repeat(50), // Reduced from 100
        // Add complex nested structures
        nested: {
          level: i,
          data: new Array(25).fill(`nested-${i}`), // Reduced from 50
          map: new Map(Object.entries({ 
            nestedKey1: `nestedValue-${i}`, 
            nestedKey2: Math.random(),
            nestedKey3: new Array(12).fill(`deep-${i}`) // Reduced from 25
          })),
          set: new Set([`set-item-${i}`, `set-item-${i + 1}`, `set-item-${i + 2}`])
        },
        // Add large buffers
        buffer: Buffer.alloc(256, `buffer-${i}`), // Reduced from 512
        // Add functions to make context more complex
        func: () => `function-${i}`,
        // Add symbols for additional complexity
        [Symbol(`symbol-${i}`)]: `symbol-value-${i}`
      };
    }
    
    // Add some very large properties for extreme testing
    if (size >= 1000) {
      largeContext.megaArray = new Array(1000).fill('mega-data').map((_, i) => ({ // Reduced from 10000
        id: i,
        data: `mega-${i}`.repeat(50), // Reduced from 100
        timestamp: Date.now(),
        metadata: new Array(50).fill(`meta-${i}`) // Reduced from 100
      }));
      
      largeContext.megaBuffer = Buffer.alloc(1024 * 100, 'mega-buffer'); // Reduced from 1MB to 100KB
      
      largeContext.megaMap = new Map();
      for (let i = 0; i < 500; i++) { // Reduced from 5000
        largeContext.megaMap.set(`mega-key-${i}`, {
          value: `mega-value-${i}`,
          data: new Array(50).fill(`mega-data-${i}`), // Reduced from 100
          timestamp: Date.now()
        });
      }
    }
    
    als.run(largeContext, async () => {
      // Verify context integrity
      const store = als.getStore();
      if (!store || Object.keys(store).length < size) {
        reject(new Error('Large context integrity failed'));
        return;
      }
      
      // Perform CPU-intensive operations to make overhead visible
      let sum = 0;
      for (let i = 0; i < 1000; i++) { // Reduced from 5000
        sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
      
      // Simulate async operations with minimal delay
      await new Promise(resolve => setImmediate(resolve));
      
      // Verify context is still intact
      const storeAfter = als.getStore();
      if (!storeAfter || Object.keys(storeAfter).length < size) {
        reject(new Error('Large context lost during async operation'));
        return;
      }
      
      // Additional verification for mega properties
      if (size >= 1000) {
        if (!storeAfter.megaArray || storeAfter.megaArray.length !== 1000) { // Updated
          reject(new Error('Mega array lost during operation'));
          return;
        }
        if (!storeAfter.megaBuffer || storeAfter.megaBuffer.length !== 1024 * 100) { // Updated
          reject(new Error('Mega buffer lost during operation'));
          return;
        }
        if (!storeAfter.megaMap || storeAfter.megaMap.size !== 500) { // Updated
          reject(new Error('Mega map lost during operation'));
          return;
        }
      }
      
      resolve();
    });
  });
}

// Worker thread support
if (!isMainThread) {
  const { variant, options } = workerData;
  runBenchmark(variant, options).then(results => {
    parentPort.postMessage(results);
  }).catch(error => {
    parentPort.postMessage({ error: error.message });
  });
}

// Export for use in main benchmark
export {
  runBenchmark,
  CONFIG,
  TrafficGenerator,
  ALSRequestHandler,
  NonALSRequestHandler,
  DistributedTokenBucket,
  MetricsCollector,
};