import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
      light: alpha('#2196f3', 0.1),
      dark: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
      light: alpha('#9c27b0', 0.1),
      dark: '#7b1fa2',
    },
    error: {
      main: '#f44336',
      light: alpha('#f44336', 0.1),
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: alpha('#ff9800', 0.1),
      dark: '#f57c00',
    },
    success: {
      main: '#4caf50',
      light: alpha('#4caf50', 0.1),
      dark: '#388e3c',
    },
    info: {
      main: '#03a9f4',
      light: alpha('#03a9f4', 0.1),
      dark: '#0288d1',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1.125rem',
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.1)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
          '&.MuiButton-contained': {
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.1)',
          },
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(33,150,243,0.3)',
          },
        },
        containedSecondary: {
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(156,39,176,0.3)',
          },
        },
        containedError: {
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(244,67,54,0.3)',
          },
        },
        containedWarning: {
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(255,152,0,0.3)',
          },
        },
        containedSuccess: {
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(76,175,80,0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 4,
          fontSize: '0.875rem',
          padding: '8px 12px',
        },
      },
    },
  },
});

export default theme;
