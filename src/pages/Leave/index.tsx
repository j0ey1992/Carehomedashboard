import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Paper,
  Stack,
  Alert,
  LinearProgress,
  useTheme,
  alpha,
  styled,
  Fade,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Event as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as AchievementIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import { LeaveRequestForm } from '../../components/Leave/LeaveRequestForm';
import { LeaveRequestList } from '../../components/Leave/LeaveRequestList';
import { useLeave } from '../../contexts/LeaveContext';
import { ActionButton } from '../../types';
import { format, isAfter, isBefore } from 'date-fns';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
  borderRadius: '16px',
  overflow: 'hidden',
}));

const LeavePage: React.FC = () => {
  const theme = useTheme();
  const { leaveEntitlement, leaveRequests, isLoading } = useLeave();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const stats = useMemo(() => {
    const today = new Date();
    const upcoming = leaveRequests.filter(request => 
      request.status === 'pending' && isAfter(new Date(request.startDate), today)
    );
    const approved = leaveRequests.filter(request => request.status === 'approved');
    const totalRequests = leaveRequests.length;

    return {
      upcoming: upcoming.length,
      approved: approved.length,
      totalRequests
    };
  }, [leaveRequests]);

  const actions: ActionButton[] = [
    {
      label: 'Request Leave',
      icon: <AddIcon />,
      onClick: () => setIsFormOpen(true),
      color: 'primary',
      variant: 'contained',
      tooltip: 'Create a new leave request'
    }
  ];

  const handleFormClose = () => {
    setIsFormOpen(false);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const renderSummaryCards = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} lg={3}>
        <StyledCard>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon color="primary" />
                <Typography variant="h6">Leave Balance</Typography>
              </Box>
              
              <Box sx={{ position: 'relative', pt: 2 }}>
                <Typography variant="h3" color="primary.main">
                  {leaveEntitlement?.remainingDays ?? 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  days remaining
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={((leaveEntitlement?.remainingDays ?? 0) / 
                    (leaveEntitlement?.totalEntitlement ?? 1)) * 100}
                  sx={{
                    mt: 1,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  }}
                />
              </Box>

              {leaveEntitlement?.carryForwardDays && leaveEntitlement.carryForwardDays > 0 && (
                <Alert 
                  severity="info" 
                  sx={{ 
                    borderRadius: '12px',
                    '& .MuiAlert-icon': { alignItems: 'center' }
                  }}
                >
                  {leaveEntitlement.carryForwardDays} carry forward days
                </Alert>
              )}
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <StyledCard>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon color="info" />
                <Typography variant="h6">Upcoming</Typography>
              </Box>
              
              <Typography variant="h3" color="info.main">
                {stats.upcoming}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                pending requests
              </Typography>
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <StyledCard>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">Approved</Typography>
              </Box>
              
              <Typography variant="h3" color="success.main">
                {stats.approved}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                approved requests
              </Typography>
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <StyledCard>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AchievementIcon color="warning" />
                <Typography variant="h6">Total</Typography>
              </Box>
              
              <Typography variant="h3" color="warning.main">
                {stats.totalRequests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total requests this year
              </Typography>
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Fade in timeout={800}>
        <div>
          <PageHeader
            title="Leave Management"
            subtitle={`You have ${leaveEntitlement?.remainingDays ?? 0} days of leave remaining`}
            actions={actions}
          />

          {renderSummaryCards()}

          {isLoading && (
            <LinearProgress 
              sx={{ 
                mt: 3, 
                borderRadius: 1,
                height: 6,
              }} 
            />
          )}

          <Box sx={{ mt: 4 }}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: '16px',
                bgcolor: 'background.paper',
                boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
              }}
            >
              <LeaveRequestList />
            </Paper>
          </Box>

          <Dialog
            open={isFormOpen}
            onClose={handleFormClose}
            maxWidth="md"
            fullWidth
            sx={{
              '& .MuiDialog-paper': {
                borderRadius: '16px',
              },
            }}
          >
            <DialogTitle sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              py: 2,
            }}>
              <Typography variant="h6">Request Leave</Typography>
              <IconButton
                onClick={handleFormClose}
                size="small"
                sx={{ color: 'inherit' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <LeaveRequestForm
                onSubmit={handleFormSuccess}
                onCancel={handleFormClose}
              />
            </DialogContent>
          </Dialog>

          <Fade in={showSuccess}>
            <Alert
              severity="success"
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                borderRadius: '12px',
                boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.15)}`,
                zIndex: 1400,
              }}
              onClose={() => setShowSuccess(false)}
            >
              Leave request submitted successfully!
            </Alert>
          </Fade>
        </div>
      </Fade>
    </Box>
  );
};

export default LeavePage;
