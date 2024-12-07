import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  Alert,
  Checkbox,
  Zoom,
  Fade,
  Badge,
  Stack,
  CircularProgress,
  Tooltip,
  Avatar,
  Autocomplete,
  Drawer,
  ToggleButton,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send as SendIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ShiftIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Group as GroupIcon,
  PersonAdd as SelectAllIcon,
  PersonRemove as DeselectAllIcon,
  WbSunny as WbSunnyIcon,
  WbTwilight as WbTwilightIcon,
  NightsStay as NightsStayIcon,
  Schedule,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import PageHeader from '../../components/Common/PageHeader';
import { useCommunication } from '../../contexts/CommunicationContext';
import useData from '../../hooks/useData';
import { format, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { alpha, useTheme } from '@mui/material/styles';

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  department?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
  };
}

interface Shift {
  type: 'AM' | 'PM' | 'NIGHT';
  icon: React.ReactNode;
  color: string;
}

interface DayShifts {
  date: Date;
  shifts: {
    AM: boolean;
    PM: boolean;
    NIGHT: boolean;
  };
}

interface MessageStats {
  totalSent: number;
  successRate: number;
  activeRecipients: number;
  pendingMessages: number;
}

const SHIFT_TYPES: Shift[] = [
  { 
    type: 'AM',
    icon: <WbSunnyIcon />,
    color: '#ff9800' // warning
  },
  { 
    type: 'PM',
    icon: <WbTwilightIcon />,
    color: '#2196f3' // info
  },
  { 
    type: 'NIGHT',
    icon: <NightsStayIcon />,
    color: '#3f51b5' // primary
  },
];

const CommunicationPage = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [messageType, setMessageType] = useState('sms');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayShifts, setSelectedDayShifts] = useState<DayShifts[]>([]);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const { sendMessage, loading } = useCommunication();
  const { data: users = [] } = useData<User>('users');

  const handleSelectAllStaff = () => {
    if (selectedStaff.length === users.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(users.map(user => user.id));
    }
  };

  const getInitial = (name: string): string => {
    return name && typeof name === 'string' ? name.charAt(0).toUpperCase() : '?';
  };

  const updateDaysList = (start: Date | null, end: Date | null) => {
    if (start && end) {
      const days = eachDayOfInterval({ start, end });
      setSelectedDayShifts(days.map(date => ({
        date,
        shifts: { AM: false, PM: false, NIGHT: false }
      })));
      updateMessageFromShifts();
    } else {
      setSelectedDayShifts([]);
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    updateDaysList(date, endDate);
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    updateDaysList(startDate, date);
  };

  const handleShiftToggle = (date: Date, shiftType: 'AM' | 'PM' | 'NIGHT') => {
    setSelectedDayShifts(prev => {
      const newShifts = prev.map(dayShift => {
        if (dayShift.date.getTime() === date.getTime()) {
          return {
            ...dayShift,
            shifts: {
              ...dayShift.shifts,
              [shiftType]: !dayShift.shifts[shiftType]
            }
          };
        }
        return dayShift;
      });
      
      setTimeout(() => updateMessageFromShifts(), 0);
      return newShifts;
    });
  };

  const updateMessageFromShifts = () => {
    if (startDate && endDate) {
      const shiftsNeeded = selectedDayShifts
        .filter(day => Object.values(day.shifts).some(selected => selected))
        .map(day => {
          const selectedShifts = Object.entries(day.shifts)
            .filter(([_, selected]) => selected)
            .map(([type]) => type);
          return `${format(day.date, 'MMM d')}: ${selectedShifts.join(', ')}`;
        });

      if (shiftsNeeded.length > 0) {
        const startDateStr = format(startDate, 'MMM d');
        const endDateStr = format(endDate, 'MMM d');
        
        setSubject(`Cover Needed: Multiple Shifts - ${startDateStr} to ${endDateStr}`);
        setMessage(
          `Cover needed for the following shifts:\n\n` +
          shiftsNeeded.join('\n') +
          `\n\nPlease respond if you are available to work any of these shifts.`
        );
      }
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setMessage('');
    setSubject('');
    setSelectedStaff([]);
    setStartDate(null);
    setEndDate(null);
    setSelectedDayShifts([]);
  };

  const handleSendMessage = async () => {
    try {
      const messageData = {
        type: messageType as 'email' | 'sms' | 'both',
        subject: subject || 'Staff Communication',
        message,
        recipients: selectedStaff,
        dateRange: startDate && endDate ? {
          start: startDate,
          end: endDate
        } : undefined,
        shifts: selectedDayShifts
      };

      await sendMessage(messageData);
      
      setSuccessMessage('Message sent successfully! 🎉');
      
      setTimeout(() => {
        setMessage('');
        setSubject('');
        setSelectedStaff([]);
        setStartDate(null);
        setEndDate(null);
        setSelectedDayShifts([]);
      }, 500);

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while sending the message');
    }
  };

  const stats = useMemo<MessageStats>(() => {
    return {
      totalSent: selectedStaff.length,
      successRate: 100,
      activeRecipients: users.length,
      pendingMessages: 0,
    };
  }, [selectedStaff.length, users.length]);

  const achievements = useMemo(() => {
    const hasSelectedStaff = selectedStaff.length > 0;
    const hasMessage = message.trim().length > 0;
    const hasShifts = selectedDayShifts.some(day => 
      Object.values(day.shifts).some(selected => selected)
    );
    const hasDateRange = startDate && endDate;
    
    return {
      readyToSend: hasSelectedStaff && hasMessage,
      shiftsCovered: tabValue === 1 && hasShifts && hasDateRange,
      allStaffSelected: selectedStaff.length === users.length,
      totalAchievements: [
        hasSelectedStaff,
        hasMessage,
        hasShifts && hasDateRange
      ].filter(Boolean).length
    };
  }, [selectedStaff, message, selectedDayShifts, startDate, endDate, tabValue, users.length]);

  const renderMessageTypeSelector = () => (
    <FormControl 
      fullWidth
      sx={{
        '& .MuiOutlinedInput-root': {
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 2,
          },
        },
      }}
    >
      <InputLabel>Message Type</InputLabel>
      <Select
        value={messageType}
        onChange={(e) => setMessageType(e.target.value)}
        startAdornment={
          messageType === 'sms' ? <SmsIcon color="primary" sx={{ mr: 1 }} /> :
          messageType === 'email' ? <EmailIcon color="primary" sx={{ mr: 1 }} /> :
          <MessageIcon color="primary" sx={{ mr: 1 }} />
        }
      >
        <MenuItem value="sms">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmsIcon /> SMS
          </Box>
        </MenuItem>
        <MenuItem value="email">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon /> Email
          </Box>
        </MenuItem>
        <MenuItem value="both">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MessageIcon /> Both
          </Box>
        </MenuItem>
      </Select>
    </FormControl>
  );

  const renderStaffSelector = () => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          onClick={handleSelectAllStaff}
          startIcon={selectedStaff.length === users.length ? 
            <DeselectAllIcon /> : <SelectAllIcon />}
          sx={{
            transition: 'all 0.3s ease',
            padding: '12px 24px',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 2,
            },
          }}
        >
          {selectedStaff.length === users.length ? 'Deselect All' : 'Select All Staff'}
        </Button>
        <Chip 
          label={`${selectedStaff.length} Selected`} 
          color={selectedStaff.length > 0 ? "primary" : "default"}
          sx={{ height: '40px', fontSize: '1.1rem' }}
        />
      </Box>

      <Autocomplete
        multiple
        id="staff-selector"
        options={users}
        value={users.filter(user => selectedStaff.includes(user.id))}
        onChange={(e, newValue) => {
          setSelectedStaff(newValue.map(user => user.id));
        }}
        getOptionLabel={(option) => option.name}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Search and Select Staff"
            placeholder="Type to search..."
            sx={{
              '& .MuiOutlinedInput-root': {
                padding: '8px 12px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                },
              },
            }}
          />
        )}
        renderOption={(props, option) => (
          <MenuItem {...props} sx={{ 
            py: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              transform: 'scale(1.02)',
            },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {getInitial(option.name)}
              </Avatar>
              <Box>
                <Typography variant="body1">{option.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {option.email}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={option.name}
              avatar={<Avatar>{getInitial(option.name)}</Avatar>}
              sx={{
                m: 0.5,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            />
          ))
        }
        sx={{
          width: '100%',
          '& .MuiAutocomplete-tag': {
            margin: '4px',
          },
        }}
      />
    </Box>
  );

  const renderShiftSelector = () => (
    <Box>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              minDate={startDate || undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />
          </Grid>
        </Grid>
      </LocalizationProvider>

      {selectedDayShifts.length > 0 && (
        <Grid container spacing={2}>
          {selectedDayShifts.map((dayShift) => (
            <Grid item xs={12} key={dayShift.date.toISOString()}>
              <Paper
                sx={{
                  p: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  {format(dayShift.date, 'EEEE, MMMM d')}
                </Typography>
                <Stack direction="row" spacing={2}>
                  {SHIFT_TYPES.map((shift) => (
                    <ToggleButton
                      key={shift.type}
                      value={shift.type}
                      selected={dayShift.shifts[shift.type]}
                      onChange={() => handleShiftToggle(dayShift.date, shift.type)}
                      sx={{
                        flex: 1,
                        p: 1,
                        gap: 1,
                        borderColor: shift.color,
                        color: dayShift.shifts[shift.type] ? 'white' : shift.color,
                        bgcolor: dayShift.shifts[shift.type] ? shift.color : 'transparent',
                        '&:hover': {
                          bgcolor: dayShift.shifts[shift.type] 
                            ? shift.color 
                            : alpha(shift.color, 0.1),
                        },
                        '&.Mui-selected': {
                          bgcolor: shift.color,
                          '&:hover': {
                            bgcolor: shift.color,
                          },
                        },
                      }}
                    >
                      {shift.icon}
                      <Typography>{shift.type}</Typography>
                    </ToggleButton>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderAchievements = () => (
    <Fade in timeout={1000}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Tooltip title="Message Ready" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.readyToSend ? '✓' : ''}
            color="success"
          >
            <MessageIcon 
              color={achievements.readyToSend ? 'primary' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="Staff Selected" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.allStaffSelected ? '✓' : ''}
            color="success"
          >
            <GroupIcon 
              color={selectedStaff.length > 0 ? 'info' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        {tabValue === 1 && (
          <Tooltip title="Shifts Selected" TransitionComponent={Zoom}>
            <Badge
              badgeContent={achievements.shiftsCovered ? '✓' : ''}
              color="success"
            >
              <ShiftIcon 
                color={achievements.shiftsCovered ? 'warning' : 'disabled'} 
                sx={{ fontSize: 40 }}
              />
            </Badge>
          </Tooltip>
        )}
        {achievements.totalAchievements === 3 && (
          <Tooltip title="Communication Master!" TransitionComponent={Zoom}>
            <TrophyIcon 
              color="primary" 
              sx={{ 
                fontSize: 40,
                animation: 'bounce 1s infinite',
              }} 
            />
          </Tooltip>
        )}
      </Box>
    </Fade>
  );

  const renderProgressHeader = () => (
    <Box 
      sx={{ 
        mb: 3, 
        p: 2, 
        borderRadius: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        boxShadow: 2,
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Message Status
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress
              variant="determinate"
              value={stats.successRate}
              size={60}
              thickness={4}
              sx={{
                color: stats.successRate === 100 ? 'success.main' :
                       stats.successRate >= 80 ? 'info.main' : 'warning.main',
              }}
            />
            <Box>
              <Typography variant="body1" color="textSecondary">
                Recipients Selected: {selectedStaff.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Staff: {users.length}
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <Chip
              icon={<MessageIcon />}
              label={`${messageType.toUpperCase()} Message`}
              color="primary"
              variant="outlined"
            />
            {tabValue === 1 && selectedDayShifts.some(day => 
              Object.values(day.shifts).some(selected => selected)
            ) && (
              <Chip
                icon={<ShiftIcon />}
                label="Shifts Selected"
                color="warning"
                variant="outlined"
              />
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );

  const renderTabs = () => (
    <Tabs 
      value={tabValue} 
      onChange={handleTabChange}
      sx={{
        '& .MuiTab-root': {
          transition: 'all 0.3s ease',
          minHeight: 60,
          '&:hover': {
            transform: 'translateY(-2px)',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          },
        },
      }}
    >
      <Tab 
        label={
          <Stack direction="row" spacing={1} alignItems="center">
            <MessageIcon />
            <Box>
              <Typography variant="body1">Direct Message</Typography>
              <Typography variant="caption" color="textSecondary">
                Send to specific staff members
              </Typography>
            </Box>
          </Stack>
        }
      />
      <Tab 
        label={
          <Stack direction="row" spacing={1} alignItems="center">
            <ShiftIcon />
            <Box>
              <Typography variant="body1">Shift Cover</Typography>
              <Typography variant="caption" color="textSecondary">
                Request shift coverage
              </Typography>
            </Box>
          </Stack>
        }
      />
    </Tabs>
  );

  const renderSendButton = () => (
    <Box sx={{ 
      mt: 3, 
      display: 'flex', 
      justifyContent: 'flex-end',
      gap: 2,
      p: 2,
    }}>
      {loading && (
        <Typography color="textSecondary">
          Sending to {selectedStaff.length} recipients...
        </Typography>
      )}
      <Button
        variant="contained"
        color="primary"
        onClick={handleSendMessage}
        disabled={loading || !message || !selectedStaff.length}
        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        sx={{
          transition: 'all 0.3s ease',
          minWidth: 150,
          padding: '12px 24px',
          '&:not(:disabled):hover': {
            transform: 'scale(1.05)',
            boxShadow: 4,
          },
          '&:disabled': {
            bgcolor: theme.palette.action.disabledBackground,
          },
        }}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Fade in timeout={600}>
        <Box>
          <PageHeader 
            title="Mass Communication" 
            subtitle="Send messages and shift cover requests to staff members"
            helpText="Use this page to send direct messages or request shift coverage from your staff."
          />

          {renderAchievements()}

          {(successMessage || error) && (
            <Zoom in>
              <Alert 
                severity={successMessage ? "success" : "error"}
                sx={{ 
                  mb: 2,
                  animation: successMessage ? 'slideIn 0.5s ease-out' : undefined,
                }}
                onClose={() => successMessage ? setSuccessMessage('') : setError(null)}
              >
                {successMessage || error}
              </Alert>
            </Zoom>
          )}

          <Paper 
            sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 6,
              },
            }}
          >
            {renderProgressHeader()}
            {renderTabs()}
            <Box sx={{ p: 3 }}>
              {tabValue === 0 && (
                <Fade in>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      {renderMessageTypeSelector()}
                    </Grid>
                    <Grid item xs={12}>
                      {renderStaffSelector()}
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 2,
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 2,
                            },
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Fade>
              )}
              {tabValue === 1 && (
                <Fade in>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      {renderMessageTypeSelector()}
                    </Grid>
                    <Grid item xs={12}>
                      {renderShiftSelector()}
                    </Grid>
                    <Grid item xs={12}>
                      {renderStaffSelector()}
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 2,
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 2,
                            },
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Fade>
              )}
            </Box>
            {renderSendButton()}
          </Paper>

          <style>
            {`
              @keyframes slideIn {
                from {
                  transform: translateY(-20px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
            `}
          </style>
        </Box>
      </Fade>
    </Box>
  );
};

export default CommunicationPage;
