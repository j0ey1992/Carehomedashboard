import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Grid,
  Tooltip,
  Zoom,
  alpha,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  LocalHospital as SickIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';

interface AttendanceData {
  sickDays: number;
  lateDays: number;
  totalDays: number;
  attendanceRate: number;
}

const AttendanceSection: React.FC = () => {
  const theme = useTheme();
  const { userData } = useAuth();
  const attendance: AttendanceData = userData?.attendance || {
    sickDays: 0,
    lateDays: 0,
    totalDays: 0,
    attendanceRate: 100,
  };

  const getAttendanceColor = (rate: number): string => {
    if (rate >= 95) return theme.palette.success.main;
    if (rate >= 90) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const stats = [
    {
      label: 'Attendance Rate',
      value: `${attendance.attendanceRate}%`,
      icon: <CheckIcon />,
      color: getAttendanceColor(attendance.attendanceRate),
      tooltip: 'Your overall attendance rate',
    },
    {
      label: 'Sick Days',
      value: attendance.sickDays,
      icon: <SickIcon />,
      color: theme.palette.error.main,
      tooltip: 'Total number of sick days taken',
    },
    {
      label: 'Late Days',
      value: attendance.lateDays,
      icon: <TimeIcon />,
      color: theme.palette.warning.main,
      tooltip: 'Number of days you were late',
    },
    {
      label: 'Total Days',
      value: attendance.totalDays,
      icon: <CalendarIcon />,
      color: theme.palette.info.main,
      tooltip: 'Total working days',
    },
  ];

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <Typography variant="h6" gutterBottom>
        Attendance Overview
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Overall Attendance
          </Typography>
          <Typography variant="body2" sx={{ color: getAttendanceColor(attendance.attendanceRate) }}>
            {attendance.attendanceRate}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(attendance.attendanceRate, 100)}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(getAttendanceColor(attendance.attendanceRate), 0.1),
            '& .MuiLinearProgress-bar': {
              bgcolor: getAttendanceColor(attendance.attendanceRate),
              borderRadius: 4,
            },
          }}
        />
      </Box>

      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Tooltip
              title={stat.tooltip}
              TransitionComponent={Zoom}
              placement="top"
            >
              <Paper
                sx={{
                  p: 2,
                  textAlign: 'center',
                  bgcolor: alpha(stat.color, 0.1),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    bgcolor: alpha(stat.color, 0.15),
                  },
                }}
                elevation={0}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
                <Typography
                  variant="h6"
                  sx={{ color: stat.color, fontWeight: 600, mb: 0.5 }}
                >
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stat.label}
                </Typography>
              </Paper>
            </Tooltip>
          </Grid>
        ))}
      </Grid>

      {attendance.attendanceRate >= 98 && (
        <Box
          sx={{
            mt: 2,
            p: 1,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.success.main, 0.1),
            color: theme.palette.success.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <CheckIcon />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Excellent Attendance! Keep up the great work!
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AttendanceSection;
