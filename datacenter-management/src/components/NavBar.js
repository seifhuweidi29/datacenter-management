import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import LoginIcon from '@mui/icons-material/Login';  // Login icon
import ExitToAppIcon from '@mui/icons-material/ExitToApp';  // Logout icon
import HomeIcon from '@mui/icons-material/Home';  // Datacenter Selection icon

const Navbar = ({ isAuthenticated, setIsAuthenticated }) => {
  const handleLogout = () => {
    // Clear tokens from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Update authentication state
    setIsAuthenticated(false);

    // Redirect to login page using standard HTML navigation
    // This avoids React Router security issues
    window.location.href = '/login';
  };

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Data Center Management
        </Typography>

        <Box>
          {isAuthenticated ? (
            <>
              <Button
                color="inherit"
                component={Link}
                to="/datacenters"
                startIcon={<HomeIcon />}
              >
                Datacenter Selection
              </Button>
              <Button
                color="inherit"
                onClick={handleLogout}
                startIcon={<ExitToAppIcon />}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                color="inherit"
                component={Link}
                to="/login"
                startIcon={<LoginIcon />}
              >
                Login
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
