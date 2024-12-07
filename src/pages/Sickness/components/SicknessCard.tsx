import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Alert,
  Button,
  Tooltip,
  Zoom,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  ButtonGroup,
  Chip,
} from '@mui/material';
import {
  Sick as SickIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
  CheckCircle as CompleteIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  ArrowForward as NextStepIcon,
  Done as DoneIcon,
  Flag as FlagIcon,
  EventBusy as UnpaidLeaveIcon,
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { alpha, useTheme } from '@mui/material/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useSickness } from '../../../contexts/SicknessContext';
import { SicknessRecord } from '../../../types/sickness';

interface Props {
  record: SicknessRecord;
  onScheduleMeeting?: (record: SicknessRecord) => void;
  onAddNotes?: (record: SicknessRecord) => void;
  onEdit?: (record: SicknessRecord) => void;
  onUploadForm?: (record: SicknessRecord) => void;
  onComplete?: (record: SicknessRecord) => void;
}

const toDate = (value: Date | Timestamp | null | undefined): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return value.toDate();
};

const getStepInfo = (step: number) => {
  const steps = ['No Steps', 'Record Created', 'Review Meeting', 'Case Resolved'];
  return { steps, activeStep: step };
};

const SicknessCard: React.FC<Props> = ({ 
  record, 
  onScheduleMeeting, 
  onAddNotes,
  onEdit,
  onUploadForm,
  onComplete,
}) => {
  const theme = useTheme();
  const { isAdmin, isSiteManager } = useAuth();
  const { getTriggerStatus, progressToNextStep } = useSickness();

  const startDate = toDate(record.startDate);
  const endDate = record.endDate ? toDate(record.endDate) : null;
  const duration = endDate ? differenceInDays(endDate, startDate) : 
                  differenceInDays(new Date(), startDate);
  
  const recordStats = getTriggerStatus(record.staffId);
  const showManagerActions = (isAdmin || isSiteManager);
  const { steps, activeStep } = getStepInfo(record.step);

  const statusColor = record.status === 'review' ? theme.palette.warning.main : 
                     record.status === 'current' ? theme.palette.error.main : 
                     theme.palette.success.main;

  const handleNextStep = async () => {
    try {
      await progressToNextStep(record);
    } catch (error) {
      console.error('Error progressing to next step:', error);
    }
  };

  const getStepChipColor = (step: number) => {
    if (step === 0) return 'default';
    if (step === 3) return 'success';
    if (step === 2) return 'warning';
    return 'info';
  };

  const getTriggerProgress = () => {
    if (!recordStats) return 0;
    const daysProgress = Math.min((recordStats.totalDays / 10) * 100, 100);
    const occurrencesProgress = Math.min((recordStats.occurrences / 4) * 100, 100);
    return Math.max(daysProgress, occurrencesProgress);
  };

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
          position: 'relative',
          overflow: 'visible',
          bgcolor: alpha(statusColor, 0.05),
          border: `1px solid ${alpha(statusColor, 0.2)}`,
        }}
      >
        {/* Type and Step Indicator */}
        <Box sx={{ position: 'absolute', top: -12, left: 16, right: 16, display: 'flex', gap: 1 }}>
          {record.type === 'authorised_unpaid' ? (
            <Chip
              icon={<UnpaidLeaveIcon />}
              label="Unpaid Leave"
              color="info"
              size="small"
              sx={{ flex: 1 }}
            />
          ) : (
            <>
              <Chip
                icon={<SickIcon />}
                label={`Step ${record.step}`}
                color={getStepChipColor(record.step)}
                size="small"
                sx={{ flex: 1 }}
              />
              <LinearProgress
                variant="determinate"
                value={getTriggerProgress()}
                color={recordStats?.hasReachedTrigger ? "error" : recordStats?.isNearingTrigger ? "warning" : "primary"}
                sx={{ 
                  flex: 2,
                  height: 24,
                  borderRadius: 12,
                  bgcolor: alpha(theme.palette.grey[500], 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 12,
                  }
                }}
              />
            </>
          )}
        </Box>

        <CardContent sx={{ flexGrow: 1, pt: 3 }}>
          <Stack spacing={2}>
            {/* Header */}
            <Box 
              display="flex" 
              alignItems="center" 
              gap={1}
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: alpha(statusColor, 0.1),
              }}
            >
              <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
                {record.staffName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {record.status === 'review' && (
                  <Tooltip title="Review Required" TransitionComponent={Zoom}>
                    <WarningIcon color="warning" />
                  </Tooltip>
                )}
                {record.status === 'completed' && (
                  <Tooltip title="Case Resolved" TransitionComponent={Zoom}>
                    <CompleteIcon color="success" />
                  </Tooltip>
                )}
              </Stack>
            </Box>

            {/* Step Indicator - Only show if steps have started and it's a sickness record */}
            {record.type === 'sickness' && record.step > 0 && (
              <Stepper activeStep={activeStep - 1} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.875rem' } }}>
                {steps.slice(1).map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}

            {/* Reason */}
            <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Reason:
              </Typography>
              <Typography variant="body1" color="text.primary">
                {record.reason}
              </Typography>
            </Box>

            {/* Dates and Duration */}
            <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Start Date: {format(startDate, 'PPP')}
              </Typography>
              {endDate && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  End Date: {format(endDate, 'PPP')}
                </Typography>
              )}
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold',
                  color: duration > 7 ? 'error.main' : 'text.primary',
                  mt: 1
                }}
              >
                Duration: {duration} days
              </Typography>
            </Box>

            {/* Notes */}
            {record.notes && (
              <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Notes:
                </Typography>
                <Typography variant="body2" color="text.primary">
                  {record.notes}
                </Typography>
              </Box>
            )}

            {/* Trigger Warning - Only show for sickness records */}
            {record.type === 'sickness' && recordStats && (recordStats.isNearingTrigger || recordStats.hasReachedTrigger) && (
              <Alert 
                severity={recordStats.hasReachedTrigger ? "error" : "warning"}
                icon={recordStats.hasReachedTrigger ? <FlagIcon /> : <WarningIcon />}
                sx={{ 
                  mt: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  },
                  '& .MuiAlert-message': {
                    color: recordStats.hasReachedTrigger ? theme.palette.error.dark : theme.palette.warning.dark
                  }
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {recordStats.hasReachedTrigger ? 'Trigger Points Reached:' : 'Nearing Trigger Points:'}
                </Typography>
                <Typography variant="body2">
                  • {recordStats.occurrences}/4 occurrences
                  <br />
                  • {recordStats.totalDays}/10 days
                </Typography>
                {recordStats.hasReachedTrigger && record.step === 0 && (
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Sickness review meeting required - Progress to Step 1
                  </Typography>
                )}
              </Alert>
            )}

            {/* Review Date */}
            {record.status === 'review' && record.reviewDate && (
              <Alert 
                severity="info"
                sx={{ 
                  mt: 2,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  '& .MuiAlert-icon': {
                    color: theme.palette.info.main
                  },
                  '& .MuiAlert-message': {
                    color: theme.palette.info.dark
                  }
                }}
              >
                <Typography variant="subtitle2">
                  Review scheduled for: {format(toDate(record.reviewDate), 'PPP')}
                </Typography>
              </Alert>
            )}

            {/* Action Buttons */}
            {showManagerActions && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {/* Primary Actions */}
                <ButtonGroup fullWidth variant="contained">
                  {onEdit && (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => onEdit(record)}
                      sx={{ flex: 1 }}
                    >
                      Edit
                    </Button>
                  )}
                  {record.type === 'sickness' && onUploadForm && (
                    <Button
                      startIcon={<UploadIcon />}
                      onClick={() => onUploadForm(record)}
                      sx={{ flex: 1 }}
                    >
                      Return to Work Form
                    </Button>
                  )}
                </ButtonGroup>

                {/* Status-based Actions */}
                {record.type === 'sickness' && (
                  <ButtonGroup fullWidth variant="contained">
                    {record.status === 'current' && onScheduleMeeting && (
                      <Button
                        startIcon={<CalendarIcon />}
                        onClick={() => onScheduleMeeting(record)}
                        color="primary"
                        sx={{ flex: 1 }}
                      >
                        Schedule Meeting
                      </Button>
                    )}
                    {record.status === 'review' && onAddNotes && (
                      <Button
                        startIcon={<NotesIcon />}
                        onClick={() => onAddNotes(record)}
                        color="warning"
                        sx={{ flex: 1 }}
                      >
                        Add Meeting Notes
                      </Button>
                    )}
                  </ButtonGroup>
                )}

                {/* Progress Actions */}
                <ButtonGroup fullWidth variant="contained">
                  {record.type === 'sickness' && record.step < 3 && (
                    <Button
                      startIcon={<NextStepIcon />}
                      onClick={handleNextStep}
                      color="info"
                      sx={{ flex: 1 }}
                    >
                      {record.step === 0 ? 'Start Steps' : 'Next Step'}
                    </Button>
                  )}
                  {onComplete && record.status !== 'completed' && (
                    <Button
                      startIcon={<DoneIcon />}
                      onClick={() => onComplete(record)}
                      color="success"
                      sx={{ flex: 1 }}
                    >
                      Mark Complete
                    </Button>
                  )}
                </ButtonGroup>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Zoom>
  );
};

export default SicknessCard;
