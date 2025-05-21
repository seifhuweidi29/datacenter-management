import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Paper, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import LeaderboardIcon from '@mui/icons-material/Leaderboard'; // Material UI icons
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const DataCenterSelection = () => {
  const [datacenters, setDatacenters] = useState([]);
  const [loading, setLoading] = useState(true);  // Loading state to show spinner while fetching data
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDataCenters = async () => {
      try {
        const token = localStorage.getItem('access_token');

        if (!token) {
          // Use window.location for authentication redirects
          window.location.href = '/login';
          return;
        }

        // Use axios directly for better performance
        const response = await axios.get(`${API_URL}/datacenters/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setDatacenters(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching datacenters:', err);
        setError('Failed to load datacenters. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchDataCenters();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{
      padding: 3,
      bgcolor: '#f5f5f5',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <Typography variant="h4" sx={{
        marginBottom: 3,
        textAlign: 'center',
        color: '#007bff',
        fontWeight: 600
      }}>
        Select Datacenter
      </Typography>

      {datacenters.length === 0 ? (
        <Typography variant="body1" sx={{ py: 3, color: '#007bff' }}>
          No datacenters found. Please contact your administrator.
        </Typography>
      ) : (
        <Grid container spacing={3} justifyContent="center">
          {datacenters.map((datacenter) => (
            <Grid item xs={12} sm={6} md={4} key={datacenter.id}>
              <Paper
                sx={{
                  padding: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: 2,
                  borderRadius: 3,
                  backgroundColor: '#ffffff',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 4,
                  },
                }}
              >
                <LeaderboardIcon sx={{
                  fontSize: 50,
                  marginBottom: 2,
                  color: '#007bff',
                  transition: 'color 0.2s ease'
                }} />
                <Typography variant="h6" sx={{
                  marginBottom: 2,
                  textAlign: 'center',
                  color: '#007bff',
                  fontWeight: 500
                }}>
                  {datacenter.name}
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  component={Link}
                  to={`/datacenter/${datacenter.id}`}
                  sx={{
                    padding: '12px 24px',
                    bgcolor: '#00c853',
                    color: '#ffffff',
                    boxShadow: 2,
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: '#00b037',
                      transform: 'translateY(-1px)',
                      boxShadow: 4
                    }
                  }}
                >
                  Select
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default DataCenterSelection;
