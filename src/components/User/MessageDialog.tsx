import React, { useState } from 'react';
import { Box } from '@mui/system';
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Mail as MailIcon,
} from '@mui/icons-material';
import { darken } from '@mui/material/styles';
import { THEME } from '../../theme/colors';

export interface MessageDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  onSend: (message: { subject: string; body: string }) => Promise<void>;
}

export const MessageDialog: React.FC<MessageDialogProps> = ({ open, onClose, userId, onSend }) => {
  const [message, setMessage] = useState({ subject: '', body: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!message.subject.trim()) errors.subject = 'Subject is required';
    if (!message.body.trim()) errors.body = 'Message body is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSend = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await onSend(message);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }
      }}
    >
      {isLoading && <LinearProgress color="primary" />}
      
      <DialogTitle sx={{ 
        textAlign: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2,
      }}>
        Send Message
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            label="Subject"
            value={message.subject}
            onChange={(e) => {
              setMessage({ ...message, subject: e.target.value });
              if (formErrors.subject) {
                setFormErrors({ ...formErrors, subject: '' });
              }
            }}
            error={!!formErrors.subject}
            helperText={formErrors.subject || 'Brief summary of your message'}
            margin="normal"
            InputProps={{
              startAdornment: (
                <MailIcon sx={{ 
                  mr: 1, 
                  color: formErrors.subject ? THEME.error : 'action.active' 
                }} />
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused': {
                  boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.2)',
                }
              }
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message"
            value={message.body}
            onChange={(e) => {
              setMessage({ ...message, body: e.target.value });
              if (formErrors.body) {
                setFormErrors({ ...formErrors, body: '' });
              }
            }}
            error={!!formErrors.body}
            helperText={formErrors.body || 'Enter your message here'}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused': {
                  boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.2)',
                }
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        px: 3, 
        pb: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}>
        <Button 
          onClick={onClose} 
          color="inherit"
          sx={{ 
            color: THEME.grey,
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.04)',
            }
          }}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleSend}
          variant="contained"
          color="primary"
          disabled={isLoading}
          sx={{
            px: 4,
            bgcolor: THEME.info,
            '&:hover': {
              bgcolor: darken(THEME.info, 0.1),
            },
            animation: 'pulse 1.5s infinite',
          }}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};
