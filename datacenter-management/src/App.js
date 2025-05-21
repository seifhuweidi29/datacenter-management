import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DataCenterSelection from './components/DatacenterSelection';
import DataCenter from './components/Datacenter';
import Navbar from './components/NavBar';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status at load time
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage events (logout in another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'access_token') {
        checkAuth();
      }
    });

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // Handle page load with auth check
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Custom auth route component that doesn't use navigate() directly
  const AuthRoute = ({ element }) => {
    return isAuthenticated ? element : <Navigate to="/login" replace />;
  };

  // Custom login route that checks authentication without navigation
  const LoginRoute = () => {
    if (isAuthenticated) {
      // If user is already logged in and tries to access /login,
      // redirect to datacenters page
      return <Navigate to="/datacenters" replace />;
    }
    return <Login />;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        <Routes>
          {/* Root route */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/datacenters" replace /> : <LoginRoute />} />

          {/* Login route */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Protected routes */}
          <Route path="/datacenters" element={<AuthRoute element={<DataCenterSelection />} />} />
          <Route path="/datacenter/:datacenterId" element={<AuthRoute element={<DataCenter />} />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;