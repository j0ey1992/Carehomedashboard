import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Zoom,
  Fade,
  alpha,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Chip,
  Grid,
} from '@mui/material';
import {
  Info as InfoIcon,
  Close as CloseIcon,
  CheckCircle as ValidIcon,
  LocalHospital as HealthIcon,
} from '@mui/icons-material';
import { HealthCheckForm } from '../../types/compliance';
import { THEME } from '../../theme/colors';

interface HealthCheckDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: HealthCheckForm) => Promise<void>;
  initialData?: Partial<HealthCheckForm>;
}

const commonConditions = [
  'Asthma',
  'Diabetes',
  'High Blood Pressure',
  'Heart Condition',
  'Back Pain',
  'Arthritis',
  'Depression/Anxiety',
  'Other',
];

const HealthCheckDialog: React.FC<HealthCheckDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<HealthCheckForm>>({
    questions: {
      generalHealth: '',
      medications: '',
      allergies: '',
      conditions: [],
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
    },
    completed: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setFormData(initialData || {
        questions: {
          generalHealth: '',
          medications: '',
          allergies: '',
          conditions: [],
          emergencyContact: {
            name: '',
            relationship: '',
            phone: '',
          },
        },
        completed: false,
      });
      setError(null);
      setProgress(0);
    }
  }, [open, initialData]);

  useEffect(() => {
    let completed = 0;
    const questions = formData.questions;
    if (questions) {
      if (questions.generalHealth) completed++;
      if (questions.medications) completed++;
      if (questions.allergies) completed++;
      if (questions.conditions?.length > 0) completed++;
      if (questions.emergencyContact?.name) completed++;
      if (questions.emergencyContact?.relationship) completed++;
      if (questions.emergencyContact?.phone) completed++;
    }
    setProgress((completed / 7) * 100);
  }, [formData]);

  const validateForm = (): boolean => {
    const questions = formData.questions;
    if (!questions) {
      setError('All fields are required');
      return false;
    }

    if (!questions.generalHealth) {
      setError('Please describe your general health');
      return false;
    }

    if (!questions.emergencyContact?.name || 
        !questions.emergencyContact?.relationship || 
        !questions.emergencyContact?.phone) {
      setError('Emergency contact details are required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const healthCheckForm: HealthCheckForm = {
        ...formData,
        questions: formData.questions!,
        completed: true,
      } as HealthCheckForm;

      await onSubmit(healthCheckForm);
      onClose();
    } catch (error) {
      setError('Failed to save health check data');
    } finally {
      setLoading(false);
    }
  };

  const handleConditionToggle = (condition: string) => {
    setFormData(prev => ({
      ...prev,
      questions: {
        ...prev.questions!,
        conditions: prev.questions?.conditions?.includes(condition)
          ? prev.questions.conditions.filter(c => c !== condition)
          : [...(prev.questions?.conditions || []), condition],
      },
    }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      TransitionComponent={Zoom}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HealthIcon sx={{ color: THEME.info }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Health Check Form
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <LinearProgress 
        variant="determinate" 
        value={progress}
        sx={{
          height: 2,
          bgcolor: alpha(THEME.info, 0.1),
          '& .MuiLinearProgress-bar': {
            bgcolor: progress === 100 ? THEME.success : THEME.info,
          },
        }}
      />

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: 'text.secondary',
          }}>
            <InfoIcon fontSize="small" />
            <Typography variant="body2">
              Please complete all sections of this health check form. This information helps us ensure your wellbeing at work.
            </Typography>
          </Box>

          <Fade in={!!error}>
            <Box>
              {error && (
                <Alert 
                  severity="error" 
                  onClose={() => setError(null)}
                  sx={{ 
                    animation: 'shake 0.5s',
                    '@keyframes shake': {
                      '0%, 100%': { transform: 'translateX(0)' },
                      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
                      '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
                    },
                  }}
                >
                  {error}
                </Alert>
              )}
            </Box>
          </Fade>

          <TextField
            label="General Health"
            multiline
            rows={3}
            value={formData.questions?.generalHealth || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questions: {
                ...prev.questions!,
                generalHealth: e.target.value,
              },
            }))}
            placeholder="Please describe your general health status..."
            required
          />

          <TextField
            label="Current Medications"
            multiline
            rows={2}
            value={formData.questions?.medications || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questions: {
                ...prev.questions!,
                medications: e.target.value,
              },
            }))}
            placeholder="List any medications you are currently taking..."
          />

          <TextField
            label="Allergies"
            value={formData.questions?.allergies || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questions: {
                ...prev.questions!,
                allergies: e.target.value,
              },
            }))}
            placeholder="List any allergies..."
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Medical Conditions
            </Typography>
            <FormGroup>
              <Grid container spacing={2}>
                {commonConditions.map((condition) => (
                  <Grid item xs={6} sm={4} key={condition}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.questions?.conditions?.includes(condition) || false}
                          onChange={() => handleConditionToggle(condition)}
                        />
                      }
                      label={condition}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </Box>

          <Box sx={{ 
            p: 2, 
            bgcolor: alpha(THEME.info, 0.05), 
            borderRadius: 1,
            border: `1px solid ${alpha(THEME.info, 0.1)}`,
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, color: THEME.info }}>
              Emergency Contact Details
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={formData.questions?.emergencyContact?.name || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  questions: {
                    ...prev.questions!,
                    emergencyContact: {
                      ...prev.questions?.emergencyContact!,
                      name: e.target.value,
                    },
                  },
                }))}
                required
              />
              <TextField
                label="Relationship"
                value={formData.questions?.emergencyContact?.relationship || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  questions: {
                    ...prev.questions!,
                    emergencyContact: {
                      ...prev.questions?.emergencyContact!,
                      relationship: e.target.value,
                    },
                  },
                }))}
                required
              />
              <TextField
                label="Phone Number"
                value={formData.questions?.emergencyContact?.phone || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  questions: {
                    ...prev.questions!,
                    emergencyContact: {
                      ...prev.questions?.emergencyContact!,
                      phone: e.target.value,
                    },
                  },
                }))}
                required
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || progress !== 100}
          startIcon={<ValidIcon />}
          sx={{
            bgcolor: THEME.success,
            '&:hover': {
              bgcolor: alpha(THEME.success, 0.9),
            },
          }}
        >
          {loading ? 'Saving...' : 'Submit Health Check'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HealthCheckDialog;
