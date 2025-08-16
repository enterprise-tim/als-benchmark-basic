# Available Routes

All pages in the AsyncLocalStorage Benchmarks application are now linkable via direct URLs. You can share these links directly or embed them in other applications.

## Base URL
- **Production**: `https://tobrien.github.io/async-node-stats/`
- **Development**: `http://localhost:5173/`

## Available Routes

### 1. Overview (Default)
- **URL**: `/` or `/overview`
- **Description**: Main dashboard with benchmark overview and key metrics
- **Direct Link**: `https://tobrien.github.io/async-node-stats/overview`

### 2. Performance
- **URL**: `/performance`
- **Description**: Detailed performance analysis and benchmark results
- **Direct Link**: `https://tobrien.github.io/async-node-stats/performance`

### 3. Distributed Systems
- **URL**: `/distributed`
- **Description**: Distributed system benchmarks and multi-tenant testing
- **Direct Link**: `https://tobrien.github.io/async-node-stats/distributed`

### 4. Memory
- **URL**: `/memory`
- **Description**: Memory usage analysis and garbage collection metrics
- **Direct Link**: `https://tobrien.github.io/async-node-stats/memory`

### 5. Version Analysis
- **URL**: `/version-analysis`
- **Description**: Node.js version comparison and performance trends
- **Direct Link**: `https://tobrien.github.io/async-node-stats/version-analysis`

### 6. Recommendations
- **URL**: `/recommendations`
- **Description**: Performance recommendations and best practices
- **Direct Link**: `https://tobrien.github.io/async-node-stats/recommendations`

## Usage Examples

### Embedding in Documentation
```markdown
For detailed performance analysis, see the [Performance Dashboard](https://tobrien.github.io/async-node-stats/performance).
```

### Linking from External Applications
```html
<a href="https://tobrien.github.io/async-node-stats/distributed" target="_blank">
  View Distributed Systems Benchmarks
</a>
```

### API Documentation
```javascript
// Example of linking to specific sections
const benchmarkUrls = {
  overview: 'https://tobrien.github.io/async-node-stats/overview',
  performance: 'https://tobrien.github.io/async-node-stats/performance',
  distributed: 'https://tobrien.github.io/async-node-stats/distributed',
  memory: 'https://tobrien.github.io/async-node-stats/memory',
  versionAnalysis: 'https://tobrien.github.io/async-node-stats/version-analysis',
  recommendations: 'https://tobrien.github.io/async-node-stats/recommendations'
};
```

## Technical Details

- **Routing**: Uses React Router v6 for client-side routing
- **Deployment**: Configured for GitHub Pages with proper fallback handling
- **URLs**: Clean, SEO-friendly URLs that are easy to remember and share
- **Fallbacks**: Unknown routes automatically redirect to the overview page

## Browser Compatibility

All modern browsers support the routing functionality. The application gracefully degrades for older browsers by redirecting to the main page.

## Development

To test locally:
1. Run `npm run dev`
2. Navigate to `http://localhost:5173/`
3. All routes will work as expected in development mode
