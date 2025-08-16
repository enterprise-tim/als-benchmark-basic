import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'

const Recommendations = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#6750a4', mb: 3 }}>
        Recommendations
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <CheckCircleIcon sx={{ color: '#4caf50', marginRight: 1 }} />
                <Typography variant="h6">Performance Recommendations</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Use single AsyncLocalStorage contexts when possible"
                    secondary="Avoid nested contexts to minimize overhead"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Monitor memory usage in production"
                    secondary="Watch for memory leaks in long-running processes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Test across Node.js versions"
                    secondary="Performance characteristics vary significantly"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <WarningIcon sx={{ color: '#ff9800', marginRight: 1 }} />
                <Typography variant="h6">Watch Out For</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Nested AsyncLocalStorage contexts"
                    secondary="Can cause 50-100%+ performance overhead"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Large context objects"
                    secondary="Memory overhead scales with object size"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Rapid context switching"
                    secondary="High-frequency context changes can impact performance"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3, backgroundColor: '#e3f2fd' }}>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
              <InfoIcon sx={{ color: '#1976d2', marginRight: 1 }} />
              <Typography variant="h6" sx={{ color: '#1565c0' }}>
                Best Practices Summary
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              AsyncLocalStorage is excellent for request tracing, user context, and distributed tracing, 
              but should be used thoughtfully. Single contexts provide minimal overhead (0-5%), while 
              nested contexts can significantly impact performance. Always test in your specific use case 
              and monitor both performance and memory usage.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Recommendations
