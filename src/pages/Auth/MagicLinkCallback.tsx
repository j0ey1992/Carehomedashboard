import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Alert, 
  Button, 
  useTheme, 
  alpha,
  Paper,
} from '@mui/material';
import { 
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const MagicLinkCallback: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { handleMagicLinkSignIn, loginWithMagicLink, userData } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get email from localStorage
    const storedEmail = window.localStorage.getItem('emailForSignIn');
    setEmail(storedEmail);

    const handleSignIn = async () => {
      try {
        await handleMagicLinkSignIn();
        // Successful sign in animation before redirect
        setLoading(false);
        setTimeout(() => {
          // Check user role and redirect accordingly
          if (userData?.role === 'admin' || userData?.role === 'manager') {
            navigate('/admindashboard');
          } else {
            navigate('/');
          }
        }, 1000);
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to sign in');
      }
    };

    handleSignIn();
  }, [handleMagicLinkSignIn, navigate, userData?.role]);

  const handleResendLink = async () => {
    if (!email) return;
    
    try {
      setLoading(true);
      setError(null);
      await loginWithMagicLink(email);
      setError('New magic link sent! Please check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(3),
        background: `radial-gradient(circle at 50% 50%,
                    ${alpha(theme.palette.primary.main, 0.15)},
                    ${alpha(theme.palette.background.default, 0.95)})`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: theme.spacing(4),
            borderRadius: theme.shape.borderRadius * 2,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress 
                  size={60}
                  sx={{
                    color: theme.palette.primary.main,
                    filter: 'drop-shadow(0 0 8px ${alpha(theme.palette.primary.main, 0.4)})',
                  }}
                />
                <Typography 
                  variant="h6"
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 600,
                  }}
                >
                  Completing sign in...
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Please wait while we verify your magic link
                </Typography>
              </Box>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert 
                  severity={error.includes('sent') ? 'success' : 'error'}
                  sx={{ 
                    borderRadius: theme.shape.borderRadius * 1.5,
                    '& .MuiAlert-icon': {
                      fontSize: '2rem',
                    },
                  }}
                >
                  {error}
                </Alert>

                {error.includes('expired') && email && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<RefreshIcon />}
                    onClick={handleResendLink}
                    sx={{
                      borderRadius: theme.shape.borderRadius * 1.5,
                      padding: theme.spacing(1.5),
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Resend Magic Link
                  </Button>
                )}

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<EmailIcon />}
                  onClick={() => navigate('/login')}
                  sx={{
                    borderRadius: theme.shape.borderRadius * 1.5,
                    padding: theme.spacing(1.5),
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Try Different Login Method
                </Button>

                <Button
                  variant="text"
                  color="inherit"
                  startIcon={<HomeIcon />}
                  onClick={() => navigate('/')}
                  sx={{
                    borderRadius: theme.shape.borderRadius * 1.5,
                    padding: theme.spacing(1.5),
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  Return to Home
                </Button>
              </Box>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Typography 
                  variant="h5"
                  sx={{
                    color: theme.palette.success.main,
                    fontWeight: 600,
                  }}
                >
                  Successfully signed in!
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Redirecting you to the {userData?.role === 'admin' || userData?.role === 'manager' ? 'admin dashboard' : 'main website'}...
                </Typography>
              </Box>
            </motion.div>
          )}
        </Paper>
      </motion.div>
    </Box>
  );
};

export default MagicLinkCallback;
