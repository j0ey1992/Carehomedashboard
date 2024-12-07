import React, { useState, useEffect, memo } from 'react';
import { Box } from '@mui/system';
import {
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Paper,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  ArrowBack as ArrowBackIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  EventAvailable as EventAvailableIcon,
} from '@mui/icons-material';
import { darken } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../contexts/UserContext';
import { User } from '../../types';
import { ShiftRole } from '../../types/rota';
import { THEME } from '../../theme/colors';

const SITES = ['Willowbrook', 'Sunnydale', 'Riverside', 'Oakwood'];

const ROLES = [
  { value: 'admin' as const, label: 'Admin', color: THEME.error },
  { value: 'manager' as const, label: 'Manager', color: THEME.warning },
  { value: 'staff' as const, label: 'Staff', color: THEME.info },
];

const SHIFT_ROLES: ShiftRole[] = ['Driver', 'Shift Leader', 'Care Staff'];

const DEFAULT_NOTIFICATION_PREFERENCES: Required<User['notificationPreferences']> = {
  email: true,
  sms: true,
};

const DEFAULT_USER_DATA: Partial<User> = {
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  sites: [],
  role: 'staff',
  roles: ['Care Staff'] as ShiftRole[],
  departmentId: '',
  probationStatus: 'pending',
  trainingProgress: {
    week1Review: false,
    week4Supervision: false,
    week8Review: false,
    week12Supervision: false,
  },
  contractedHours: 37.5,
  annualLeave: 28,
  sickness: 0,
  attendance: {
    attendanceRate: 100,
    lateDays: 0,
    sickDays: 0,
    totalDays: 0
  },
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
  }
};

export interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  onSave: (userData: Partial<User>) => Promise<void>;
}

export const UserDialog: React.FC<UserDialogProps> = memo(({ open, onClose, userId, onSave }) => {
  const [userData, setUserData] = useState<Partial<User>>(DEFAULT_USER_DATA);
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const steps = ['User Information', 'Role & Site', 'Work Details', 'Notifications'];
  const { users } = useUsers();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (userId && open) {
      const user = users.find(u => u.id === userId);
      if (user) {
        setUserData({
          ...user,
          notificationPreferences: {
            email: user.notificationPreferences?.email ?? DEFAULT_NOTIFICATION_PREFERENCES.email,
            sms: user.notificationPreferences?.sms ?? DEFAULT_NOTIFICATION_PREFERENCES.sms,
          },
          contractedHours: user.contractedHours ?? DEFAULT_USER_DATA.contractedHours,
          annualLeave: user.annualLeave ?? DEFAULT_USER_DATA.annualLeave,
          sickness: user.sickness ?? DEFAULT_USER_DATA.sickness,
          preferences: user.preferences ?? DEFAULT_USER_DATA.preferences,
          performanceMetrics: user.performanceMetrics ?? DEFAULT_USER_DATA.performanceMetrics,
          roles: user.roles ?? DEFAULT_USER_DATA.roles
        });
      }
    } else {
      setUserData(DEFAULT_USER_DATA);
    }
  }, [userId, users, open]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!userData.name?.trim()) errors.name = 'Name is required';
    if (!userData.email?.trim()) errors.email = 'Email is required';
    if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!userData.role) errors.role = 'Role is required';
    if (!userData.sites?.length) errors.sites = 'At least one site is required';
    if (!userData.roles?.length) errors.roles = 'At least one shift role is required';
    if (!userData.contractedHours) errors.contractedHours = 'Contracted hours are required';
    if (!userData.annualLeave) errors.annualLeave = 'Annual leave allowance is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await onSave({
        ...userData,
        roles: userData.roles || DEFAULT_USER_DATA.roles,
        departmentId: userData.departmentId || '',
        probationStatus: userData.probationStatus || 'pending',
        trainingProgress: userData.trainingProgress || {
          week1Review: false,
          week4Supervision: false,
          week8Review: false,
          week12Supervision: false,
        },
        notificationPreferences: {
          email: userData.notificationPreferences?.email ?? DEFAULT_NOTIFICATION_PREFERENCES.email,
          sms: userData.notificationPreferences?.sms ?? DEFAULT_NOTIFICATION_PREFERENCES.sms,
        },
        contractedHours: userData.contractedHours ?? DEFAULT_USER_DATA.contractedHours,
        annualLeave: userData.annualLeave ?? DEFAULT_USER_DATA.annualLeave,
        sickness: userData.sickness ?? DEFAULT_USER_DATA.sickness,
        preferences: userData.preferences ?? DEFAULT_USER_DATA.preferences,
        performanceMetrics: userData.performanceMetrics ?? DEFAULT_USER_DATA.performanceMetrics
      });
      handleClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationPreferenceChange = (type: keyof User['notificationPreferences'], checked: boolean) => {
    setUserData((prev) => {
      const currentPreferences = prev.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
      return {
        ...prev,
        notificationPreferences: {
          ...currentPreferences,
          [type]: checked,
        },
      };
    });
  };

  const handleSiteChange = (event: any) => {
    const sites = event.target.value as string[];
    setUserData((prev) => ({
      ...prev,
      sites,
      site: sites[0], // Set primary site as first selected site
    }));
    if (formErrors.sites) {
      setFormErrors({ ...formErrors, sites: '' });
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFormErrors({});
    setUserData(DEFAULT_USER_DATA);
    onClose();
  };

  const handleFieldChange = (field: keyof User, value: any) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const renderUserInformation = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Name"
          value={userData.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          error={!!formErrors.name}
          helperText={formErrors.name || 'Enter the user\'s full name'}
          InputProps={{
            startAdornment: (
              <PersonIcon sx={{ 
                mr: 1, 
                color: formErrors.name ? THEME.error : 'action.active' 
              }} />
            ),
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email"
          value={userData.email || ''}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          error={!!formErrors.email}
          helperText={formErrors.email || 'Enter a valid email address'}
          InputProps={{
            startAdornment: (
              <EmailIcon sx={{ 
                mr: 1, 
                color: formErrors.email ? THEME.error : 'action.active' 
              }} />
            ),
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Mobile Number"
          value={userData.phoneNumber || ''}
          onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
          placeholder="+44 7700 900000"
          InputProps={{
            startAdornment: (
              <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
            ),
          }}
          helperText="Include country code"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Location"
          value={userData.location || ''}
          onChange={(e) => handleFieldChange('location', e.target.value)}
          InputProps={{
            startAdornment: (
              <LocationIcon sx={{ mr: 1, color: 'action.active' }} />
            ),
          }}
          helperText="City or region"
        />
      </Grid>
    </Grid>
  );

  const renderRoleAndSite = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControl 
          fullWidth 
          error={!!formErrors.role}
        >
          <InputLabel>Role</InputLabel>
          <Select
            value={userData.role || ''}
            onChange={(e) => handleFieldChange('role', e.target.value)}
            startAdornment={
              <BadgeIcon sx={{ ml: 1, mr: 1, color: 'action.active' }} />
            }
            label="Role"
          >
            {ROLES.map((role) => (
              <MenuItem 
                key={role.value} 
                value={role.value}
                disabled={role.value === 'admin' && !isAdmin}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip
                    label={role.label}
                    size="small"
                    sx={{ 
                      bgcolor: `${role.color}15`,
                      color: role.color,
                      fontWeight: 500,
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2">
                    {role.label} User
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {formErrors.role || 'Select the user\'s role'}
          </FormHelperText>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <FormControl 
          fullWidth 
          error={!!formErrors.roles}
        >
          <InputLabel>Shift Roles</InputLabel>
          <Select
            multiple
            value={userData.roles || []}
            onChange={(e) => handleFieldChange('roles', e.target.value as ShiftRole[])}
            startAdornment={
              <BadgeIcon sx={{ ml: 1, mr: 1, color: 'action.active' }} />
            }
            label="Shift Roles"
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as ShiftRole[]).map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    size="small"
                    sx={{ 
                      bgcolor: `${THEME.info}15`,
                      color: THEME.info,
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>
            )}
          >
            {SHIFT_ROLES.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {formErrors.roles || 'Select one or more shift roles'}
          </FormHelperText>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <FormControl 
          fullWidth 
          error={!!formErrors.sites}
        >
          <InputLabel>Sites</InputLabel>
          <Select
            multiple
            value={userData.sites || []}
            onChange={handleSiteChange}
            startAdornment={
              <BusinessIcon sx={{ ml: 1, mr: 1, color: 'action.active' }} />
            }
            label="Sites"
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((site) => (
                  <Chip
                    key={site}
                    label={site}
                    size="small"
                    sx={{ 
                      bgcolor: `${THEME.info}15`,
                      color: THEME.info,
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>
            )}
          >
            {SITES.map((site) => (
              <MenuItem key={site} value={site}>
                {site}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {formErrors.sites || 'Select one or more sites'}
          </FormHelperText>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderWorkDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Contracted Hours"
          type="number"
          value={userData.contractedHours || ''}
          onChange={(e) => handleFieldChange('contractedHours', parseFloat(e.target.value))}
          error={!!formErrors.contractedHours}
          helperText={formErrors.contractedHours || 'Weekly contracted hours'}
          InputProps={{
            startAdornment: (
              <AccessTimeIcon sx={{ 
                mr: 1, 
                color: formErrors.contractedHours ? THEME.error : 'action.active' 
              }} />
            ),
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Annual Leave Days"
          type="number"
          value={userData.annualLeave || ''}
          onChange={(e) => handleFieldChange('annualLeave', parseInt(e.target.value))}
          error={!!formErrors.annualLeave}
          helperText={formErrors.annualLeave || 'Annual leave entitlement'}
          InputProps={{
            startAdornment: (
              <EventAvailableIcon sx={{ 
                mr: 1, 
                color: formErrors.annualLeave ? THEME.error : 'action.active' 
              }} />
            ),
          }}
        />
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={userData.preferences?.flexibleHours ?? true}
              onChange={(e) => handleFieldChange('preferences', {
                ...userData.preferences,
                flexibleHours: e.target.checked
              })}
            />
          }
          label="Flexible Hours"
        />
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={userData.preferences?.nightShiftOnly ?? false}
              onChange={(e) => handleFieldChange('preferences', {
                ...userData.preferences,
                nightShiftOnly: e.target.checked
              })}
            />
          }
          label="Night Shift Only"
        />
      </Grid>
    </Grid>
  );

  const renderNotifications = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Notification Preferences
      </Typography>
      
      <Paper 
        elevation={1} 
        sx={{ 
          p: 3, 
          mb: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={userData.notificationPreferences?.email ?? DEFAULT_NOTIFICATION_PREFERENCES.email}
                  onChange={(e) => handleNotificationPreferenceChange('email', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: THEME.info,
                    }
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    Email Notifications
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Receive updates via email
                  </Typography>
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={userData.notificationPreferences?.sms ?? DEFAULT_NOTIFICATION_PREFERENCES.sms}
                  onChange={(e) => handleNotificationPreferenceChange('sms', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: THEME.warning,
                    }
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    SMS Notifications
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Receive updates via SMS
                  </Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderUserInformation();
      case 1:
        return renderRoleAndSite();
      case 2:
        return renderWorkDetails();
      case 3:
        return renderNotifications();
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
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
        {userId ? 'Edit User' : 'Add User'}
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel 
          sx={{ 
            mb: 4,
            '& .MuiStepLabel-root': {
              cursor: 'pointer',
            },
            '& .MuiStepLabel-completed': {
              color: THEME.success,
            }
          }}
        >
          {steps.map((label, index) => (
            <Step 
              key={label}
              onClick={() => setActiveStep(index)}
              sx={{
                '&:hover': {
                  opacity: 0.8,
                }
              }}
            >
              <StepLabel>
                <Typography variant="body2" fontWeight="medium">
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
          {renderStepContent()}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ 
        justifyContent: 'space-between', 
        px: 3, 
        pb: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}>
        <Button 
          onClick={handleClose} 
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
        
        <Box>
          {activeStep > 0 && (
            <Button 
              onClick={handleBack}
              sx={{ mr: 1 }}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
          )}
          
          <Button
            onClick={activeStep < steps.length - 1 ? handleNext : handleSave}
            variant="contained"
            color="primary"
            disabled={isLoading}
            sx={{
              px: 4,
              bgcolor: THEME.info,
              '&:hover': {
                bgcolor: darken(THEME.info, 0.1),
              },
              ...(activeStep === steps.length - 1 && {
                animation: 'pulse 1.5s infinite',
              })
            }}
          >
            {activeStep < steps.length - 1 ? 'Next' : 'Save'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
});
