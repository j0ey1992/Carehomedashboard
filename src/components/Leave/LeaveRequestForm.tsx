import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Tooltip,
  IconButton,
  Fade,
  ThemeProvider,
  createTheme,
  alpha,
  useTheme,
  Collapse,
  Chip,
  Grid,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useLeave } from '../../contexts/LeaveContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRotaContext } from '../../contexts/RotaContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { LeaveType } from '../../types/leave';
import {
  format,
  parseISO,
  isWeekend,
  addMonths,
  isBefore,
  isAfter,
  differenceInDays,
  startOfYear,
  endOfYear,
  addYears
} from 'date-fns';
import {
  Help as HelpIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Event as EventIcon,
} from '@mui/icons-material';

// ADHD-friendly theme adjustments (unchanged)
const createADHDFriendlyTheme = (baseTheme: any) =>
  createTheme({
    ...baseTheme,
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: alpha(baseTheme.palette.primary.main, 0.02),
              },
              '&.Mui-focused': {
                backgroundColor: alpha(baseTheme.palette.primary.main, 0.05),
                boxShadow: `0 0 0 2px ${alpha(baseTheme.palette.primary.main, 0.2)}`,
              },
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            padding: '10px 24px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 12px ${alpha(baseTheme.palette.primary.main, 0.2)}`,
            },
          },
        },
      },
    },
  });

// Form steps configuration
const FORM_STEPS = [
  {
    label: 'Leave Type',
    description: 'Select the type of leave you want to request',
  },
  {
    label: 'Date Selection',
    description: 'Choose your leave dates',
  },
  {
    label: 'Review',
    description: 'Review and submit your request',
  },
];

// Busy periods configuration
const BUSY_PERIODS = [
  { start: '12-20', end: '01-05', label: 'Christmas & New Year' },
  { start: '07-15', end: '08-31', label: 'Summer Holidays' },
  { start: '04-01', end: '04-15', label: 'Easter Period' },
];

interface FormData {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  notes: string;
}

export const LeaveRequestForm: React.FC<{
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const baseTheme = useTheme();
  const adhdfTheme = createADHDFriendlyTheme(baseTheme);
  const { leaveEntitlement, calculateLeaveDays, checkLeaveAvailability, teamCalendar, requestLeave } = useLeave();
  const { currentUser, userData } = useAuth();
  const { currentRota } = useRotaContext();
  const { notify } = useNotifications();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [formTouched, setFormTouched] = useState(true); // Set to true initially
  const [busyPeriodWarning, setBusyPeriodWarning] = useState('');
  const [rotaConflict, setRotaConflict] = useState(false);

  // Get current leave year dates
  const getCurrentLeaveYear = () => {
    const now = new Date();
    const year = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
    return {
      start: new Date(year, 3, 1), // April 1st
      end: new Date(year + 1, 2, 31), // March 31st next year
    };
  };

  // Check if date is in current leave year
  const isInCurrentLeaveYear = (date: Date) => {
    const { start, end } = getCurrentLeaveYear();
    return isAfter(date, start) && isBefore(date, end);
  };

  // Calculate days until year end
  const getDaysUntilYearEnd = () => {
    const { end } = getCurrentLeaveYear();
    return differenceInDays(end, new Date());
  };

  // Calculate business days
  const calculateBusinessDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    let totalDays = 0;
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    
    for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
      if (!isWeekend(date)) totalDays++;
    }
    return totalDays;
  };

  const businessDays = calculateBusinessDays(formData.startDate, formData.endDate);

  // Effect to check leave year end and show warnings
  useEffect(() => {
    if (leaveEntitlement && currentUser) {
      const daysUntilYearEnd = getDaysUntilYearEnd();
      
      if (daysUntilYearEnd <= 30 && leaveEntitlement.remainingDays > 5) {
        setErrors(prev => ({
          ...prev,
          yearEnd: `Warning: You have ${leaveEntitlement.remainingDays} days remaining and the leave year ends in ${daysUntilYearEnd} days`
        }));

        notify({
          type: 'system',
          title: 'Leave Year Ending Soon',
          message: `You have ${leaveEntitlement.remainingDays} days of leave remaining. The leave year ends in ${daysUntilYearEnd} days.`,
          userId: currentUser.uid
        });
      }
    }
  }, [leaveEntitlement, currentUser, notify]);

  // Check for busy periods
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const startDate = parseISO(formData.startDate);
      const endDate = parseISO(formData.endDate);
      
      for (const period of BUSY_PERIODS) {
        const currentYear = new Date().getFullYear();
        const periodStart = parseISO(`${currentYear}-${period.start}`);
        const periodEnd = parseISO(`${currentYear}-${period.end}`);
        
        if (
          (isAfter(startDate, periodStart) && isBefore(startDate, periodEnd)) ||
          (isAfter(endDate, periodStart) && isBefore(endDate, periodEnd))
        ) {
          setBusyPeriodWarning(`This request falls within ${period.label}, a typically busy period`);
          return;
        }
      }
      setBusyPeriodWarning('');
    }
  }, [formData.startDate, formData.endDate]);

  // Check for rota conflicts
  useEffect(() => {
    if (formData.startDate && formData.endDate && currentRota) {
      const startDate = parseISO(formData.startDate);
      const endDate = parseISO(formData.endDate);
      const rotaStart = parseISO(currentRota.startDate);
      const rotaEnd = parseISO(currentRota.endDate);

      if (
        (isAfter(startDate, rotaStart) && isBefore(startDate, rotaEnd)) ||
        (isAfter(endDate, rotaStart) && isBefore(endDate, rotaEnd))
      ) {
        setRotaConflict(true);
      } else {
        setRotaConflict(false);
      }
    }
  }, [formData.startDate, formData.endDate, currentRota]);

  // Calculate leave quota usage
  const calculateQuotaUsage = () => {
    if (!leaveEntitlement) return 0;
    return (businessDays / leaveEntitlement.totalEntitlement) * 100;
  };

  // Validation
  const validateStep = async (step: number): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!formData.leaveType) {
          newErrors.leaveType = 'Please select a leave type';
        }
        break;
      case 1:
        if (!formData.startDate) {
          newErrors.startDate = 'Please select a start date';
        }
        if (!formData.endDate) {
          newErrors.endDate = 'Please select an end date';
        }
        if (formData.startDate && formData.endDate) {
          const start = parseISO(formData.startDate);
          const end = parseISO(formData.endDate);
          
          if (end < start) {
            newErrors.endDate = 'End date must be after start date';
          }

          // Check if dates are in current leave year
          if (!isInCurrentLeaveYear(start) || !isInCurrentLeaveYear(end)) {
            newErrors.dates = 'Leave dates must be within the current leave year (April-March)';
          }

          if (leaveEntitlement && businessDays > leaveEntitlement.remainingDays) {
            newErrors.dates = 'Requested days exceed your remaining leave balance';
          }

          // Check availability
          const availability = await checkLeaveAvailability(
            formData.startDate,
            formData.endDate,
            formData.leaveType
          );

          if (!availability.isAvailable) {
            availability.conflicts.forEach(conflict => {
              newErrors.dates = conflict.message;
            });
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = async () => {
    if (await validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData || !(await validateStep(activeStep))) return;

    setIsSubmitting(true);
    try {
      await requestLeave({
        userId: currentUser.uid,
        staffName: userData.name || 'Unknown Staff',
        site: userData.site || 'Unknown Site',
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: businessDays,
        leaveType: formData.leaveType,
        notes: formData.notes
      });

      notify({
        type: 'system',
        title: 'Leave Request Submitted',
        message: 'Your leave request has been submitted for approval',
        userId: currentUser.uid
      });

      await onSubmit();
      
      // Reset form
      setFormData({
        leaveType: 'Annual Leave',
        startDate: '',
        endDate: '',
        notes: '',
      });
      setActiveStep(0);
    } catch (err) {
      setErrors({
        ...errors,
        submit: err instanceof Error ? err.message : 'Failed to submit leave request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form steps
  const renderLeaveTypeStep = () => (
    <Fade in timeout={500}>
      <Stack spacing={3}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Leave Type</InputLabel>
            <Select
              value={formData.leaveType}
              label="Leave Type"
              onChange={(e) => {
                setFormData({ ...formData, leaveType: e.target.value as LeaveType });
                setFormTouched(true);
              }}
              error={!!errors.leaveType}
              sx={{
                borderRadius: '12px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <MenuItem value="Annual Leave">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography>Annual Leave</Typography>
                  {leaveEntitlement && (
                    <Chip 
                      label={`${leaveEntitlement.remainingDays} days remaining`}
                      size="small"
                      color={leaveEntitlement.remainingDays < 5 ? "warning" : "success"}
                      sx={{ ml: 1 }}
                    />
                  )}
                </Stack>
              </MenuItem>
              <MenuItem value="Unpaid Leave">Unpaid Leave</MenuItem>
              <MenuItem value="Emergency Leave">Emergency Leave</MenuItem>
            </Select>
            {errors.leaveType && (
              <Typography color="error" variant="caption" sx={{ mt: 1, ml: 1 }}>
                {errors.leaveType}
              </Typography>
            )}
          </FormControl>

          {leaveEntitlement && (
            <>
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 2,
                  borderRadius: '12px',
                  backgroundColor: (theme) => alpha(theme.palette.info.main, 0.1),
                }}
                icon={<InfoIcon />}
              >
                <Stack spacing={1}>
                  <Typography variant="body2">
                    Annual Leave Balance: {leaveEntitlement.remainingDays} days
                  </Typography>
                  {leaveEntitlement.carryForwardDays > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Including {leaveEntitlement.carryForwardDays} carried forward days
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Current Leave Year: {format(getCurrentLeaveYear().start, 'do MMM yyyy')} - {format(getCurrentLeaveYear().end, 'do MMM yyyy')}
                  </Typography>
                </Stack>
              </Alert>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Leave Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={calculateQuotaUsage()}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: alpha(baseTheme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {Math.round(calculateQuotaUsage())}% of annual entitlement used
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Stack>
    </Fade>
  );

  const renderDateSelectionStep = () => (
    <Fade in timeout={500}>
      <Stack spacing={3}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={formData.startDate ? parseISO(formData.startDate) : null}
                onChange={(date) => {
                  setFormData({
                    ...formData,
                    startDate: date ? format(date, 'yyyy-MM-dd') : '',
                  });
                  setFormTouched(true);
                }}
                disablePast
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startDate,
                    helperText: errors.startDate,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={formData.endDate ? parseISO(formData.endDate) : null}
                onChange={(date) => {
                  setFormData({
                    ...formData,
                    endDate: date ? format(date, 'yyyy-MM-dd') : '',
                  });
                  setFormTouched(true);
                }}
                disablePast
                minDate={formData.startDate ? parseISO(formData.startDate) : undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.endDate,
                    helperText: errors.endDate,
                  },
                }}
              />
            </Grid>
          </Grid>

          {businessDays > 0 && (
            <Alert 
              severity="info"
              sx={{ 
                mt: 3,
                borderRadius: '12px',
                backgroundColor: (theme) => alpha(theme.palette.info.main, 0.1),
              }}
            >
              <Typography variant="body2">
                Total Working Days: {businessDays} {businessDays === 1 ? 'day' : 'days'}
              </Typography>
            </Alert>
          )}

          {busyPeriodWarning && (
            <Alert
              severity="warning"
              sx={{
                mt: 2,
                borderRadius: '12px',
              }}
              icon={<WarningIcon />}
            >
              <Typography variant="body2">
                {busyPeriodWarning}
              </Typography>
            </Alert>
          )}

          {rotaConflict && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                borderRadius: '12px',
              }}
              icon={<EventIcon />}
            >
              <Typography variant="body2">
                This leave request conflicts with an existing rota. Please coordinate with your manager.
              </Typography>
            </Alert>
          )}

          {errors.dates && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                borderRadius: '12px',
              }}
            >
              <Typography variant="body2">
                {errors.dates}
              </Typography>
            </Alert>
          )}

          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => {
              setFormData({ ...formData, notes: e.target.value });
              setFormTouched(true);
            }}
            sx={{ mt: 3 }}
          />
        </Paper>
      </Stack>
    </Fade>
  );

  const renderReviewStep = () => (
    <Fade in timeout={500}>
      <Stack spacing={3}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" gutterBottom color="primary">
            Review Your Request
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Leave Type
              </Typography>
              <Typography variant="body1">
                {formData.leaveType}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="body1">
                {format(parseISO(formData.startDate), 'PPP')} - {format(parseISO(formData.endDate), 'PPP')}
                <Typography variant="body2" color="text.secondary">
                  ({businessDays} working {businessDays === 1 ? 'day' : 'days'})
                </Typography>
              </Typography>
            </Box>
            {formData.notes && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body1">
                  {formData.notes}
                </Typography>
              </Box>
            )}

            {errors.yearEnd && (
              <Alert 
                severity="warning"
                sx={{ mt: 2, borderRadius: '12px' }}
              >
                <Typography variant="body2">
                  {errors.yearEnd}
                </Typography>
              </Alert>
            )}

            {!isInCurrentLeaveYear(parseISO(formData.startDate)) && (
              <Alert 
                severity="info"
                sx={{ mt: 2, borderRadius: '12px' }}
              >
                <Typography variant="body2">
                  This leave request is for the {format(parseISO(formData.startDate), 'yyyy')}-{format(parseISO(formData.endDate), 'yyyy')} leave year
                </Typography>
              </Alert>
            )}

            {(busyPeriodWarning || rotaConflict) && (
              <Alert
                severity="warning"
                sx={{ mt: 2, borderRadius: '12px' }}
              >
                <Typography variant="body2" gutterBottom>
                  Please note the following:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {busyPeriodWarning && (
                    <li>{busyPeriodWarning}</li>
                  )}
                  {rotaConflict && (
                    <li>This request conflicts with an existing rota</li>
                  )}
                </ul>
              </Alert>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Fade>
  );

  return (
    <ThemeProvider theme={adhdfTheme}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={4}>
          {/* Progress Stepper */}
          <Stepper 
            activeStep={activeStep} 
            alternativeLabel
            sx={{ mb: 4 }}
          >
            {FORM_STEPS.map((step, index) => (
              <Step 
                key={step.label}
                completed={index < activeStep}
              >
                <StepLabel
                  optional={
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                  }
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Help Toggle */}
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <Tooltip title={showHelp ? "Hide help" : "Show help"}>
              <IconButton 
                onClick={() => setShowHelp(!showHelp)}
                color={showHelp ? "primary" : "default"}
              >
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Help Content */}
          <Collapse in={showHelp}>
            <Alert 
              severity="info"
              sx={{ mb: 3, borderRadius: '12px' }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Need Help?
              </Typography>
              <Typography variant="body2">
                • Select your leave type first
                <br />
                • Choose your start and end dates (within current leave year: {format(getCurrentLeaveYear().start, 'MMM yyyy')} - {format(getCurrentLeaveYear().end, 'MMM yyyy')})
                <br />
                • Add any notes or comments (optional)
                <br />
                • Review your request before submitting
              </Typography>
            </Alert>
          </Collapse>

          {/* Form Steps */}
          {activeStep === 0 && renderLeaveTypeStep()}
          {activeStep === 1 && renderDateSelectionStep()}
          {activeStep === 2 && renderReviewStep()}

          {/* Error Messages */}
          {errors.submit && (
            <Alert 
              severity="error"
              sx={{ 
                mt: 2,
                borderRadius: '12px',
                backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
              }}
            >
              {errors.submit}
            </Alert>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              onClick={onCancel}
              startIcon={<CancelIcon />}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              Cancel
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep > 0 && (
                <Button
                  onClick={handleBack}
                  startIcon={<BackIcon />}
                >
                  Back
                </Button>
              )}
              {activeStep < FORM_STEPS.length - 1 ? (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  endIcon={<NextIcon />}
                  disabled={!formTouched}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting || !formTouched}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  sx={{
                    bgcolor: (theme) => theme.palette.success.main,
                    '&:hover': {
                      bgcolor: (theme) => theme.palette.success.dark,
                    },
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              )}
            </Box>
          </Box>
        </Stack>
      </Box>
    </ThemeProvider>
  );
};
