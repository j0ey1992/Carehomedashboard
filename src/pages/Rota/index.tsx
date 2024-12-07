import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  useTheme,
  alpha,
  Stack,
  Typography,
  IconButton,
  CircularProgress,
  Drawer,
  TextField,
  InputAdornment,
  ButtonGroup,
  Button,
  Divider,
  Tooltip,
  Fab
} from '@mui/material';
import WeeklySchedule from '../../components/Rota/WeeklySchedule';
import AutoScheduler from '../../components/Rota/AutoScheduler';
import { ImportDialog } from '../../components/Rota/ImportDialog';
import StaffList from '../../components/Rota/StaffList';
import { useRota } from '../../hooks/useRota';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Staff, ShiftTime, ShiftRole } from '../../types/rota';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import PeopleIcon from '@mui/icons-material/People';
import { format, startOfWeek } from 'date-fns';

interface ShiftRequirements {
  total: number;
  shiftLeader: boolean;
  driver: boolean;
}

const DRAWER_WIDTH = 280;

type RoleFilter = ShiftRole | 'All';

const RotaPage: React.FC = () => {
  const theme = useTheme();
  const {
    currentRota,
    staff,
    isLoading,
    currentDate,
    navigateToNextWeek,
    navigateToPreviousWeek,
    addShift,
    assignStaff,
    removeStaff,
    generateRota,
    loadRotaForWeek,
    createRota
  } = useRota({ autoLoad: false });

  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [draggingStaff, setDraggingStaff] = useState<Staff | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('All');
  const [paintMode, setPaintMode] = useState(false);

  useEffect(() => {
    const initializeRota = async () => {
      if (hasInitialized) return;
      setHasInitialized(true);
      await loadRotaForWeek(currentDate);
      if (!currentRota) {
        const weekStart = format(
          startOfWeek(currentDate, { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        );
        await createRota(weekStart);
      }
    };

    if (!hasInitialized) {
      initializeRota();
    }
  }, [hasInitialized, currentDate, loadRotaForWeek, createRota, currentRota]);

  const { shortcuts } = useKeyboardShortcuts({
    paintMode,
    onPaintModeToggle: () => setPaintMode((prev) => !prev),
    onClearSelection: () => {
      setPaintMode(false);
      setDraggingStaff(null);
    }
  });

  const handleStaffDragStart = useCallback((staff: Staff) => {
    setDraggingStaff(staff);
    setDrawerOpen(false);
  }, []);

  const handleStaffAssign = useCallback(
    async (shiftId: string, staffId: string, role: ShiftRole) => {
      if (draggingStaff) {
        // Handle drag and drop case
        try {
          await assignStaff(shiftId, draggingStaff.id, draggingStaff.roles[0]);
        } finally {
          setDraggingStaff(null);
        }
      } else if (staffId) {
        // Handle staff selector case
        await assignStaff(shiftId, staffId, role);
      }
    },
    [draggingStaff, assignStaff]
  );

  const handleStaffRemove = useCallback(
    (shiftId: string) => {
      if (!currentRota) return;
      const shift = currentRota.shifts.find((s) => s.id === shiftId);
      if (!shift || shift.assignedStaff.length === 0) return;
      const lastAssignment = shift.assignedStaff[shift.assignedStaff.length - 1];
      const staffId =
        typeof lastAssignment === 'string' ? lastAssignment : lastAssignment.userId;
      removeStaff(shiftId, staffId);
    },
    [currentRota, removeStaff]
  );

  const handleAddShift = useCallback(
    (date: string, time: ShiftTime, requirements: ShiftRequirements) => {
      addShift(date, time, requirements);
    },
    [addShift]
  );

  const handleDrawerToggle = useCallback(() => {
    if (!draggingStaff) {
      setDrawerOpen((prev) => !prev);
    }
  }, [draggingStaff]);

  const filteredStaff = useMemo(() => {
    return staff.filter(
      (member) =>
        (selectedRole === 'All' || member.roles.includes(selectedRole)) &&
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, selectedRole, searchTerm]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: alpha(theme.palette.background.default, 0.98)
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentRota) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          bgcolor: alpha(theme.palette.background.default, 0.98)
        }}
      >
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          No rota found for this week. Creating a new one...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      bgcolor: alpha(theme.palette.background.default, 0.98),
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Main Content */}
      <Box 
        sx={{ 
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          p: 1,
          position: 'relative',
          zIndex: theme.zIndex.drawer - 2
        }}
      >
        <WeeklySchedule
          startDate={currentDate}
          rota={currentRota}
          staff={staff}
          onAddShift={handleAddShift}
          onEditShift={() => {}}
          onDeleteShift={handleStaffRemove}
          onAssignStaff={handleStaffAssign}
          onNavigateNext={navigateToNextWeek}
          onNavigatePrevious={navigateToPreviousWeek}
        />

        <AutoScheduler
          open={showAutoScheduler}
          onClose={() => setShowAutoScheduler(false)}
          onGenerate={generateRota}
        />

        <ImportDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
        />
      </Box>

      {/* Staff List Overlay */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          zIndex: theme.zIndex.drawer,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            borderRight: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[8]
          }
        }}
      >
        <Stack spacing={2} sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PeopleIcon sx={{ color: theme.palette.primary.main }} />
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  fontSize: '1rem'
                }}
              >
                Staff List
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Keyboard Shortcuts" placement="bottom">
                <IconButton size="small" onClick={() => {}} sx={{ p: 0.5 }}>
                  <KeyboardIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={handleDrawerToggle} sx={{ p: 0.5 }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <TextField
            fullWidth
            size="small"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.85rem'
              }
            }}
          />

          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterListIcon fontSize="small" color="action" />
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                Filter by Role
              </Typography>
            </Stack>
            <ButtonGroup fullWidth size="small" variant="outlined">
              {['All', 'Care Staff', 'Shift Leader', 'Driver'].map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <Button
                    key={role}
                    onClick={() => setSelectedRole(role as RoleFilter)}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      ...(isSelected && {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main
                      })
                    }}
                  >
                    {role === 'Care Staff' ? 'Care' :
                     role === 'Shift Leader' ? 'Lead' :
                     role === 'Driver' ? 'Drive' :
                     'All'}
                  </Button>
                );
              })}
            </ButtonGroup>
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}
            >
              {filteredStaff.length} staff members
            </Typography>
            <StaffList
              staff={filteredStaff}
              onDragStart={handleStaffDragStart}
            />
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowAutoScheduler(true)}
              fullWidth
              sx={{ fontSize: '0.85rem', textTransform: 'none' }}
            >
              Auto Schedule
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowImportDialog(true)}
              fullWidth
              sx={{
                fontSize: '0.85rem',
                textTransform: 'none',
                borderColor: alpha(theme.palette.text.primary, 0.2)
              }}
            >
              Import Rota
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      {/* Floating Staff List Toggle Button */}
      <Box
        sx={{
          position: 'fixed',
          left: theme.spacing(2),
          top: theme.spacing(2),
          zIndex: theme.zIndex.drawer + 1,
          pointerEvents: draggingStaff ? 'none' : 'auto'
        }}
      >
        {!drawerOpen && !draggingStaff && (
          <Tooltip title="Open Staff List" placement="right">
            <Fab
              size="medium"
              color="primary"
              onClick={handleDrawerToggle}
              sx={{
                boxShadow: theme.shadows[4],
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark
                }
              }}
            >
              <PeopleIcon />
            </Fab>
          </Tooltip>
        )}
      </Box>

      {/* Drag Layer */}
      {draggingStaff && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.drawer - 1,
            pointerEvents: 'none'
          }}
        />
      )}
    </Box>
  );
};

export default React.memo(RotaPage);
