import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MemoryChart = ({ data, type = 'line', title, yAxisLabel, isLoading, error }) => {
  const chartRef = useRef(null);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <Typography color="error">Error loading chart data: {error}</Typography>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const chartData = {
    labels: data.map(item => item.version),
    datasets: [
      {
        label: 'Memory Overhead (KB)',
        data: data.map(item => {
          const avg = item.memoryOverhead.reduce((sum, m) => sum + Math.abs(m), 0) / item.memoryOverhead.length;
          return avg;
        }),
        borderColor: 'rgb(76, 175, 80)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1
      },
      {
        label: 'Memory Growth (KB)',
        data: data.map(item => {
          if (item.memoryGrowth && item.memoryGrowth.length > 0) {
            const avg = item.memoryGrowth.reduce((sum, g) => sum + Math.abs(g.growth), 0) / item.memoryGrowth.length;
            return avg;
          }
          return 0;
        }),
        borderColor: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        color: '#6750a4'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} KB`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Node.js Version',
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        title: {
          display: true,
          text: yAxisLabel || 'Memory Usage (KB)',
          font: {
            weight: 'bold'
          }
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, height: 500 }}>
      {type === 'line' ? (
        <Line ref={chartRef} data={chartData} options={options} />
      ) : (
        <Bar ref={chartRef} data={chartData} options={options} />
      )}
    </Paper>
  );
};

export default MemoryChart;
