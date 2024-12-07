import React, { useMemo, useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTraining } from '../../contexts/TrainingContext';
import { useSickness } from '../../contexts/SicknessContext';
import { useTask } from '../../contexts/TaskContext';
import { useUsers } from '../../contexts/UserContext';
import { useLeave } from '../../contexts/LeaveContext';
import { alpha, useTheme } from '@mui/material/styles';
import { format } from 'date-fns';

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
}

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { userData } = useAuth();
  const { trainingRecords, stats } = useTraining();
  const { sicknessRecords, getTriggerStatus } = useSickness();
  const { tasks } = useTask();
  const { users } = useUsers();
  const { leaveRequests } = useLeave();

  // State for selected site
  const [selectedSite, setSelectedSite] = useState<string>('');

  // Initialize selected site
  React.useEffect(() => {
    if (userData?.sites && userData.sites.length > 0) {
      setSelectedSite(userData.sites[0]);
    } else if (userData?.site) {
      setSelectedSite(userData.site);
    }
  }, [userData]);

  // Get available sites
  const availableSites = useMemo(() => {
    return userData?.sites || (userData?.site ? [userData.site] : []);
  }, [userData]);

  // Calculate site stats
  const siteStats = useMemo(() => {
    if (!selectedSite) return null;

    // Training stats
    const siteRecords = trainingRecords.filter(record => record.siteId === selectedSite);
    const totalStaff = new Set(siteRecords.map(record => record.staffId)).size;
    const expiredCount = siteRecords.filter(record => record.status === 'expired').length;
    const expiringCount = siteRecords.filter(record => record.status === 'expiring').length;
    const completionRate = totalStaff > 0 ? 
      ((totalStaff - (expiredCount + expiringCount)) / totalStaff) * 100 : 0;

    // Sickness stats
    const siteSicknessRecords = sicknessRecords.filter(record => record.site === selectedSite);
    const currentSickness = siteSicknessRecords.filter(record => record.status === 'current');
    const needingReview = siteSicknessRecords.filter(record => record.status === 'review');
    
    // Staff with trigger points
    const siteStaff = users.filter(user => user.site === selectedSite);
    const staffWithTriggers = siteStaff.filter(user => {
      const status = getTriggerStatus(user.id);
      return status.isNearingTrigger;
    });

    // Leave requests
    const pendingLeaveRequests = leaveRequests.filter(request => 
      request.site === selectedSite && 
      request.status === 'pending'
    );

    // Sickness-related tasks
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

  const dashboardItems: DashboardItem[] = [
    {
      title: 'Leave Requests',
      icon: <LeaveIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.pendingLeaveCount || 0} Pending Requests`,
      color: 'warning',
      onClick: () => navigate('/leave'),
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
    },
    {
      title: 'Staff Management',
      icon: <StaffIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.totalStaff || 0} Staff Members`,
      color: 'primary',
      onClick: () => navigate('/users'),
    },
    {
      title: 'Training Overview',
      icon: <TrainingIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.completionRate || 0}% Completion Rate`,
      color: 'success',
      alerts: siteStats?.expiredCount ? [
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
      ] : undefined,
      onClick: () => navigate('/training'),
    },
    {
      title: 'Task Management',
      icon: <TaskIcon sx={{ fontSize: 40 }} />,
      stats: `${siteStats?.sicknessTasks.length || 0} Sickness Tasks`,
      color: 'info',
      onClick: () => navigate('/tasks'),
    },
    {
      title: 'Rota Management',
      icon: <RotaIcon sx={{ fontSize: 40 }} />,
      stats: 'View Schedule',
      color: 'warning',
      onClick: () => navigate('/rota'),
    },
  ];

  // Recent sickness tasks
  const recentTasks = useMemo(() => {
    if (!siteStats?.sicknessTasks) return [];
    return siteStats.sicknessTasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [siteStats]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4">Manager Dashboard</Typography>
        {availableSites.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Site</InputLabel>
            <Select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              label="Site"
              startAdornment={<SiteIcon sx={{ mr: 1 }} />}
            >
              {availableSites.map((site) => (
                <MenuItem key={site} value={site}>
                  {site}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Main Stats Grid */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {dashboardItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 4,
                },
                bgcolor: alpha(theme.palette[item.color].main, 0.05),
              }}
              onClick={item.onClick}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ color: `${item.color}.main` }}>
                      {item.icon}
                    </Box>
                    <Typography variant="h6">{item.title}</Typography>
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

      {/* Recent Sickness Tasks */}
      {recentTasks.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
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
    </Box>
  );
};

export default ManagerDashboard;
