import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  alpha,
  Stepper,
  Step,
  StepLabel,
  Stack
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { 
  RotaImportData, 
  ShiftTime, 
  Staff, 
  SHIFT_TIME_DETAILS, 
  ShiftStatus,
  ShiftAssignment 
} from '../../types/rota';
import { useRotaContext } from '../../contexts/RotaContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const steps = ['Upload File', 'Review Data', 'Import'];

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onComplete
}) => {
  const theme = useTheme();
  const { staff, currentRota, updateRota } = useRotaContext();
  const { notify } = useNotifications();
  
  const [activeStep, setActiveStep] = useState(0);
  const [importData, setImportData] = useState<RotaImportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length !== 1) {
      setError('Please upload a single file');
      return;
    }

    const file = acceptedFiles[0];
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as RotaImportData;

      // Validate the imported data
      if (!Array.isArray(data.shifts)) {
        throw new Error('Invalid file format: shifts array is missing');
      }

      for (const shift of data.shifts) {
        if (!shift.date || !shift.time || !Array.isArray(shift.staff)) {
          throw new Error('Invalid shift data format');
        }
        if (!Object.keys(SHIFT_TIME_DETAILS).includes(shift.time)) {
          throw new Error(`Invalid shift time: ${shift.time}`);
        }
      }

      setImportData(data);
      setActiveStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: false
  });

  const handleImport = async () => {
    if (!importData || !currentRota) return;

    setIsLoading(true);
    setError(null);

    try {
      // Map imported staff IDs to actual staff objects
      const updatedShifts = currentRota.shifts.map(shift => {
        const importedShift = importData.shifts.find(s => 
          s.date === shift.date && s.time === shift.time
        );

        if (!importedShift) return shift;

        // Filter out invalid staff IDs and create assignments
        const validAssignments: ShiftAssignment[] = importedShift.staff
          .map(staffId => {
            const staffMember = staff.find(s => s.id === staffId);
            if (!staffMember) return null;

            return {
              userId: staffMember.id,
              role: staffMember.roles[0],
              assignedAt: new Date().toISOString(),
              assignedBy: 'IMPORT'
            };
          })
          .filter((assignment): assignment is ShiftAssignment => assignment !== null);

        const status: ShiftStatus = validAssignments.length >= shift.requiredStaff 
          ? 'Fully Staffed' 
          : validAssignments.length > 0 
            ? 'Partially Staffed' 
            : 'Unfilled';

        return {
          ...shift,
          assignedStaff: validAssignments,
          status
        };
      });

      const updatedRota = {
        ...currentRota,
        shifts: updatedShifts,
        updatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        modifiedBy: 'IMPORT'
      };

      await updateRota(updatedRota);
      notify({
        type: 'system',
        title: 'Import Successful',
        message: 'Rota data has been imported successfully',
        userId: 'system'
      });
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
      notify({
        type: 'system',
        title: 'Import Error',
        message: 'Failed to import rota data',
        userId: 'system'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const renderUploadStep = () => (
    <Stack
      {...getRootProps()}
      spacing={2}
      alignItems="center"
      sx={{
        p: 3,
        border: 2,
        borderRadius: 1,
        borderColor: isDragActive ? 'primary.main' : 'divider',
        borderStyle: 'dashed',
        bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.05)
        }
      }}
    >
      <input {...getInputProps()} />
      <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
      <Typography variant="h6" component="div">
        {isDragActive ? 'Drop the file here' : 'Drag and drop a file here'}
      </Typography>
      <Typography variant="body2" color="textSecondary" component="div">
        or click to select a file
      </Typography>
      <Typography variant="caption" color="textSecondary" component="div">
        Accepts JSON files only
      </Typography>
    </Stack>
  );

  const renderReviewStep = () => (
    <Stack spacing={2}>
      {importData && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Staff Assigned</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {importData.shifts.map((shift, index) => (
                <TableRow key={index}>
                  <TableCell>{shift.date}</TableCell>
                  <TableCell>{shift.time}</TableCell>
                  <TableCell>{shift.staff.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme.palette.background.paper,
          backgroundImage: `linear-gradient(${alpha(theme.palette.primary.main, 0.05)} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }
      }}
    >
      <DialogTitle>Import Rota</DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {isLoading ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress />
            </Stack>
          ) : (
            <>
              {activeStep === 0 && renderUploadStep()}
              {activeStep === 1 && renderReviewStep()}
              {activeStep === 2 && (
                <Alert severity="info">
                  Click Import to proceed with importing the rota data
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Stack direction="row" spacing={1}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={isLoading}
            >
              Import
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!importData}
            >
              Next
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
