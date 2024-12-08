import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Fade,
  Zoom,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Card,
  CardContent,
  Button,
  Stack,
  Divider,
  Tooltip,
  Switch,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  LocalHospital as SickIcon,
  Event as EventIcon,
  School as TrainingIcon,
  Pending as PendingIcon,
  EventAvailable as LeaveIcon,
  HelpOutline as HelpIcon,
  PlayCircleOutline as QuickActionIcon,
  Celebration as CelebrationIcon,
  Assignment as TaskIcon,
  Assessment as ReportIcon,
  Group as StaffIcon,
  AccountBalance as ComplianceIcon,
  Forum as CommunicationIcon,
  ArrowForward as ArrowIcon,
  FilterList as FilterIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { format, isAfter, isBefore, startOfDay, addDays, parseISO } from 'date-fns';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useTraining } from '../../contexts/TrainingContext';
import { useTask } from '../../contexts/TaskContext';
import { useSupervision } from '../../contexts/SupervisionContext';
import { useCompliance } from '../../contexts/ComplianceContext';
import { useUsers } from '../../contexts/UserContext';
import { useSickness } from '../../contexts/SicknessContext';
import { useLeave } from '../../contexts/LeaveContext';
import { useGamification } from '../../contexts/GamificationContext';
import LeaderboardSection from '../Dashboard/LeaderboardSection';

import { F2F_COURSES, TRAINING_COURSES } from '../../utils/courseConstants';

type ColorType = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

interface DashboardItem {
  title: string;
  icon: JSX.Element;
  stats: string;
  color: ColorType;
  alerts?: {
    label: string;
    count: number;
    color: ColorType;
  }[];
  path: string;
  actionableCounts?: number[];
}

const toDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val.toDate) return val.toDate();
  return parseISO(val);
};

const StaffDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const { userData } = useAuth();
  const { trainingRecords } = useTraining();
  const { tasks } = useTask();
  const { supervisions } = useSupervision();
  const { staffCompliance } = useCompliance();
  const { sicknessRecords, getTriggerStatus } = useSickness();
  const { leaveRequests, leaveEntitlement } = useLeave();
  const { userStats } = useGamification();
  const { users } = useUsers();

  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Basic user and site info
  const site = userData?.site || 'Not assigned';
  const roles = userData?.roles || [];

  // Compute various stats and actionable items
  const today = startOfDay(new Date());
  const thirtyDaysFromNow = addDays(today, 30);

  // Training calculations
  const userTrainingRecords = useMemo(() => {
    if (!userData) return [];
    return trainingRecords.filter(r => r.staffId === userData.id);
  }, [trainingRecords, userData]);

  const trainingOnly = userTrainingRecords.filter(r => TRAINING_COURSES.includes(r.courseTitle));
  const f2fOnly = userTrainingRecords.filter(r => F2F_COURSES.includes(r.courseTitle));

  const expiredTraining = trainingOnly.filter(record => {
    if (!record.expiryDate) return false;
    return isBefore(toDate(record.expiryDate), today);
  });

  const expiredF2F = f2fOnly.filter(record => {
    if (!record.expiryDate) return false;
    return isBefore(toDate(record.expiryDate), today);
  });

  const upcomingTraining = trainingOnly.filter(record => {
    if (!record.expiryDate) return false;
    const expiry = toDate(record.expiryDate);
    return isAfter(expiry, today) && isBefore(expiry, thirtyDaysFromNow) && !record.isManuallyScheduled;
  });

  const upcomingF2F = f2fOnly.filter(record => {
    if (!record.expiryDate) return false;
    const expiry = toDate(record.expiryDate);
    return isAfter(expiry, today) && isBefore(expiry, thirtyDaysFromNow) && !record.isManuallyScheduled;
  });

  const trainingRate = trainingOnly.length > 0 
    ? ((trainingOnly.length - expiredTraining.length) / trainingOnly.length) * 100 
    : 100;
  const f2fRate = f2fOnly.length > 0
    ? ((f2fOnly.length - expiredF2F.length) / f2fOnly.length) * 100
    : 100;

  // Tasks assigned to user
  const userTasks = useMemo(() => {
    if (!userData) return [];
    return tasks.filter(task => task.assignedTo === userData.id && task.status !== 'completed');
  }, [tasks, userData]);

  // Supervisions scheduled for user
  const userSupervisions = useMemo(() => {
    if (!userData) return [];
    return supervisions
      .filter(s => s.staffId === userData.id && s.status === 'scheduled')
      .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  }, [supervisions, userData]);

  // Sickness data
  const userSickness = useMemo(() => {
    if (!userData) return null;
    const userRecords = sicknessRecords.filter(r => r.staffId === userData.id);
    const currentSickness = userRecords.find(r => r.status === 'current');
    const needingReview = userRecords.filter(r => r.status === 'review');
    const triggerStatus = getTriggerStatus(userData.id);

    return {
      currentSickness,
      needingReviewCount: needingReview.length,
      trigger: triggerStatus,
    };
  }, [sicknessRecords, userData, getTriggerStatus]);

  // Leave data
  const userLeave = useMemo(() => {
    if (!userData) return { pending: 0, upcoming: 0 };
    const userRequests = leaveRequests.filter(req => req.userId === userData.id);
    const pending = userRequests.filter(req => req.status === 'pending').length;
    const upcoming = userRequests.filter(req => req.status === 'approved' && isAfter(parseISO(req.startDate), today)).length;

    return { pending, upcoming };
  }, [leaveRequests, userData]);

  // Compliance checks
  const complianceAlerts = useMemo(() => {
    if (!staffCompliance) return 0;
    return Object.values(staffCompliance).filter((val: any) => val.status === 'expired' || val.status === 'missing').length;
  }, [staffCompliance]);

  // Quick Actions for Staff
  const quickActions = [
    {
      label: 'Request Leave',
      path: '/leave/request',
      icon: <LeaveIcon />,
    },
    {
      label: 'View Rota',
      path: '/rota',
      icon: <EventIcon />,
    },
    {
      label: 'Upload Training Docs',
      path: '/training/upload',
      icon: <TrainingIcon />,
    },
    {
      label: 'Compliance Dashboard',
      path: '/compliance',
      icon: <ComplianceIcon />,
    },
    {
      label: 'Communication Board',
      path: '/communications',
      icon: <CommunicationIcon />,
    },
  ];

  // Main dashboard items for staff
  const dashboardItems: DashboardItem[] = [
    {
      title: 'Training',
      icon: <TrainingIcon sx={{ fontSize: 40 }} />,
      stats: `${expiredTraining.length} Expired, ${upcomingTraining.length} Due Soon`,
      color: 'warning',
      alerts: [
        { label: 'Expired', count: expiredTraining.length, color: 'error' },
        { label: 'Due Soon', count: upcomingTraining.length, color: 'warning' },
      ],
      path: '/training',
      actionableCounts: [expiredTraining.length, upcomingTraining.length],
    },
    {
      title: 'F2F Sessions',
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      stats: `${expiredF2F.length} Expired, ${upcomingF2F.length} Due Soon`,
      color: 'warning',
      alerts: [
        { label: 'Expired', count: expiredF2F.length, color: 'error' },
        { label: 'Due Soon', count: upcomingF2F.length, color: 'warning' },
      ],
      path: '/training/f2f',
      actionableCounts: [expiredF2F.length, upcomingF2F.length],
    },
    {
      title: 'Leave Requests',
      icon: <LeaveIcon sx={{ fontSize: 40 }} />,
      stats: `${userLeave.pending} Pending, ${userLeave.upcoming} Upcoming`,
      color: 'primary',
      alerts: userLeave.pending > 0 ? [
        { label: 'Pending', count: userLeave.pending, color: 'warning' },
      ] : undefined,
      path: '/leave',
      actionableCounts: [userLeave.pending],
    },
    {
      title: 'Tasks',
      icon: <TaskIcon sx={{ fontSize: 40 }} />,
      stats: `${userTasks.length} Tasks Assigned`,
      color: 'info',
      path: '/tasks',
      actionableCounts: [userTasks.length],
    },
    {
      title: 'Sickness',
      icon: <SickIcon sx={{ fontSize: 40 }} />,
      stats: `${userSickness?.currentSickness ? 'Currently Sick' : 'No Current Sickness'}`,
      color: 'error',
      alerts: userSickness?.needingReviewCount
        ? [{ label: 'Need Review', count: userSickness?.needingReviewCount, color: 'warning' }]
        : undefined,
      path: '/sickness',
      actionableCounts: [
        userSickness?.currentSickness ? 1 : 0, 
        userSickness?.needingReviewCount || 0, 
        userSickness?.trigger.isNearingTrigger ? 1 : 0
      ],
    },
    {
      title: 'Compliance',
      icon: <ComplianceIcon sx={{ fontSize: 40 }} />,
      stats: complianceAlerts > 0 ? `${complianceAlerts} Issues` : 'All Good',
      color: complianceAlerts > 0 ? 'error' : 'success',
      path: '/compliance',
      actionableCounts: [complianceAlerts],
    },
    {
      title: 'Rota',
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      stats: 'View Your Shifts',
      color: 'secondary',
      path: '/rota',
      actionableCounts: [],
    },
    {
      title: 'Supervisions',
      icon: <StaffIcon sx={{ fontSize: 40 }} />,
      stats: `${userSupervisions.length} Scheduled`,
      color: 'primary',
      path: '/supervision',
      actionableCounts: [userSupervisions.length],
    },
    {
      title: 'Communications',
      icon: <CommunicationIcon sx={{ fontSize: 40 }} />,
      stats: 'View Messages',
      color: 'info',
      path: '/communications',
      actionableCounts: [], // Always accessible
    },
  ];

  // Filter dashboard items in focus mode: only show if any actionableCounts > 0
  const visibleDashboardItems = useMemo(() => {
    if (!focusMode) return dashboardItems;
    return dashboardItems.filter(item => 
      item.actionableCounts && item.actionableCounts.some(count => count > 0)
    );
  }, [focusMode, dashboardItems]);

  if (!userData) return null;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', fontSize: '1rem' }}>
      {/* Top Controls: Focus Mode and Help */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2">Focus Mode</Typography>
          <Switch checked={focusMode} onChange={() => setFocusMode(!focusMode)} />
        </Stack>
        <Tooltip title="Need help?">
          <IconButton onClick={() => navigate('/help')}>
            <HelpIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Welcome & Gamification Section */}
      <Fade in timeout={800}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 4, 
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 3,
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  Welcome back, {userData?.name?.split(' ')[0]}! 👋
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon />
                  <Typography variant="subtitle1">
                    {site}
                  </Typography>
                </Box>
                <Tooltip title="Filter data">
                  <IconButton>
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="subtitle1" gutterBottom>
                {expiredTraining.length + expiredF2F.length + (userSickness?.needingReviewCount || 0) > 0
                  ? `${expiredTraining.length + expiredF2F.length + (userSickness?.needingReviewCount || 0)} items need attention`
                  : 'Everything looks good! 🎉'}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={trainingRate}
                sx={{ 
                  mt: 2, 
                  height: 10, 
                  borderRadius: 5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    bgcolor: trainingRate === 100 
                      ? 'success.main'
                      : trainingRate >= 80
                      ? 'primary.main'
                      : 'warning.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ position: 'relative', p: 2, textAlign: 'center' }}>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.common.white, 0.1),
                    p: 2,
                  }}
                >
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ fontWeight: 'bold' }}
                  >
                    {Math.round(trainingRate)}%
                  </Typography>
                  {trainingRate >= 90 && (
                    <CelebrationIcon 
                      sx={{ 
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        color: theme.palette.warning.light,
                        animation: 'bounce 1s infinite',
                      }} 
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Training Completion Rate
                </Typography>

                {/* Gamification Info */}
                {!focusMode && userStats && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Level {userStats.rank}
                    </Typography>
                    <Typography variant="body2">
                      {userStats.points} XP
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(userStats.points, 100)}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: 'info.main',
                        },
                      }}
                    />
                    {userStats.achievements && userStats.achievements.length > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {userStats.achievements.slice(0, 3).map((badge) => (
                          <Chip
                            key={badge.id}
                            label={badge.title}
                            icon={<CheckCircleIcon />}
                            color="primary"
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      {/* Quick Actions at the Top */}
      <Card sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <QuickActionIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Quick Actions
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2} direction="row" flexWrap="wrap" gap={2}>
          {quickActions.map((action, i) => (
            <Fade in timeout={300} style={{ transitionDelay: `${i * 100}ms` }} key={action.label}>
              <Button
                variant="contained"
                startIcon={action.icon}
                onClick={() => navigate(action.path)}
                sx={{
                  textTransform: 'none',
                  borderRadius: 3,
                  bgcolor: theme.palette.primary.main,
                  fontWeight: 'bold',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.8),
                  },
                }}
              >
                {action.label}
              </Button>
            </Fade>
          ))}
        </Stack>
      </Card>

      {/* Main Dashboard Sections */}
      <Grid container spacing={3}>
        {visibleDashboardItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
                bgcolor: alpha(theme.palette[item.color].main, 0.05),
                borderRadius: 3,
              }}
              onClick={() => navigate(item.path)}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ color: `${item.color}.main` }}>
                      {item.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{item.title}</Typography>
                  </Box>
                  <Typography variant="body1" color="textSecondary">
                    {item.stats}
                  </Typography>
                  {item.alerts && (
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {item.alerts.map((alert, i) => (
                        <Chip
                          key={i}
                          label={`${alert.count} ${alert.label}`}
                          color={alert.color}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Leaderboard and Gamification (hidden in focus mode) */}
      {!focusMode && (
        <Box sx={{ mt: 3 }}>
          <LeaderboardSection />
        </Box>
      )}

      {/* Additional Sections like recent communications, messages, etc. can be added here */}

      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </Box>
  );
};

export default StaffDashboard;
