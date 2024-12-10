import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Person as PersonIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import UserInfoInput from './UserInfoInput';
import FileUploadInput from './FileUploadInput';
import { extractStaffFromExcel } from '../../utils/excelParser';
import { StaffInfo } from '../../utils/excelParser';
import { NewUserData } from '../../types';
import { ShiftRole } from '../../types/rota';
import { createBulkAuthAccounts } from '../../services/authService';

interface TrainingUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, userData: NewUserData) => Promise<void>;
}

const defaultUserData: NewUserData = {
  name: '',
  email: '',
  phoneNumber: '',
  role: 'staff',
  roles: ['Care Staff'],
  site: 'Willowbrook',
  sites: ['Willowbrook'],
  contractedHours: 37.5,
  annualLeave: 28,
  sickness: 0,
  preferences: {
    preferredShifts: [],
    unavailableDates: [],
    flexibleHours: true,
    nightShiftOnly: false
  },
  performanceMetrics: {
    attendanceRate: 100,
    punctualityScore: 100,
    shiftCompletionRate: 100,
    feedbackScore: 100
  },
  attendance: {
    attendanceRate: 100,
    lateDays: 0,
    sickDays: 0,
    totalDays: 0
  },
  notificationPreferences: {
    email: true,
    sms: true
  }
};

const TrainingUploadDialog: React.FC<TrainingUploadDialogProps> = ({
  open,
  onClose,
  onUpload,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [staffMembers, setStaffMembers] = useState<StaffInfo[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userDataMap, setUserDataMap] = useState<{ [key: string]: NewUserData }>({});
  const [authResults, setAuthResults] = useState<{
    success: string[];
    failed: { userId: string; error: string }[];
  } | null>(null);

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setFile(selectedFile);
    setProgressPercentage(20);

    try {
      const staff = await extractStaffFromExcel(selectedFile);
      setStaffMembers(staff);
      
      // Initialize userDataMap with default values for new staff
      const initialUserData: { [key: string]: NewUserData } = {};
      staff.forEach(member => {
        if (member.needsInfo) {
          initialUserData[member.name] = {
            ...defaultUserData,
            name: member.name,
            email: member.email || '',
          };
        }
      });
      setUserDataMap(initialUserData);
      
      setActiveStep(1);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleUserDataChange = (staffName: string, field: keyof NewUserData, value: any) => {
    setUserDataMap(prev => ({
      ...prev,
      [staffName]: {
        ...prev[staffName],
        [field]: value,
        // If site is updated, also update sites array
        ...(field === 'site' ? { sites: [value] } : {})
      },
    }));
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setProgressPercentage(0);

    try {
      // First create auth accounts for new staff members
      const authResult = await createBulkAuthAccounts(staffMembers, userDataMap);
      setAuthResults(authResult);
      setProgressPercentage(50);

      // Then upload training data for each staff member
      for (const staff of staffMembers) {
        if (staff.needsInfo) {
          const userData = userDataMap[staff.name];
          if (!userData) {
            throw new Error(`Missing user data for ${staff.name}`);
          }
          setProgressPercentage(prev => prev + 20);
          await onUpload(file, userData);
        }
      }

      setProgressPercentage(100);
      
      // Only close if there were no auth failures
      if (authResult.failed.length === 0) {
        onClose();
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      setProgressPercentage(0);
      setStaffMembers([]);
      setActiveStep(0);
      setExpanded(null);
      setUserDataMap({});
      setAuthResults(null);
      onClose();
    }
  };

  const canProceed = () => {
    if (activeStep === 1) {
      return staffMembers.every(staff => 
        !staff.needsInfo || (
          userDataMap[staff.name]?.email &&
          userDataMap[staff.name]?.site &&
          userDataMap[staff.name]?.name
        )
      );
    }
    return true;
  };

  const steps = ['Select File', 'Review Staff', 'Upload'];

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <UploadIcon />
          <Typography variant="h6">Upload Training Data</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Please select a file to upload:
            </Typography>
            <FileUploadInput file={file} setFile={handleFileSelect} />
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Staff Review
            </Typography>
            <List>
              {staffMembers.map((staff) => (
                <Paper key={staff.name} sx={{ mb: 1 }}>
                  <ListItem
                    button
                    onClick={() => setExpanded(expanded === staff.name ? null : staff.name)}
                  >
                    <ListItemText
                      primary={staff.name}
                      secondary={staff.exists ? 'Existing Staff' : 'New Staff - Needs Information'}
                    />
                    {expanded === staff.name ? <ExpandLess /> : <ExpandMore />}
                  </ListItem>
                  <Collapse in={expanded === staff.name} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2 }}>
                      {staff.needsInfo ? (
                        <UserInfoInput
                          contractedHours={userDataMap[staff.name]?.contractedHours || defaultUserData.contractedHours}
                          setContractedHours={(value: number) => handleUserDataChange(staff.name, 'contractedHours', value)}
                          annualLeave={userDataMap[staff.name]?.annualLeave || defaultUserData.annualLeave}
                          setAnnualLeave={(value: number) => handleUserDataChange(staff.name, 'annualLeave', value)}
                          sickness={userDataMap[staff.name]?.sickness || defaultUserData.sickness}
                          setSickness={(value: number) => handleUserDataChange(staff.name, 'sickness', value)}
                          roles={userDataMap[staff.name]?.roles || defaultUserData.roles}
                          setRoles={(value: ShiftRole[]) => handleUserDataChange(staff.name, 'roles', value)}
                          email={userDataMap[staff.name]?.email || staff.email || ''}
                          setEmail={(value: string) => handleUserDataChange(staff.name, 'email', value)}
                          phoneNumber={userDataMap[staff.name]?.phoneNumber || defaultUserData.phoneNumber}
                          setPhoneNumber={(value: string) => handleUserDataChange(staff.name, 'phoneNumber', value)}
                          site={userDataMap[staff.name]?.site || defaultUserData.site}
                          setSite={(value: string) => handleUserDataChange(staff.name, 'site', value)}
                          name={staff.name}
                          setName={(value: string) => handleUserDataChange(staff.name, 'name', value)}
                        />
                      ) : (
                        <Typography>
                          Staff member already exists. Training records will be updated.
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              ))}
            </List>
            {activeStep === 1 && (
              <Button
                variant="contained"
                onClick={() => setActiveStep(2)}
                disabled={!canProceed()}
                sx={{ mt: 2 }}
              >
                Continue
              </Button>
            )}
          </Box>
        )}

        {error && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {authResults && (
          <Box sx={{ mt: 2 }}>
            {authResults.success.length > 0 && (
              <Alert severity="success" sx={{ mb: 1 }}>
                Successfully created {authResults.success.length} auth accounts
              </Alert>
            )}
            {authResults.failed.length > 0 && (
              <Alert severity="error">
                Failed to create {authResults.failed.length} auth accounts:
                <List>
                  {authResults.failed.map(failure => (
                    <ListItem key={failure.userId}>
                      <ListItemText
                        primary={failure.userId}
                        secondary={failure.error}
                      />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progressPercentage} />
            <Typography sx={{ mt: 1 }}>Uploading data...</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        {activeStep === 2 && (
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !file}
            startIcon={<UploadIcon />}
          >
            Upload
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TrainingUploadDialog;
