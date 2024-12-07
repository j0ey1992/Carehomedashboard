import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Autocomplete,
  Alert,
  SelectChangeEvent,
  CircularProgress,
  IconButton,
  ButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesome as EnhanceIcon,
  Summarize as SummarizeIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import { useCommunication } from '../../contexts/CommunicationContext';
import { DEFAULT_TAGS, CommunicationEntry, AIEnhancementType } from '../../types/communication';
import useData from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface CommunicationEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  entry?: CommunicationEntry;
  mode?: 'create' | 'edit';
}

type NewEntry = Omit<CommunicationEntry, 'id' | 'date' | 'lastModified' | 'comments'>;

const CommunicationEntryDialog: React.FC<CommunicationEntryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  entry,
  mode = 'create'
}): JSX.Element => {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [status, setStatus] = useState<'open' | 'in-progress' | 'resolved'>('open');
  const [visibility, setVisibility] = useState<'public' | 'restricted'>('public');
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [originalContent, setOriginalContent] = useState<string | null>(null);

  const { addEntry, updateEntry, loading, enhanceContent } = useCommunication();
  const { data: users = [] } = useData<User>('users');
  const { currentUser } = useAuth();

  useEffect(() => {
    if (entry && mode === 'edit') {
      setSubject(entry.subject);
      setDetails(entry.details);
      setSelectedTags(entry.tags);
      setAssignedTo(entry.assignedTo || '');
      setStatus(entry.status);
      setVisibility(entry.visibility);
      if (entry.originalContent) {
        setOriginalContent(entry.originalContent);
      }
    }
  }, [entry, mode]);

  const handleSubmit = async () => {
    if (!currentUser) {
      setError('You must be logged in to create or edit entries');
      return;
    }

    try {
      setError(null);

      if (!subject.trim() || !details.trim()) {
        setError('Subject and details are required');
        return;
      }

      // Create the entry data with all required fields
      const entryData: NewEntry = {
        subject: subject.trim(),
        details: details.trim(),
        tags: selectedTags,
        status,
        visibility,
        createdBy: currentUser.uid,
        aiEnhanced: Boolean(originalContent)
      };

      // Add optional fields only if they have values
      if (assignedTo) {
        entryData.assignedTo = assignedTo;
      }

      if (originalContent) {
        entryData.originalContent = originalContent;
      }

      if (mode === 'edit' && entry) {
        await updateEntry(entry.id, entryData);
      } else {
        await addEntry(entryData);
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error('Error submitting entry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleClose = () => {
    setSubject('');
    setDetails('');
    setSelectedTags([]);
    setAssignedTo('');
    setStatus('open');
    setVisibility('public');
    setError(null);
    setOriginalContent(null);
    onClose();
  };

  const handleEnhanceContent = async (type: AIEnhancementType) => {
    try {
      setIsEnhancing(true);
      setError(null);

      if (!details.trim()) {
        setError('Please enter some content before enhancing');
        return;
      }

      // Store original content if not already stored
      if (!originalContent) {
        setOriginalContent(details);
      }

      const enhancedContent = await enhanceContent(details, type);
      setDetails(enhancedContent);
    } catch (err) {
      console.error('Error enhancing content:', err);
      setError('Failed to enhance content. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUndoEnhancement = () => {
    if (originalContent) {
      setDetails(originalContent);
      setOriginalContent(null);
    }
  };

  const handleTagChange = (_event: React.SyntheticEvent, newValue: string[]) => {
    setSelectedTags(newValue);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setStatus(event.target.value as 'open' | 'in-progress' | 'resolved');
  };

  const handleVisibilityChange = (event: SelectChangeEvent<string>) => {
    setVisibility(event.target.value as 'public' | 'restricted');
  };

  const handleAssignedToChange = (event: SelectChangeEvent<string>) => {
    setAssignedTo(event.target.value);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'New Communication Entry' : 'Edit Communication Entry'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            required
          />

          <Box sx={{ position: 'relative' }}>
            <TextField
              label="Details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              multiline
              rows={4}
              fullWidth
              required
            />
            <Box sx={{ position: 'absolute', top: 0, right: 0, p: 1 }}>
              <ButtonGroup size="small">
                <Tooltip title="Improve writing">
                  <span>
                    <IconButton 
                      onClick={() => handleEnhanceContent('improve')}
                      disabled={isEnhancing}
                    >
                      <EnhanceIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Summarize">
                  <span>
                    <IconButton
                      onClick={() => handleEnhanceContent('summarize')}
                      disabled={isEnhancing}
                    >
                      <SummarizeIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                {originalContent && (
                  <Tooltip title="Undo AI enhancement">
                    <IconButton onClick={handleUndoEnhancement}>
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </ButtonGroup>
            </Box>
          </Box>

          <Autocomplete
            multiple
            options={DEFAULT_TAGS}
            value={selectedTags}
            onChange={handleTagChange}
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Select tags" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
          />

          <FormControl fullWidth>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={assignedTo}
              onChange={handleAssignedToChange}
              label="Assign To"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              onChange={handleStatusChange}
              label="Status"
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={visibility}
              onChange={handleVisibilityChange}
              label="Visibility"
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="restricted">Restricted</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading || isEnhancing}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || isEnhancing}
          startIcon={loading || isEnhancing ? <CircularProgress size={20} /> : undefined}
        >
          {loading || isEnhancing ? 'Processing...' : mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommunicationEntryDialog;
