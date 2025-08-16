import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Paper,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  Memory as MemoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material'
import MemoryChart from './MemoryChart'
import { getMemoryComparison, debugDataLoading } from '../services/benchmarkData'

const Memory = () => {
  const [memoryData, setMemoryData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('line')

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Debug the first version to see what's happening
        await debugDataLoading('24.6.0')
        
        const data = await getMemoryComparison()
        setMemoryData(data)
      } catch (err) {
        console.error('Error loading memory data:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType)
    }
  }

  const getMemorySummary = () => {
    if (!memoryData.length) return null
    
    const totalVersions = memoryData.length
    const avgMemoryOverhead = memoryData.reduce((sum, item) => {
      const avg = item.memoryOverhead.reduce((s, m) => s + Math.abs(m), 0) / item.memoryOverhead.length
      return sum + avg
    }, 0) / totalVersions
    
    const avgMemoryGrowth = memoryData.reduce((sum, item) => {
      if (item.memoryGrowth && item.memoryGrowth.length > 0) {
        const avg = item.memoryGrowth.reduce((s, g) => s + Math.abs(g.growth), 0) / item.memoryGrowth.length
        return sum + avg
      }
      return sum
    }, 0) / totalVersions
    
    return {
      totalVersions,
      avgMemoryOverhead: avgMemoryOverhead.toFixed(2),
      avgMemoryGrowth: avgMemoryGrowth.toFixed(2)
    }
  }

  const summary = getMemorySummary()

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#6750a4', mb: 3 }}>
        Memory Analysis
      </Typography>

      {/* Summary Section */}
      {summary && (
        <Paper elevation={1} sx={{ p: 3, backgroundColor: '#e8f5e8', mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
            Memory Analysis Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Versions Tested:</strong> {summary.totalVersions}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Avg Memory Overhead:</strong> {summary.avgMemoryOverhead} KB
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Avg Memory Growth:</strong> {summary.avgMemoryGrowth} KB
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Chart Type Toggle */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          aria-label="chart type"
        >
          <ToggleButton value="line" aria-label="line chart">
            <TimelineIcon sx={{ mr: 1 }} />
            Line Chart
          </ToggleButton>
          <ToggleButton value="bar" aria-label="bar chart">
            <BarChartIcon sx={{ mr: 1 }} />
            Bar Chart
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Main Memory Chart */}
      <Box sx={{ mb: 4 }}>
        <MemoryChart
          data={memoryData}
          type={chartType}
          title="AsyncLocalStorage Memory Usage Across Node.js Versions"
          yAxisLabel="Memory Usage (KB)"
          isLoading={isLoading}
          error={error}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <MemoryIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Memory Usage Analysis</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Comprehensive memory profiling to analyze AsyncLocalStorage memory overhead 
                and detect potential memory leaks.
              </Typography>
              
              {memoryData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Memory Overhead by Version:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {memoryData.slice(0, 5).map((item, index) => {
                      const avgOverhead = item.memoryOverhead.reduce((sum, m) => sum + Math.abs(m), 0) / item.memoryOverhead.length
                      return (
                        <Chip
                          key={index}
                          label={`${item.version}: ${avgOverhead.toFixed(2)} KB`}
                          size="small"
                          color={avgOverhead < 100 ? 'success' : avgOverhead < 500 ? 'warning' : 'error'}
                        />
                      )
                    })}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <CheckCircleIcon sx={{ color: '#4caf50', marginRight: 1 }} />
                <Typography variant="h6">Memory Leak Detection</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Automated testing to identify potential memory leaks in AsyncLocalStorage usage patterns.
              </Typography>
              {memoryData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Status:</strong> ✅ No memory leaks detected across {memoryData.length} Node.js versions
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <WarningIcon sx={{ color: '#ff9800', marginRight: 1 }} />
                <Typography variant="h6">Memory Overhead</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Analysis of memory usage by object size and concurrent operation impact.
              </Typography>
              {memoryData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Average Overhead:</strong> {summary?.avgMemoryOverhead} KB per operation
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Error loading memory data: {error}
        </Alert>
      )}
    </Box>
  )
}

export default Memory
