import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Chip,
  Tooltip,
  Zoom,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Sick as SickIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as AlertIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { Timestamp } from 'firebase/firestore';
import { format, subDays, isAfter } from 'date-fns';

interface Props {
  records: Array<{
    id: string;
    staffId: string;
    staffName: string;
    status: 'current' | 'completed' | 'review';
    startDate: Date | Timestamp;
    endDate?: Date | Timestamp | null;
    reviewDate?: Date | Timestamp;
  }>;
}

const toDate = (value: Date | Timestamp | null | undefined): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return value.toDate();
};

const SicknessStats: React.FC<Props> = ({ records }) => {
  const theme = useTheme();

  const stats = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    // Basic counts
    const current = records.filter(r => r.status === 'current').length;
    const review = records.filter(r => r.status === 'review').length;
    const completed = records.filter(r => r.status === 'completed').length;

    // Completed records analysis
    const completedRecords = records.filter(r => r.status === 'completed' && r.endDate);
    const totalDays = completedRecords.reduce((sum, record) => {
      const start = toDate(record.startDate);
      const end = toDate(record.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    // Recent trends
    const recentRecords = records.filter(r => isAfter(toDate(r.startDate), thirtyDaysAgo));
    const recentTotal = recentRecords.length;

    // Priority actions
    const overdueReviews = records.filter(r => 
      r.status === 'review' && 
      r.reviewDate && 
      isAfter(today, toDate(r.reviewDate))
    );

    // Staff with multiple current cases
    const staffCases = records
      .filter(r => r.status === 'current')
      .reduce((acc, record) => {
        acc[record.staffId] = acc[record.staffId] || { count: 0, name: record.staffName };
        acc[record.staffId].count++;
        return acc;
      }, {} as Record<string, { count: number; name: string }>);

    const multipleCurrentCases = Object.values(staffCases)
      .filter(staff => staff.count > 1)
      .map(staff => ({ name: staff.name, count: staff.count }));

    return {
      current,
      review,
      completed,
      averageDuration: completedRecords.length > 0 
        ? Math.round(totalDays / completedRecords.length) 
        : 0,
      recentTotal,
      overdueReviews,
      multipleCurrentCases,
      monthlyTrend: recentTotal > (completed / 12) ? 'increasing' : 'stable',
    };
  }, [records]);

  return (
    <Grid container spacing={3}>
      {/* Main Stats Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
            >
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <SickIcon color="error" />
                  <Typography variant="h6">Current Cases</Typography>
                </Box>
                <Typography variant="h3" sx={{ color: theme.palette.error.main }}>
                  {stats.current}
                </Typography>
                {stats.monthlyTrend === 'increasing' && (
                  <Chip
                    icon={<TrendingUpIcon />}
                    label="Increasing this month"
                    size="small"
                    color="error"
                    sx={{ width: 'fit-content' }}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              }}
            >
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <WarningIcon color="warning" />
                  <Typography variant="h6">Need Review</Typography>
                </Box>
                <Typography variant="h3" sx={{ color: theme.palette.warning.main }}>
                  {stats.review}
                </Typography>
                {stats.overdueReviews.length > 0 && (
                  <Chip
                    icon={<AlertIcon />}
                    label={`${stats.overdueReviews.length} overdue`}
                    size="small"
                    color="warning"
                    sx={{ width: 'fit-content' }}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AssessmentIcon color="success" />
                  <Typography variant="h6">Completed</Typography>
                </Box>
                <Typography variant="h3" sx={{ color: theme.palette.success.main }}>
                  {stats.completed}
                </Typography>
                <Chip
                  icon={<CalendarIcon />}
                  label={`${stats.recentTotal} in last 30 days`}
                  size="small"
                  color="success"
                  sx={{ width: 'fit-content' }}
                />
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.info.main, 0.1),
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon color="info" />
                  <Typography variant="h6">Avg. Duration</Typography>
                </Box>
                <Typography variant="h3" sx={{ color: theme.palette.info.main }}>
                  {stats.averageDuration}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  days per case
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Grid>

      {/* Priority Actions */}
      <Grid item xs={12} md={6}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            height: '100%',
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertIcon color="error" />
            Priority Actions
          </Typography>
          <Divider sx={{ my: 1 }} />
          <List dense>
            {stats.overdueReviews.length > 0 && (
              <ListItem>
                <ListItemIcon>
                  <ScheduleIcon color="error" />
                </ListItemIcon>
                <ListItemText 
                  primary={`${stats.overdueReviews.length} overdue reviews`}
                  secondary="Requires immediate attention"
                />
                <Button variant="outlined" color="error" size="small">
                  View All
                </Button>
              </ListItem>
            )}
            {stats.multipleCurrentCases.map((staff, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <PersonIcon color="warning" />
                </ListItemIcon>
                <ListItemText 
                  primary={`${staff.name} has ${staff.count} current cases`}
                  secondary="May need additional support"
                />
                <Button variant="outlined" color="warning" size="small">
                  View Cases
                </Button>
              </ListItem>
            ))}
            {stats.review > 0 && (
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="warning" />
                </ListItemIcon>
                <ListItemText 
                  primary={`${stats.review} cases need review`}
                  secondary="Schedule follow-up meetings"
                />
                <Button variant="outlined" color="warning" size="small">
                  Schedule
                </Button>
              </ListItem>
            )}
          </List>
        </Paper>
      </Grid>

      {/* Monthly Trends */}
      <Grid item xs={12} md={6}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            height: '100%',
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon color="primary" />
            30-Day Overview
          </Typography>
          <Divider sx={{ my: 1 }} />
          <List dense>
            <ListItem>
              <ListItemIcon>
                <AssessmentIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={`${stats.recentTotal} new cases`}
                secondary="In the last 30 days"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CalendarIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={`${stats.averageDuration} days`}
                secondary="Average case duration"
              />
            </ListItem>
            {stats.monthlyTrend === 'increasing' && (
              <ListItem sx={{ color: theme.palette.error.main }}>
                <ListItemIcon>
                  <TrendingUpIcon color="error" />
                </ListItemIcon>
                <ListItemText 
                  primary="Increasing trend detected"
                  secondary="Cases are above monthly average"
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default SicknessStats;
