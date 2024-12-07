import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import PageHeader from '../../components/Common/PageHeader';
import { ImportDialog } from '../../components/Rota/ImportDialog';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const ImportRota: React.FC = () => {
  const theme = useTheme();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAutoScheduler, setShowAutoScheduler] = useState(false);

  const handleImportOpen = useCallback(() => {
    setShowImportDialog(true);
  }, []);

  const handleImportClose = useCallback(() => {
    setShowImportDialog(false);
  }, []);

  const handleAutoSchedulerOpen = useCallback(() => {
    setShowAutoScheduler(true);
  }, []);

  const handleAutoSchedulerClose = useCallback(() => {
    setShowAutoScheduler(false);
  }, []);

  const pageActions = [
    {
      label: 'Import Excel',
      onClick: handleImportOpen,
      icon: <UploadFileIcon />,
      variant: 'outlined' as const
    },
    {
      label: 'AI Generate',
      onClick: handleAutoSchedulerOpen,
      icon: <AutoAwesomeIcon />,
      color: 'primary' as const,
      variant: 'contained' as const
    }
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Import Rota"
        subtitle="Import rota data from Excel or generate using AI"
        actions={pageActions}
      />

      <Paper 
        sx={{ 
          p: 3,
          flexGrow: 1,
          bgcolor: alpha(theme.palette.background.paper, 0.98)
        }}
      >
        {/* Content */}
      </Paper>

      <ImportDialog
        open={showImportDialog}
        onClose={handleImportClose}
      />
    </Box>
  );
};

export default React.memo(ImportRota);
