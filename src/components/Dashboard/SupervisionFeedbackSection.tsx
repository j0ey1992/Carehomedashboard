import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Rating,
  FormControlLabel,
  Switch,
  Stack,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  SupervisorAccount as SupervisorIcon,
  Send as SendIcon,
  Lock as LockIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { SupervisionFeedback } from '../../types';

interface SupervisionFeedbackSectionProps {
  onSubmit: (feedback: Omit<SupervisionFeedback, 'id' | 'submittedAt'>) => Promise<void>;
}

const SupervisionFeedbackSection: React.FC<SupervisionFeedbackSectionProps> = ({ onSubmit }) => {
  const theme = useTheme();
  const { userData } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<Partial<SupervisionFeedback>>({
    topics: [],
    comments: '',
    concerns: [],
    suggestions: [],
    rating: 5,
    isConfidential: false,
  });

  const [newTopic, setNewTopic] = useState('');
  const [newConcern, setNewConcern] = useState('');
  const [newSuggestion, setNewSuggestion] = useState('');

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setFeedback(prev => ({
        ...prev,
        topics: [...(prev.topics || []), newTopic.trim()],
      }));
      setNewTopic('');
    }
  };

  const handleAddConcern = () => {
    if (newConcern.trim()) {
      setFeedback(prev => ({
        ...prev,
        concerns: [...(prev.concerns || []), newConcern.trim()],
      }));
      setNewConcern('');
    }
  };

  const handleAddSuggestion = () => {
    if (newSuggestion.trim()) {
      setFeedback(prev => ({
        ...prev,
        suggestions: [...(prev.suggestions || []), newSuggestion.trim()],
      }));
      setNewSuggestion('');
    }
  };

  const handleSubmit = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      const submissionData: Omit<SupervisionFeedback, 'id' | 'submittedAt'> = {
        supervisionId: '', // This will be set by the parent component
        staffId: userData.id,
        topics: feedback.topics || [],
        comments: feedback.comments || '',
        concerns: feedback.concerns || [],
        suggestions: feedback.suggestions || [],
        rating: feedback.rating || 5,
        isConfidential: feedback.isConfidential || false,
      };

      // Only add staffName if it exists in userData
      if (userData.name) {
        submissionData.staffName = userData.name;
      }

      await onSubmit(submissionData);

      // Reset form
      setFeedback({
        topics: [],
        comments: '',
        concerns: [],
        suggestions: [],
        rating: 5,
        isConfidential: false,
      });
      setExpanded(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <SupervisorIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Supervision Feedback
        </Typography>
        <IconButton size="small">
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 3 }}>
          {/* Topics */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Topics to Discuss
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {feedback.topics?.map((topic, index) => (
                <Chip
                  key={index}
                  label={topic}
                  onDelete={() => {
                    setFeedback(prev => ({
                      ...prev,
                      topics: prev.topics?.filter((_, i) => i !== index),
                    }));
                  }}
                />
              ))}
            </Stack>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Add a topic"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
              />
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddTopic}
                variant="outlined"
                size="small"
              >
                Add
              </Button>
            </Box>
          </Box>

          {/* Comments */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="General Comments"
            value={feedback.comments}
            onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
            sx={{ mb: 3 }}
          />

          {/* Concerns */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Concerns
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {feedback.concerns?.map((concern, index) => (
                <Chip
                  key={index}
                  label={concern}
                  color="error"
                  onDelete={() => {
                    setFeedback(prev => ({
                      ...prev,
                      concerns: prev.concerns?.filter((_, i) => i !== index),
                    }));
                  }}
                />
              ))}
            </Stack>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={newConcern}
                onChange={(e) => setNewConcern(e.target.value)}
                placeholder="Add a concern"
                onKeyPress={(e) => e.key === 'Enter' && handleAddConcern()}
              />
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddConcern}
                variant="outlined"
                size="small"
                color="error"
              >
                Add
              </Button>
            </Box>
          </Box>

          {/* Suggestions */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Suggestions
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {feedback.suggestions?.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  color="success"
                  onDelete={() => {
                    setFeedback(prev => ({
                      ...prev,
                      suggestions: prev.suggestions?.filter((_, i) => i !== index),
                    }));
                  }}
                />
              ))}
            </Stack>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={newSuggestion}
                onChange={(e) => setNewSuggestion(e.target.value)}
                placeholder="Add a suggestion"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSuggestion()}
              />
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddSuggestion}
                variant="outlined"
                size="small"
                color="success"
              >
                Add
              </Button>
            </Box>
          </Box>

          {/* Rating */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Overall Rating
            </Typography>
            <Rating
              value={feedback.rating}
              onChange={(_, newValue) => setFeedback(prev => ({ ...prev, rating: newValue || 5 }))}
              size="large"
            />
          </Box>

          {/* Confidentiality Toggle */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={feedback.isConfidential}
                  onChange={(e) => setFeedback(prev => ({ ...prev, isConfidential: e.target.checked }))}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockIcon fontSize="small" />
                  <Typography>Keep this feedback confidential</Typography>
                </Box>
              }
            />
          </Box>

          {/* Submit Button */}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={loading || !feedback.comments}
          >
            Submit Feedback
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default SupervisionFeedbackSection;
