import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import { TrainingRecord } from '../../types';

interface MessageDialogProps {
  open: boolean;
  onClose: () => void;
  selectedRecords: TrainingRecord[];
  onSend: (message: string, type: 'email' | 'sms' | 'both') => Promise<void>;
}

interface ReminderDialogProps {
  open: boolean;
  onClose: () => void;
  selectedRecords: TrainingRecord[];
  onSchedule: (schedule: { initial: number; followUp: number; final: number }) => Promise<void>;
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: string, fields: string[]) => Promise<void>;
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
  open,
  onClose,
  selectedRecords,
  onSend,
}) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'email' | 'sms' | 'both'>('email');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setSending(true);
      await onSend(message, type);
      setMessage('');
      setType('email');
      setError(null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Training Notification</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Sending notification to {selectedRecords.length} staff member(s)
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Notification Type</InputLabel>
            <Select
              value={type}
              label="Notification Type"
              onChange={(e) => setType(e.target.value as 'email' | 'sms' | 'both')}
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Message"
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSend} variant="contained" disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ReminderDialog: React.FC<ReminderDialogProps> = ({
  open,
  onClose,
  selectedRecords,
  onSchedule,
}) => {
  const [schedule, setSchedule] = useState({
    initial: 30,
    followUp: 14,
    final: 7,
  });
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const handleSchedule = async () => {
    try {
      setScheduling(true);
      await onSchedule(schedule);
      setError(null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule Training Reminders</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Scheduling reminders for {selectedRecords.length} staff member(s)
          </Typography>

          <TextField
            label="Initial Reminder (days before expiry)"
            type="number"
            value={schedule.initial}
            onChange={(e) => setSchedule({ ...schedule, initial: parseInt(e.target.value) })}
            fullWidth
          />

          <TextField
            label="Follow-up Reminder (days before expiry)"
            type="number"
            value={schedule.followUp}
            onChange={(e) => setSchedule({ ...schedule, followUp: parseInt(e.target.value) })}
            fullWidth
          />

          <TextField
            label="Final Reminder (days before expiry)"
            type="number"
            value={schedule.final}
            onChange={(e) => setSchedule({ ...schedule, final: parseInt(e.target.value) })}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSchedule} variant="contained" disabled={scheduling}>
          {scheduling ? 'Scheduling...' : 'Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  onExport,
}) => {
  const [format, setFormat] = useState('excel');
  const [fields, setFields] = useState<string[]>([
    'staffName',
    'courseTitle',
    'status',
    'expiryDate',
  ]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await onExport(format, fields);
      setError(null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Training Records</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={format}
              label="Export Format"
              onChange={(e) => setFormat(e.target.value)}
            >
              <MenuItem value="excel">Excel</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Fields to Export</InputLabel>
            <Select
              multiple
              value={fields}
              label="Fields to Export"
              onChange={(e) => setFields(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
              renderValue={(selected) => selected.join(', ')}
            >
              <MenuItem value="staffName">Staff Name</MenuItem>
              <MenuItem value="courseTitle">Course Title</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="expiryDate">Expiry Date</MenuItem>
              <MenuItem value="completionDate">Completion Date</MenuItem>
              <MenuItem value="location">Location</MenuItem>
              <MenuItem value="category">Category</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleExport} variant="contained" disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
