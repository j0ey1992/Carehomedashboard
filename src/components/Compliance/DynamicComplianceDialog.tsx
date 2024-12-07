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
  Box,
  IconButton,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Zoom,
  Fade,
  Alert,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Help as HelpIcon,
  DragIndicator as DragIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { THEME } from '../../theme/colors';
import { DynamicComplianceItem, DynamicComplianceQuestion } from '../../types/compliance';

interface DynamicComplianceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<DynamicComplianceItem, 'date' | 'expiryDate' | 'status' | 'evidence'>) => Promise<void>;
}

interface Question extends DynamicComplianceQuestion {
  id: string;
  text: string;
  type: 'text' | 'yesno' | 'multiple';
  required: boolean;
  options?: string[];
}

const QuestionTypeChip: React.FC<{ type: string }> = ({ type }) => {
  const getTypeColor = () => {
    switch (type) {
      case 'text':
        return THEME.info;
      case 'yesno':
        return THEME.success;
      case 'multiple':
        return THEME.warning;
      default:
        return THEME.grey;
    }
  };

  return (
    <Chip
      label={type.toUpperCase()}
      size="small"
      sx={{
        bgcolor: alpha(getTypeColor(), 0.1),
        color: getTypeColor(),
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  );
};

export const DynamicComplianceDialog: React.FC<DynamicComplianceDialogProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<'monthly' | 'yearly' | 'custom'>('yearly');
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState<'days' | 'months' | 'years'>('months');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setRecurrence('yearly');
      setCustomInterval(1);
      setCustomUnit('months');
      setQuestions([]);
      setError(null);
      setProgress(0);
    }
  }, [open]);

  useEffect(() => {
    let completed = 0;
    if (title) completed++;
    if (description) completed++;
    if (questions.length > 0) completed++;
    if (questions.every(q => q.text)) completed++;
    setProgress((completed / 4) * 100);
  }, [title, description, questions]);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `q${questions.length + 1}`,
      text: '',
      type: 'text',
      required: false,
      options: [],
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    };
    setQuestions(updatedQuestions);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }

    if (!description.trim()) {
      setError('Description is required');
      return false;
    }

    if (questions.length === 0) {
      setError('At least one question is required');
      return false;
    }

    if (questions.some(q => !q.text.trim())) {
      setError('All questions must have text');
      return false;
    }

    if (questions.some(q => q.type === 'multiple' && (!q.options || q.options.length < 2))) {
      setError('Multiple choice questions must have at least 2 options');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit({
        type: 'dynamic',
        title,
        description,
        recurrence,
        ...(recurrence === 'custom' && {
          customRecurrence: {
            interval: customInterval,
            unit: customUnit,
          },
        }),
        questions,
      });
      onClose();
    } catch (error) {
      setError('Failed to create compliance item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Zoom}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle sx={{
        pb: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Create New Compliance Item
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
            transition: 'all 0.3s ease-in-out',
          },
        }}
      />

      <DialogContent sx={{ mt: 2 }}>
        <Stack spacing={3}>
          {error && (
            <Fade in>
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
            </Fade>
          )}

          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            error={!title && !!error}
            helperText={!title && !!error ? 'Title is required' : ''}
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

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            error={!description && !!error}
            helperText={!description && !!error ? 'Description is required' : ''}
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

          <FormControl fullWidth>
            <InputLabel>Recurrence</InputLabel>
            <Select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
              label="Recurrence"
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          {recurrence === 'custom' && (
            <Stack direction="row" spacing={2}>
              <TextField
                label="Interval"
                type="number"
                value={customInterval}
                onChange={(e) => setCustomInterval(Number(e.target.value))}
                inputProps={{ min: 1 }}
                sx={{ width: 120 }}
              />
              <FormControl sx={{ width: 120 }}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as typeof customUnit)}
                  label="Unit"
                >
                  <MenuItem value="days">Days</MenuItem>
                  <MenuItem value="months">Months</MenuItem>
                  <MenuItem value="years">Years</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          <Box>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 2,
              gap: 1,
            }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  Questions
                </Typography>
                <Tooltip title="Add questions to collect compliance information" arrow>
                  <HelpIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                </Tooltip>
              </Stack>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddQuestion}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: THEME.info,
                  color: THEME.info,
                  '&:hover': {
                    borderColor: THEME.info,
                    bgcolor: alpha(THEME.info, 0.1),
                  },
                }}
              >
                Add Question
              </Button>
            </Box>

            <Stack spacing={2}>
              {questions.map((question, index) => (
                <Zoom in key={question.id} style={{ transitionDelay: `${index * 50}ms` }}>
                  <Box
                    sx={{
                      p: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      position: 'relative',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: 2,
                        borderColor: THEME.info,
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <DragIcon sx={{ color: theme.palette.text.secondary }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        Question {index + 1}
                      </Typography>
                      <QuestionTypeChip type={question.type} />
                      <Box sx={{ flexGrow: 1 }} />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveQuestion(index)}
                        sx={{
                          color: THEME.error,
                          '&:hover': {
                            bgcolor: alpha(THEME.error, 0.1),
                          },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>

                    <Stack spacing={2}>
                      <TextField
                        label="Question Text"
                        value={question.text}
                        onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                        fullWidth
                        error={!question.text && !!error}
                        helperText={!question.text && !!error ? 'Question text is required' : ''}
                      />

                      <FormControl fullWidth>
                        <InputLabel>Question Type</InputLabel>
                        <Select
                          value={question.type}
                          onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                          label="Question Type"
                        >
                          <MenuItem value="text">Text Response</MenuItem>
                          <MenuItem value="yesno">Yes/No</MenuItem>
                          <MenuItem value="multiple">Multiple Choice</MenuItem>
                        </Select>
                      </FormControl>

                      {question.type === 'multiple' && (
                        <TextField
                          label="Options (comma-separated)"
                          value={question.options?.join(', ') || ''}
                          onChange={(e) => handleQuestionChange(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                          fullWidth
                          error={(!question.options || question.options.length < 2) && !!error}
                          helperText={
                            (!question.options || question.options.length < 2) && !!error
                              ? 'At least 2 options are required'
                              : 'Enter options separated by commas'
                          }
                        />
                      )}

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={question.required}
                            onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                            sx={{
                              color: THEME.info,
                              '&.Mui-checked': {
                                color: THEME.info,
                              },
                            }}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            Required question
                          </Typography>
                        }
                      />
                    </Stack>
                  </Box>
                </Zoom>
              ))}

              {questions.length === 0 && (
                <Box
                  sx={{
                    p: 4,
                    border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                    borderRadius: 2,
                    textAlign: 'center',
                    color: theme.palette.text.secondary,
                  }}
                >
                  <Typography variant="body2">
                    No questions added yet. Click "Add Question" to get started.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            color: theme.palette.text.secondary,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: alpha(theme.palette.text.secondary, 0.1),
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !title || !description || questions.length === 0}
          startIcon={loading ? undefined : progress === 100 ? <ValidIcon /> : <WarningIcon />}
          sx={{
            bgcolor: progress === 100 ? THEME.success : THEME.warning,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: progress === 100 ? alpha(THEME.success, 0.9) : alpha(THEME.warning, 0.9),
              transform: 'translateY(-2px)',
            },
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Create Item'}
        </Button>
      </DialogActions>

      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
            20%, 40%, 60%, 80% { transform: translateX(2px); }
          }
        `}
      </style>
    </Dialog>
  );
};

export default DynamicComplianceDialog;
