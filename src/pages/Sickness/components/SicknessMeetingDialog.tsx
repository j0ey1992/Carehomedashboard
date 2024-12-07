import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
  Assignment as OutcomesIcon,
  PlaylistAdd as ActionsIcon,
  Event as ReviewIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  ContentPaste as TemplateIcon,
} from '@mui/icons-material';
import { Timestamp } from 'firebase/firestore';
import { alpha, useTheme } from '@mui/material/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useSickness } from '../../../contexts/SicknessContext';
import { useTask } from '../../../contexts/TaskContext';
import { createNotification } from '../../../utils/notifications';
import { SicknessRecord } from '../../../types/sickness';

interface Props {
  open: boolean;
  onClose: () => void;
  record: SicknessRecord;
}

const STEPS = ['Schedule', 'Notes', 'Outcomes', 'Actions', 'Review'];

type TemplateField = 'notes' | 'outcomes' | 'followUpActions';

const TEMPLATES: Record<TemplateField, string[]> = {
  notes: [
    'Employee confirmed fit to return to work',
    'Discussed support needed for return',
    'Reviewed absence history and patterns',
  ],
  outcomes: [
    'Return to work approved',
    'Adjustments required',
    'Further review needed',
  ],
  followUpActions: [
    'Schedule follow-up meeting',
    'Update risk assessment',
    'Arrange occupational health referral',
  ],
};

const SicknessMeetingDialog: React.FC<Props> = ({ open, onClose, record }) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { updateSicknessRecord, scheduleReview, progressToNextStep } = useSickness();
  const { addTask } = useTask();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    meetingDate: '',
    notes: '',
    outcomes: '',
    followUpActions: '',
    nextReviewDate: '',
  });

  const isStepComplete = (step: number) => {
    switch (step) {
      case 0:
        return !!formData.meetingDate;
      case 1:
        return !!formData.notes;
      case 2:
        return !!formData.outcomes;
      case 3:
        return true; // Actions are optional
      case 4:
        return true; // Review is optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepComplete(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const addTemplate = (field: TemplateField, template: string) => {
    const currentValue = formData[field];
    const newValue = currentValue
      ? `${currentValue}\n${template}`
      : template;
    setFormData({ ...formData, [field]: newValue });
  };

  const handleSubmit = async () => {
    try {
      const meetingDate = new Date(formData.meetingDate);
      const nextReviewDate = formData.nextReviewDate ? new Date(formData.nextReviewDate) : undefined;

      // Create task for any follow-up actions
      if (formData.followUpActions.trim()) {
        await addTask({
          title: `Sickness Follow-up Actions - ${record.staffName}`,
          description: formData.followUpActions,
          dueDate: nextReviewDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priority: 'high',
          status: 'pending',
          assignedTo: currentUser!.uid,
          category: 'sickness',
          relatedRecordId: record.id,
          relatedRecordType: 'sickness',
          site: record.site,
        });
      }

      // Schedule next review if needed
      if (nextReviewDate) {
        await scheduleReview(record, nextReviewDate);
      }

      // Update record status and progress to next step
      if (!nextReviewDate) {
        await updateSicknessRecord(record.id, {
          status: 'completed',
          reviewNotes: formData.notes,
        });
      }

      // Progress to next step in workflow
      await progressToNextStep(record);

      // Notify staff member
      await createNotification(
        record.staffId,
        'system',
        'Return to Work Meeting Completed',
        `Your return to work meeting notes have been recorded${nextReviewDate ? '. A follow-up review has been scheduled.' : '.'}`,
        '/sickness'
      );

      onClose();
      setError(null);
      setFormData({
        meetingDate: '',
        notes: '',
        outcomes: '',
        followUpActions: '',
        nextReviewDate: '',
      });
      setActiveStep(0);
    } catch (err) {
      console.error('Error saving meeting notes:', err);
      setError('Failed to save meeting notes. Please try again.');
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon color="primary" />
              Schedule Meeting
            </Typography>
            <TextField
              type="datetime-local"
              label="Meeting Date & Time"
              value={formData.meetingDate}
              onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
              error={!formData.meetingDate}
              helperText={!formData.meetingDate ? 'Required' : ''}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon color="primary" />
              Meeting Notes
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {TEMPLATES.notes.map((template, index) => (
                <Tooltip key={index} title="Add template">
                  <Chip
                    icon={<TemplateIcon />}
                    label={template}
                    onClick={() => addTemplate('notes', template)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Tooltip>
              ))}
            </Stack>
            <TextField
              label="Meeting Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={4}
              required
              error={!formData.notes}
              helperText={!formData.notes ? 'Required' : 'Document key points discussed during the meeting'}
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OutcomesIcon color="primary" />
              Meeting Outcomes
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {TEMPLATES.outcomes.map((template, index) => (
                <Tooltip key={index} title="Add template">
                  <Chip
                    icon={<TemplateIcon />}
                    label={template}
                    onClick={() => addTemplate('outcomes', template)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Tooltip>
              ))}
            </Stack>
            <TextField
              label="Outcomes"
              value={formData.outcomes}
              onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
              fullWidth
              multiline
              rows={3}
              required
              error={!formData.outcomes}
              helperText={!formData.outcomes ? 'Required' : 'Enter each outcome on a new line'}
            />
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ActionsIcon color="primary" />
              Follow-up Actions
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {TEMPLATES.followUpActions.map((template, index) => (
                <Tooltip key={index} title="Add template">
                  <Chip
                    icon={<TemplateIcon />}
                    label={template}
                    onClick={() => addTemplate('followUpActions', template)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Tooltip>
              ))}
            </Stack>
            <TextField
              label="Follow-up Actions"
              value={formData.followUpActions}
              onChange={(e) => setFormData({ ...formData, followUpActions: e.target.value })}
              fullWidth
              multiline
              rows={3}
              helperText="Enter each action on a new line (optional)"
            />
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReviewIcon color="primary" />
              Next Review
            </Typography>
            <TextField
              type="date"
              label="Next Review Date (if needed)"
              value={formData.nextReviewDate}
              onChange={(e) => setFormData({ ...formData, nextReviewDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Leave blank if no further review is needed"
              sx={{ mt: 2 }}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5">
            {record.status === 'review' ? 'Return to Work Meeting' : 'Schedule Meeting'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            - {record.staffName}
          </Typography>
        </Box>
      </DialogTitle>

      <LinearProgress 
        variant="determinate" 
        value={(activeStep / (STEPS.length - 1)) * 100}
        sx={{
          height: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
        }}
      />

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Stepper 
            activeStep={activeStep} 
            alternativeLabel
            sx={{
              '& .MuiStepLabel-label': {
                fontSize: '0.875rem',
              },
            }}
          >
            {STEPS.map((label, index) => (
              <Step key={label} completed={isStepComplete(index)}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            {renderStepContent()}
          </Paper>

          {error && (
            <Alert 
              severity="error"
              sx={{
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
            >
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<BackIcon />}
        >
          Back
        </Button>
        {activeStep === STEPS.length - 1 ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.meetingDate || !formData.notes || !formData.outcomes}
            startIcon={<SaveIcon />}
          >
            Save Meeting
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="contained"
            color="primary"
            disabled={!isStepComplete(activeStep)}
            endIcon={<NextIcon />}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SicknessMeetingDialog;
