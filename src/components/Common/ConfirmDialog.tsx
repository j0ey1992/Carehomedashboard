import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

type DialogType = 'warning' | 'error' | 'info' | 'confirm';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  type?: DialogType;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  hideCancel?: boolean;
  disableBackdropClick?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  error = null,
  maxWidth = 'xs',
  hideCancel = false,
  disableBackdropClick = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main', fontSize: 40 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 40 }} />;
      case 'info':
        return <InfoIcon sx={{ color: 'info.main', fontSize: 40 }} />;
      default:
        return <HelpIcon sx={{ color: 'primary.main', fontSize: 40 }} />;
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
        return 'info';
      default:
        return 'primary';
    }
  };

  const handleClose = (event: {}, reason?: string) => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return;
    }
    if (!loading) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (loading) return;
    await onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {getIcon()}
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
          {!loading && !disableBackdropClick && (
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

      <DialogContent>
        {typeof message === 'string' ? (
          <Typography>{message}</Typography>
        ) : (
          message
        )}
        {error && (
          <Typography
            color="error"
            variant="body2"
            sx={{ mt: 2, p: 1, bgcolor: 'error.light', borderRadius: 1 }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        {!hideCancel && (
          <Button
            onClick={onClose}
            color="inherit"
            disabled={loading}
            variant="text"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          color={getConfirmButtonColor()}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Helper hook for managing confirm dialog state
export const useConfirmDialog = (initialState = false) => {
  const [open, setOpen] = React.useState(initialState);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpen = () => {
    setOpen(true);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      setError(null);
    }
  };

  const handleConfirm = async (action: () => void | Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return {
    open,
    loading,
    error,
    handleOpen,
    handleClose,
    handleConfirm,
  };
};

export default ConfirmDialog;
