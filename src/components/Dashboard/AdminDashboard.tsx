import React, { useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  Stack,
  Paper,
  Chip,
  IconButton,
  Collapse,
  LinearProgress,
  Fade,
  Zoom,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  SupervisorAccount as SupervisionIcon,
  School as TrainingIcon,
  Event as EventIcon,
  Refresh as RenewalsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Celebration as CelebrationIcon,
  ArrowForward as ArrowIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  LocalHospital as SickIcon,
  EventAvailable as LeaveIcon,
  Notifications as NotificationsIcon,
  PlayCircleOutline as QuickActionIcon,
  Redeem as BadgeIcon,
  FilterList as FilterIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTraining } from '../../contexts/TrainingContext';
import { useSupervision } from '../../contexts/SupervisionContext';
import { useSickness } from '../../contexts/SicknessContext';
import { useLeave } from '../../contexts/LeaveContext';
import { format, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { alpha, useTheme } from '@mui/material/styles';
import { F2F_COURSES, TRAINING_COURSES } from '../../utils/courseConstants';
import LeaderboardSection from './LeaderboardSection';
import { useUsers } from '../../contexts/UserContext';
import { useGamification } from '../../contexts/GamificationContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Achievement } from '../../types/gamification';

export interface ActionItem {
  label: string;
  path: string;
  icon: JSX.Element;
  count: number;
}

export interface CompletedItem {
  label: string;
  path: string;
  icon: JSX.Element;
  subLabel: string;
  date: string;
}

export interface Section {
  title: string;
  icon: JSX.Element;
  color: string;
  bgColor: string;
  items: (ActionItem | CompletedItem)[];
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { trainingRecords } = useTraining();
  const { stats: supervisionStats } = useSupervision();
  const { sicknessRecords, getTriggerStatus } = useSickness();
  const { leaveRequests } = useLeave();
  const { users } = useUsers();
  const theme = useTheme();
  
  const [expandedSections, setExpandedSections] = useState<number[]>([0, 1]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  const { userStats } = useGamification();
  const { notifications } = useNotifications();

  // Get list of unique sites
  const sites = useMemo(() => {
    const siteSet = new Set<string>();
    users.forEach(user => {
      if (user.site) siteSet.add(user.site);
    });
    return ['all', ...Array.from(siteSet)];
  }, [users]);

  // Filter records by selected site
  const filteredRecords = useMemo(() => {
    if (selectedSite === 'all') return sicknessRecords;
    return sicknessRecords.filter(record => record.site === selectedSite);
  }, [sicknessRecords, selectedSite]);

  // Filter leave requests by selected site and status
  const pendingLeaveRequests = useMemo(() => {
    return leaveRequests.filter(request => 
      request.status === 'pending' && 
      (selectedSite === 'all' || request.site === selectedSite)
    );
  }, [leaveRequests, selectedSite]);

  // Calculate sickness stats
  const sicknessStats = useMemo(() => {
    const currentSickness = filteredRecords.filter(record => record.status === 'current');
    const needingReview = filteredRecords.filter(record => record.status === 'review');

    const staffWithTriggers = users
      .filter(user => {
        if (selectedSite !== 'all' && user.site !== selectedSite) return false;
        const status = getTriggerStatus(user.id);
        return status.isNearingTrigger;
      })
      .length;

    return {
      currentCount: currentSickness.length,
      reviewCount: needingReview.length,
      triggerCount: staffWithTriggers,
    };
  }, [filteredRecords, users, getTriggerStatus, selectedSite]);

  // Filter and organize records
  const organizedRecords = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);

    // Filter records by type
    const trainingOnly = trainingRecords.filter(r => 
      TRAINING_COURSES.includes(r.courseTitle) &&
      (selectedSite === 'all' || r.siteId === selectedSite)
    );
    const f2fOnly = trainingRecords.filter(r => 
      F2F_COURSES.includes(r.courseTitle) &&
      (selectedSite === 'all' || r.siteId === selectedSite)
    );

    const expiredTraining = trainingOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = new Date(record.expiryDate);
      return isBefore(expiryDate, today);
    });

    const expiredF2F = f2fOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = new Date(record.expiryDate);
      return isBefore(expiryDate, today);
    });

    const upcomingTraining = trainingOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = new Date(record.expiryDate);
      return isAfter(expiryDate, today) && 
             isBefore(expiryDate, thirtyDaysFromNow) &&
             !record.isManuallyScheduled;
    });

    const upcomingF2F = f2fOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = new Date(record.expiryDate);
      return isAfter(expiryDate, today) && 
             isBefore(expiryDate, thirtyDaysFromNow) &&
             !record.isManuallyScheduled;
    });

    // Calculate completion rates
    const trainingRate = trainingOnly.length > 0 
      ? ((trainingOnly.length - expiredTraining.length) / trainingOnly.length) * 100 
      : 100;
    const f2fRate = f2fOnly.length > 0 
      ? ((f2fOnly.length - expiredF2F.length) / f2fOnly.length) * 100 
      : 100;
    const overallRate = (trainingRate + f2fRate + supervisionStats.completionRate) / 3;

    return {
      expiredTraining,
      expiredF2F,
      upcomingTraining,
      upcomingF2F,
      completed: trainingRecords
        .filter(r => r.completionDate && (selectedSite === 'all' || r.siteId === selectedSite))
        .sort((a, b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime()),
      completionRate: Math.round(overallRate),
    };
  }, [trainingRecords, supervisionStats.completionRate, selectedSite]);

  const sections: Section[] = [
    {
      title: 'Need Attention Now',
      icon: <ErrorIcon sx={{ color: theme.palette.error.main }} />,
      color: theme.palette.error.main,
      bgColor: alpha(theme.palette.error.main, 0.05),
      items: [
        {
          label: 'Pending Leave Requests',
          count: pendingLeaveRequests.length,
          path: '/leave',
          icon: <LeaveIcon />,
        },
        {
          label: 'Current Sickness',
          count: sicknessStats.currentCount,
          path: '/sickness',
          icon: <SickIcon />,
        },
        {
          label: 'Sickness Reviews',
          count: sicknessStats.reviewCount,
          path: '/sickness',
          icon: <WarningIcon />,
        },
        {
          label: 'Staff Near Triggers',
          count: sicknessStats.triggerCount,
          path: '/sickness',
          icon: <ErrorIcon />,
        },
        {
          label: 'Overdue Supervisions',
          count: supervisionStats.overdue,
          path: '/supervision',
          icon: <SupervisionIcon />,
        },
        {
          label: 'Expired Training',
          count: organizedRecords.expiredTraining.length,
          path: '/training',
          icon: <TrainingIcon />,
        },
        {
          label: 'Expired F2F Training',
          count: organizedRecords.expiredF2F.length,
          path: '/f2f',
          icon: <EventIcon />,
        },
      ].filter(item => item.count > 0) as ActionItem[],
    },
    {
      title: 'Due in Next 30 Days',
      icon: <WarningIcon sx={{ color: theme.palette.warning.main }} />,
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.05),
      items: [
        {
          label: 'Upcoming Supervisions',
          count: supervisionStats.upcomingCount,
          path: '/supervision',
          icon: <SupervisionIcon />,
        },
        {
          label: 'Training Due Soon',
          count: organizedRecords.upcomingTraining.length,
          path: '/training',
          icon: <TrainingIcon />,
        },
        {
          label: 'F2F Sessions Due',
          count: organizedRecords.upcomingF2F.length,
          path: '/f2f',
          icon: <EventIcon />,
        },
      ].filter(item => item.count > 0) as ActionItem[],
    },
    {
      title: 'Recently Completed',
      icon: <CheckCircleIcon sx={{ color: theme.palette.success.main }} />,
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.05),
      items: organizedRecords.completed
        .slice(0, 3)
        .map(record => ({
          label: record.courseTitle,
          subLabel: `Completed by ${record.staffName}`,
          date: format(new Date(record.completionDate || new Date()), 'MMM d'),
          path: `/${record.recordType}`,
          icon: record.recordType === 'f2f' ? <EventIcon /> : 
                record.recordType === 'supervision' ? <SupervisionIcon /> : 
                record.recordType === 'compliance' ? <RenewalsIcon /> : 
                <TrainingIcon />,
        })) as CompletedItem[],
    },
  ];

  const toggleSection = (index: number) => {
    setExpandedSections(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const renderItem = (item: ActionItem | CompletedItem, sectionIndex: number) => {
    const itemKey = `${item.label}-${sectionIndex}`;
    return (
      <Zoom in timeout={300} style={{ transitionDelay: `${sectionIndex * 100}ms` }} key={itemKey}>
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: hoveredItem === itemKey ? 'translateX(8px) scale(1.02)' : 'none',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              boxShadow: 3,
            },
          }}
          onClick={() => navigate(item.path)}
          onMouseEnter={() => setHoveredItem(itemKey)}
          onMouseLeave={() => setHoveredItem(null)}
          elevation={hoveredItem === itemKey ? 4 : 1}
        >
          <Box 
            sx={{ 
              p: 1, 
              borderRadius: '50%', 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              transform: hoveredItem === itemKey ? 'scale(1.1)' : 'none',
              transition: 'transform 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {item.icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {item.label}
            </Typography>
            {'subLabel' in item && (
              <Typography variant="body2" color="textSecondary">
                {item.subLabel}
              </Typography>
            )}
          </Box>
          {'count' in item && (
            <Chip 
              label={item.count}
              color={sectionIndex === 0 ? 'error' : sectionIndex === 1 ? 'warning' : 'success'}
              sx={{ 
                transform: hoveredItem === itemKey ? 'scale(1.1)' : 'none',
                transition: 'transform 0.3s ease',
              }}
            />
          )}
          {'date' in item && (
            <Typography variant="body2" color="textSecondary">
              {item.date}
            </Typography>
          )}
          <ArrowIcon 
            color="action" 
            sx={{ 
              transform: hoveredItem === itemKey ? 'translateX(4px)' : 'none',
              transition: 'transform 0.3s ease',
            }}
          />
        </Paper>
      </Zoom>
    );
  };

  // Quick Actions for Admin - now at the top
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
      label: 'View Compliance Reports',
      path: '/compliance/reports',
      icon: <RenewalsIcon />,
    },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', fontSize: '1rem' }}>
      {/* Top Controls: Focus Mode */}
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
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Site</InputLabel>
                  <Select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    label="Site"
                  >
                    {sites.map((site) => (
                      <MenuItem key={site} value={site}>
                        {site === 'all' ? 'All Sites' : site}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Tooltip title="Filter data">
                  <IconButton>
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="subtitle1" gutterBottom>
                {organizedRecords.expiredTraining.length + organizedRecords.expiredF2F.length + supervisionStats.overdue + sicknessStats.currentCount > 0 ? (
                  `${organizedRecords.expiredTraining.length + organizedRecords.expiredF2F.length + supervisionStats.overdue + sicknessStats.currentCount} items need attention`
                ) : (
                  'All staff training and supervisions are up to date! 🎉'
                )}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={organizedRecords.completionRate}
                sx={{ 
                  mt: 2, 
                  height: 10, 
                  borderRadius: 5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    bgcolor: organizedRecords.completionRate === 100 
                      ? 'success.main'
                      : organizedRecords.completionRate >= 80
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
                    {Math.round(organizedRecords.completionRate)}%
                  </Typography>
                  {organizedRecords.completionRate >= 90 && (
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
                  Overall Completion Rate
                </Typography>

                {/* Gamification Info */}
                {userStats && (
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
                        {userStats.achievements.slice(0, 3).map((badge: Achievement) => (
                          <Chip
                            key={badge.id}
                            label={badge.title}
                            icon={<BadgeIcon />}
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

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {sections.map((section, sectionIndex) => (
            <Card 
              key={section.title}
              sx={{ 
                p: 3,
                mb: 3,
                bgcolor: section.bgColor,
                transition: 'all 0.3s ease',
                borderRadius: 3,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 3, 
                  gap: 1,
                  cursor: 'pointer',
                }}
                onClick={() => toggleSection(sectionIndex)}
              >
                {section.icon}
                <Typography variant="h5" sx={{ color: section.color, flexGrow: 1, fontWeight: 'bold' }}>
                  {section.title}
                </Typography>
                <IconButton size="small">
                  {expandedSections.includes(sectionIndex) ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Collapse in={expandedSections.includes(sectionIndex)}>
                <Stack spacing={2}>
                  {section.items.map((item, i) => renderItem(item, sectionIndex))}

                  {section.items.length === 0 && (
                    <Fade in timeout={500}>
                      <Box 
                        sx={{ 
                          p: 3, 
                          textAlign: 'center',
                          color: 'text.secondary',
                        }}
                      >
                        <Typography>
                          {sectionIndex === 0 ? '🎉 Nothing needs attention right now!' :
                           sectionIndex === 1 ? '✨ No upcoming items in the next 30 days' :
                           '📝 No recent completions to show'}
                        </Typography>
                      </Box>
                    </Fade>
                  )}
                </Stack>
              </Collapse>
            </Card>
          ))}
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          {!focusMode && <LeaderboardSection />}

          {/* Notifications Section */}
          {!focusMode && (
            <Card sx={{ p: 3, mt: 3, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                  Notifications
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {notifications.slice(0, 3).map((n: { id: string; title: string; message: string; icon?: JSX.Element }, i: number) => (
                  <Fade in timeout={300} style={{ transitionDelay: `${i * 100}ms` }} key={n.id}>
                    <Paper
                      sx={{
                        p: 2,
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderRadius: 2,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          boxShadow: 3,
                        },
                      }}
                      onClick={() => navigate('/notifications')}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: '50%',
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {n.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {n.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {n.message}
                        </Typography>
                      </Box>
                    </Paper>
                  </Fade>
                ))}
                {notifications.length === 0 && (
                  <Fade in timeout={500}>
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography>No new notifications 🎉</Typography>
                    </Box>
                  </Fade>
                )}
              </Stack>
            </Card>
          )}
        </Grid>
      </Grid>

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

export default AdminDashboard;
