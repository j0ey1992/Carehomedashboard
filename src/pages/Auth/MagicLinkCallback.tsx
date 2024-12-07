import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const MagicLinkCallback: React.FC = () => {
  const navigate = useNavigate();
  const { handleMagicLinkSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSignIn = async () => {
      try {
        await handleMagicLinkSignIn();
        navigate('/'); // Redirect to home page after successful sign in
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sign in');
      }
    };

    handleSignIn();
  }, [handleMagicLinkSignIn, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
        </Alert>
      ) : (
        <>
          <CircularProgress />
          <Typography variant="h6">
            Completing sign in...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default MagicLinkCallback;
