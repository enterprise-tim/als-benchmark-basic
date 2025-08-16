import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Divider,
  Paper,
  Alert,
} from '@mui/material'
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  Code as CodeIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'

const Overview = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#6750a4', mb: 3 }}>
        AsyncLocalStorage Performance Analysis
      </Typography>
      
      <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', mb: 4 }}>
        This analysis provides comprehensive performance benchmarks for Node.js AsyncLocalStorage, 
        helping answer the critical question: <strong>"What is the overhead of using AsyncLocalStorage, 
        and is there anything I should be worried about?"</strong>
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        AsyncLocalStorage enables powerful patterns like request tracing, user context propagation, 
        distributed tracing, and logging context preservation, but it comes with performance implications 
        that vary significantly across Node.js versions.
      </Typography>



      {/* Test Configuration Explanation */}
      <Paper elevation={1} sx={{ p: 3, backgroundColor: '#e8f5e8', mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
          Why Two Test Versions Exist
        </Typography>
        <Typography variant="body2" paragraph>
          The simple overhead tests include <strong>two specific configurations</strong> that serve different purposes and measure different aspects of AsyncLocalStorage performance:
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, backgroundColor: '#fff' }}>
              <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                1. Small Data (5 properties, 10K iterations, no async)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                <strong>Purpose:</strong> Baseline performance measurement without async operations<br/>
                <strong>Simulates:</strong> Simple, synchronous operations like basic request tracking<br/>
                <strong>Tests:</strong> Pure AsyncLocalStorage overhead without event loop complexity<br/>
                <strong>Use case:</strong> Applications that use ALS for simple context storage without I/O
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, backgroundColor: '#fff' }}>
              <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                2. Small Data + Async (5 properties, 5K iterations, with async)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                <strong>Purpose:</strong> Performance measurement with real async operations<br/>
                <strong>Simulates:</strong> Real-world scenarios with I/O operations, database calls, HTTP requests<br/>
                <strong>Tests:</strong> AsyncLocalStorage performance through async boundaries and event loop<br/>
                <strong>Use case:</strong> Production applications that use ALS during async operations
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ color: '#2e7d32', mb: 1, fontWeight: 600 }}>
          Key Differences
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Data Structure:</strong> Both use the same 5-property data objects with nested structure (id, timestamp, metadata with nested objects and arrays).<br/>
          <strong>Async Operations:</strong> The "+ Async" version includes simulated I/O operations (setTimeout with heavy computation) to test event loop performance.<br/>
          <strong>Iteration Counts:</strong> Small Data uses 10,000 iterations (more for statistical significance), while Small Data + Async uses 5,000 iterations (fewer due to async overhead).
        </Typography>

        <Typography variant="subtitle2" sx={{ color: '#2e7d32', mb: 1, fontWeight: 600 }}>
          Why This Matters
        </Typography>
        <Typography variant="body2" paragraph>
          The dramatic performance differences you see between these two test types reveal that:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" variant="body2">Older Node.js versions struggle with AsyncLocalStorage during async operations</Typography>
          <Typography component="li" variant="body2">Async operations significantly amplify the performance overhead</Typography>
          <Typography component="li" variant="body2">Real-world usage (which involves async) is much more expensive than simple sync operations</Typography>
        </Box>
        <Typography variant="body2">
          This dual approach gives you insight into both the theoretical overhead and the practical performance impact that developers actually experience in production applications.
        </Typography>
      </Paper>

      {/* Detailed Benchmark Types Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: '#fff' }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#6750a4', mb: 3 }}>
          Benchmark Types Explained
        </Typography>

        {/* Simple Tests Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#7b1fa2', fontWeight: 600 }}>
            1. Simple AsyncLocalStorage Overhead Tests
          </Typography>
          
          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Purpose
          </Typography>
          <Typography variant="body2" paragraph>
            Measure the basic performance cost of using AsyncLocalStorage in isolation, similar to the code examples in the nested-als.html documentation.
          </Typography>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            What It Tests
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Basic Overhead: Simple AsyncLocalStorage.run() operations</Typography>
            <Typography component="li" variant="body2">Nested Contexts: Multiple levels of AsyncLocalStorage nesting</Typography>
            <Typography component="li" variant="body2">Data Size Impact: Performance with different object sizes (1KB to 10MB)</Typography>
            <Typography component="li" variant="body2">Async Operations: Performance with and without async operations</Typography>
            <Typography component="li" variant="body2">Context Switching: Rapid context creation/destruction (Node.js v24+ focus)</Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Code Examples
          </Typography>
          <Box component="pre" sx={{ 
            backgroundColor: '#f1f3f4', 
            p: 2, 
            borderRadius: 1, 
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            overflow: 'auto',
            mb: 2
          }}>
{`// Basic test - measures simple overhead
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
});`}
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            When to Use
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Development: Understanding basic AsyncLocalStorage performance</Typography>
            <Typography component="li" variant="body2">Code Review: Evaluating performance impact of context usage</Typography>
            <Typography component="li" variant="body2">Architecture: Deciding between single vs. nested contexts</Typography>
            <Typography component="li" variant="body2">Node.js Version Selection: Understanding performance differences across versions</Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Output
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Basic overhead percentages</Typography>
            <Typography component="li" variant="body2">Nested context overhead percentages</Typography>
            <Typography component="li" variant="body2">Memory usage impact</Typography>
            <Typography component="li" variant="body2">Performance recommendations</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Advanced Tests Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#7b1fa2', fontWeight: 600 }}>
            2. Advanced Distributed System Tests
          </Typography>
          
          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Purpose
          </Typography>
          <Typography variant="body2" paragraph>
            Measure AsyncLocalStorage performance in complex, real-world distributed applications that closely mirror production environments.
          </Typography>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            What It Tests
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Multi-Tenant Architecture: 2000+ concurrent tenants</Typography>
            <Typography component="li" variant="body2">High Concurrency: 5000+ requests per second</Typography>
            <Typography component="li" variant="body2">Worker Threads: Context isolation across threads</Typography>
            <Typography component="li" variant="body2">Cluster Mode: Context propagation across processes</Typography>
            <Typography component="li" variant="body2">Real-World Patterns: Rate limiting, distributed tracing, user context</Typography>
            <Typography component="li" variant="body2">Latency Patterns: Database calls, API calls, Redis operations</Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Test Scenario
          </Typography>
          <Typography variant="body2" paragraph>
            The distributed benchmark simulates a <strong>SaaS platform</strong> with multiple tenant isolation, distributed rate limiting with token buckets, user context propagation across async boundaries, worker thread and cluster mode processing, and high-concurrency request handling.
          </Typography>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Code Architecture
          </Typography>
          <Box component="pre" sx={{ 
            backgroundColor: '#f1f3f4', 
            p: 2, 
            borderRadius: 1, 
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            overflow: 'auto',
            mb: 2
          }}>
{`// Simplified version of what the distributed benchmark tests
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
}`}
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            When to Use
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Production Planning: Understanding AsyncLocalStorage in distributed systems</Typography>
            <Typography component="li" variant="body2">Architecture Design: Planning multi-process/multi-thread applications</Typography>
            <Typography component="li" variant="body2">Performance Tuning: Optimizing high-concurrency scenarios</Typography>
            <Typography component="li" variant="body2">Enterprise Applications: Large-scale SaaS or microservice architectures</Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Output
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Throughput measurements (requests per second)</Typography>
            <Typography component="li" variant="body2">Latency percentiles (P50, P95, P99)</Typography>
            <Typography component="li" variant="body2">Context isolation error rates</Typography>
            <Typography component="li" variant="body2">Distributed overhead measurements</Typography>
            <Typography component="li" variant="body2">Worker thread and cluster performance</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Key Differences Table */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#7b1fa2', fontWeight: 600 }}>
            Key Differences
          </Typography>
          
          <Paper elevation={1} sx={{ overflow: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr" sx={{ backgroundColor: '#f3e5f5' }}>
                  <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 600 }}>Aspect</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 600 }}>Simple Tests</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 600 }}>Advanced Tests</Box>
                </Box>
              </Box>
              <Box component="tbody">
                <Box component="tr">
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee', fontWeight: 500 }}>Complexity</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Low - isolated operations</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>High - complex distributed scenarios</Box>
                </Box>
                <Box component="tr">
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee', fontWeight: 500 }}>Scope</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Single process, single thread</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Multi-process, multi-thread</Box>
                </Box>
                <Box component="tr">
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee', fontWeight: 500 }}>Realism</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Synthetic workloads</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Production-like scenarios</Box>
                </Box>
                <Box component="tr">
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee', fontWeight: 500 }}>Use Case</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Development, code review</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Production planning, architecture</Box>
                </Box>
                <Box component="tr">
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee', fontWeight: 500 }}>Performance Focus</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Basic overhead measurement</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>System-level performance</Box>
                </Box>
                <Box component="tr">
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee', fontWeight: 500 }}>Context Usage</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Simple, nested contexts</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: '1px solid #eee' }}>Complex context propagation</Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Recommendations Section */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#7b1fa2', fontWeight: 600 }}>
            Recommendations
          </Typography>
          <Box component="ol" sx={{ pl: 3 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Start with Simple Tests:</strong> Understand basic overhead before diving into complexity
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Use Advanced Tests for Production:</strong> When planning distributed architectures
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Compare Across Versions:</strong> Both test types show Node.js version differences
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Focus on Your Use Case:</strong> Choose the benchmark type that matches your needs
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <SpeedIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Simple Performance Tests</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Basic AsyncLocalStorage overhead, nested contexts, and data size impact across Node.js versions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <MemoryIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Memory Analysis</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Analyze memory usage patterns and detect potential memory leaks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <TimelineIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Advanced Distributed Tests</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Multi-tenant rate limiter simulation with worker threads and cluster mode
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <CodeIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Cross-Version Analysis</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Test across Node.js versions 16.x through 24.x with performance evolution tracking
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={1} sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          Quick Start
        </Typography>
        <Box component="pre" sx={{ 
          backgroundColor: '#f1f3f4', 
          p: 2, 
          borderRadius: 1, 
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          overflow: 'auto'
        }}>
{`git clone https://github.com/tobrien/async-node-stats.git
cd async-node-stats
npm install

# Run simple overhead tests
npm run benchmark

# Run advanced distributed tests  
npm run benchmark-distributed`}
        </Box>
      </Paper>
    </Box>
  )
}

export default Overview
