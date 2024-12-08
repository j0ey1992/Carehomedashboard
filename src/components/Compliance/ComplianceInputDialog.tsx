import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  Chip,
  Tooltip,
  LinearProgress,
  Zoom,
  Fade,
  alpha,
  IconButton,
  Rating,
} from '@mui/material';
import {
  DatePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addMonths, addYears, isAfter, isBefore } from 'date-fns';
import { ComplianceItem, CompetencyItem } from '../../types/compliance';
import { Timestamp } from 'firebase/firestore';
import { THEME } from '../../theme/colors';
import {
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  CheckCircle as ValidIcon,
  Error as ExpiredIcon,
  Close as CloseIcon,
  Star as StarIcon,
} from '@mui/icons-material';

interface ComplianceInputDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ComplianceItem | CompetencyItem) => Promise<void>;
  title: string;
  description?: string;
  initialData?: Partial<ComplianceItem> | Partial<CompetencyItem>;
  isCompetencyAssessment?: boolean;
}

interface ComplianceFormData {
  date: Date | null;
  expiryDate: Date | null;
  status: 'valid' | 'expired';
  notes?: string;
  assessedBy?: string;
  score?: number;
}

const QuickExpiryButton: React.FC<{
  label: string;
  onClick: () => void;
  color: string;
  tooltip: string;
}> = ({ label, onClick, color, tooltip }) => (
  <Tooltip title={tooltip} arrow placement="top">
    <Button
      size="small"
      variant="outlined"
      onClick={onClick}
      sx={{
        color,
        borderColor: alpha(color, 0.5),
        bgcolor: alpha(color, 0.05),
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: color,
          bgcolor: alpha(color, 0.1),
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center">
        <CalendarIcon fontSize="small" />
        {label}
      </Stack>
    </Button>
  </Tooltip>
);

const ComplianceInputDialog: React.FC<ComplianceInputDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  description,
  initialData,
  isCompetencyAssessment = false,
}) => {
  const [formData, setFormData] = useState<ComplianceFormData>({
    date: initialData?.date?.toDate() || null,
    expiryDate: initialData?.expiryDate?.toDate() || null,
    status: initialData?.status || 'valid',
    notes: initialData?.notes || '',
    assessedBy: (initialData as CompetencyItem)?.assessedBy || '',
    score: (initialData as CompetencyItem)?.score || 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Update form data when dialog opens or initial data changes
  useEffect(() => {
    if (open) {
      const status = initialData?.status || 'valid';
      setFormData({
        date: initialData?.date?.toDate() || null,
        expiryDate: initialData?.expiryDate?.toDate() || null,
        status,
        notes: initialData?.notes || '',
        assessedBy: (initialData as CompetencyItem)?.assessedBy || '',
        score: (initialData as CompetencyItem)?.score || 0,
      });
      setError(null);
      setProgress(0);
    }
  }, [open, initialData]);

  // Update progress bar
  useEffect(() => {
    let completed = 0;
    if (formData.date) completed++;
    if (formData.status === 'valid') completed++;
    if (formData.notes?.trim()) completed++;
    if (isCompetencyAssessment) {
      if (formData.assessedBy?.trim()) completed++;
      if (formData.score && formData.score > 0) completed++;
      setProgress((completed / 5) * 100);
    } else {
      setProgress((completed / 3) * 100);
    }
  }, [formData, isCompetencyAssessment]);

  // Update status based on expiry date
  useEffect(() => {
    if (formData.expiryDate) {
      const now = new Date();
      const status = isAfter(formData.expiryDate, now) ? 'valid' : 'expired';
      if (status !== formData.status) {
        setFormData(prev => ({ ...prev, status }));
      }
    }
  }, [formData.expiryDate]);

  const validateForm = (): boolean => {
    if (!formData.date) {
      setError('Completion date is required');
      return false;
    }

    if (formData.expiryDate && isBefore(formData.expiryDate, formData.date)) {
      setError('Expiry date cannot be before completion date');
      return false;
    }

    if (formData.expiryDate && isBefore(formData.expiryDate, new Date())) {
      if (formData.status === 'valid') {
        setFormData(prev => ({ ...prev, status: 'expired' }));
      }
    }

    if (isCompetencyAssessment) {
      if (!formData.assessedBy?.trim()) {
        setError('Assessor name is required');
        return false;
      }
      if (!formData.score || formData.score <= 0) {
        setError('Assessment score is required');
        return false;
      }
    }

    return true;
  };

const handleSubmit = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    const status = formData.expiryDate && isAfter(formData.expiryDate, new Date()) ? 'valid' as const : 'expired' as const;
    
    const baseData = {
      type: 'compliance' as const,
      date: Timestamp.fromDate(formData.date!),
      expiryDate: formData.expiryDate ? Timestamp.fromDate(formData.expiryDate) : null,
      status,
      notes: formData.notes,
    };

    if (isCompetencyAssessment) {
      const competencyItem: CompetencyItem = {
        ...baseData,
        type: 'competency',
        assessedBy: formData.assessedBy!,
        score: formData.score!,
      };
      await onSubmit(competencyItem);
    } else {
      const complianceItem: ComplianceItem = {
        ...baseData,
        type: 'compliance',
      };
      await onSubmit(complianceItem);
    }
    onClose();
  } catch (error) {
    setError('Failed to save compliance data');
  } finally {
    setLoading(false);
  }
};

  const handleQuickExpiry = (duration: 'sixMonths' | 'oneYear' | 'threeYears') => {
    if (!formData.date) return;

    const date = formData.date;
    let expiryDate: Date;

    switch (duration) {
      case 'sixMonths':
        expiryDate = addMonths(date, 6);
        break;
      case 'oneYear':
        expiryDate = addYears(date, 1);
        break;
      case 'threeYears':
        expiryDate = addYears(date, 3);
        break;
    }

    const status = isAfter(expiryDate, new Date()) ? 'valid' : 'expired';
    setFormData(prev => ({
      ...prev,
      expiryDate,
      status,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return THEME.success;
      default:
        return THEME.error;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <ValidIcon />;
      default:
        return <ExpiredIcon />;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      TransitionComponent={Zoom}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
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
          {description && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: 'text.secondary',
            }}>
              <InfoIcon fontSize="small" />
              <Typography variant="body2">
                {description}
              </Typography>
            </Box>
          )}

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

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Completion Date"
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ 
                ...prev, 
                date,
                status: date ? (
                  prev.expiryDate && isBefore(prev.expiryDate, new Date()) ? 
                  'expired' : 'valid'
                ) : 'valid'
              }))}
              slotProps={{
                textField: {
                  required: true,
                  error: !formData.date && !!error,
                  helperText: !formData.date && !!error ? 'Required field' : '',
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        '& fieldset': {
                          borderColor: THEME.info,
                        },
                      },
                    },
                  },
                }
              }}
            />
          </LocalizationProvider>

          <Box>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Expiry Date"
                value={formData.expiryDate}
                onChange={(date) => setFormData(prev => ({ 
                  ...prev, 
                  expiryDate: date,
                  status: date ? (
                    isBefore(date, new Date()) ? 'expired' : 'valid'
                  ) : prev.status
                }))}
                slotProps={{
                  textField: {
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          '& fieldset': {
                            borderColor: THEME.info,
                          },
                        },
                      },
                    },
                  }
                }}
              />
            </LocalizationProvider>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <QuickExpiryButton
                label="+6 Months"
                onClick={() => handleQuickExpiry('sixMonths')}
                color={THEME.info}
                tooltip="Set expiry to 6 months from completion date"
              />
              <QuickExpiryButton
                label="+1 Year"
                onClick={() => handleQuickExpiry('oneYear')}
                color={THEME.info}
                tooltip="Set expiry to 1 year from completion date"
              />
              <QuickExpiryButton
                label="+3 Years"
                onClick={() => handleQuickExpiry('threeYears')}
                color={THEME.info}
                tooltip="Set expiry to 3 years from completion date"
              />
            </Stack>
          </Box>

          {isCompetencyAssessment && (
            <>
              <TextField
                label="Assessed By"
                value={formData.assessedBy}
                onChange={(e) => setFormData(prev => ({ ...prev, assessedBy: e.target.value }))}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      '& fieldset': {
                        borderColor: THEME.info,
                      },
                    },
                  },
                }}
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Assessment Score
                </Typography>
                <Rating
                  value={formData.score}
                  onChange={(_, newValue) => setFormData(prev => ({ ...prev, score: newValue || 0 }))}
                  max={5}
                  icon={<StarIcon fontSize="large" />}
                  emptyIcon={<StarIcon fontSize="large" />}
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: THEME.info,
                    },
                    '& .MuiRating-iconHover': {
                      color: alpha(THEME.info, 0.7),
                    },
                  }}
                />
              </Box>
            </>
          )}

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                status: e.target.value as 'valid' | 'expired'
              }))}
              label="Status"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(getStatusColor(formData.status), 0.5),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: getStatusColor(formData.status),
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: getStatusColor(formData.status),
                },
              }}
            >
              <MenuItem value="valid">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ValidIcon sx={{ color: THEME.success }} />
                  <Chip 
                    label="COMPLIANT" 
                    size="small"
                    sx={{ 
                      bgcolor: `${THEME.success}15`,
                      color: THEME.success,
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              </MenuItem>
              <MenuItem value="expired">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ExpiredIcon sx={{ color: THEME.error }} />
                  <Chip 
                    label="EXPIRED" 
                    size="small"
                    sx={{ 
                      bgcolor: `${THEME.error}15`,
                      color: THEME.error,
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any additional notes or comments..."
            sx={{
              '& .MuiOutlinedInput-root': {
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  '& fieldset': {
                    borderColor: THEME.info,
                  },
                },
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: alpha(THEME.grey, 0.1),
            },
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !formData.date}
          startIcon={getStatusIcon(formData.status)}
          sx={{
            bgcolor: getStatusColor(formData.status),
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: alpha(getStatusColor(formData.status), 0.8),
              transform: 'translateY(-2px)',
            },
            '&:disabled': {
              bgcolor: alpha(THEME.grey, 0.2),
            },
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComplianceInputDialog;
