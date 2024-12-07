import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Tooltip,
  Badge,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import VerifiedIcon from '@mui/icons-material/Verified';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import { Staff, ShiftRole, ComplianceLevel, Shift } from '../../types/rota';

interface StaffSelectorProps {
  open: boolean;
  onClose: () => void;
  staff: Staff[];
  shift?: Shift;
  onSelect: (staffId: string, role: ShiftRole) => void;
}

const StaffSelector: React.FC<StaffSelectorProps> = ({
  open,
  onClose,
  staff,
  shift,
  onSelect
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<ShiftRole | ''>('');
  const [selectedRole, setSelectedRole] = useState<ShiftRole>('Care Staff');

  const getComplianceColor = (level: number): string => {
    if (level >= 90) return theme.palette.success.main;
    if (level >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getComplianceLevel = (score: number): ComplianceLevel => {
    if (score >= 90) return 'High';
    if (score >= 70) return 'Medium';
    return 'Low';
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || member.roles.includes(roleFilter);
      const notAssigned = !shift?.assignedStaff.some(assignment => 
        typeof assignment === 'string' 
          ? assignment === member.id 
          : assignment.userId === member.id
      );
      return matchesSearch && matchesRole && notAssigned;
    });
  }, [staff, searchTerm, roleFilter, shift]);

  const isOnLeave = (staffMember: Staff): boolean => {
    if (!shift) return false;
    return staffMember.leave.some(leave => 
      leave.startDate <= shift.date && leave.endDate >= shift.date
    );
  };

  const getIncompleteTraining = (staffMember: Staff): string[] => {
    return staffMember.trainingModules
      .filter(module => module.required && module.status !== 'completed')
      .map(module => module.name);
  };

  const handleSelect = (staffId: string) => {
    onSelect(staffId, selectedRole);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Select Staff Member</DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter by Role</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as ShiftRole | '')}
                  label="Filter by Role"
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="Care Staff">Care Staff</MenuItem>
                  <MenuItem value="Shift Leader">Shift Leader</MenuItem>
                  <MenuItem value="Driver">Driver</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Assign as Role</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ShiftRole)}
                  label="Assign as Role"
                >
                  <MenuItem value="Care Staff">Care Staff</MenuItem>
                  <MenuItem value="Shift Leader">Shift Leader</MenuItem>
                  <MenuItem value="Driver">Driver</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          <List>
            {filteredStaff.map((member) => {
              const onLeave = isOnLeave(member);
              const incompleteTraining = getIncompleteTraining(member);
              
              return (
                <ListItem
                  key={member.id}
                  button
                  onClick={() => handleSelect(member.id)}
                  disabled={onLeave}
                  sx={{
                    opacity: onLeave ? 0.6 : 1,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08)
                    }
                  }}
                >
                  <ListItemIcon>
                    <Badge
                      overlap="circular"
                      badgeContent={onLeave ? <EventBusyIcon color="error" /> : null}
                    >
                      <PersonIcon />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary={member.name}
                    secondary={
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {member.roles.map((role) => (
                            <Chip
                              key={role}
                              label={role}
                              size="small"
                              color={role === selectedRole ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Tooltip title={`${member.contractedHours}h contracted`}>
                            <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                              <AccessTimeIcon fontSize="small" />
                              <Typography variant="caption" component="span">
                                {member.contractedHours}h
                              </Typography>
                            </Stack>
                          </Tooltip>
                          <Tooltip title={`Compliance: ${member.complianceScore.overall}%`}>
                            <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                              <VerifiedIcon 
                                fontSize="small" 
                                sx={{ color: getComplianceColor(member.complianceScore.overall) }}
                              />
                              <Typography variant="caption" component="span">
                                {getComplianceLevel(member.complianceScore.overall)}
                              </Typography>
                            </Stack>
                          </Tooltip>
                          {incompleteTraining.length > 0 && (
                            <Tooltip title={`Required Training: ${incompleteTraining.join(', ')}`}>
                              <SchoolIcon fontSize="small" color="warning" />
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    }
                  />
                </ListItem>
              );
            })}
            {filteredStaff.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No staff members available"
                  secondary="Try adjusting your search or filter criteria"
                />
              </ListItem>
            )}
          </List>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaffSelector;
