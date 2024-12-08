import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  LinearProgress,
  Fade,
  Zoom,
  Divider,
  Switch,
  Paper,
} from '@mui/material';
import {
  Group as StaffIcon,
  School as TrainingIcon,
  Assignment as TaskIcon,
  Event as RotaIcon,
  Assessment as ReportIcon,
  LocalHospital as SickIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowIcon,
  LocationOn as SiteIcon,
  EventAvailable as LeaveIcon,
  FilterList as FilterIcon,
  HelpOutline as HelpIcon,
  PlayCircleOutline as QuickActionIcon,
  Celebration as CelebrationIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTraining } from '../../contexts/TrainingContext';
import { useSickness } from '../../contexts/SicknessContext';
import { useTask } from '../../contexts/TaskContext';
import { useUsers } from '../../contexts/UserContext';
import { useLeave } from '../../contexts/LeaveContext';
import { useGamification } from '../../contexts/GamificationContext'; 
import { alpha, useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import LeaderboardSection from '../Dashboard/LeaderboardSection';

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
  onClick: () => void;
  // We'll add a field to help determine if it's actionable
  actionableCounts?: number[];
}

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { userData } = useAuth();
  const { trainingRecords } = useTraining();
  const { sicknessRecords, getTriggerStatus } = useSickness();
  const { tasks } = useTask();
  const { users } = useUsers();
  const { leaveRequests } = useLeave();
  const { userStats } = useGamification(); // Get gamification stats (points, rank, achievements)

  const [selectedSite, setSelectedSite] = useState<string>('');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  useEffect(() => {
    if (userData?.site) {
      setSelectedSite(userData.site);
    }
  }, [userData]);

  const siteStats = useMemo(() => {
    if (!selectedSite) return null;

    const siteRecords = trainingRecords.filter(record => record.siteId === selectedSite);
    const totalStaff = new Set(siteRecords.map(record => record.staffId)).size;
    const expiredCount = siteRecords.filter(record => record.status === 'expired').length;
    const expiringCount = siteRecords.filter(record => record.status === 'expiring').length;
    const completionRate = totalStaff > 0 
      ? ((totalStaff - (expiredCount + expiringCount)) / totalStaff) * 100
      : 100;

    const siteSicknessRecords = sicknessRecords.filter(record => record.site === selectedSite);
    const currentSickness = siteSicknessRecords.filter(record => record.status === 'current');
    const needingReview = siteSicknessRecords.filter(record => record.status === 'review');

    const siteStaff = users.filter(user => user.site === selectedSite);
    const staffWithTriggers = siteStaff.filter(user => {
      const status = getTriggerStatus(user.id);
      return status.isNearingTrigger;
    });

    const pendingLeaveRequests = leaveRequests.filter(request => 
      request.site === selectedSite && request.status === 'pending'
    );

    const siteTasks = tasks.filter(task => 
      task.site === selectedSite && 
      task.category === 'sickness' &&
      task.status !== 'completed'
    );

    return {
      totalStaff,
      expiredCount,
      expiringCount,
      completionRate: Math.round(completionRate),
      currentSicknessCount: currentSickness.length,
      reviewCount: needingReview.length,
      triggerCount: staffWithTriggers.length,
      sicknessTasks: siteTasks,
      pendingLeaveCount: pendingLeaveRequests.length,
    };
  }, [trainingRecords, selectedSite, sicknessRecords, users, getTriggerStatus, tasks, leaveRequests]);

  const recentTasks = useMemo(() => {
    if (!siteStats?.sicknessTasks) return [];
    return siteStats.sicknessTasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [siteStats]);

  const quickActions = [
    {
      label: 'Add Training',
      path: '/training/add',
      icon: <TrainingIcon />,
    },
    {
      label: 'Approve Leave',
      path: '/leave',
      icon: <LeaveIcon />,
    },
    {
      label: 'View Reports',
      path: '/reports',
      icon: <ReportIcon />,
    },
  ];

  // Dashboard items now have actionableCounts array to help determine if they should be shown in focus mode
  const dashboardItems: DashboardItem[] = [
    {
      title: 'Leave Requests',
      icon: <LeaveIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.pendingLeaveCount || 0} Pending Requests`,
      color: 'warning',
      onClick: () => navigate('/leave'),
      actionableCounts: [siteStats?.pendingLeaveCount || 0],
    },
    {
      title: 'Staff Sickness',
      icon: <SickIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.currentSicknessCount || 0} Current Cases`,
      color: 'error',
      alerts: [
        {
          label: 'Need Review',
          count: siteStats?.reviewCount || 0,
          color: 'warning',
        },
        {
          label: 'Near Triggers',
          count: siteStats?.triggerCount || 0,
          color: 'error',
        },
      ],
      onClick: () => navigate('/sickness'),
      actionableCounts: [
        siteStats?.currentSicknessCount || 0, 
        siteStats?.reviewCount || 0, 
        siteStats?.triggerCount || 0
      ],
    },
    {
      title: 'Staff Management',
      icon: <StaffIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.totalStaff || 0} Staff Members`,
      color: 'primary',
      onClick: () => navigate('/users'),
      actionableCounts: [siteStats?.totalStaff || 0], 
      // Assuming staff management is always somewhat actionable if there's staff
    },
    {
      title: 'Training Overview',
      icon: <TrainingIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.completionRate || 0}% Completion Rate`,
      color: 'success',
      alerts: siteStats?.expiredCount
        ? [
            {
              label: 'Expired',
              count: siteStats.expiredCount,
              color: 'error',
            },
            {
              label: 'Expiring',
              count: siteStats.expiringCount,
              color: 'warning',
            },
          ]
        : undefined,
      onClick: () => navigate('/training'),
      actionableCounts: [
        siteStats?.expiredCount || 0,
        siteStats?.expiringCount || 0
      ],
    },
    {
      title: 'Task Management',
      icon: <TaskIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.sicknessTasks.length || 0} Sickness Tasks`,
      color: 'info',
      onClick: () => navigate('/tasks'),
      actionableCounts: [siteStats?.sicknessTasks.length || 0],
    },
    {
      title: 'Rota Management',
      icon: <RotaIcon sx={{ fontSize: 40 }} />,
      stats: 'View Schedule',
      color: 'warning',
      onClick: () => navigate('/rota'),
      actionableCounts: [], 
      // Rota might not have a count, but let's leave it. If we consider no action means we can always view schedule?
      // If we strictly hide non-action items in focus mode, leave no actionable items means hide in focus mode
    },
  ];

  // Filter dashboard items in focus mode: only show items with any actionableCounts > 0
  const visibleDashboardItems = useMemo(() => {
    if (!focusMode) return dashboardItems;
    return dashboardItems.filter(item => 
      item.actionableCounts && item.actionableCounts.some(count => count > 0)
    );
  }, [focusMode, dashboardItems]);

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

      {/* Welcome & Training Completion Section */}
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
                  <SiteIcon />
                  <Typography variant="subtitle1">
                    {selectedSite}
                  </Typography>
                </Box>
                <Tooltip title="Filter data">
                  <IconButton>
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="subtitle1" gutterBottom>
                {siteStats && (siteStats.expiredCount + siteStats.expiringCount + siteStats.currentSicknessCount > 0) ? (
                  `${(siteStats.expiredCount || 0) + (siteStats.expiringCount || 0) + (siteStats.currentSicknessCount || 0)} items need attention`
                ) : (
                  'All staff training and sickness metrics look good! 🎉'
                )}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={siteStats?.completionRate || 0}
                sx={{ 
                  mt: 2, 
                  height: 10, 
                  borderRadius: 5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    bgcolor: siteStats?.completionRate === 100 
                      ? 'success.main'
                      : (siteStats?.completionRate || 0) >= 80
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
                    {siteStats?.completionRate || 0}%
                  </Typography>
                  {siteStats && siteStats.completionRate >= 90 && (
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
                  Overall Training Completion Rate
                </Typography>
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
              onClick={item.onClick}
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

      {/* Leaderboard and Gamification (hide in focus mode) */}
      {!focusMode && (
        <Box sx={{ mt: 3 }}>
          <LeaderboardSection />
          {userStats && (
            <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Your Progress
              </Typography>
              <Typography variant="body1">Level: {userStats.rank}</Typography>
              <Typography variant="body2">
                Points: {userStats.points}
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
            </Paper>
          )}
        </Box>
      )}

      {/* Recent Sickness Tasks (hidden in focus mode) */}
      {!focusMode && recentTasks.length > 0 && (
        <Card sx={{ mt: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Recent Sickness Tasks
            </Typography>
            <List>
              {recentTasks.map((task) => (
                <ListItem key={task.id}>
                  <ListItemIcon>
                    {task.priority === 'high' ? (
                      <WarningIcon color="error" />
                    ) : task.status === 'completed' ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <TaskIcon color="primary" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={`Due: ${format(task.dueDate, 'PPP')} • Priority: ${task.priority}`}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="View Details">
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}`);
                        }}
                      >
                        <ArrowIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

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

export default ManagerDashboard;
