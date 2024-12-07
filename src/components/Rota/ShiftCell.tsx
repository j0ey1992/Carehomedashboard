import React, { useMemo } from 'react';
import { 
  Typography, 
  Chip, 
  IconButton, 
  Tooltip, 
  useTheme, 
  Badge,
  alpha,
  Stack,
  Paper
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import WarningIcon from '@mui/icons-material/Warning';
import SchoolIcon from '@mui/icons-material/School';
import VerifiedIcon from '@mui/icons-material/Verified';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { Shift, Staff, SHIFT_TIME_DETAILS, TrainingModule, ShiftRole } from '../../types/rota';

interface ShiftCellProps {
  shift: Shift;
  staff?: Staff[];
  onAssignStaff?: () => void;
  onRemoveStaff?: (staffId: string) => void;
  isEditable?: boolean;
  isDragging?: boolean;
  isValidDrop?: boolean;
}

const ShiftCell: React.FC<ShiftCellProps> = ({
  shift,
  staff = [],
  onAssignStaff,
  onRemoveStaff,
  isEditable = true,
  isDragging = false,
  isValidDrop = false
}) => {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (shift.status) {
      case 'Fully Staffed':
        return theme.palette.success.main;
      case 'Partially Staffed':
        return theme.palette.warning.main;
      case 'Unfilled':
        return theme.palette.error.main;
      case 'Conflict':
        return theme.palette.error.dark;
      default:
        return theme.palette.grey[500];
    }
  };

  const getComplianceColor = () => {
    switch (shift.complianceStatus) {
      case 'High':
        return theme.palette.success.main;
      case 'Medium':
        return theme.palette.warning.main;
      case 'Low':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const isStaffTrainedForShift = (staffMember: Staff): boolean => {
    if (!shift.trainingRequired || shift.trainingRequired.length === 0) return true;
    const requiredTrainings = shift.trainingRequired;
    const completedTraining = staffMember.trainingModules.filter(m => m.status === 'completed').map(m => m.name);
    return requiredTrainings.every(req => completedTraining.includes(req));
  };

  const assignedStaffDetails = useMemo(() => 
    shift.assignedStaff.map(assignment => {
      const staffMember = typeof assignment === 'string'
        ? staff.find(s => s.id === assignment)
        : staff.find(s => s.id === assignment.userId);

      const role = typeof assignment === 'string'
        ? staffMember?.roles[0] || 'Care Staff'
        : assignment.role;

      const onLeave = staffMember && isStaffOnLeave(staffMember, shift.date);

      return {
        id: typeof assignment === 'string' ? assignment : assignment.userId,
        name: staffMember?.name || 'Unknown Staff',
        role: role as ShiftRole,
        onLeave,
        staffMember
      };
    }).filter(details => details.name !== 'Unknown Staff')
  , [shift.assignedStaff, staff, shift.date]);

  const timeDetails = SHIFT_TIME_DETAILS[shift.time];

  const getRoleIcon = (role: ShiftRole) => {
    switch (role) {
      case 'Driver':
        return <DirectionsCarIcon fontSize="small" />;
      case 'Shift Leader':
        return <SupervisorAccountIcon fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Paper
      elevation={isDragging ? 4 : 1}
      sx={{
        p: 0.75,
        border: 1,
        borderColor: isDragging ? 
          (isValidDrop ? theme.palette.success.main : theme.palette.error.main) : 
          getStatusColor(),
        borderRadius: 1,
        bgcolor: isDragging ? 
          (isValidDrop ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05)) : 
          alpha(theme.palette.background.paper, 0.98),
        minHeight: 60,
        transition: 'all 0.2s ease',
        cursor: isDragging ? 'copy' : 'default',
        '&:hover': {
          boxShadow: theme.shadows[2],
          transform: 'translateY(-1px)'
        }
      }}
    >
      {/* Header Section */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography 
          variant="body2" 
          fontWeight="medium"
          sx={{
            color: theme.palette.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.8rem'
          }}
        >
          {timeDetails.start} - {timeDetails.end}
          <Typography 
            variant="caption" 
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              ml: 0.5,
              fontSize: '0.7rem'
            }}
          >
            {timeDetails.type}
          </Typography>
        </Typography>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {shift.trainingRequired && shift.trainingRequired.length > 0 && (
            <Tooltip title={`Required Training: ${shift.trainingRequired.join(', ')}`} arrow>
              <SchoolIcon 
                sx={{ fontSize: '0.9rem', color: theme.palette.warning.main }}
              />
            </Tooltip>
          )}
          {shift.complianceStatus && (
            <Tooltip title={`Compliance Status: ${shift.complianceStatus}`} arrow>
              <VerifiedIcon
                sx={{ fontSize: '0.9rem', color: getComplianceColor() }}
              />
            </Tooltip>
          )}
          {isEditable && onAssignStaff && assignedStaffDetails.length < shift.requiredStaff && (
            <Tooltip title="Add Staff Member" arrow>
              <IconButton 
                size="small" 
                onClick={onAssignStaff}
                sx={{
                  p: 0.25,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2)
                  }
                }}
              >
                <PersonAddIcon sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Staff List */}
      <Stack spacing={0.5}>
        {assignedStaffDetails.map(({ id, name, role, onLeave, staffMember }, index) => {
          if (!staffMember) return null;

          const overallCompliance = staffMember.complianceScore.overall;
          const trainedForShift = isStaffTrainedForShift(staffMember);
          const roleIcon = getRoleIcon(role);

          return (
            <Badge
              key={`${id}-${index}`}
              overlap="circular"
              badgeContent={onLeave ? <EventBusyIcon sx={{ fontSize: '0.8rem' }} color="error" /> : null}
            >
              <Tooltip
                title={`
                  ${name}
                  Role: ${role}
                  Compliance: ${overallCompliance}%
                  ${trainedForShift ? '✓ Meets training requirements' : '⚠ Missing required training'}
                  ${onLeave ? '🚫 Currently on leave' : ''}
                `}
                arrow
                placement="top"
              >
                <Chip
                  label={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {roleIcon && React.cloneElement(roleIcon, { sx: { fontSize: '0.9rem' } })}
                      <span>{name}</span>
                    </Stack>
                  }
                  size="small"
                  variant={role === 'Shift Leader' ? 'filled' : 'outlined'}
                  color={role === 'Shift Leader' ? 'primary' : 'default'}
                  onDelete={isEditable && onRemoveStaff ? () => onRemoveStaff(id) : undefined}
                  deleteIcon={
                    <IconButton size="small" sx={{ p: 0.25 }}>
                      <PersonRemoveIcon sx={{ fontSize: '0.9rem' }} />
                    </IconButton>
                  }
                  sx={{
                    opacity: onLeave ? 0.6 : 1,
                    textDecoration: onLeave ? 'line-through' : 'none',
                    height: 24,
                    '& .MuiChip-label': {
                      px: 0.5,
                      fontSize: '0.75rem'
                    },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }
                  }}
                />
              </Tooltip>
              {!trainedForShift && (
                <Tooltip title="Missing required training" arrow>
                  <SchoolIcon 
                    sx={{ 
                      fontSize: '0.9rem',
                      ml: 0.25,
                      color: theme.palette.error.main,
                      animation: 'pulse 2s infinite'
                    }} 
                  />
                </Tooltip>
              )}
            </Badge>
          );
        })}
      </Stack>

      {/* Footer Section */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center"
        sx={{ 
          mt: 0.5,
          pt: 0.5,
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Stack 
          direction="row" 
          alignItems="center" 
          spacing={0.25}
        >
          {shift.status === 'Conflict' && (
            <WarningIcon 
              sx={{ 
                fontSize: '0.9rem',
                color: theme.palette.error.main,
                animation: 'pulse 2s infinite'
              }} 
            />
          )}
          <Typography 
            variant="caption" 
            sx={{ 
              color: getStatusColor(),
              fontWeight: 'medium',
              fontSize: '0.7rem'
            }}
          >
            {shift.status}
          </Typography>
        </Stack>
        <Typography 
          variant="caption" 
          sx={{
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            bgcolor: alpha(getStatusColor(), 0.1),
            color: getStatusColor(),
            fontWeight: 'medium',
            fontSize: '0.7rem'
          }}
        >
          {assignedStaffDetails.length}/{shift.requiredStaff} Staff
        </Typography>
      </Stack>
    </Paper>
  );
};

function isStaffOnLeave(staffMember: Staff, shiftDate: string): boolean {
  const date = new Date(shiftDate);
  return staffMember.leave.some(leave => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    return date >= startDate && date <= endDate;
  });
}

export default React.memo(ShiftCell);
