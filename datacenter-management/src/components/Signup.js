import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Box, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AccountCircle, Email, Lock } from '@mui/icons-material';  // Material UI icons
import api from '../api';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Call to your API endpoint (replace api.post with your actual API logic)
      await api.post('/signup/', { username, email, password });
      navigate('/login');  // Redirect to login after successful signup
    } catch (err) {
      setError('Username or email already exists.');
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login');  // Redirect to the login page
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Sign Up
        </Typography>

        {error && <Typography color="error">{error}</Typography>}

        <form onSubmit={handleSignup}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountCircle />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            startIcon={<Lock />}
          >
            Sign Up
          </Button>
        </form>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" align="center">
            Already have an account?{' '}
            <Button onClick={handleLoginRedirect} color="primary">
              Log In
            </Button>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Signup;
