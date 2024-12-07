import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Fade,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Link,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useTraining } from '../../contexts/TrainingContext';
import { useTask } from '../../contexts/TaskContext';
import { useSupervision } from '../../contexts/SupervisionContext';
import { useCompliance } from '../../contexts/ComplianceContext';
import { useLeaderboard } from '../../contexts/LeaderboardContext';
import { useSickness } from '../../contexts/SicknessContext';
import { useLeave } from '../../contexts/LeaveContext';
import { format, isAfter, isBefore, startOfDay, addDays, parseISO } from 'date-fns';
import { F2F_COURSES, TRAINING_COURSES } from '../../utils/courseConstants';
import AttendanceSection from './AttendanceSection';
import SupervisionFeedbackSection from './SupervisionFeedbackSection';
import LeaderboardSection from './LeaderboardSection';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { SupervisionFeedback } from '../../types';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WorkIcon from '@mui/icons-material/Work';
import { LocalHospital as SickIcon } from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';
import { ShiftRole } from '../../types/rota';
import { EventAvailable as LeaveIcon } from '@mui/icons-material';
import { LeaveRequest } from '../../types/leave';

interface SicknessRecord {
  id: string;
  staffId: string;
  staffName: string;
  startDate: Date | Timestamp;
  endDate?: Date | Timestamp | null;
  reason: string;
  notes?: string;
  status: 'current' | 'completed' | 'review';
  reviewDate?: Date | Timestamp;
  reviewNotes?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  createdBy: string;
  site?: string;
}

interface UserSicknessData {
  currentSickness: SicknessRecord | null;
  upcomingReviews: SicknessRecord[];
  recentHistory: SicknessRecord[];
  triggerStatus: {
    occurrences: number;
    totalDays: number;
    isNearingTrigger: boolean;
  };
}

interface UserLeaveInfo {
  upcomingLeave: LeaveRequest[];
  pendingRequests: LeaveRequest[];
  recentDecisions: LeaveRequest[];
}

const toDate = (value: Date | Timestamp | null | undefined): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return value.toDate();
};

const StaffDashboard: React.FC = () => {
  const theme = useTheme();
  const { userData } = useAuth();
  const { trainingRecords } = useTraining();
  const { tasks } = useTask();
  const { supervisions } = useSupervision();
  const { staffCompliance } = useCompliance();
  const { leaderboard, userRank } = useLeaderboard();
  const { sicknessRecords, getTriggerStatus } = useSickness();
  const { leaveRequests, leaveEntitlement } = useLeave();

  const userRecords = useMemo(() => {
    if (!userData) return null;

    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);

    const userTrainingRecords = trainingRecords.filter(r => r.staffId === userData.id);

    const trainingOnly = userTrainingRecords.filter(r => 
      TRAINING_COURSES.includes(r.courseTitle)
    );
    const f2fOnly = userTrainingRecords.filter(r => 
      F2F_COURSES.includes(r.courseTitle)
    );

    const expiredTraining = trainingOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isBefore(expiryDate, today);
    });

    const expiredF2F = f2fOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isBefore(expiryDate, today);
    });

    const upcomingTraining = trainingOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isAfter(expiryDate, today) && 
             isBefore(expiryDate, thirtyDaysFromNow) &&
             !record.isManuallyScheduled;
    });

    const upcomingF2F = f2fOnly.filter(record => {
      if (!record.expiryDate) return false;
      const expiryDate = toDate(record.expiryDate);
      return isAfter(expiryDate, today) && 
             isBefore(expiryDate, thirtyDaysFromNow) &&
             !record.isManuallyScheduled;
    });

    const trainingRate = trainingOnly.length > 0 
      ? ((trainingOnly.length - expiredTraining.length) / trainingOnly.length) * 100 
      : 100;
    const f2fRate = f2fOnly.length > 0 
      ? ((f2fOnly.length - expiredF2F.length) / f2fOnly.length) * 100 
      : 100;

    const nextTraining = upcomingTraining.sort((a, b) => {
      const dateA = toDate(a.expiryDate);
      const dateB = toDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    })[0];

    const nextF2F = upcomingF2F.sort((a, b) => {
      const dateA = toDate(a.expiryDate);
      const dateB = toDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    })[0];

    return {
      expiredTraining,
      expiredF2F,
      upcomingTraining,
      upcomingF2F,
      nextTraining,
      nextF2F,
      trainingRate,
      f2fRate,
    };
  }, [trainingRecords, userData]);

  const userTasks = useMemo(() => {
    if (!userData) return [];
    return tasks.filter(task => task.assignedTo === userData.id && task.status !== 'completed');
  }, [tasks, userData]);

  const userSupervisions = useMemo(() => {
    if (!userData) return [];
    return supervisions
      .filter(s => s.staffId === userData.id && s.status === 'scheduled')
      .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  }, [supervisions, userData]);

  const userSicknessData = useMemo<UserSicknessData | null>(() => {
    if (!userData) return null;

    const userRecords = sicknessRecords.filter(record => record.staffId === userData.id);
    const currentSickness = userRecords.find(record => record.status === 'current') || null;
    const upcomingReviews = userRecords
      .filter(record => record.status === 'review' && record.reviewDate)
      .sort((a, b) => toDate(a.reviewDate).getTime() - toDate(b.reviewDate).getTime());
    
    const recentHistory = userRecords
      .filter(record => record.status === 'completed' && record.endDate)
      .sort((a, b) => toDate(b.endDate).getTime() - toDate(a.endDate).getTime())
      .slice(0, 3);

    const triggerStatus = getTriggerStatus(userData.id);

    return {
      currentSickness,
      upcomingReviews,
      recentHistory,
      triggerStatus,
    };
  }, [sicknessRecords, userData, getTriggerStatus]);

  const userLeaveInfo = useMemo<UserLeaveInfo>(() => {
    if (!userData) return {
      upcomingLeave: [],
      pendingRequests: [],
      recentDecisions: [],
    };

    const today = startOfDay(new Date());
    const userRequests = leaveRequests.filter(request => request.userId === userData.id);

    const upcomingLeave = userRequests
      .filter(request => 
        request.status === 'approved' && 
        isAfter(parseISO(request.startDate), today)
      )
      .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());

    const pendingRequests = userRequests
      .filter(request => request.status === 'pending')
      .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());

    const recentDecisions = userRequests
      .filter(request => 
        (request.status === 'approved' || request.status === 'declined') &&
        isBefore(parseISO(request.startDate), today)
      )
      .sort((a, b) => {
        // Use updatedAt if available, fall back to createdAt
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return parseISO(dateB).getTime() - parseISO(dateA).getTime();
      })
      .slice(0, 3);

    return {
      upcomingLeave,
      pendingRequests,
      recentDecisions,
    };
  }, [leaveRequests, userData]);

  const handleSupervisionFeedback = async (feedback: Omit<SupervisionFeedback, 'id' | 'submittedAt'>) => {
    const feedbackRef = collection(db, 'supervisionFeedback');
    await addDoc(feedbackRef, {
      ...feedback,
      submittedAt: Timestamp.now(),
    });
  };

  if (!userRecords) return null;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
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
            <Grid item xs={12}>
              <Typography variant="h4" gutterBottom>
                Welcome back, {userData?.name?.split(' ')[0]}! 👋
              </Typography>

              {/* Role Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Your Roles
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {userData?.roles?.map((role: ShiftRole) => (
                    <Chip
                      key={role}
                      icon={<WorkIcon />}
                      label={role}
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Site: {userData?.site || 'Not assigned'}
                </Typography>
                {userData?.preferences && (
                  <>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Preferred Shifts: {userData.preferences.preferredShifts.join(', ')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Max Shifts per Week: {userData.preferences.maxShiftsPerWeek}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {userData.preferences.flexibleHours ? 'Flexible Hours' : 'Fixed Hours'}
                      {userData.preferences.nightShiftOnly && ' - Night Shift Only'}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Leave Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LeaveIcon />
                  Leave Status
                </Typography>

                {/* Leave Entitlement */}
                <Alert 
                  severity="info"
                  sx={{ mb: 2 }}
                >
                  Annual Leave Remaining: {leaveEntitlement?.remainingDays || 0} days
                  {leaveEntitlement?.carryForwardDays ? 
                    ` (including ${leaveEntitlement.carryForwardDays} carried forward)` : 
                    ''
                  }
                </Alert>

                {/* Upcoming Leave */}
                {userLeaveInfo.upcomingLeave.length > 0 && (
                  <>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Upcoming Leave
                    </Typography>
                    <List>
                      {userLeaveInfo.upcomingLeave.map(leave => (
                        <ListItem key={leave.id}>
                          <ListItemIcon>
                            <EventIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${format(parseISO(leave.startDate), 'PP')} - ${format(parseISO(leave.endDate), 'PP')}`}
                            secondary={`${leave.totalDays} days • ${leave.leaveType}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {/* Pending Requests */}
                {userLeaveInfo.pendingRequests.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Pending Requests
                    </Typography>
                    <List>
                      {userLeaveInfo.pendingRequests.map(request => (
                        <ListItem key={request.id}>
                          <ListItemIcon>
                            <PendingIcon color="warning" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${format(parseISO(request.startDate), 'PP')} - ${format(parseISO(request.endDate), 'PP')}`}
                            secondary={`${request.totalDays} days • ${request.leaveType}`}
                          />
                          <Chip 
                            label="Pending"
                            color="warning"
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {/* Recent Decisions */}
                {userLeaveInfo.recentDecisions.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Recent Decisions
                    </Typography>
                    <List>
                      {userLeaveInfo.recentDecisions.map(decision => (
                        <ListItem key={decision.id}>
                          <ListItemIcon>
                            {decision.status === 'approved' ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <WarningIcon color="error" />
                            )}
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${format(parseISO(decision.startDate), 'PP')} - ${format(parseISO(decision.endDate), 'PP')}`}
                            secondary={`${decision.totalDays} days • ${decision.leaveType}`}
                          />
                          <Chip 
                            label={decision.status === 'approved' ? 'Approved' : 'Declined'}
                            color={decision.status === 'approved' ? 'success' : 'error'}
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                <Button
                  component={RouterLink}
                  to="/leave"
                  variant="text"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ mt: 1 }}
                >
                  View All Leave
                </Button>
              </Box>

              {/* Sickness Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SickIcon />
                  Sickness Status
                </Typography>

                {userSicknessData?.currentSickness ? (
                  <Alert 
                    severity="warning"
                    sx={{ mb: 2 }}
                  >
                    Currently on sick leave since {format(toDate(userSicknessData.currentSickness.startDate), 'PPP')}
                  </Alert>
                ) : (
                  <Alert 
                    severity="success"
                    sx={{ mb: 2 }}
                  >
                    No current sickness records
                  </Alert>
                )}

                {userSicknessData?.triggerStatus.isNearingTrigger && (
                  <Alert 
                    severity="error"
                    sx={{ mb: 2 }}
                  >
                    Nearing sickness trigger points:
                    <br />
                    • {userSicknessData.triggerStatus.occurrences} occurrences this year
                    <br />
                    • {userSicknessData.triggerStatus.totalDays} total days
                  </Alert>
                )}

                {userSicknessData && userSicknessData.upcomingReviews.length > 0 && (
                  <>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Upcoming Reviews
                    </Typography>
                    <List>
                      {userSicknessData.upcomingReviews.map(review => (
                        <ListItem key={review.id}>
                          <ListItemIcon>
                            <EventIcon color="warning" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Return to Work Meeting"
                            secondary={`Scheduled: ${format(toDate(review.reviewDate), 'PPP')}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {userSicknessData && userSicknessData.recentHistory.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Recent Sickness History
                    </Typography>
                    <List>
                      {userSicknessData.recentHistory.map(record => (
                        <ListItem key={record.id}>
                          <ListItemIcon>
                            <SickIcon color="action" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={record.reason}
                            secondary={`${format(toDate(record.startDate), 'PP')} - ${format(toDate(record.endDate), 'PP')}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Button
                      component={RouterLink}
                      to="/sickness"
                      variant="text"
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ mt: 1 }}
                    >
                      View Full History
                    </Button>
                  </>
                )}
              </Box>
              
              {/* Tasks Section */}
              {userTasks.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Your Tasks
                  </Typography>
                  <List>
                    {userTasks.map(task => (
                      <ListItem key={task.id}>
                        <ListItemIcon>
                          <AssignmentIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={task.title}
                          secondary={`Due: ${format(toDate(task.dueDate), 'MMM d, yyyy')}`}
                        />
                        <Button 
                          component={RouterLink} 
                          to="/tasks" 
                          variant="outlined" 
                          size="small"
                        >
                          View
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Training Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Training Status
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={userRecords.trainingRate}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      bgcolor: userRecords.trainingRate === 100 
                        ? 'success.main'
                        : userRecords.trainingRate >= 80
                        ? 'primary.main'
                        : 'warning.main',
                    },
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  {userRecords.trainingRate === 100 
                    ? '🎉 All training up to date!'
                    : `${userRecords.expiredTraining.length} training modules need attention`}
                </Typography>

                {/* Expired Training */}
                {userRecords.expiredTraining.length > 0 && (
                  <List>
                    {userRecords.expiredTraining.map(record => (
                      <ListItem key={record.id}>
                        <ListItemIcon>
                          <WarningIcon color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={record.courseTitle}
                          secondary={`Expired: ${format(toDate(record.expiryDate), 'MMM d, yyyy')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* Upcoming Training */}
                {userRecords.upcomingTraining.length > 0 && (
                  <List>
                    {userRecords.upcomingTraining.map(record => (
                      <ListItem key={record.id}>
                        <ListItemIcon>
                          <PendingIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={record.courseTitle}
                          secondary={`Due: ${format(toDate(record.expiryDate), 'MMM d, yyyy')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              {/* F2F Training Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Face-to-Face Training Status
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={userRecords.f2fRate}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      bgcolor: userRecords.f2fRate === 100 
                        ? 'success.main'
                        : userRecords.f2fRate >= 80
                        ? 'primary.main'
                        : 'warning.main',
                    },
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  {userRecords.f2fRate === 100 
                    ? '🎉 All F2F training up to date!'
                    : `${userRecords.expiredF2F.length} F2F sessions need attention`}
                </Typography>

                {/* Expired F2F */}
                {userRecords.expiredF2F.length > 0 && (
                  <List>
                    {userRecords.expiredF2F.map(record => (
                      <ListItem key={record.id}>
                        <ListItemIcon>
                          <WarningIcon color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={record.courseTitle}
                          secondary={`Expired: ${format(toDate(record.expiryDate), 'MMM d, yyyy')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* Upcoming F2F */}
                {userRecords.upcomingF2F.length > 0 && (
                  <List>
                    {userRecords.upcomingF2F.map(record => (
                      <ListItem key={record.id}>
                        <ListItemIcon>
                          <PendingIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={record.courseTitle}
                          secondary={`Due: ${format(toDate(record.expiryDate), 'MMM d, yyyy')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              {/* Supervisions Section */}
              {userSupervisions.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Scheduled Supervisions
                  </Typography>
                  <List>
                    {userSupervisions.map(supervision => (
                      <ListItem key={supervision.id}>
                        <ListItemIcon>
                          <EventIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`Supervision with ${supervision.supervisor}`}
                          secondary={`Scheduled: ${format(toDate(supervision.date), 'MMM d, yyyy')}`}
                        />
                        <Button 
                          component={RouterLink} 
                          to={`/supervision/${supervision.id}`} 
                          variant="outlined" 
                          size="small"
                        >
                          View Form
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Compliance Section */}
              {staffCompliance && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Your Compliance Status
                  </Typography>
                  <List>
                    {Object.entries(staffCompliance).map(([key, value]) => {
                      if (key === 'userId') return null;
                      return (
                        <ListItem key={key}>
                          <ListItemIcon>
                            {value.status === 'valid' ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <WarningIcon color="error" />
                            )}
                          </ListItemIcon>
                          <ListItemText 
                            primary={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            secondary={value.expiryDate ? 
                              `Expires: ${format(value.expiryDate.toDate(), 'MMM d, yyyy')}` : 
                              'No expiry date'}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          <AttendanceSection />
          <SupervisionFeedbackSection onSubmit={handleSupervisionFeedback} />
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          <LeaderboardSection />
        </Grid>
      </Grid>
    </Box>
  );
};

export { StaffDashboard };
export default StaffDashboard;
