import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Paper,
  Alert,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  Hub as HubIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material'
import PerformanceChart from './PerformanceChart'
import { getPerformanceComparison, getPerformanceSummary, debugDataLoading } from '../services/benchmarkData'

const Performance = () => {
  const [performanceData, setPerformanceData] = useState([])
  const [summary, setSummary] = useState(null)
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
        
        const data = await getPerformanceComparison()
        setPerformanceData(data)
        
        const summaryData = getPerformanceSummary(data)
        setSummary(summaryData)
      } catch (err) {
        console.error('Error loading performance data:', err)
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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#6750a4', mb: 3 }}>
        Performance Analysis
      </Typography>

      {/* Summary Section */}
      {summary && (
        <Paper elevation={1} sx={{ p: 3, backgroundColor: '#e8f5e8', mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
            Performance Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Best Version:</strong> {summary.bestVersion}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Worst Version:</strong> {summary.worstVersion}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Versions Tested:</strong> {summary.versions.length}
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

      {/* Main Performance Chart */}
      <Box sx={{ mb: 4 }}>
        <PerformanceChart
          data={performanceData}
          type={chartType}
          title="AsyncLocalStorage Performance Across Node.js Versions"
          yAxisLabel="Overhead (%)"
          isLoading={isLoading}
          error={error}
        />
      </Box>

      {/* Simple Overhead Tests Section */}
      <Typography variant="h5" gutterBottom sx={{ color: '#6750a4', mb: 3 }}>
        Simple AsyncLocalStorage Overhead Tests
      </Typography>
      <Typography variant="body1" paragraph sx={{ mb: 3 }}>
        These tests measure the basic performance cost of using AsyncLocalStorage compared to not using it. 
        They test various scenarios that developers commonly encounter in production applications.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <TrendingUpIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Basic AsyncLocalStorage Overhead</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                This chart shows the basic overhead of using AsyncLocalStorage compared to not using it. 
                Values represent the percentage increase in execution time.
              </Typography>
              {performanceData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Key Findings:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {performanceData.slice(0, 3).map((item, index) => (
                      <Chip
                        key={index}
                        label={`${item.version}: ${item.basicOverhead.reduce((sum, b) => sum + b.overhead, 0) / item.basicOverhead.length > 0 ? '+' : ''}${(item.basicOverhead.reduce((sum, b) => sum + b.overhead, 0) / item.basicOverhead.length).toFixed(2)}%`}
                        size="small"
                        color={item.basicOverhead.reduce((sum, b) => sum + b.overhead, 0) / item.basicOverhead.length < 5 ? 'success' : 'warning'}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <SpeedIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Nested AsyncLocalStorage Overhead</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                This chart shows the overhead when using nested AsyncLocalStorage contexts 
                (one ALS context inside another). This represents more complex scenarios 
                where multiple layers of context are needed.
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>What is "Nested ALS"?</strong> When you have one AsyncLocalStorage.run() 
                call inside another, creating multiple layers of context.
              </Alert>
              {performanceData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Key Findings:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {performanceData.slice(0, 3).map((item, index) => (
                      <Chip
                        key={index}
                        label={`${item.version}: +${(item.nestedOverhead.reduce((sum, b) => sum + b.overhead, 0) / item.nestedOverhead.length).toFixed(2)}%`}
                        size="small"
                        color="error"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Advanced Distributed Tests Section */}
      <Typography variant="h5" gutterBottom sx={{ color: '#6750a4', mb: 3 }}>
        Advanced Distributed System Tests
      </Typography>
      <Typography variant="body1" paragraph sx={{ mb: 3 }}>
        These tests measure AsyncLocalStorage performance in complex, real-world distributed applications. 
        They simulate production scenarios with multiple processes, worker threads, and high concurrency.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <HubIcon sx={{ color: '#6750a4', marginRight: 1 }} />
                <Typography variant="h6">Distributed System Performance</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                This chart shows AsyncLocalStorage performance in distributed scenarios including worker threads, 
                cluster mode, and multi-tenant applications.
              </Typography>
              {performanceData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Versions tested:</strong> {performanceData.map(d => d.version).join(', ')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={1} sx={{ p: 3, backgroundColor: '#fff3e0' }}>
        <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
          <WarningIcon sx={{ color: '#f57c00', marginRight: 1 }} />
          <Typography variant="h6" sx={{ color: '#e65100' }}>
            Performance Results
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Performance data is loaded from benchmark results. The charts above display 
          actual overhead measurements across different Node.js versions and test scenarios.
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Error loading data: {error}
            </Alert>
          )}
        </Typography>
      </Paper>
    </Box>
  )
}

export default Performance
