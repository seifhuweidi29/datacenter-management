import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import theme from './theme';
import Login from './components/Login';
import DatacenterSelection from './components/DatacenterSelection';
import Datacenter from './components/Datacenter';
import NavBar from './components/NavBar';
import { setNavigateCallback } from './api';

// Navigation setup component
const NavigationSetup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigateCallback(navigate);
  }, [navigate]);

  return null;
};

// Page transition wrapper
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

// Loading component
const LoadingScreen = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      zIndex: 9999,
    }}
  >
    <CircularProgress size={60} thickness={4} />
  </Box>
);

// App content component that uses Router hooks
const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/datacenters"
          element={
            <PageTransition>
              <NavBar>
                <DatacenterSelection />
              </NavBar>
            </PageTransition>
          }
        />
        <Route
          path="/datacenter/:id"
          element={
            <PageTransition>
              <NavBar>
                <Datacenter />
              </NavBar>
            </PageTransition>
          }
        />
        <Route
          path="/"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <NavigationSetup />
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;