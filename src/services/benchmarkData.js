// Service to load and process benchmark data from version-comparison.json endpoint
// This provides a simple way to load all benchmark data in one request

const VERSION_COMPARISON_URL = 'https://enterprise-tim.github.io/async-node-stats/version-comparison.json'

const NODE_VERSIONS = [
  '16.20.2', '18.19.1', '20.0.0', '20.11.0', 
  '21.0.0', '21.7.3', '22.0.0', '22.18.0', 
  '23.0.0', '24.0.0', '24.6.0'
];

// Load version comparison data from the centralized endpoint
async function loadVersionComparisonData() {
  try {
    console.log('Loading version comparison data from:', VERSION_COMPARISON_URL);
    const response = await fetch(VERSION_COMPARISON_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to load version comparison data: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Version comparison data loaded successfully:', data);
    return data;
  } catch (error) {
    console.error('Error loading version comparison data:', error);
    throw error;
  }
}

// Get aggregated performance data across all versions
async function getPerformanceComparison() {
  try {
    console.log('Loading performance comparison data...');
    
    const versionData = await loadVersionComparisonData();
    if (!versionData || !versionData.comparisons) {
      console.log('No benchmark data available');
      return [];
    }
    
    const performanceData = versionData.comparisons.map(comparison => ({
      version: comparison.nodeVersion,
      basicOverhead: comparison.testResults
        .filter(test => test.type === 'traditional')
        .map(test => ({
          name: test.name,
          overhead: test.overheadPercent
        })),
      nestedOverhead: comparison.testResults
        .filter(test => test.type === 'traditional')
        .map(test => ({
          name: test.name,
          overhead: test.nestedOverheadPercent
        })),
      memoryOverhead: comparison.testResults
        .filter(test => test.type === 'traditional')
        .map(test => ({
          name: test.name,
          overhead: test.memoryOverheadBytes / 1024 / 1024 // Convert to MB
        }))
    }));
    
    console.log(`Loaded performance data for ${performanceData.length} versions`);
    return performanceData;
  } catch (error) {
    console.error('Error loading performance comparison:', error);
    return [];
  }
}

// Get aggregated memory data across all versions
async function getMemoryComparison() {
  try {
    console.log('Loading memory comparison data...');
    
    const versionData = await loadVersionComparisonData();
    if (!versionData || !versionData.comparisons) {
      console.log('No memory data available');
      return [];
    }
    
    const memoryData = versionData.comparisons.map(comparison => ({
      version: comparison.nodeVersion,
      memoryOverhead: comparison.testResults
        .filter(test => test.type === 'traditional')
        .map(test => test.memoryOverheadBytes / 1024), // Convert to KB
      memoryGrowth: comparison.testResults
        .filter(test => test.type === 'traditional' && test.memoryOverheadBytes > 0)
        .map(test => ({
          size: test.name,
          growth: test.memoryOverheadBytes / 1024 // Convert to KB
        })),
      totalMemoryOverhead: comparison.totalMemoryOverheadBytes / 1024 // Convert to KB
    }));
    
    console.log(`Loaded memory data for ${memoryData.length} versions`);
    return memoryData;
  } catch (error) {
    console.error('Error loading memory comparison:', error);
    return [];
  }
}

// Get summary statistics for performance
function getPerformanceSummary(performanceData) {
  if (!performanceData.length) return null;
  
  const summary = {
    versions: performanceData.map(d => d.version),
    averageBasicOverhead: [],
    averageNestedOverhead: [],
    bestVersion: null,
    worstVersion: null
  };
  
  performanceData.forEach(data => {
    if (data.basicOverhead.length > 0) {
      const avgBasic = data.basicOverhead.reduce((sum, item) => sum + item.overhead, 0) / data.basicOverhead.length;
      summary.averageBasicOverhead.push(avgBasic);
    }
    
    if (data.nestedOverhead.length > 0) {
      const avgNested = data.nestedOverhead.reduce((sum, item) => sum + item.overhead, 0) / data.nestedOverhead.length;
      summary.averageNestedOverhead.push(avgNested);
    }
  });
  
  // Find best and worst versions based on basic overhead
  if (summary.averageBasicOverhead.length > 0) {
    const minIndex = summary.averageBasicOverhead.indexOf(Math.min(...summary.averageBasicOverhead));
    const maxIndex = summary.averageBasicOverhead.indexOf(Math.max(...summary.averageBasicOverhead));
    summary.bestVersion = summary.versions[minIndex];
    summary.worstVersion = summary.versions[maxIndex];
  }
  
  return summary;
}

// Debug function for testing data loading (simplified)
async function debugDataLoading(version) {
  console.log(`=== Debugging data loading for ${version} ===`);
  
  try {
    const data = await loadVersionComparisonData();
    const versionData = data.comparisons.find(c => c.nodeVersion === version);
    
    if (versionData) {
      console.log(`Found data for ${version}:`, versionData);
    } else {
      console.log(`No data found for ${version}`);
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.log(`=== End debugging for ${version} ===`);
}

export {
  loadVersionComparisonData,
  getPerformanceComparison,
  getMemoryComparison,
  getPerformanceSummary,
  debugDataLoading,
  NODE_VERSIONS
};