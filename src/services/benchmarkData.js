// Service to load and process benchmark data from results directory
// This works with GitHub Pages by loading data directly from the deployed results files

const NODE_VERSIONS = [
  '16.20.2', '18.19.1', '20.0.0', '20.11.0', 
  '21.0.0', '21.7.3', '22.0.0', '22.18.0', 
  '23.0.0', '24.0.0', '24.6.0'
];

// Helper function to determine the correct base path
function getBasePath() {
  let basePath = '';
  if (window.location.hostname !== 'localhost' || window.location.pathname.includes('/async-node-stats')) {
    basePath = '/async-node-stats';
  }
  console.log('Base path determined:', basePath, 'from hostname:', window.location.hostname, 'pathname:', window.location.pathname);
  return basePath;
}

// Load the data index file
async function loadDataIndex() {
  try {
    const basePath = getBasePath();
    
    console.log('Loading data index from:', `${basePath}/data-index.json`);
    let response = await fetch(`${basePath}/data-index.json`);
    
    // If that fails, try without basePath
    if (!response.ok) {
      console.log('Trying data-index.json without basePath: /data-index.json');
      response = await fetch('/data-index.json');
    }
    
    // If that fails, try with relative path
    if (!response.ok) {
      console.log('Trying data-index.json with relative path: ./data-index.json');
      response = await fetch('./data-index.json');
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load data index: ${response.statusText}`);
    }
    
    const dataIndex = await response.json();
    console.log('Data index loaded successfully:', dataIndex);
    return dataIndex.versions;
  } catch (error) {
    console.warn('Could not load data index, using fallback:', error);
    // Fallback to hardcoded index if the file can't be loaded
    return createFallbackDataIndex();
  }
}

// Fallback data index in case the external file can't be loaded
function createFallbackDataIndex() {
  return {
    '16.20.2': {
      benchmark: 'benchmark_v16_20_2_1755282128371.json',
      memory: 'memory_v16_20_2_1755283972331.json'
    },
    '18.19.1': {
      benchmark: 'benchmark_v18_19_1_1755282128371.json',
      memory: 'memory_v18_19_1_1755283972331.json'
    },
    '20.0.0': {
      benchmark: 'benchmark_v20_0_0_1755352092232.json',
      memory: 'memory_v20_0_0_1755352116511.json'
    },
    '20.11.0': {
      benchmark: 'benchmark_v20_11_0_1755282207134.json',
      memory: 'memory_v20_11_0_1755284049178.json'
    },
    '21.0.0': {
      benchmark: 'benchmark_v21_0_0_1755352250054.json',
      memory: 'memory_v21_0_0_1755352272312.json'
    },
    '21.7.3': {
      benchmark: 'benchmark_v21_7_3_1755282285062.json',
      memory: 'memory_v21_7_3_1755284123217.json'
    },
    '22.0.0': {
      benchmark: 'benchmark_v22_0_0_1755282370635.json',
      memory: 'memory_v22_0_0_1755284198440.json'
    },
    '22.18.0': {
      benchmark: 'benchmark_v22_18_0_1755352491956.json',
      memory: 'memory_v22_18_0_1755352514642.json'
    },
    '23.0.0': {
      benchmark: 'benchmark_v23_0_0_1755352568557.json',
      memory: 'memory_v23_0_0_1755352591575.json'
    },
    '24.0.0': {
      benchmark: 'benchmark_v24_0_0_1755352642980.json',
      memory: 'memory_v24_0_0_1755352667446.json'
    },
    '24.6.0': {
      benchmark: 'benchmark_v24_6_0_1755352715978.json',
      memory: 'memory_v24_6_0_1755352739076.json'
    }
  };
}

// Load benchmark data for a specific version
async function loadBenchmarkData(version) {
  try {
    const versionDir = `node_${version}`;
    const basePath = getBasePath();
    
    // Get the data index to find the exact filename
    const dataIndex = await loadDataIndex();
    const versionData = dataIndex[version];
    
    if (!versionData) {
      throw new Error(`No data index found for version ${version}`);
    }
    
    let response = await fetch(`${basePath}/results/versions/${versionDir}/${versionData.benchmark}`);
    
    // If that fails, try without basePath
    if (!response.ok) {
      console.log(`Trying benchmark without basePath: /results/versions/${versionDir}/${versionData.benchmark}`);
      response = await fetch(`/results/versions/${versionDir}/${versionData.benchmark}`);
    }
    
    // If that fails, try with relative path
    if (!response.ok) {
      console.log(`Trying benchmark with relative path: ./results/versions/${versionDir}/${versionData.benchmark}`);
      response = await fetch(`./results/versions/${versionDir}/${versionData.benchmark}`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load benchmark data for ${version}: ${response.statusText}`);
    }
    
    if (response.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Received HTML instead of JSON for ${version}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`Could not load benchmark data for ${version}:`, error);
    return null;
  }
}

// Load memory data for a specific version
async function loadMemoryData(version) {
  try {
    const versionDir = `node_${version}`;
    const basePath = getBasePath();
    
    // Get the data index to find the exact filename
    const dataIndex = await loadDataIndex();
    const versionData = dataIndex[version];
    
    if (!versionData) {
      throw new Error(`No data index found for version ${version}`);
    }
    
    let response = await fetch(`${basePath}/results/versions/${versionDir}/${versionData.memory}`);
    
    // If that fails, try without basePath
    if (!response.ok) {
      console.log(`Trying memory without basePath: /results/versions/${versionDir}/${versionData.memory}`);
      response = await fetch(`/results/versions/${versionDir}/${versionData.memory}`);
    }
    
    // If that fails, try with relative path
    if (!response.ok) {
      console.log(`Trying memory with relative path: ./results/versions/${versionDir}/${versionData.memory}`);
      response = await fetch(`./results/versions/${versionDir}/${versionData.memory}`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load memory data for ${version}: ${response.statusText}`);
    }
    
    if (response.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Received HTML instead of JSON for ${version}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`Could not load memory data for ${version}:`, error);
    return null;
  }
}

// Load benchmark data for a specific version using the data index
async function loadBenchmarkDataWithIndex(version) {
  try {
    const versionDir = `node_${version}`;
    const dataIndex = await loadDataIndex();
    const versionData = dataIndex[version];
    
    if (!versionData) {
      throw new Error(`No data index found for version ${version}`);
    }
    
    const basePath = getBasePath();
    let url = `${basePath}/results/versions/${versionDir}/${versionData.benchmark}`;
    console.log(`Loading benchmark data for ${version} from:`, url);
    
    let response = await fetch(url);
    
    // If that fails, try without basePath
    if (!response.ok) {
      url = `/results/versions/${versionDir}/${versionData.benchmark}`;
      console.log(`Trying benchmark without basePath:`, url);
      response = await fetch(url);
    }
    
    // If that fails, try with relative path
    if (!response.ok) {
      url = `./results/versions/${versionDir}/${versionData.benchmark}`;
      console.log(`Trying benchmark with relative path:`, url);
      response = await fetch(url);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load benchmark data for ${version}: ${response.statusText}`);
    }
    
    if (response.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Received HTML instead of JSON for ${version}`);
    }
    
    const data = await response.json();
    console.log(`Benchmark data loaded for ${version}:`, data);
    return data;
  } catch (error) {
    console.warn(`Could not load benchmark data for ${version}:`, error);
    return null;
  }
}

// Load memory data for a specific version using the data index
async function loadMemoryDataWithIndex(version) {
  try {
    const versionDir = `node_${version}`;
    const dataIndex = await loadDataIndex();
    const versionData = dataIndex[version];
    
    if (!versionData) {
      throw new Error(`No data index found for version ${version}`);
    }
    
    const basePath = getBasePath();
    let response = await fetch(`${basePath}/results/versions/${versionDir}/${versionData.memory}`);
    
    // If that fails, try without basePath
    if (!response.ok) {
      console.log(`Trying memory without basePath: /results/versions/${versionDir}/${versionData.memory}`);
      response = await fetch(`/results/versions/${versionDir}/${versionData.memory}`);
    }
    
    // If that fails, try with relative path
    if (!response.ok) {
      console.log(`Trying memory with relative path: ./results/versions/${versionDir}/${versionData.memory}`);
      response = await fetch(`./results/versions/${versionDir}/${versionData.memory}`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load memory data for ${version}: ${response.statusText}`);
    }
    
    if (response.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Received HTML instead of JSON for ${version}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`Could not load memory data for ${version}:`, error);
    return null;
  }
}

// Process benchmark data to extract performance metrics
function processBenchmarkData(data) {
  if (!data || !data.benchmarks) return null;
  
  const metrics = {
    version: data.nodeVersion,
    timestamp: data.timestamp,
    basicOverhead: [],
    nestedOverhead: [],
    memoryOverhead: []
  };
  
  data.benchmarks.forEach(benchmark => {
    if (benchmark.overhead) {
      metrics.basicOverhead.push({
        name: benchmark.name,
        overhead: benchmark.overhead.timePercent
      });
      
      if (benchmark.overhead.nestedTimePercent) {
        metrics.nestedOverhead.push({
          name: benchmark.name,
          overhead: benchmark.overhead.nestedTimePercent
        });
      }
      
      if (benchmark.overhead.memoryRSSBytes) {
        metrics.memoryOverhead.push({
          name: benchmark.name,
          overhead: benchmark.overhead.memoryRSSBytes / 1024 / 1024 // Convert to MB
        });
      }
    }
  });
  
  return metrics;
}

// Process memory data to extract memory metrics
function processMemoryData(data) {
  if (!data || !data.memoryTests) return null;
  
  const metrics = {
    version: data.nodeVersion,
    timestamp: data.timestamp,
    objectSizes: [],
    memoryOverhead: [],
    memoryGrowth: []
  };
  
  data.memoryTests.forEach(test => {
    if (test.overhead) {
      metrics.objectSizes.push(test.objectSizeKB);
      metrics.memoryOverhead.push(test.overhead.heapUsed / 1024); // Convert to KB
      
      if (test.withALS && test.withALS.delta) {
        metrics.memoryGrowth.push({
          size: test.objectSizeKB,
          growth: test.withALS.delta.heapUsed / 1024
        });
      }
    }
  });
  
  return metrics;
}

// Get aggregated performance data across all versions
async function getPerformanceComparison() {
  const performanceData = [];
  
  for (const version of NODE_VERSIONS) {
    const benchmarkData = await loadBenchmarkDataWithIndex(version);
    if (benchmarkData) {
      const processed = processBenchmarkData(benchmarkData);
      if (processed) {
        performanceData.push(processed);
      }
    }
  }
  
  return performanceData;
}

// Get aggregated memory data across all versions
async function getMemoryComparison() {
  const memoryData = [];
  
  for (const version of NODE_VERSIONS) {
    const memoryTestData = await loadMemoryDataWithIndex(version);
    if (memoryTestData) {
      const processed = processMemoryData(memoryTestData);
      if (processed) {
        memoryData.push(processed);
      }
    }
  }
  
  return memoryData;
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

// Debug function to test data loading
async function debugDataLoading(version) {
  console.log(`=== Debugging data loading for ${version} ===`);
  
  try {
    const basePath = getBasePath();
    const versionDir = `node_${version}`;
    
    console.log('Base path:', basePath);
    console.log('Version directory:', versionDir);
    console.log('Current location:', window.location.href);
    console.log('Hostname:', window.location.hostname);
    console.log('Pathname:', window.location.pathname);
    console.log('Origin:', window.location.origin);
    console.log('Protocol:', window.location.protocol);
    console.log('Port:', window.location.port);
    
    // First test if we can access the data-index.json
    console.log('Testing data-index.json access...');
    
    // Test if we can access the root
    console.log('Testing root access...');
    try {
      const rootTestResponse = await fetch(`${basePath}/`);
      console.log('Root test response status:', rootTestResponse.status);
      console.log('Root test response status text:', rootTestResponse.statusText);
    } catch (error) {
      console.log('Root test error:', error);
    }
    
    // Test if we can access the results directory structure
    console.log('Testing results directory access...');
    try {
      console.log('Trying results directory with basePath:', `${basePath}/results/versions/`);
      let resultsTestResponse = await fetch(`${basePath}/results/versions/`);
      
      // If that fails, try without basePath
      if (!resultsTestResponse.ok) {
        console.log('Trying results directory without basePath: /results/versions/');
        resultsTestResponse = await fetch('/results/versions/');
      }
      
      // If that fails, try with relative path
      if (!resultsTestResponse.ok) {
        console.log('Trying results directory with relative path: ./results/versions/');
        resultsTestResponse = await fetch('./results/versions/');
      }
      
      console.log('Results directory test response status:', resultsTestResponse.status);
      console.log('Results directory test response status text:', resultsTestResponse.statusText);
    } catch (error) {
      console.log('Results directory test error:', error);
    }
    
    // Test if we can access the specific version directory
    console.log('Testing version directory access...');
    try {
      console.log('Trying version directory with basePath:', `${basePath}/results/versions/${versionDir}/`);
      let versionDirTestResponse = await fetch(`${basePath}/results/versions/${versionDir}/`);
      
      // If that fails, try without basePath
      if (!versionDirTestResponse.ok) {
        console.log('Trying version directory without basePath:', `/results/versions/${versionDir}/`);
        versionDirTestResponse = await fetch(`/results/versions/${versionDir}/`);
      }
      
      // If that fails, try with relative path
      if (!versionDirTestResponse.ok) {
        console.log('Trying version directory with relative path:', `./results/versions/${versionDir}/`);
        versionDirTestResponse = await fetch(`./results/versions/${versionDir}/`);
      }
      
      console.log('Version directory test response status:', versionDirTestResponse.status);
      console.log('Version directory test response status text:', versionDirTestResponse.statusText);
    } catch (error) {
      console.log('Version directory test error:', error);
    }
    
    // Test if we can access a known file directly
    console.log('Testing direct file access...');
    try {
      console.log('Trying direct file with basePath:', `${basePath}/results/versions/${versionDir}/memory_v24_6_0_1755352739076.json`);
      let directFileTestResponse = await fetch(`${basePath}/results/versions/${versionDir}/memory_v24_6_0_1755352739076.json`);
      
      // If that fails, try without basePath
      if (!directFileTestResponse.ok) {
        console.log('Trying direct file without basePath:', `/results/versions/${versionDir}/memory_v24_6_0_1755352739076.json`);
        directFileTestResponse = await fetch(`/results/versions/${versionDir}/memory_v24_6_0_1755352739076.json`);
      }
      
      // If that fails, try with relative path
      if (!directFileTestResponse.ok) {
        console.log('Trying direct file with relative path:', `./results/versions/${versionDir}/memory_v24_6_0_1755352739076.json`);
        directFileTestResponse = await fetch(`./results/versions/${versionDir}/memory_v24_6_0_1755352739076.json`);
      }
      
      console.log('Direct file test response status:', directFileTestResponse.status);
      console.log('Direct file test response status text:', directFileTestResponse.statusText);
      if (directFileTestResponse.ok) {
        const fileText = await directFileTestResponse.text();
        console.log('Direct file response preview:', fileText.substring(0, 200));
      }
    } catch (error) {
      console.log('Direct file test error:', error);
    }
    
    try {
      // Try different paths for the data index
      console.log('Trying data-index.json with basePath:', `${basePath}/data-index.json`);
      let indexResponse = await fetch(`${basePath}/data-index.json`);
      
      // If that fails, try without basePath
      if (!indexResponse.ok) {
        console.log('Trying data-index.json without basePath: /data-index.json');
        indexResponse = await fetch('/data-index.json');
      }
      
      // If that fails, try with relative path
      if (!indexResponse.ok) {
        console.log('Trying data-index.json with relative path: ./data-index.json');
        indexResponse = await fetch('./data-index.json');
      }
      
      console.log('Data index response status:', indexResponse.status);
      console.log('Data index response status text:', indexResponse.statusText);
      console.log('Data index response headers:', Object.fromEntries(indexResponse.headers.entries()));
      
      if (indexResponse.ok) {
        const indexText = await indexResponse.text();
        console.log('Data index response preview:', indexText.substring(0, 200));
        console.log('Data index response length:', indexText.length);
        
        const dataIndex = JSON.parse(indexText);
        const versionData = dataIndex.versions[version];
        console.log('Version data from index:', versionData);
        
        if (versionData) {
          const memoryUrl = `${basePath}/results/versions/${versionDir}/${versionData.memory}`;
          const benchmarkUrl = `${basePath}/results/versions/${versionDir}/${versionData.benchmark}`;
          
          console.log('Memory URL:', memoryUrl);
          console.log('Benchmark URL:', benchmarkUrl);
          
          // Test memory file
          try {
            console.log('Testing memory file fetch...');
            const memoryResponse = await fetch(memoryUrl);
            console.log('Memory response status:', memoryResponse.status);
            console.log('Memory response status text:', memoryResponse.statusText);
            console.log('Memory response headers:', Object.fromEntries(memoryResponse.headers.entries()));
            
            if (memoryResponse.ok) {
              const memoryText = await memoryResponse.text();
              console.log('Memory response preview:', memoryText.substring(0, 200));
              console.log('Memory response length:', memoryText.length);
            } else {
              console.log('Memory response not ok, trying to get error text...');
              try {
                const errorText = await memoryResponse.text();
                console.log('Memory error response:', errorText.substring(0, 500));
              } catch (e) {
                console.log('Could not read error response:', e);
              }
            }
          } catch (error) {
            console.error('Memory fetch error:', error);
          }
          
          // Test benchmark file
          try {
            console.log('Testing benchmark file fetch...');
            const benchmarkResponse = await fetch(benchmarkUrl);
            console.log('Benchmark response status:', benchmarkResponse.status);
            console.log('Benchmark response status text:', benchmarkResponse.statusText);
            console.log('Benchmark response headers:', Object.fromEntries(benchmarkResponse.headers.entries()));
            
            if (benchmarkResponse.ok) {
              const benchmarkText = await benchmarkResponse.text();
              console.log('Benchmark response preview:', benchmarkText.substring(0, 200));
              console.log('Benchmark response length:', benchmarkText.length);
            } else {
              console.log('Benchmark response not ok, trying to get error text...');
              try {
                const errorText = await benchmarkResponse.text();
                console.log('Benchmark error response:', errorText.substring(0, 500));
              } catch (e) {
                console.log('Could not read error response:', e);
              }
            }
          } catch (error) {
            console.error('Benchmark fetch error:', error);
          }
        }
      } else {
        console.log('Data index response not ok, trying to get error text...');
        try {
          const errorText = await indexResponse.text();
          console.log('Data index error response:', errorText.substring(0, 500));
        } catch (e) {
          console.log('Could not read error response:', e);
        }
      }
    } catch (error) {
      console.error('Data index fetch error:', error);
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.log(`=== End debugging for ${version} ===`);
}

export {
  loadBenchmarkData,
  loadMemoryData,
  loadBenchmarkDataWithIndex,
  loadMemoryDataWithIndex,
  processBenchmarkData,
  processMemoryData,
  getPerformanceComparison,
  getMemoryComparison,
  getPerformanceSummary,
  debugDataLoading,
  NODE_VERSIONS
};
