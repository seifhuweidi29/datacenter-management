import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Paper, Grid, Alert } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import LeaderboardIcon from '@mui/icons-material/Leaderboard'; // Material UI icons
import { datacenters } from '../api';

const DataCenterSelection = () => {
  const [datacentersList, setDatacenters] = useState([]);
  const [loading, setLoading] = useState(true);  // Loading state to show spinner while fetching data
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const MAX_RETRIES = 3;

  const fetchDataCenters = async () => {
    try {
      const data = await datacenters.list();
      if (data && data.length > 0) {
        setDatacenters(data);
        setError(null);
      } else {
        setError('No datacenters available. Please contact your administrator.');
      }
    } catch (err) {
      console.error('Error fetching datacenters:', err);

      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }

      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchDataCenters, 1000); // Retry after 1 second
        return;
      }

      setError('Failed to load datacenters. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDataCenters();
  }, [navigate]);

  const handleRetry = () => {
    setRetryCount(0);
    setLoading(true);
    fetchDataCenters();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} thickness={4} />
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

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, width: '100%', maxWidth: 600 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={3} justifyContent="center">
        {datacentersList.map((datacenter) => (
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
    </Box>
  );
};

export default DataCenterSelection;
