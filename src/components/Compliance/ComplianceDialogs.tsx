import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Rating,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { THEME } from '../../theme/colors';
import { 
  StaffCompliance, 
  CompetencyItem, 
  SignableItem, 
  HealthCheckItem,
  ComplianceItem,
  DynamicComplianceItem,
  ComplianceFormState,
  ComplianceFormUpdater
} from '../../types/compliance';
import DynamicComplianceDialog from './DynamicComplianceDialog';
import { Timestamp } from 'firebase/firestore';

interface HealthAnswer {
  [key: string]: string | boolean | number;
}

const HEALTH_CHECK_QUESTIONS = [
  { id: 'general', label: 'How would you rate your general health?', type: 'rating' },
  { id: 'conditions', label: 'Do you have any pre-existing medical conditions?', type: 'text' },
  { id: 'medications', label: 'Are you currently taking any medications?', type: 'text' },
  { id: 'restrictions', label: 'Do you have any work restrictions?', type: 'text' },
  { id: 'vaccinations', label: 'Are your vaccinations up to date?', type: 'boolean' },
];

interface ComplianceDialogsProps {
  healthCheckOpen: boolean;
  signDialogOpen: boolean;
  editDialogOpen: boolean;
  dynamicDialogOpen: boolean;
  healthAnswers: HealthAnswer;
  signType: 'supervisionAgreement' | 'beneficiaryOnFile' | null;
  selectedField: keyof StaffCompliance | null;
  formData: ComplianceFormState;
  loading: boolean;
  onHealthCheckClose: () => void;
  onSignDialogClose: () => void;
  onEditDialogClose: () => void;
  onDynamicDialogClose: () => void;
  onHealthAnswersChange: (answers: HealthAnswer) => void;
  onFormDataChange: (dataOrUpdater: ComplianceFormState | ComplianceFormUpdater) => void;
  onHealthCheckSubmit: () => Promise<void>;
  onSignAgreement: () => Promise<void>;
  onEditSubmit: () => Promise<void>;
  onDynamicSubmit: (data: Omit<DynamicComplianceItem, 'date' | 'expiryDate' | 'status' | 'evidence'>) => Promise<void>;
}

const isCompetencyItem = (item: any): item is CompetencyItem => {
  return item && 'score' in item;
};

const isSignableItem = (item: any): item is SignableItem => {
  return item && 'signed' in item;
};

const isHealthCheckItem = (item: any): item is HealthCheckItem => {
  return item && 'completed' in item;
};

const isComplianceItemWithDate = (item: any): item is ComplianceItem & { date: Timestamp | null; expiryDate: Timestamp | null } => {
  return item && 'date' in item && 'status' in item;
};

const getSignedValue = (formData: ComplianceFormState, field: keyof StaffCompliance): boolean => {
  const item = formData[field];
  if (!item || !isSignableItem(item)) return false;
  return item.signed;
};

const getCompletedValue = (formData: ComplianceFormState, field: keyof StaffCompliance): boolean => {
  const item = formData[field];
  if (!item || !isHealthCheckItem(item)) return false;
  return item.completed;
};

const getScoreValue = (formData: ComplianceFormState, field: keyof StaffCompliance): number | undefined => {
  const item = formData[field];
  if (!item || !isCompetencyItem(item)) return undefined;
  return item.score;
};

const ComplianceDialogs: React.FC<ComplianceDialogsProps> = ({
  healthCheckOpen,
  signDialogOpen,
  editDialogOpen,
  dynamicDialogOpen,
  healthAnswers,
  signType,
  selectedField,
  formData,
  loading,
  onHealthCheckClose,
  onSignDialogClose,
  onEditDialogClose,
  onDynamicDialogClose,
  onHealthAnswersChange,
  onFormDataChange,
  onHealthCheckSubmit,
  onSignAgreement,
  onEditSubmit,
  onDynamicSubmit,
}) => {
  const theme = useTheme();

  const handleDateChange = (newDate: Date | null) => {
    if (!selectedField || !newDate) return;
    
    onFormDataChange((prev) => {
      const currentItem = prev[selectedField];
      if (!currentItem || !isComplianceItemWithDate(currentItem)) return prev;

      return {
        ...prev,
        [selectedField]: {
          ...currentItem,
          date: Timestamp.fromDate(newDate),
        },
      };
    });
  };

  const handleScoreChange = (score: number) => {
    if (!selectedField) return;
    
    onFormDataChange((prev) => {
      const currentItem = prev[selectedField];
      if (!currentItem || !isCompetencyItem(currentItem)) return prev;

      return {
        ...prev,
        [selectedField]: {
          ...currentItem,
          score,
        },
      };
    });
  };

  const handleSignedChange = (signed: boolean) => {
    if (!selectedField) return;
    
    onFormDataChange((prev) => {
      const currentItem = prev[selectedField];
      if (!currentItem || !isSignableItem(currentItem)) return prev;

      return {
        ...prev,
        [selectedField]: {
          ...currentItem,
          signed,
        },
      };
    });
  };

  const handleCompletedChange = (completed: boolean) => {
    if (!selectedField) return;
    
    onFormDataChange((prev) => {
      const currentItem = prev[selectedField];
      if (!currentItem || !isHealthCheckItem(currentItem)) return prev;

      return {
        ...prev,
        [selectedField]: {
          ...currentItem,
          completed,
        },
      };
    });
  };

  const getDateValue = () => {
    if (!selectedField || !formData[selectedField]) return null;
    const item = formData[selectedField];
    if (!isComplianceItemWithDate(item)) return null;
    return item.date?.toDate() || null;
  };

  return (
    <>
      {/* Health Check Dialog */}
      <Dialog 
        open={healthCheckOpen} 
        onClose={onHealthCheckClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          fontWeight: 600
        }}>
          Health Check Questionnaire
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {HEALTH_CHECK_QUESTIONS.map(question => (
              <Box key={question.id}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ 
                    color: theme.palette.text.primary,
                    fontWeight: 500,
                    mb: 1
                  }}
                >
                  {question.label}
                </Typography>
                {question.type === 'rating' ? (
                  <Rating
                    value={Number(healthAnswers[question.id]) || 0}
                    onChange={(_, value) => 
                      onHealthAnswersChange({ ...healthAnswers, [question.id]: value || 0 })
                    }
                    sx={{ 
                      '& .MuiRating-iconFilled': {
                        color: THEME.info
                      }
                    }}
                  />
                ) : question.type === 'boolean' ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(healthAnswers[question.id])}
                        onChange={(e) => 
                          onHealthAnswersChange({ ...healthAnswers, [question.id]: e.target.checked })
                        }
                        sx={{
                          '&.Mui-checked': {
                            color: THEME.success
                          }
                        }}
                      />
                    }
                    label="Yes"
                  />
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={healthAnswers[question.id] || ''}
                    onChange={(e) => 
                      onHealthAnswersChange({ ...healthAnswers, [question.id]: e.target.value })
                    }
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: THEME.info
                        }
                      }
                    }}
                  />
                )}
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={onHealthCheckClose}
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                bgcolor: alpha(theme.palette.text.secondary, 0.1)
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={onHealthCheckSubmit}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: THEME.success,
              '&:hover': {
                bgcolor: alpha(THEME.success, 0.9)
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sign Agreement Dialog */}
      <Dialog 
        open={signDialogOpen} 
        onClose={onSignDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          fontWeight: 600
        }}>
          Sign {signType?.split(/(?=[A-Z])/).join(' ')}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography>
            Please confirm that you have read and agree to the terms of the {
              signType?.split(/(?=[A-Z])/).join(' ').toLowerCase()
            }.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={onSignDialogClose}
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                bgcolor: alpha(theme.palette.text.secondary, 0.1)
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSignAgreement}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: THEME.success,
              '&:hover': {
                bgcolor: alpha(THEME.success, 0.9)
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign Agreement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={onEditDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          fontWeight: 600
        }}>
          Update {selectedField?.split(/(?=[A-Z])/).join(' ')}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={getDateValue()}
                onChange={handleDateChange}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: THEME.info
                    }
                  }
                }}
              />
            </LocalizationProvider>

            {selectedField === 'albacMat' && (
              <TextField
                label="Score"
                type="number"
                value={getScoreValue(formData, selectedField) ?? ''}
                onChange={(e) => {
                  const score = Number(e.target.value);
                  if (score >= 0 && score <= 100) {
                    handleScoreChange(score);
                  }
                }}
                inputProps={{ min: 0, max: 100 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: THEME.info
                    }
                  }
                }}
              />
            )}

            {selectedField && ['supervisionAgreement', 'beneficiaryOnFile'].includes(selectedField) && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={getSignedValue(formData, selectedField)}
                    onChange={(e) => handleSignedChange(e.target.checked)}
                    sx={{
                      '&.Mui-checked': {
                        color: THEME.success
                      }
                    }}
                  />
                }
                label="Signed"
              />
            )}

            {selectedField === 'healthCheck' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={getCompletedValue(formData, selectedField)}
                    onChange={(e) => handleCompletedChange(e.target.checked)}
                    sx={{
                      '&.Mui-checked': {
                        color: THEME.success
                      }
                    }}
                  />
                }
                label="Completed"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={onEditDialogClose}
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                bgcolor: alpha(theme.palette.text.secondary, 0.1)
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={onEditSubmit}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: THEME.success,
              '&:hover': {
                bgcolor: alpha(THEME.success, 0.9)
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dynamic Compliance Dialog */}
      <DynamicComplianceDialog
        open={dynamicDialogOpen}
        onClose={onDynamicDialogClose}
        onSubmit={onDynamicSubmit}
      />
    </>
  );
};

export default ComplianceDialogs;
