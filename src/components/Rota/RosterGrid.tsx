import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Stack,
  IconButton,
  Paper,
  Chip
} from '@mui/material';
import { format, addDays, isToday } from 'date-fns';
import { Rota, Staff, ShiftTime, SHIFT_TIME_DETAILS, Shift, ShiftRole } from '../../types/rota';
import ShiftCell from './ShiftCell';
import StaffSelector from './StaffSelector';
import AddIcon from '@mui/icons-material/Add';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WbTwilightIcon from '@mui/icons-material/WbTwilight';
import NightsStayIcon from '@mui/icons-material/NightsStay';

interface RosterGridProps {
  startDate: Date;
  rota: Rota;
  staff: Staff[];
  onShiftClick?: (shiftId: string) => void;
  onStaffAssign?: (shiftId: string, staffId: string, role: ShiftRole) => void;
  onStaffRemove?: (shiftId: string) => void;
  isDraggingStaff?: boolean;
  onAddShift?: (date: string, time: ShiftTime, requirements: ShiftRequirements) => void;
}

interface ShiftRequirements {
  total: number;
  shiftLeader: boolean;
  driver: boolean;
}

const getShiftIcon = (type: 'morning' | 'afternoon' | 'night') => {
  switch (type) {
    case 'morning':
      return <WbSunnyIcon fontSize="small" sx={{ color: '#FBC02D' }} />;
    case 'afternoon':
      return <WbTwilightIcon fontSize="small" sx={{ color: '#5C6BC0' }} />;
    case 'night':
      return <NightsStayIcon fontSize="small" sx={{ color: '#311B92' }} />;
  }
};

const RosterGrid: React.FC<RosterGridProps> = ({
  startDate,
  rota,
  staff,
  onShiftClick,
  onStaffAssign,
  onStaffRemove,
  isDraggingStaff = false,
  onAddShift
}) => {
  const theme = useTheme();
  const [dragOverShiftId, setDragOverShiftId] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showStaffSelector, setShowStaffSelector] = useState(false);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(startDate, i);
        return {
          date,
          formattedDate: format(date, 'yyyy-MM-dd'),
          dayName: format(date, 'EEEE'),
          dayNumber: format(date, 'do')
        };
      }),
    [startDate]
  );

  const shiftTimes = useMemo(() => Object.keys(SHIFT_TIME_DETAILS) as ShiftTime[], []);

  const getShiftsForDateAndTime = useCallback(
    (date: string, time: ShiftTime): Shift[] => {
      return rota.shifts.filter(
        (shift) => shift.date === date && shift.time === time
      );
    },
    [rota.shifts]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, shiftId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverShiftId(shiftId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverShiftId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, shiftId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverShiftId(null);
    onStaffAssign?.(shiftId, '', 'Care Staff'); // Role will be handled by drag source
  }, [onStaffAssign]);

  const handleQuickAdd = useCallback(
    (date: string, time: ShiftTime) => {
      if (onAddShift) {
        onAddShift(date, time, {
          total: SHIFT_TIME_DETAILS[time].type === 'night' ? 2 : 4,
          shiftLeader: true,
          driver: SHIFT_TIME_DETAILS[time].type === 'morning'
        });
      }
    },
    [onAddShift]
  );

  const handleStaffSelect = useCallback((staffId: string, role: ShiftRole) => {
    if (selectedShift && onStaffAssign) {
      onStaffAssign(selectedShift.id, staffId, role);
    }
    setSelectedShift(null);
    setShowStaffSelector(false);
  }, [selectedShift, onStaffAssign]);

  const handleAssignStaff = useCallback((shift: Shift) => {
    setSelectedShift(shift);
    setShowStaffSelector(true);
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        overflowX: 'auto',
        bgcolor: alpha(theme.palette.background.default, 0.98),
        p: 0.5,
      }}
    >
      {/* Days Header */}
      <Stack direction="row" spacing={0} sx={{ mb: 1 }}>
        <Box sx={{ width: 120 }} />
        {weekDays.map(({ date, dayName, dayNumber }) => (
          <Box
            key={dayName}
            sx={{
              flex: 1,
              p: 0.5,
              textAlign: 'center',
              bgcolor: isToday(date)
                ? alpha(theme.palette.primary.main, 0.08)
                : 'transparent',
              borderRadius: 1
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight="600"
              sx={{ 
                color: isToday(date) ? theme.palette.primary.main : 'inherit',
                fontSize: '0.9rem',
                mb: 0.5
              }}
            >
              {dayName}
            </Typography>
            <Chip
              label={dayNumber}
              color={isToday(date) ? 'primary' : 'default'}
              size="small"
              variant={isToday(date) ? 'filled' : 'outlined'}
              sx={{
                fontSize: '0.75rem',
                fontWeight: '500',
                height: 20,
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
          </Box>
        ))}
      </Stack>

      {/* Grid */}
      <Stack spacing={1}>
        {shiftTimes.map((time) => (
          <Stack
            key={time}
            direction="row"
            spacing={1}
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              borderRadius: 1,
              p: 0.5,
              transition: 'none',
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
            }}
          >
            {/* Time Column */}
            <Box
              sx={{
                width: 120,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexShrink: 0
              }}
            >
              {getShiftIcon(SHIFT_TIME_DETAILS[time].type)}
              <Stack spacing={0.25}>
                <Typography variant="subtitle2" fontWeight="600" sx={{ fontSize: '0.8rem' }}>
                  {SHIFT_TIME_DETAILS[time].start} - {SHIFT_TIME_DETAILS[time].end}
                </Typography>
                <Chip
                  label={SHIFT_TIME_DETAILS[time].type}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 18,
                    fontSize: '0.7rem',
                    fontWeight: '500',
                    '& .MuiChip-label': {
                      px: 1
                    }
                  }}
                />
              </Stack>
            </Box>

            {/* Shifts */}
            {weekDays.map(({ formattedDate }) => {
              const shifts = getShiftsForDateAndTime(formattedDate, time);
              const cellId = `${formattedDate}-${time}`;

              return (
                <Box
                  key={cellId}
                  sx={{
                    flex: 1,
                    minHeight: 80,
                    position: 'relative',
                    transition: 'none',
                    display: 'flex',
                    alignItems: 'stretch'
                  }}
                >
                  {shifts.length > 0 ? (
                    <Stack spacing={0.5} sx={{ width: '100%' }}>
                      {shifts.map((shift) => (
                        <Box
                          key={shift.id}
                          onClick={() => onShiftClick?.(shift.id)}
                          onDragOver={(e) => handleDragOver(e, shift.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, shift.id)}
                          sx={{
                            border: dragOverShiftId === shift.id
                              ? `2px solid ${theme.palette.primary.main}`
                              : '2px solid transparent',
                            borderRadius: 1,
                            p: 0.5,
                            bgcolor: alpha(theme.palette.background.paper, 0.6),
                            cursor: 'pointer'
                          }}
                        >
                          <ShiftCell
                            shift={shift}
                            staff={staff}
                            onAssignStaff={() => handleAssignStaff(shift)}
                            onRemoveStaff={() => onStaffRemove?.(shift.id)}
                            isDragging={isDraggingStaff}
                            isValidDrop={isDraggingStaff && dragOverShiftId === shift.id}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Paper
                      elevation={0}
                      sx={{
                        height: '100%',
                        minHeight: 80,
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`,
                        bgcolor: 'transparent',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          borderColor: theme.palette.primary.main
                        }
                      }}
                      onClick={() => handleQuickAdd(formattedDate, time)}
                    >
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  )}
                </Box>
              );
            })}
          </Stack>
        ))}
      </Stack>

      {/* Staff Selector Dialog */}
      <StaffSelector
        open={showStaffSelector}
        onClose={() => {
          setShowStaffSelector(false);
          setSelectedShift(null);
        }}
        staff={staff}
        shift={selectedShift || undefined}
        onSelect={handleStaffSelect}
      />
    </Box>
  );
};

export default React.memo(RosterGrid);
