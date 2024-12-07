import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Alert,
  Stack,
  Chip,
  Tooltip,
  IconButton,
  Paper,
  Button,
  ButtonGroup,
  Collapse,
  Fade
} from '@mui/material';
import { format } from 'date-fns';
import { Rota, Staff, ShiftTime, ShiftRole } from '../../types/rota';
import RosterGrid from './RosterGrid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PlaylistAddCheckCircleIcon from '@mui/icons-material/PlaylistAddCheckCircle';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import SaveIcon from '@mui/icons-material/Save';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface WeeklyScheduleProps {
  startDate: Date;
  rota: Rota;
  staff: Staff[];
  onAddShift: (date: string, time: ShiftTime, requirements: ShiftRequirements) => void;
  onEditShift: (shiftId: string) => void;
  onDeleteShift: (shiftId: string) => void;
  onAssignStaff: (shiftId: string, staffId: string, role: ShiftRole) => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
}

interface ShiftRequirements {
  total: number;
  shiftLeader: boolean;
  driver: boolean;
}

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  startDate,
  rota,
  staff,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onAssignStaff,
  onNavigateNext,
  onNavigatePrevious
}) => {
  const theme = useTheme();
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [draggingStaff, setDraggingStaff] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const stats = useMemo(() => {
    const totalShifts = rota.shifts.length;
    const filledShifts = rota.shifts.filter(s => s.status === 'Fully Staffed').length;
    const unfilledShifts = rota.shifts.filter(s => s.status === 'Unfilled').length;
    const partiallyFilledShifts = rota.shifts.filter(s => s.status === 'Partially Staffed').length;

    return {
      totalShifts,
      filledShifts,
      unfilledShifts,
      partiallyFilledShifts
    };
  }, [rota.shifts]);

  const handleShiftClick = useCallback((shiftId: string) => {
    setSelectedShiftId(shiftId);
  }, []);

  const handleDragStart = useCallback(() => {
    setDraggingStaff(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingStaff(false);
  }, []);

  const handleStaffAssign = useCallback((shiftId: string, staffId: string, role: ShiftRole) => {
    onAssignStaff(shiftId, staffId, role);
    setDraggingStaff(false);
  }, [onAssignStaff]);

  return (
    <Stack
      spacing={1}
      onDragEnter={() => setDraggingStaff(true)}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDraggingStaff(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      sx={{
        p: 0.5,
        bgcolor: alpha(theme.palette.background.default, 0.9),
        borderRadius: 1
      }}
    >
      {/* Header Section */}
      <Paper 
        elevation={2}
        sx={{ 
          p: 1,
          bgcolor: alpha(theme.palette.background.paper, 0.98)
        }}
      >
        <Stack spacing={1}>
          {/* Navigation and Controls */}
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" component="div" fontWeight="bold">
                Weekly Rota
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                <Button startIcon={<FileCopyIcon fontSize="small" />} sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  Templates
                </Button>
                <Button startIcon={<SaveIcon fontSize="small" />} sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  Save
                </Button>
                <Button startIcon={<AutorenewIcon fontSize="small" />} sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  Auto-Fill
                </Button>
              </ButtonGroup>
              <Tooltip title="Show/Hide Tips" arrow>
                <IconButton 
                  size="small" 
                  onClick={() => setShowTips(prev => !prev)}
                  color={showTips ? "primary" : "default"}
                  sx={{ ml: 0.5 }}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton 
                onClick={onNavigatePrevious}
                disabled={!onNavigatePrevious}
                size="small"
                sx={{ 
                  p: 0.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2)
                  }
                }}
              >
                <NavigateBeforeIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle2" sx={{ minWidth: 160, textAlign: 'center' }}>
                Week {format(startDate, 'wo')} • {format(startDate, 'MMMM yyyy')}
              </Typography>
              <IconButton 
                onClick={onNavigateNext}
                disabled={!onNavigateNext}
                size="small"
                sx={{ 
                  p: 0.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2)
                  }
                }}
              >
                <NavigateNextIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Stats Section */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Total number of shifts for this week" arrow>
              <Chip
                icon={<PlaylistAddCheckCircleIcon fontSize="small" />}
                label={`Total: ${stats.totalShifts}`}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.7rem', fontWeight: 500, height: 20 }}
              />
            </Tooltip>

            <Tooltip title="All required staff assigned" arrow>
              <Chip
                icon={<CheckCircleIcon fontSize="small" />}
                label={`Filled: ${stats.filledShifts}`}
                color="success"
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.7rem', fontWeight: 500, height: 20 }}
              />
            </Tooltip>

            <Tooltip title="Some staff assigned, but more needed" arrow>
              <Chip
                icon={<WarningAmberIcon fontSize="small" />}
                label={`Partial: ${stats.partiallyFilledShifts}`}
                color="warning"
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.7rem', fontWeight: 500, height: 20 }}
              />
            </Tooltip>

            <Tooltip title="No staff assigned yet" arrow>
              <Chip
                icon={<ErrorOutlineIcon fontSize="small" />}
                label={`Unfilled: ${stats.unfilledShifts}`}
                color="error"
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.7rem', fontWeight: 500, height: 20 }}
              />
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Collapsible Tips Section */}
      <Collapse in={showTips}>
        <Fade in={showTips}>
          <Alert 
            severity="info" 
            sx={{ 
              py: 0.5,
              px: 1,
              alignItems: 'flex-start',
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Stack spacing={0.25}>
              <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                Tips for Quick Navigation
              </Typography>
              <Typography variant="body2" component="div" sx={{ fontSize: '0.75rem' }}>
                • Click the + button in empty slots to add shifts
              </Typography>
              <Typography variant="body2" component="div" sx={{ fontSize: '0.75rem' }}>
                • Use templates to quickly set up common patterns
              </Typography>
              <Typography variant="body2" component="div" sx={{ fontSize: '0.75rem' }}>
                • Drag staff from the staff list onto shifts to assign
              </Typography>
            </Stack>
          </Alert>
        </Fade>
      </Collapse>

      {/* Main Roster Grid */}
      <RosterGrid
        startDate={startDate}
        rota={rota}
        staff={staff}
        onShiftClick={handleShiftClick}
        onStaffAssign={handleStaffAssign}
        onStaffRemove={onDeleteShift}
        isDraggingStaff={draggingStaff}
        onAddShift={onAddShift}
      />
    </Stack>
  );
};

export default React.memo(WeeklySchedule);
