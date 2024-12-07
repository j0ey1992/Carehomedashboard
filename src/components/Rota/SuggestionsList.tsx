import React, { useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Typography,
  Paper,
  Tooltip,
  useTheme,
  alpha,
  Stack,
  Badge
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RecommendIcon from '@mui/icons-material/Recommend';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import VerifiedIcon from '@mui/icons-material/Verified';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Staff, Shift, AIShiftSuggestion, ShiftRole, ComplianceLevel } from '../../types/rota';

interface SuggestionsListProps {
  suggestions: AIShiftSuggestion;
  staff: Staff[];
  shift: Shift;
  onAssignStaff: (staffId: string, role: ShiftRole) => void;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  staff,
  shift,
  onAssignStaff
}) => {
  const theme = useTheme();

  const getStaffMember = (staffId: string) => {
    return staff.find(s => s.id === staffId);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return theme.palette.success.main;
    if (confidence >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

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

  const isStaffOnLeave = (staffMember: Staff, shiftDate: string): boolean => {
    const date = new Date(shiftDate);
    return staffMember.leave.some(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  const getIncompleteTraining = (staffMember: Staff): string[] => {
    return staffMember.trainingModules
      .filter(module => module.required && module.status !== 'completed')
      .map(module => module.name);
  };

  const isStaffTrainedForShift = (staffMember: Staff): boolean => {
    if (!shift.trainingRequired || shift.trainingRequired.length === 0) return true;
    const requiredTrainings = shift.trainingRequired;
    const completedTraining = staffMember.trainingModules.filter(m => m.status === 'completed').map(m => m.name);
    return requiredTrainings.every(req => completedTraining.includes(req));
  };

  const renderStaffSuggestion = (
    staffId: string,
    role: ShiftRole,
    confidence: number,
    reason: string,
    isPrimary: boolean = false
  ) => {
    const staffMember = getStaffMember(staffId);
    if (!staffMember) return null;

    const overallCompliance = staffMember.complianceScore.overall;
    const incompleteTraining = getIncompleteTraining(staffMember);
    const trainedForShift = isStaffTrainedForShift(staffMember);
    const onLeave = isStaffOnLeave(staffMember, shift.date);
    const complianceLevel = getComplianceLevel(overallCompliance);

    return (
      <ListItem
        key={staffId}
        sx={{
          borderRadius: 1,
          mb: 1,
          bgcolor: isPrimary ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1)
          },
          opacity: onLeave ? 0.6 : 1,
          cursor: onLeave ? 'not-allowed' : 'pointer'
        }}
      >
        <ListItemText
          primary={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Badge
                overlap="circular"
                badgeContent={onLeave ? <EventBusyIcon color="error" fontSize="small" /> : null}
              >
                <Typography variant="body1" component="span">
                  {staffMember.name}
                </Typography>
              </Badge>
              {isPrimary && (
                <Tooltip title="Best Match">
                  <RecommendIcon
                    fontSize="small"
                    sx={{ color: theme.palette.primary.main }}
                  />
                </Tooltip>
              )}
              <Chip
                label={`${Math.round(confidence * 100)}%`}
                size="small"
                sx={{
                  bgcolor: alpha(getConfidenceColor(confidence), 0.1),
                  color: getConfidenceColor(confidence),
                  fontWeight: 'medium'
                }}
              />
            </Stack>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary" component="div">
                {reason}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {staffMember.roles.map(r => (
                  <Chip
                    key={r}
                    label={r}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Tooltip title={`${staffMember.contractedHours}h contracted`}>
                  <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                    <AccessTimeIcon fontSize="small" />
                    <Typography variant="caption" component="span">
                      {staffMember.contractedHours}h
                    </Typography>
                  </Stack>
                </Tooltip>
                <Tooltip title={`Compliance: ${staffMember.complianceScore.overall}%`}>
                  <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                    <VerifiedIcon
                      fontSize="small"
                      sx={{ color: getComplianceColor(overallCompliance) }}
                    />
                    <Typography variant="caption" component="span">
                      {complianceLevel}
                    </Typography>
                  </Stack>
                </Tooltip>
                {!trainedForShift && (
                  <Tooltip title="This staff member lacks required training for this shift">
                    <SchoolIcon fontSize="small" color="error" />
                  </Tooltip>
                )}
                {incompleteTraining.length > 0 && (
                  <Tooltip title={`Incomplete Training: ${incompleteTraining.join(', ')}`}>
                    <SchoolIcon fontSize="small" color="warning" />
                  </Tooltip>
                )}
              </Stack>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <Tooltip title={onLeave ? 'Staff is on leave' : `Assign as ${role}`}>
            <span>
              <IconButton
                edge="end"
                onClick={() => !onLeave && onAssignStaff(staffId, role)}
                color="primary"
                size="small"
                disabled={onLeave}
              >
                <PersonAddIcon />
              </IconButton>
            </span>
          </Tooltip>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        AI Suggestions
        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
          {shift.time} on {new Date(shift.date).toLocaleDateString()}
        </Typography>
      </Typography>

      {suggestions.reasoning.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="textSecondary">
            Reasoning:
          </Typography>
          <List dense sx={{ pl: 2 }}>
            {suggestions.reasoning.map((reason, index) => (
              <Typography
                key={index}
                variant="body2"
                color="textSecondary"
                sx={{ '&:before': { content: '"•"', mr: 1 } }}
              >
                {reason}
              </Typography>
            ))}
          </List>
        </Box>
      )}

      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
        Recommended Staff
      </Typography>
      <List>
        {suggestions.suggestedStaff.map(suggestion =>
          renderStaffSuggestion(
            suggestion.staffId,
            suggestion.role,
            suggestion.confidence,
            suggestion.reason,
            true
          )
        )}
      </List>

      {suggestions.alternativeStaff.length > 0 && (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Alternative Options
          </Typography>
          <List>
            {suggestions.alternativeStaff.map(suggestion =>
              renderStaffSuggestion(
                suggestion.staffId,
                suggestion.role,
                suggestion.confidence,
                suggestion.reason
              )
            )}
          </List>
        </>
      )}

      {suggestions.suggestedStaff.length === 0 &&
       suggestions.alternativeStaff.length === 0 && (
        <Typography color="textSecondary" align="center" sx={{ py: 2 }}>
          No suggestions available
        </Typography>
      )}
    </Paper>
  );
};
