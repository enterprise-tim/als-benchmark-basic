import React from 'react'
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  Help as HelpIcon,
  Code as CodeIcon,
  DataObject as DataIcon,
} from '@mui/icons-material'
import Overview from './components/Overview'
import Performance from './components/Performance'
import Memory from './components/Memory'
import Recommendations from './components/Recommendations'
import VersionAnalysis from './components/VersionAnalysis'

// Navigation component that handles the tabs
function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Map routes to tab indices
  const getTabValue = () => {
    const path = location.pathname
    if (path === '/' || path === '/overview') return 0
    if (path === '/performance') return 1
    if (path === '/memory') return 2
    if (path === '/version-analysis') return 3
    if (path === '/recommendations') return 4
    return 0
  }

  const handleTabChange = (event, newValue) => {
    const routes = ['/overview', '/performance', '/memory', '/version-analysis', '/recommendations']
    navigate(routes[newValue])
  }

  return (
    <Paper elevation={0} sx={{ backgroundColor: '#fef7ff', borderBottom: '1px solid #e8def8' }}>
      <Container>
        <Tabs
          value={getTabValue()}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              color: '#49454f',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: 48,
              '&.Mui-selected': {
                color: '#6750a4',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#6750a4',
            },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Performance" />
          <Tab label="Memory" />
          <Tab label="Version Analysis" />
          <Tab label="Recommendations" />
        </Tabs>
      </Container>
    </Paper>
  )
}

function App() {
  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        {/* Top Navigation */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#6750a4', fontWeight: 600 }}>
              AsyncLocalStorage Benchmarks
            </Typography>
            <Button color="inherit" href="https://github.com/tobrien/async-node-stats" target="_blank">
              GitHub
            </Button>
          </Toolbar>
        </AppBar>

        {/* Page Navigation */}
        <Navigation />

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/version-analysis" element={<VersionAnalysis />} />
            <Route path="/recommendations" element={<Recommendations />} />
            {/* Redirect any unknown routes to overview */}
            <Route path="*" element={<Overview />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  )
}

export default App
