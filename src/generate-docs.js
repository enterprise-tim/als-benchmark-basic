import fs from 'fs/promises';
import path from 'path';

async function generateDocumentationSite() {
  const docsDir = path.join(process.cwd(), 'docs');
  
  // Ensure docs directory exists
  await fs.mkdir(docsDir, { recursive: true });
  
  // Copy analysis markdown file if it doesn't exist
  const analysisSource = path.join(process.cwd(), 'docs', 'NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md');
  try {
    await fs.access(analysisSource);
    console.log('Analysis file already exists in docs directory');
  } catch (error) {
    console.log('Analysis file not found in docs, this is expected for new setups');
  }
  
  // Generate main index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AsyncLocalStorage Performance Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary-color: #007bff;
            --success-color: #28a745;
            --warning-color: #ffc107;
            --danger-color: #dc3545;
            --light-bg: #f8f9fa;
            --border-color: #e9ecef;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background: linear-gradient(135deg, var(--primary-color), #0056b3);
            color: white;
            padding: 2rem 0;
            text-align: center;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        nav {
            background: var(--light-bg);
            padding: 1rem 0;
            border-bottom: 1px solid var(--border-color);
        }
        
        .nav-links {
            display: flex;
            gap: 2rem;
            list-style: none;
        }
        
        .nav-links a {
            text-decoration: none;
            color: var(--primary-color);
            font-weight: 500;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .nav-links a:hover {
            background-color: rgba(0, 123, 255, 0.1);
        }
        
        main {
            padding: 2rem 0;
        }
        
        .section {
            margin-bottom: 3rem;
        }
        
        .section h2 {
            color: var(--primary-color);
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid var(--border-color);
        }
        
        .card {
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .card.warning {
            border-left: 4px solid var(--warning-color);
        }
        
        .card.success {
            border-left: 4px solid var(--success-color);
        }
        
        .card.danger {
            border-left: 4px solid var(--danger-color);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .metric-card {
            background: var(--light-bg);
            padding: 1rem;
            border-radius: 6px;
            text-align: center;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .metric-label {
            font-size: 0.9rem;
            color: #666;
            margin-top: 0.5rem;
        }
        
        .chart-container {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            margin: 1rem 0;
        }
        
        .code-block {
            background: #f1f3f4;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        th {
            background: var(--light-bg);
            font-weight: 600;
        }
        
        .loading {
            text-align: center;
            color: #666;
            font-style: italic;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
        }
        
        footer {
            background: var(--light-bg);
            padding: 2rem 0;
            text-align: center;
            border-top: 1px solid var(--border-color);
            margin-top: 3rem;
        }
        
        @media (max-width: 768px) {
            .nav-links {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>AsyncLocalStorage Performance Analysis</h1>
            <p class="subtitle">Comprehensive performance and memory analysis across Node.js versions</p>
        </div>
    </header>
    
    <nav>
        <div class="container">
            <ul class="nav-links">
                <li><a href="#overview">Overview</a></li>
                <li><a href="#performance">Performance</a></li>
                <li><a href="#memory">Memory</a></li>
                <li><a href="#recommendations">Recommendations</a></li>
                <li><a href="#raw-data">Raw Data</a></li>
            </ul>
        </div>
    </nav>
    
    <main>
        <div class="container">
            <section id="overview" class="section">
                <h2>Overview</h2>
                <div class="card">
                    <p>This analysis provides comprehensive performance benchmarks for Node.js AsyncLocalStorage, comparing overhead across different versions and usage patterns.</p>
                    
                    <h3>Test Categories</h3>
                    <ul>
                        <li><strong>Performance Benchmarks:</strong> Time overhead comparison with and without AsyncLocalStorage</li>
                        <li><strong>Memory Profiling:</strong> Memory usage analysis and leak detection</li>
                        <li><strong>Concurrent Testing:</strong> Performance under concurrent load</li>
                        <li><strong>Version Comparison:</strong> Cross-version analysis of improvements</li>
                    </ul>
                </div>
                
                <div id="summary-metrics" class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value" id="avg-overhead">--</div>
                        <div class="metric-label">Average Overhead (%)</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="node-version">--</div>
                        <div class="metric-label">Latest Node.js Version</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="test-count">--</div>
                        <div class="metric-label">Total Tests Run</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="memory-overhead">--</div>
                        <div class="metric-label">Memory Overhead (MB)</div>
                    </div>
                </div>
            </section>
            
            <section id="performance" class="section">
                <h2>Performance Analysis</h2>
                <div class="chart-container">
                    <canvas id="performanceChart" width="400" height="200"></canvas>
                </div>
                
                <div id="performance-summary" class="card">
                    <div class="loading">Loading performance data...</div>
                </div>
            </section>
            
            <section id="memory" class="section">
                <h2>Memory Analysis</h2>
                <div class="chart-container">
                    <canvas id="memoryChart" width="400" height="200"></canvas>
                </div>
                
                <div id="memory-summary" class="card">
                    <div class="loading">Loading memory data...</div>
                </div>
            </section>
            
            <section id="recommendations" class="section">
                <h2>Recommendations</h2>
                <div id="recommendations-content" class="card">
                    <div class="loading">Loading recommendations...</div>
                </div>
            </section>
            
            <section id="raw-data" class="section">
                <h2>Raw Data</h2>
                <div class="card">
                    <h3>Quick Start</h3>
                    <p>To run these benchmarks yourself:</p>
                    <div class="code-block">git clone https://github.com/tobrien/async-node-stats.git
cd async-node-stats
npm install
npm run benchmark
npm run memory-test</div>
                    
                    <h3>Available Data Files</h3>
                    <ul id="data-files">
                        <li><a href="detailed-results.json">Detailed Results (JSON)</a></li>
                        <li><a href="version-comparison.json">Version Comparison (JSON)</a></li>
                        <li><a href="chart-data.json">Chart Data (JSON)</a></li>
                        <li><a href="SUMMARY.md">Summary Report (Markdown)</a></li>
                    </ul>
                </div>
            </section>
        </div>
    </main>
    
    <footer>
        <div class="container">
            <p>&copy; 2024 AsyncLocalStorage Performance Analysis. Generated automatically from benchmark results.</p>
            <p>Last updated: <span id="last-updated">--</span></p>
        </div>
    </footer>
    
    <script>
        // Initialize charts and load data
        let performanceChart, memoryChart;
        
        async function loadData() {
            try {
                // Load chart data
                const chartResponse = await fetch('chart-data.json');
                if (chartResponse.ok) {
                    const chartData = await chartResponse.json();
                    initializeCharts(chartData);
                    updateLastUpdated(chartData.generatedAt);
                }
                
                // Load summary data
                const summaryResponse = await fetch('detailed-results.json');
                if (summaryResponse.ok) {
                    const summaryData = await summaryResponse.json();
                    updateSummaryMetrics(summaryData);
                    updatePerformanceSummary(summaryData);
                    updateMemorySummary(summaryData);
                }
                
                // Load recommendations from summary markdown
                try {
                    const summaryMdResponse = await fetch('SUMMARY.md');
                    if (summaryMdResponse.ok) {
                        const summaryMd = await summaryMdResponse.text();
                        updateRecommendations(summaryMd);
                    }
                } catch (error) {
                    console.log('Summary markdown not available');
                }
                
            } catch (error) {
                console.error('Error loading data:', error);
                document.getElementById('performance-summary').innerHTML = '<div class="error">Error loading data. Please check that benchmark results are available.</div>';
            }
        }
        
        function initializeCharts(chartData) {
            // Performance Chart
            const perfCtx = document.getElementById('performanceChart').getContext('2d');
            performanceChart = new Chart(perfCtx, {
                type: 'bar',
                data: chartData.performanceChart,
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'AsyncLocalStorage Performance Overhead by Node.js Version'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Overhead (%)'
                            }
                        }
                    }
                }
            });
            
            // Memory Chart
            const memCtx = document.getElementById('memoryChart').getContext('2d');
            memoryChart = new Chart(memCtx, {
                type: 'line',
                data: chartData.memoryChart,
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Memory Overhead by Node.js Version'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Memory (MB)'
                            }
                        }
                    }
                }
            });
        }
        
        function updateSummaryMetrics(data) {
            if (data.benchmarkResults && data.benchmarkResults.length > 0) {
                const latest = data.benchmarkResults[data.benchmarkResults.length - 1];
                const avgOverhead = latest.benchmarks.reduce((sum, b) => sum + b.overhead.timePercent, 0) / latest.benchmarks.length;
                const totalMemory = latest.benchmarks.reduce((sum, b) => sum + b.overhead.memoryRSSBytes, 0);
                
                document.getElementById('avg-overhead').textContent = avgOverhead.toFixed(1) + '%';
                document.getElementById('node-version').textContent = latest.nodeVersion;
                document.getElementById('memory-overhead').textContent = (totalMemory / 1024 / 1024).toFixed(1);
            }
            
            const totalTests = data.benchmarkResults.length + data.memoryResults.length;
            document.getElementById('test-count').textContent = totalTests;
        }
        
        function updatePerformanceSummary(data) {
            if (data.benchmarkResults && data.benchmarkResults.length > 0) {
                const latest = data.benchmarkResults[data.benchmarkResults.length - 1];
                let html = '<h3>Latest Performance Results</h3>';
                html += '<table><thead><tr><th>Test Case</th><th>ALS Overhead</th><th>Nested Overhead</th><th>Memory Impact</th></tr></thead><tbody>';
                
                for (const benchmark of latest.benchmarks) {
                    const memoryMB = (benchmark.overhead.memoryRSSBytes / 1024 / 1024).toFixed(2);
                    html += \`<tr>
                        <td>\${benchmark.name}</td>
                        <td>\${benchmark.overhead.timePercent.toFixed(2)}%</td>
                        <td>\${benchmark.overhead.nestedTimePercent.toFixed(2)}%</td>
                        <td>\${memoryMB}MB</td>
                    </tr>\`;
                }
                
                html += '</tbody></table>';
                document.getElementById('performance-summary').innerHTML = html;
            }
        }
        
        function updateMemorySummary(data) {
            if (data.memoryResults && data.memoryResults.length > 0) {
                const latest = data.memoryResults[data.memoryResults.length - 1];
                let html = '<h3>Latest Memory Analysis</h3>';
                
                if (latest.memoryLeakTest) {
                    const analysis = latest.memoryLeakTest.analysis;
                    html += \`<div class="card \${analysis.potentialLeak ? 'danger' : 'success'}">
                        <h4>Memory Leak Detection</h4>
                        <p><strong>Status:</strong> \${analysis.potentialLeak ? '⚠️ Potential leak detected' : '✅ No leak detected'}</p>
                        <p><strong>Average Growth:</strong> \${(analysis.avgGrowthPerIterationBytes / 1024 / 1024).toFixed(2)}MB per cycle</p>
                    </div>\`;
                }
                
                document.getElementById('memory-summary').innerHTML = html;
            }
        }
        
        function updateRecommendations(summaryMd) {
            // Extract recommendations section from markdown
            const recommendationsMatch = summaryMd.match(/## Recommendations\\n\\n([\\s\\S]*?)(?=\\n## |$)/);
            if (recommendationsMatch) {
                let recommendations = recommendationsMatch[1];
                // Simple markdown to HTML conversion
                recommendations = recommendations
                    .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                    .replace(/^- (.*$)/gim, '<li>$1</li>')
                    .replace(/^(✅|⚠️|❌|💡|🔍|🚨|🔧|📊) (.*$)/gim, '<div class="recommendation-item">$1 $2</div>');
                
                document.getElementById('recommendations-content').innerHTML = recommendations;
            }
        }
        
        function updateLastUpdated(timestamp) {
            document.getElementById('last-updated').textContent = new Date(timestamp).toLocaleString();
        }
        
        // Load data when page loads
        document.addEventListener('DOMContentLoaded', loadData);
    </script>
</body>
</html>`;

  await fs.writeFile(path.join(docsDir, 'index.html'), indexHtml);
  console.log('Documentation site generated: docs/index.html');
  console.log('Note: Additional pages (nested-als.html, getting-started.html) should be manually created or copied to docs/ directory');
  console.log('The site expects NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md to be present in docs/ directory');
}

// Run documentation generation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDocumentationSite().catch(console.error);
}

export { generateDocumentationSite };
