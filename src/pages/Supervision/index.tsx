import React, { useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Zoom,
  Fade,
  Tooltip,
  Badge,
  alpha,
} from '@mui/material';
import {
  SupervisorAccount as SupervisionIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationIcon,
  Email as EmailIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useTraining } from '../../contexts/TrainingContext';
import { TrainingRecord } from '../../types';
import { format, differenceInDays, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { SUPERVISION_COURSES } from '../../utils/excelParser';
import { createNotification, scheduleSupervsion } from '../../utils/notifications';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';

interface ScheduleDialogData {
  staffId: string;
  staffName: string;
  courseTitle: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  sendQuestionnaire: boolean;
}

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value) {
    return value.toDate();
  }
  return new Date(value);
};

const SupervisionPage: React.FC = () => {
  const theme = useTheme();
  const { trainingRecords, loading, updateTrainingRecord } = useTraining();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [newSupervisionDialogOpen, setNewSupervisionDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleDialogData>({
    staffId: '',
    staffName: '',
    courseTitle: SUPERVISION_COURSES[0],
    date: '',
    time: '',
    location: '',
    notes: '',
    sendQuestionnaire: true,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Filter records to only show supervision courses
  const supervisionRecords = useMemo(() => 
    trainingRecords.filter((record: TrainingRecord) => 
      SUPERVISION_COURSES.includes(record.courseTitle)
    ),
    [trainingRecords]
  );

  // Organize records by status and date
  const organizedRecords = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);

    // First identify manually scheduled records
    const scheduled = supervisionRecords.filter(record => {
      // Only consider records that have been manually scheduled through UI
      return record.isManuallyScheduled === true && 
             record.completionDate && 
             isAfter(toDate(record.completionDate), today);
    }).sort((a, b) => {
      const dateA = toDate(a.completionDate);
      const dateB = toDate(b.completionDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Get IDs of scheduled records to exclude them
    const scheduledIds = new Set(scheduled.map(r => r.id));

    // Get all unscheduled records (excluding any that are manually scheduled)
    const unscheduledRecords = supervisionRecords.filter(record => 
      !scheduledIds.has(record.id) && record.isManuallyScheduled !== true
    );

    // Process expired records (only from unscheduled records)
    const expired = unscheduledRecords.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isBefore(expiryDate, today);
    }).sort((a, b) => {
      const dateA = toDate(a.expiryDate);
      const dateB = toDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Get upcoming records (only from unscheduled records)
    const upcoming = unscheduledRecords.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow);
    }).sort((a, b) => {
      const dateA = toDate(a.expiryDate);
      const dateB = toDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });

    return { expired, upcoming, scheduled };
  }, [supervisionRecords]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (supervisionRecords.length === 0) return 100;
    const totalRecords = supervisionRecords.length;
    const expiredRecords = organizedRecords.expired.length;
    return Math.round(((totalRecords - expiredRecords) / totalRecords) * 100);
  }, [supervisionRecords, organizedRecords]);

  // Calculate achievements
  const achievements = useMemo(() => {
    const allOnTime = organizedRecords.expired.length === 0;
    const allScheduled = organizedRecords.upcoming.length === 0;
    const hasScheduledSessions = organizedRecords.scheduled.length > 0;

    return {
      perfectScore: progressPercentage === 100,
      allOnTime,
      allScheduled,
      hasScheduledSessions,
      totalAchievements: [allOnTime, allScheduled, hasScheduledSessions].filter(Boolean).length,
    };
  }, [organizedRecords, progressPercentage]);

  const handleNewSupervision = () => {
    setScheduleData({
      staffId: '',
      staffName: '',
      courseTitle: SUPERVISION_COURSES[0],
      date: '',
      time: '',
      location: '',
      notes: '',
      sendQuestionnaire: true,
    });
    setNewSupervisionDialogOpen(true);
  };

  const handleSchedule = async (record: TrainingRecord) => {
    setSelectedRecord(record);
    setScheduleData({
      staffId: record.staffId || '',
      staffName: record.staffName,
      courseTitle: record.courseTitle,
      date: '',
      time: '',
      location: '',
      notes: '',
      sendQuestionnaire: true,
    });
    setScheduleDialogOpen(true);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedRecord || !currentUser) return;

    try {
      const scheduledDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
      
      // Wait for both operations to complete
      await Promise.all([
        scheduleSupervsion(
          selectedRecord.staffId,
          currentUser.uid,
          scheduledDate,
          scheduleData.sendQuestionnaire
        ),
        updateTrainingRecord(selectedRecord.id, {
          status: 'valid',
          completionDate: scheduledDate,
          expiryDate: addDays(scheduledDate, 90),
          notes: scheduleData.notes,
          location: scheduleData.location,
          isManuallyScheduled: true,
        })
      ]);

      // Add a small delay to ensure Firebase data is updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSnackbar({
        open: true,
        message: 'Supervision scheduled successfully! Reminders have been set.',
        severity: 'success',
      });

      setScheduleDialogOpen(false);
      setSelectedRecord(null);
      setActiveTab(2); // Switch to Scheduled tab
    } catch (error) {
      console.error('Error scheduling supervision:', error);
      setSnackbar({
        open: true,
        message: 'Error scheduling supervision. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleNewSupervisionSubmit = async () => {
    if (!currentUser) return;

    try {
      const scheduledDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
      
      // Create the supervision record
      const supervisionRef = await addDoc(collection(db, 'training'), {
        staffId: scheduleData.staffId,
        staffName: scheduleData.staffName,
        courseTitle: scheduleData.courseTitle,
        status: 'valid',
        recordType: 'supervision',
        completionDate: Timestamp.fromDate(scheduledDate),
        expiryDate: Timestamp.fromDate(addDays(scheduledDate, 90)),
        notes: scheduleData.notes,
        location: scheduleData.location,
        isManuallyScheduled: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
      });

      // Schedule the supervision
      await scheduleSupervsion(
        scheduleData.staffId,
        currentUser.uid,
        scheduledDate,
        scheduleData.sendQuestionnaire
      );

      // Add a small delay to ensure Firebase data is updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSnackbar({
        open: true,
        message: 'New supervision created and scheduled successfully!',
        severity: 'success',
      });

      setNewSupervisionDialogOpen(false);
      setActiveTab(2); // Switch to Scheduled tab
    } catch (error) {
      console.error('Error creating new supervision:', error);
      setSnackbar({
        open: true,
        message: 'Error creating supervision. Please try again.',
        severity: 'error',
      });
    }
  };

  const renderAchievements = () => (
    <Fade in timeout={1000}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Tooltip title="All Supervisions On Time" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.allOnTime ? '✓' : ''}
            color="success"
          >
            <CheckCircleIcon 
              color={achievements.allOnTime ? 'success' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="All Upcoming Scheduled" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.allScheduled ? '✓' : ''}
            color="success"
          >
            <CalendarIcon 
              color={achievements.allScheduled ? 'primary' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="Active Scheduler" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.hasScheduledSessions ? '✓' : ''}
            color="success"
          >
            <SupervisionIcon 
              color={achievements.hasScheduledSessions ? 'info' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        {achievements.perfectScore && (
          <Tooltip title="Perfect Score!" TransitionComponent={Zoom}>
            <TrophyIcon 
              color="primary" 
              sx={{ 
                fontSize: 40,
                animation: 'bounce 1s infinite',
              }} 
            />
          </Tooltip>
        )}
      </Box>
    </Fade>
  );

  const renderReminderSteps = () => (
    <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
      <List>
        <ListItem>
          <ListItemIcon>
            <CalendarIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary={<Typography variant="subtitle1">Calendar Invite</Typography>}
            secondary={<Typography variant="body2">Sent to your email</Typography>}
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <EmailIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary={<Typography variant="subtitle1">7 Days Before</Typography>}
            secondary={<Typography variant="body2">Reminder & questionnaire</Typography>}
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <NotificationIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary={<Typography variant="subtitle1">1 Day Before</Typography>}
            secondary={<Typography variant="body2">Final reminder</Typography>}
          />
        </ListItem>
      </List>
    </Box>
  );

  const renderSupervisionCard = (record: TrainingRecord) => {
    const isScheduled = record.isManuallyScheduled === true && 
                       record.completionDate && 
                       isAfter(toDate(record.completionDate), startOfDay(new Date()));
    const today = startOfDay(new Date());
    const expiryDate = toDate(record.expiryDate);
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    
    return (
      <Zoom in timeout={300}>
        <Card 
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease',
            transform: 'scale(1)',
            '&:hover': {
              transform: 'scale(1.02) translateY(-4px)',
              boxShadow: 4,
            },
            bgcolor: isScheduled ? alpha(theme.palette.info.main, 0.1) : 'background.paper',
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Stack spacing={2}>
              <Box 
                display="flex" 
                alignItems="center" 
                gap={1}
                sx={{
                  transition: 'all 0.3s ease',
                  '& .MuiSvgIcon-root': {
                    transition: 'transform 0.3s ease',
                  },
                  '&:hover .MuiSvgIcon-root': {
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <SupervisionIcon 
                  color={isScheduled ? 'info' : daysUntilExpiry <= 0 ? 'error' : 'warning'} 
                />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {record.staffName}
                </Typography>
                {isScheduled && (
                  <Tooltip title="Scheduled" TransitionComponent={Zoom}>
                    <CalendarIcon color="info" />
                  </Tooltip>
                )}
              </Box>

              <Typography variant="body1" color="textSecondary">
                {record.courseTitle}
              </Typography>

              <Box>
                {isScheduled ? (
                  <Fade in timeout={500}>
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Scheduled for: {format(toDate(record.completionDate), 'PPP')}
                      </Typography>
                      <Typography variant="body2" color="info">
                        {record.location || 'Location not specified'}
                      </Typography>
                    </Box>
                  </Fade>
                ) : (
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Due: {format(expiryDate, 'PPP')}
                    </Typography>
                    {daysUntilExpiry <= 0 && (
                      <Typography 
                        variant="body2" 
                        color="error"
                        sx={{ 
                          fontWeight: 'bold',
                          animation: 'pulse 2s infinite',
                        }}
                      >
                        Overdue by {Math.abs(daysUntilExpiry)} days
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              {!isScheduled && (
                <Button
                  variant="contained"
                  color={daysUntilExpiry <= 0 ? 'error' : 'warning'}
                  startIcon={<CalendarIcon />}
                  onClick={() => handleSchedule(record)}
                  fullWidth
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  Schedule Now
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Zoom>
    );
  };

  const renderScheduleDialog = (isNew: boolean) => {
    const open = isNew ? newSupervisionDialogOpen : scheduleDialogOpen;
    const handleClose = () => isNew ? setNewSupervisionDialogOpen(false) : setScheduleDialogOpen(false);
    const handleSubmit = isNew ? handleNewSupervisionSubmit : handleScheduleSubmit;

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isNew ? 'Schedule New Supervision' : 'Schedule Supervision'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {isNew && (
              <TextField
                label="Staff Name"
                value={scheduleData.staffName}
                onChange={(e) => setScheduleData({ ...scheduleData, staffName: e.target.value })}
                fullWidth
                required
              />
            )}
            {isNew && (
              <TextField
                select
                label="Supervision Type"
                value={scheduleData.courseTitle}
                onChange={(e) => setScheduleData({ ...scheduleData, courseTitle: e.target.value })}
                fullWidth
                required
              >
                {SUPERVISION_COURSES.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              type="date"
              label="Date"
              value={scheduleData.date}
              onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="time"
              label="Time"
              value={scheduleData.time}
              onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Location"
              value={scheduleData.location}
              onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
              fullWidth
            />
            <TextField
              label="Notes"
              value={scheduleData.notes}
              onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            {renderReminderSteps()}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 0: // Expired
        return (
          <Box>
            {organizedRecords.expired.length > 0 ? (
              <Grid container spacing={3}>
                {organizedRecords.expired.map(record => (
                  <Grid item xs={12} sm={6} md={4} key={record.id}>
                    {renderSupervisionCard(record)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                minHeight="200px"
                textAlign="center"
                gap={2}
              >
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
                <Typography color="success.main" variant="h6">
                  No expired supervisions! 🎉
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 1: // Upcoming
        return (
          <Box>
            {organizedRecords.upcoming.length > 0 ? (
              <Grid container spacing={3}>
                {organizedRecords.upcoming.map(record => (
                  <Grid item xs={12} sm={6} md={4} key={record.id}>
                    {renderSupervisionCard(record)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                minHeight="200px"
                textAlign="center"
                gap={2}
              >
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
                <Typography color="textSecondary" variant="h6">
                  No supervisions due in the next 30 days
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 2: // Scheduled
        return (
          <Box>
            {organizedRecords.scheduled.length > 0 ? (
              <Grid container spacing={3}>
                {organizedRecords.scheduled.map(record => (
                  <Grid item xs={12} sm={6} md={4} key={record.id}>
                    {renderSupervisionCard(record)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                minHeight="200px"
                textAlign="center"
                gap={2}
              >
                <CalendarIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                <Typography color="textSecondary" variant="h6">
                  No supervisions currently scheduled
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleNewSupervision}
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  Schedule New Supervision
                </Button>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Fade in timeout={800}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Typography variant="h4">
                Supervision Tracker
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={progressPercentage}
                  size={60}
                  thickness={4}
                  sx={{
                    color: progressPercentage === 100 ? 'success.main' :
                           progressPercentage >= 80 ? 'info.main' :
                           progressPercentage >= 60 ? 'warning.main' : 'error.main',
                    transition: 'all 0.3s ease',
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{ 
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      transform: progressPercentage === 100 ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {progressPercentage}%
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleNewSupervision}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              Schedule New
            </Button>
          </Box>

          {renderAchievements()}

          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                },
              },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Expired</Typography>
                  {organizedRecords.expired.length > 0 && (
                    <Chip 
                      label={organizedRecords.expired.length} 
                      color="error" 
                      size="small" 
                    />
                  )}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Upcoming</Typography>
                  {organizedRecords.upcoming.length > 0 && (
                    <Chip 
                      label={organizedRecords.upcoming.length} 
                      color="warning" 
                      size="small" 
                    />
                  )}
                </Box>
              }
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Scheduled</Typography>
                  {organizedRecords.scheduled.length > 0 && (
                    <Chip 
                      label={organizedRecords.scheduled.length} 
                      color="info" 
                      size="small" 
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>
      </Fade>

      {/* Main Content */}
      <Fade in timeout={1000}>
        <Box>
          {renderContent()}
        </Box>
      </Fade>

      {/* Dialogs */}
      {renderScheduleDialog(false)} {/* Schedule existing supervision */}
      {renderScheduleDialog(true)}  {/* Create new supervision */}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </Box>
  );
};

export default SupervisionPage;
