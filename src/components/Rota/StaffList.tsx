import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Chip,
  Tooltip,
  Badge,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Button,
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import VerifiedIcon from '@mui/icons-material/Verified';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Staff, ShiftRole, ComplianceLevel } from '../../types/rota';

interface StaffListProps {
  staff: Staff[];
  onDragStart?: (staff: Staff) => void;
  selectedStaff?: string;
  onStaffSelect?: (staffId: string) => void;
}

const StaffList: React.FC<StaffListProps> = ({
  staff,
  onDragStart,
  selectedStaff,
  onStaffSelect
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<ShiftRole | ''>('');
  const [complianceFilter, setComplianceFilter] = useState<'' | ComplianceLevel>('');

  const getComplianceColor = useCallback((level: number): string => {
    if (level >= 90) return theme.palette.success.main;
    if (level >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  }, [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main]);

  const getComplianceLevel = useCallback((score: number): ComplianceLevel => {
    if (score >= 90) return 'High';
    if (score >= 70) return 'Medium';
    return 'Low';
  }, []);

  const matchesComplianceFilter = useCallback((score: number) => {
    const level = getComplianceLevel(score);
    if (!complianceFilter) return true; // No compliance filter applied
    return level === complianceFilter;
  }, [complianceFilter, getComplianceLevel]);

  const filteredStaff = useMemo(() => 
    staff.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || member.roles.includes(roleFilter);
      const matchesCompliance = matchesComplianceFilter(member.complianceScore.overall);
      return matchesSearch && matchesRole && matchesCompliance;
    }),
  [staff, searchTerm, roleFilter, matchesComplianceFilter]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLLIElement>, s: Staff) => {
    e.dataTransfer.setData('text/plain', s.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(s);

    // Create a drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'staff-drag-image';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.padding = '8px 16px';
    dragImage.style.background = theme.palette.primary.main;
    dragImage.style.color = theme.palette.primary.contrastText;
    dragImage.style.borderRadius = '4px';
    dragImage.style.pointerEvents = 'none';
    dragImage.textContent = s.name;
    document.body.appendChild(dragImage);

    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // Clean up the drag image after dragging
    requestAnimationFrame(() => {
      document.body.removeChild(dragImage);
    });
  }, [theme.palette.primary.main, theme.palette.primary.contrastText, onDragStart]);

  const isOnLeave = useCallback((staffMember: Staff): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return staffMember.leave.some(leave => 
      leave.startDate <= today && leave.endDate >= today
    );
  }, []);

  const getIncompleteTraining = useCallback((staffMember: Staff): string[] => {
    return staffMember.trainingModules
      .filter(module => module.required && module.status !== 'completed')
      .map(module => module.name);
  }, []);

  const roleButtons = useMemo(() => [
    { label: 'All', value: '' },
    { label: 'Care Staff', value: 'Care Staff' },
    { label: 'Shift Leader', value: 'Shift Leader' },
    { label: 'Driver', value: 'Driver' }
  ], []);

  const complianceButtons = useMemo(() => [
    { label: 'All', value: '' as '' },
    { label: 'High', value: 'High' as ComplianceLevel },
    { label: 'Medium', value: 'Medium' as ComplianceLevel },
    { label: 'Low', value: 'Low' as ComplianceLevel }
  ], []);

  return (
    <Paper 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: alpha(theme.palette.background.paper, 0.98)
      }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h6">
          Staff List
        </Typography>
        
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

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {roleButtons.map(({ label, value }) => (
            <Button
              key={label}
              size="small"
              variant={roleFilter === value ? 'contained' : 'outlined'}
              onClick={() => setRoleFilter(value as ShiftRole | '')}
            >
              {label}
            </Button>
          ))}
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {complianceButtons.map(({ label, value }) => (
            <Button
              key={label}
              size="small"
              variant={complianceFilter === value ? 'contained' : 'outlined'}
              onClick={() => setComplianceFilter(value)}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Stack>

      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredStaff.length === 0 ? (
          <ListItem>
            <ListItemText
              primary={<Typography>No staff found matching your criteria.</Typography>}
            />
          </ListItem>
        ) : (
          filteredStaff.map((member) => {
            const onLeave = isOnLeave(member);
            const incompleteTraining = getIncompleteTraining(member);
            
            return (
              <ListItem
                key={member.id}
                draggable={!onLeave}
                onDragStart={(e) => handleDragStart(e, member)}
                onClick={() => onStaffSelect?.(member.id)}
                selected={selectedStaff === member.id}
                sx={{
                  cursor: onLeave ? 'not-allowed' : 'grab',
                  opacity: onLeave ? 0.6 : 1,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08)
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.16)
                    }
                  },
                  '&:active': {
                    cursor: 'grabbing'
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Badge
                        overlap="circular"
                        badgeContent={onLeave ? <EventBusyIcon color="error" /> : null}
                      >
                        <PersonIcon />
                      </Badge>
                      <Typography component="span">{member.name}</Typography>
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {member.roles.map((role) => (
                          <Chip
                            key={role}
                            label={role}
                            size="small"
                            color={role === 'Shift Leader' ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title={`${member.contractedHours}h contracted`}>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <AccessTimeIcon fontSize="small" />
                            <Typography variant="caption" component="span">
                              {member.contractedHours}h
                            </Typography>
                          </Stack>
                        </Tooltip>
                        <Tooltip title={`Compliance: ${member.complianceScore.overall}%`}>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
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
          })
        )}
      </List>

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="textSecondary">
          {filteredStaff.length} staff members shown
        </Typography>
      </Box>
    </Paper>
  );
};

export default React.memo(StaffList);
