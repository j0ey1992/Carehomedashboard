import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  Alert,
  AlertTitle,
  CircularProgress,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTraining } from '../../contexts/TrainingContext';
import { useGamification } from '../../contexts/GamificationContext';
import { format, isAfter, startOfDay } from 'date-fns';
import { TrainingRecord } from '../../types';
import PointsBadge from '../../components/Gamification/PointsBadge';

const TrainingEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trainingRecords, updateTrainingRecord, loading } = useTraining();
  const { addPoints } = useGamification();
  const [record, setRecord] = useState<TrainingRecord | null>(null);
  const [completionDate, setCompletionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id || !trainingRecords) return;

    const currentRecord = trainingRecords.find(r => r.id === id);
    if (currentRecord) {
      setRecord(currentRecord);
      if (currentRecord.completionDate) {
        setCompletionDate(format(new Date(currentRecord.completionDate), 'yyyy-MM-dd'));
      }
      if (currentRecord.notes) {
        setNotes(currentRecord.notes);
      }
    }
  }, [id, trainingRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !completionDate || !id) return;

    try {
      const today = startOfDay(new Date());
      const expiryDate = record.expiryDate ? new Date(record.expiryDate) : null;
      const isOnTime = !expiryDate || isAfter(expiryDate, today);

      const updatedRecord: Partial<TrainingRecord> = {
        ...record,
        completionDate: new Date(completionDate),
        notes,
        status: isOnTime ? 'valid' : 'expired',
      };

      await updateTrainingRecord(id, updatedRecord);

      // Award points based on completion timing
      if (isOnTime) {
        await addPoints('TRAINING_ATTEND');
      } else {
        await addPoints('TRAINING_MISS');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/training');
      }, 2000);
    } catch (err) {
      setError('Failed to update training record');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!record) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        Training record not found
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Update Training Record
            </Typography>
            <PointsBadge />
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Typography variant="h6">
                {record.courseTitle}
              </Typography>

              <TextField
                label="Staff Name"
                value={record.staffName}
                disabled
                fullWidth
              />

              <TextField
                label="Completion Date"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                required
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />

              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={4}
                fullWidth
              />

              {error && (
                <Alert severity="error">
                  <AlertTitle>Error</AlertTitle>
                  {error}
                </Alert>
              )}

              {success ? (
                <Fade in>
                  <Alert 
                    severity="success"
                    icon={<CheckCircleIcon fontSize="inherit" />}
                    action={
                      <Tooltip title="Points awarded!">
                        <TrophyIcon color="primary" />
                      </Tooltip>
                    }
                  >
                    <AlertTitle>Success</AlertTitle>
                    Training record updated successfully! Points awarded.
                  </Alert>
                </Fade>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  disabled={!completionDate}
                  fullWidth
                  sx={{
                    py: 1.5,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.02)',
                    },
                  }}
                >
                  Complete Training
                </Button>
              )}
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TrainingEdit;
