import React, { ReactElement } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Container,
  Alert,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useSickness } from '../../contexts/SicknessContext';
import { useTask } from '../../contexts/TaskContext';
import { useUsers } from '../../contexts/UserContext';
import AdminSicknessPage from './AdminSicknessPage';
import ManagerSicknessPage from './ManagerSicknessPage';
import StaffSicknessPage from './StaffSicknessPage';

interface SicknessPageProps {
  className?: string;
}

const SicknessPage: React.FC<SicknessPageProps> = ({ className }): ReactElement => {
  const theme = useTheme();
  const { currentUser, userData, isAdmin, isSiteManager, isStaff, loading } = useAuth();
  const { sicknessRecords, loading: sicknessLoading, error: sicknessError } = useSickness();
  const { tasks, loading: tasksLoading } = useTask();
  const { users, loading: usersLoading } = useUsers();

  // Show loading state if any required data is still loading
  if (loading || sicknessLoading || tasksLoading || usersLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
        className={className}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show error state if there's an error
  if (sicknessError) {
    return (
      <Container maxWidth="lg" className={className}>
        <Alert 
          severity="error"
          sx={{ 
            mt: 3,
            bgcolor: alpha(theme.palette.error.main, 0.1),
          }}
        >
          <Typography variant="h6" gutterBottom>
            Error Loading Sickness Records
          </Typography>
          <Typography>
            {sicknessError}. Please try refreshing the page.
          </Typography>
        </Alert>
      </Container>
    );
  }

  // Show appropriate page based on user role
  if (!currentUser || !userData) {
    return (
      <Container maxWidth="lg" className={className}>
        <Alert 
          severity="warning"
          sx={{ 
            mt: 3,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
          }}
        >
          <Typography variant="h6" gutterBottom>
            Authentication Required
          </Typography>
          <Typography>
            Please log in to access sickness management.
          </Typography>
        </Alert>
      </Container>
    );
  }

  // Render role-specific page
  if (isAdmin) {
    return <AdminSicknessPage />;
  }

  if (isSiteManager) {
    return <ManagerSicknessPage />;
  }

  if (isStaff) {
    return <StaffSicknessPage />;
  }

  // Fallback for unknown role
  return (
    <Container maxWidth="lg" className={className}>
      <Alert 
        severity="error"
        sx={{ 
          mt: 3,
          bgcolor: alpha(theme.palette.error.main, 0.1),
        }}
      >
        <Typography variant="h6" gutterBottom>
          Access Denied
        </Typography>
        <Typography>
          Your user role does not have access to sickness management.
        </Typography>
      </Alert>
    </Container>
  );
};

export default SicknessPage;
