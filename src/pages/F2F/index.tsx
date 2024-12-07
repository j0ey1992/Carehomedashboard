import React, { useMemo, useState, ReactElement } from 'react';
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
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  MenuItem,
  Zoom,
  Fade,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationIcon,
  Email as EmailIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { useTraining } from '../../contexts/TrainingContext';
import { TrainingRecord } from '../../types';
import { format, differenceInDays, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { createNotification } from '../../utils/notifications';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { alpha, useTheme } from '@mui/material/styles';
import { F2F_COURSES } from '../../utils/courseConstants';

interface ScheduleDialogData {
  staffId: string;
  staffName: string;
  courseTitle: string;
  date: string;
  time: string;
  location: string;
  trainer: string;
  notes: string;
}

interface OrganizedRecords {
  expired: TrainingRecord[];
  upcoming: TrainingRecord[];
  scheduled: TrainingRecord[];
}

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value) {
    return value.toDate();
  }
  return new Date(value);
};

const F2FTrainingPage = (): ReactElement => {
  const theme = useTheme();
  const { trainingRecords, loading, updateTrainingRecord } = useTraining();
  const { currentUser, userData } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [newTrainingDialogOpen, setNewTrainingDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleDialogData>({
    staffId: '',
    staffName: '',
    courseTitle: F2F_COURSES[0],
    date: '',
    time: '',
    location: '',
    trainer: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Update page title and button visibility based on role
  const pageTitle = useMemo(() => 
    userData?.role === 'admin' ? 'Face-to-Face Training' : 'My F2F Training'
  , [userData?.role]);
  
  const showNewTrainingButton = useMemo(() => 
    userData?.role === 'admin'
  , [userData?.role]);

  // Filter records based on user role
  const filteredRecords = useMemo(() => {
    if (!userData || !currentUser) return [];

    // Filter to include only F2F courses
    const f2fRecords = trainingRecords.filter(record => 
      record.recordType === 'f2f' && F2F_COURSES.includes(record.courseTitle)
    );

    // If user is admin, show all records
    if (userData.role === 'admin') {
      return f2fRecords;
    }

    // For staff, only show their own records
    return f2fRecords.filter(record => record.staffId === currentUser.uid);
  }, [trainingRecords, userData, currentUser]);

  // Organize filtered records
  const organizedRecords = useMemo<OrganizedRecords>(() => {
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);

    // Process expired records - past expiry date or expired status
    const expired = filteredRecords.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isBefore(expiryDate, today);
    }).sort((a, b) => {
      const dateA = toDate(a.expiryDate);
      const dateB = toDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Process upcoming records - due within 30 days and not expired
    const upcoming = filteredRecords.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isAfter(expiryDate, today) && 
             isBefore(expiryDate, thirtyDaysFromNow) &&
             !record.isManuallyScheduled;
    }).sort((a, b) => {
      const dateA = toDate(a.expiryDate);
      const dateB = toDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Process scheduled records
    const scheduled = filteredRecords.filter(record => {
      return record.isManuallyScheduled === true && 
             record.completionDate && 
             isAfter(toDate(record.completionDate), today);
    }).sort((a, b) => {
      if (!a.completionDate || !b.completionDate) return 0;
      const dateA = toDate(a.completionDate);
      const dateB = toDate(b.completionDate);
      return dateA.getTime() - dateB.getTime();
    });

    return { expired, upcoming, scheduled };
  }, [filteredRecords]);

  // Calculate progress percentage based on filtered records
  const progressPercentage = useMemo(() => {
    if (filteredRecords.length === 0) return 100;
    const totalRecords = filteredRecords.length;
    const expiredRecords = organizedRecords.expired.length;
    return Math.round(((totalRecords - expiredRecords) / totalRecords) * 100);
  }, [filteredRecords, organizedRecords]);

  // Calculate achievements based on filtered records
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

  // Only admins can create new training records
  const handleNewTraining = () => {
    if (!showNewTrainingButton) return;
    
    setScheduleData({
      staffId: '',
      staffName: '',
      courseTitle: F2F_COURSES[0],
      date: '',
      time: '',
      location: '',
      trainer: '',
      notes: '',
    });
    setNewTrainingDialogOpen(true);
  };

  const handleSchedule = async (record: TrainingRecord) => {
    // Only admins can schedule training
    if (!showNewTrainingButton) return;

    setSelectedRecord(record);
    setScheduleData({
      staffId: record.staffId || '',
      staffName: record.staffName,
      courseTitle: record.courseTitle,
      date: '',
      time: '',
      location: '',
      trainer: '',
      notes: '',
    });
    setScheduleDialogOpen(true);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedRecord || !currentUser || !showNewTrainingButton) return;

    try {
      const scheduledDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
      
      await updateTrainingRecord(selectedRecord.id, {
        status: 'valid',
        completionDate: scheduledDate,
        expiryDate: addDays(scheduledDate, 365),
        notes: scheduleData.notes,
        location: scheduleData.location,
        trainer: scheduleData.trainer,
        isManuallyScheduled: true,
      });

      await createNotification(
        scheduleData.staffId,
        'training',
        'F2F Training Scheduled',
        `${scheduleData.staffName} - ${scheduleData.courseTitle}`,
        `/f2f`,
        scheduledDate
      );

      setScheduleDialogOpen(false);
      setSelectedRecord(null);
      setError(null);
      setActiveTab(2);
    } catch (error) {
      console.error('Error scheduling training:', error);
      setError('Failed to schedule training. Please try again.');
    }
  };

  const handleNewTrainingSubmit = async () => {
    if (!currentUser || !showNewTrainingButton) return;

    try {
      const scheduledDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
      
      await addDoc(collection(db, 'training'), {
        staffId: scheduleData.staffId,
        staffName: scheduleData.staffName,
        courseTitle: scheduleData.courseTitle,
        status: 'valid',
        recordType: 'f2f',
        completionDate: Timestamp.fromDate(scheduledDate),
        expiryDate: Timestamp.fromDate(addDays(scheduledDate, 365)),
        notes: scheduleData.notes,
        location: scheduleData.location,
        trainer: scheduleData.trainer,
        isManuallyScheduled: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
      });

      await createNotification(
        scheduleData.staffId,
        'training',
        'F2F Training Scheduled',
        `${scheduleData.staffName} - ${scheduleData.courseTitle}`,
        `/f2f`,
        scheduledDate
      );

      setNewTrainingDialogOpen(false);
      setError(null);
      setActiveTab(2);
    } catch (error) {
      console.error('Error creating new training:', error);
      setError('Failed to create training. Please try again.');
    }
  };

  const renderReminderSteps = () => (
    <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
      <List>
        <ListItem>
          <ListItemIcon>
            <CalendarIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary={<Typography variant="subtitle1">Calendar Invite</Typography>}
            secondary={<Typography variant="body2">Sent to staff and trainer</Typography>}
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <EmailIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary={<Typography variant="subtitle1">7 Days Before</Typography>}
            secondary={<Typography variant="body2">Email reminder</Typography>}
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

  const renderAchievements = () => (
    <Fade in timeout={1000}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Tooltip title="All F2F Training On Time" TransitionComponent={Zoom}>
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
        <Tooltip title="All Sessions Scheduled" TransitionComponent={Zoom}>
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
        <Tooltip title="Active Trainer" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.hasScheduledSessions ? '✓' : ''}
            color="success"
          >
            <EventIcon 
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

  const renderTrainingCard = (record: TrainingRecord) => {
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
                <EventIcon 
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

              {record.trainer && (
                <Typography variant="body2" color="textSecondary">
                  Trainer: {record.trainer}
                </Typography>
              )}

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

              {!isScheduled && userData?.role === 'admin' && (
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
    const open = isNew ? newTrainingDialogOpen : scheduleDialogOpen;
    const handleClose = () => isNew ? setNewTrainingDialogOpen(false) : setScheduleDialogOpen(false);
    const handleSubmit = isNew ? handleNewTrainingSubmit : handleScheduleSubmit;

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isNew ? 'Schedule New F2F Training' : 'Schedule F2F Training'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {isNew && (
              <>
                <TextField
                  label="Staff Name"
                  value={scheduleData.staffName}
                  onChange={(e) => setScheduleData({ ...scheduleData, staffName: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  select
                  label="Course Title"
                  value={scheduleData.courseTitle}
                  onChange={(e) => setScheduleData({ ...scheduleData, courseTitle: e.target.value })}
                  fullWidth
                  required
                >
                  {F2F_COURSES.map((course) => (
                    <MenuItem key={course} value={course}>
                      {course}
                    </MenuItem>
                  ))}
                </TextField>
              </>
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
              required
            />
            <TextField
              label="Trainer"
              value={scheduleData.trainer}
              onChange={(e) => setScheduleData({ ...scheduleData, trainer: e.target.value })}
              fullWidth
              required
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
                    {renderTrainingCard(record)}
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
                  No expired F2F training! 🎉
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
                    {renderTrainingCard(record)}
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
                  No F2F training due in the next 30 days
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
                    {renderTrainingCard(record)}
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
                <EventIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                <Typography color="textSecondary" variant="h6">
                  No F2F training currently scheduled
                </Typography>
                {userData?.role === 'admin' && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleNewTraining}
                    sx={{
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  >
                    Schedule New Training
                  </Button>
                )}
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
                {pageTitle}
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
            {showNewTrainingButton && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleNewTraining}
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                Schedule New
              </Button>
            )}
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
      {showNewTrainingButton && (
        <>
          {renderScheduleDialog(false)} {/* Schedule existing training */}
          {renderScheduleDialog(true)}  {/* Create new training */}
        </>
      )}

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ 
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '90%',
            width: 500,
          }}
        >
          {error}
        </Alert>
      )}

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

export default F2FTrainingPage;
