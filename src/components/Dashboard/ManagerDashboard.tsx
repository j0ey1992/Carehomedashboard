// src/components/Dashboard/ManagerDashboard.tsx

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
  Divider,
  Switch,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
import { format, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import LeaderboardSection from '../Dashboard/LeaderboardSection';
import { TrainingRecord, Task } from '../../types';

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
  actionableCounts?: number[];
}

interface SiteStats {
  totalStaff: number;
  expiredCount: number;
  expiringCount: number;
  completionRate: number;
  trainingRates: {
    online: number;
    f2f: number;
    compliance: number;
  };
  currentSicknessCount: number;
  reviewCount: number;
  triggerCount: number;
  sicknessTasks: Task[];
  pendingLeaveCount: number;
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
  const { userStats } = useGamification();

  // Get manager's sites from userData
  const managerSites = userData?.sites || [];
  
  const [selectedSite, setSelectedSite] = useState<string>(managerSites[0] || '');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Update selectedSite when userData changes
  useEffect(() => {
    if (managerSites.length > 0 && !selectedSite) {
      setSelectedSite(managerSites[0]);
    }
  }, [managerSites, selectedSite]);

  // ADHD-friendly styles
  const adhd = {
    card: {
      transition: 'transform 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 6
      },
      border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    },
    focusHighlight: {
      '&:focus-within': {
        outline: `3px solid ${theme.palette.primary.main}`,
        outlineOffset: '2px'
      }
    },
    largeText: {
      fontSize: '1.1rem',
      lineHeight: 1.6
    },
    importantText: {
      fontWeight: 600
    }
  };

  // Site statistics calculation
  const siteStats = useMemo<SiteStats | null>(() => {
    if (!selectedSite) return null;

    const siteRecords = trainingRecords.filter(record => record.siteId === selectedSite);
    const totalStaff = new Set(siteRecords.map(record => record.staffId)).size;
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);

    // Separate records by type and apply weights
    const recordsByType = siteRecords.reduce((acc, record) => {
      const type = record.recordType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(record);
      return acc;
    }, {} as Record<string, typeof siteRecords>);

    // Weight definitions for different training categories
    const weights = {
      mandatory: 1.5, // Higher weight for mandatory training
      compliance: 1.2, // Important but not as critical as mandatory
      optional: 0.8, // Lower weight for optional training
    };

    // Calculate weighted completion rates
    const calculateWeightedRate = (records: typeof siteRecords) => {
      if (!records.length) return 100;

      let weightedSum = 0;
      let weightedTotal = 0;

      records.forEach((record) => {
        const weight = weights[record.statsCategory as keyof typeof weights] || 1;
        const isValid = record.expiryDate && isAfter(new Date(record.expiryDate), today);

        weightedTotal += weight;
        if (isValid) weightedSum += weight;
      });

      return (weightedSum / weightedTotal) * 100;
    };

    // Calculate rates for each type
    const trainingRates = {
      online: calculateWeightedRate(recordsByType.training || []),
      f2f: calculateWeightedRate(recordsByType.f2f || []),
      compliance: calculateWeightedRate(recordsByType.compliance || []),
    };

    // Overall weighted rate (40% training, 40% F2F, 20% compliance)
    const overallRate =
      trainingRates.online * 0.4 + trainingRates.f2f * 0.4 + trainingRates.compliance * 0.2;

    const expiredCount = siteRecords.filter(record => 
      record.expiryDate && isBefore(new Date(record.expiryDate), today)
    ).length;

    const expiringCount = siteRecords.filter(record =>
      record.expiryDate && 
      isAfter(new Date(record.expiryDate), today) &&
      isBefore(new Date(record.expiryDate), thirtyDaysFromNow)
    ).length;

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
    ) as Task[];

    return {
      totalStaff,
      expiredCount,
      expiringCount,
      completionRate: Math.round(overallRate),
      trainingRates: {
        online: Math.round(trainingRates.online),
        f2f: Math.round(trainingRates.f2f),
        compliance: Math.round(trainingRates.compliance)
      },
      currentSicknessCount: currentSickness.length,
      reviewCount: needingReview.length,
      triggerCount: staffWithTriggers.length,
      sicknessTasks: siteTasks,
      pendingLeaveCount: pendingLeaveRequests.length,
    };
  }, [trainingRecords, selectedSite, sicknessRecords, users, getTriggerStatus, tasks, leaveRequests]);

  // Recent tasks calculation
  const recentTasks = useMemo(() => {
    if (!siteStats?.sicknessTasks) return [];
    return siteStats.sicknessTasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [siteStats]);

  // Quick actions definition
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

  // Dashboard items definition wrapped in useMemo to fix dependency warning
  const dashboardItems = useMemo<DashboardItem[]>(() => [
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
    },
  ], [siteStats, navigate]);

  // Filter dashboard items for focus mode
  const visibleDashboardItems = useMemo(() => {
    if (!focusMode) return dashboardItems;
    return dashboardItems.filter(item => 
      item.actionableCounts && item.actionableCounts.some(count => count > 0)
    );
  }, [focusMode, dashboardItems]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
      {/* Top Controls: Site Selector, Focus Mode, and Help */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2, 
        gap: 3,
        p: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        borderRadius: 2,
        ...adhd.focusHighlight
      }}>
        {/* Site Selector */}
        <FormControl 
          sx={{ 
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
            },
          }}
        >
          <InputLabel id="site-select-label">Select Site</InputLabel>
          <Select
            labelId="site-select-label"
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            label="Select Site"
          >
            {managerSites.map((site) => (
              <MenuItem key={site} value={site}>{site}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Focus Mode and Help */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="body1" sx={adhd.importantText}>Focus Mode</Typography>
          <Switch 
            checked={focusMode} 
            onChange={() => setFocusMode(!focusMode)}
            sx={{ transform: 'scale(1.2)' }}
          />
          <Tooltip title="Need help?">
            <IconButton size="large">
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {selectedSite ? (
        <Box>
          {/* Welcome & Training Status Section */}
          <Fade in timeout={800}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 4, 
                mb: 4, 
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                borderRadius: 4,
                ...adhd.card,
                ...adhd.focusHighlight
              }}
            >
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: theme.palette.primary.main,
                        fontSize: '2rem'
                      }}
                    >
                      Welcome back, {userData?.name?.split(' ')[0]}! 👋
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SiteIcon />
                      <Typography variant="subtitle1" sx={adhd.importantText}>
                        {selectedSite}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Training Status Overview */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={adhd.importantText}>
                      Training Status
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', ...adhd.card }}>
                          <Typography variant="h6">
                            {Math.round(siteStats?.trainingRates.online || 0)}%
                          </Typography>
                          <Typography variant="body2">Online Training</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', ...adhd.card }}>
                          <Typography variant="h6">
                            {Math.round(siteStats?.trainingRates.f2f || 0)}%
                          </Typography>
                          <Typography variant="body2">F2F Training</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', ...adhd.card }}>
                          <Typography variant="h6">
                            {Math.round(siteStats?.trainingRates.compliance || 0)}%
                          </Typography>
                          <Typography variant="body2">Compliance</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Overall Progress */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 1, ...adhd.importantText }}>
                      Overall Progress
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={siteStats?.completionRate || 0}
                      sx={{ 
                        height: 12, 
                        borderRadius: 6,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 6,
                          bgcolor: (siteStats?.completionRate || 0) >= 90 
                            ? theme.palette.success.main
                            : (siteStats?.completionRate || 0) >= 75
                            ? theme.palette.primary.main
                            : theme.palette.warning.main,
                        },
                      }}
                    />
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        mt: 1, 
                        textAlign: 'center',
                        color: (siteStats?.completionRate || 0) >= 90 
                          ? theme.palette.success.main
                          : theme.palette.text.primary,
                        ...adhd.importantText
                      }}
                    >
                      {siteStats?.completionRate || 0}% Complete
                    </Typography>
                  </Box>

                  <Typography variant="subtitle1" sx={{ mt: 2, ...adhd.largeText }}>
                    {siteStats && (siteStats.expiredCount + siteStats.expiringCount + siteStats.currentSicknessCount > 0) ? (
                      `${siteStats.expiredCount + siteStats.expiringCount + siteStats.currentSicknessCount} items need attention`
                    ) : (
                      'All staff training and sickness metrics look good! 🎉'
                    )}
                  </Typography>
                </Grid>

                {/* Right Column - Stats Summary */}
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
                    <Typography variant="body2" sx={{ mt: 1, ...adhd.largeText }}>
                      Overall Training Completion Rate
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Fade>

          {/* Quick Actions */}
          <Card sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3,
            ...adhd.card,
            ...adhd.focusHighlight
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <QuickActionIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h5" sx={{ flexGrow: 1, ...adhd.importantText }}>
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
                      fontSize: '1rem',
                      py: 1.5,
                      px: 3,
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

          {/* Main Dashboard Grid */}
          <Grid container spacing={3}>
            {visibleDashboardItems.map((item, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    bgcolor: alpha(theme.palette[item.color].main, 0.05),
                    borderRadius: 3,
                    ...adhd.card,
                    ...adhd.focusHighlight
                  }}
                  onClick={item.onClick}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ color: `${item.color}.main` }}>
                          {item.icon}
                        </Box>
                        <Typography variant="h6" sx={adhd.importantText}>
                          {item.title}
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={adhd.largeText}>
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
                              sx={{ fontSize: '0.9rem' }}
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

          {/* Leaderboard Section */}
          {!focusMode && (
            <Box sx={{ mt: 3 }}>
              <LeaderboardSection />
              {userStats && (
                <Paper sx={{ 
                  p: 3, 
                  mt: 3, 
                  borderRadius: 3,
                  ...adhd.card,
                  ...adhd.focusHighlight
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Your Progress
                  </Typography>
                  <Typography variant="body1" sx={adhd.largeText}>
                    Level: {userStats.rank}
                  </Typography>
                  <Typography variant="body2" sx={adhd.largeText}>
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
                          sx={{ fontSize: '0.9rem' }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          )}

          {/* Recent Tasks Section */}
          {!focusMode && recentTasks.length > 0 && (
            <Card sx={{ 
              mt: 3, 
              borderRadius: 3,
              ...adhd.card,
              ...adhd.focusHighlight
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={adhd.importantText}>
                  Recent Sickness Tasks
                </Typography>
                <List>
                  {recentTasks.map((task) => (
                    <ListItem 
                      key={task.id}
                      sx={{
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                        },
                        borderRadius: 2,
                      }}
                    >
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
                        primary={
                          <Typography sx={adhd.importantText}>{task.title}</Typography>
                        }
                        secondary={
                          <Typography sx={adhd.largeText}>
                            Due: {format(task.dueDate, 'PPP')} • Priority: {task.priority}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="View Details">
                          <IconButton 
                            edge="end" 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tasks/${task.id}`);
                            }}
                            sx={{
                              transition: 'transform 0.3s ease',
                              '&:hover': {
                                transform: 'translateX(4px)',
                              },
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

          {/* Animation Styles */}
          <style>
            {`
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
            `}
          </style>
        </Box>
      ) : (
        // Fallback UI when no site is selected
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            borderRadius: 4,
            ...adhd.card
          }}
        >
          <Typography variant="h5" sx={adhd.importantText}>
            Please select a site to view the dashboard.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ManagerDashboard;
