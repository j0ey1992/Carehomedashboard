import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  children: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  error?: string | null;
  preventCloseOnSubmit?: boolean;
  hideActions?: boolean;
  fullWidth?: boolean;
  disableSubmit?: boolean;
  submitButtonColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
}

const FormDialog: React.FC<FormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  maxWidth = 'sm',
  loading = false,
  error = null,
  preventCloseOnSubmit = false,
  hideActions = false,
  fullWidth = true,
  disableSubmit = false,
  submitButtonColor = 'primary',
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preventCloseOnSubmit) {
      await onSubmit(e);
      onClose();
    } else {
      await onSubmit(e);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{title}</Typography>
            {!loading && (
              <IconButton
                edge="end"
                color="inherit"
                onClick={onClose}
                aria-label="close"
                size="small"
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Typography
              color="error"
              variant="body2"
              sx={{ mb: 2, p: 1, bgcolor: 'error.light', borderRadius: 1 }}
            >
              {error}
            </Typography>
          )}
          {children}
        </DialogContent>

        {!hideActions && (
          <DialogActions>
            <Button
              onClick={onClose}
              disabled={loading}
              color="inherit"
              variant="text"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              color={submitButtonColor}
              variant="contained"
              disabled={loading || disableSubmit}
            >
              {loading ? 'Loading...' : submitLabel}
            </Button>
          </DialogActions>
        )}
      </form>
    </Dialog>
  );
};

export default FormDialog;

// Helper component for form sections
export const FormSection: React.FC<{
  title: string;
  children: React.ReactNode;
  description?: string;
}> = ({ title, description, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
    )}
    {children}
  </Box>
);

// Helper component for form actions
export const FormActions: React.FC<{
  children: React.ReactNode;
  position?: 'left' | 'center' | 'right';
}> = ({ children, position = 'right' }) => (
  <Box
    sx={{
      mt: 3,
      display: 'flex',
      justifyContent:
        position === 'left'
          ? 'flex-start'
          : position === 'center'
          ? 'center'
          : 'flex-end',
      gap: 1,
    }}
  >
    {children}
  </Box>
);
