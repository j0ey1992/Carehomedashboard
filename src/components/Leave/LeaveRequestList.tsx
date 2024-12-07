import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Paper,
  TextField,
  MenuItem,
  Grid,
  Alert,
  useTheme,
  alpha,
  Collapse
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Assessment as AssessmentIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import DataTable from '../Common/DataTable';
import { LeaveRequest, LeaveType, LeaveStatus } from '../../types/leave';
import { useLeave } from '../../contexts/LeaveContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRotaContext } from '../../contexts/RotaContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';
import { DataTableColumn } from '../../types';

interface FilterState {
  status: string;
  leaveType: string;
  dateRange: 'all' | 'thisMonth' | 'nextMonth' | 'custom';
  startDate: string;
  endDate: string;
  site?: string;
}

type LeaveRequestColumn = keyof LeaveRequest | 'actions';

export const LeaveRequestList: React.FC = () => {
  const theme = useTheme();
  const { leaveRequests, updateLeaveRequest, leaveEntitlement } = useLeave();
  const { currentRota } = useRotaContext();
  const { currentUser, userData, isAdmin } = useAuth();
  const { notify } = useNotifications();
  
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    leaveType: 'all',
    dateRange: 'all',
    startDate: '',
    endDate: '',
    site: isAdmin ? 'all' : userData?.site
  });

  // Simplified canApproveRequests function
  const canApproveRequests = (request: LeaveRequest): boolean => {
    if (!currentUser || !userData) return false;

    // Cannot approve own requests
    if (request.userId === currentUser.uid) return false;

    // Admin can approve all requests
    if (isAdmin) return true;

    // Manager can approve requests from their sites
    if (userData.role === 'manager') {
      return userData.sites?.includes(request.site) || false;
    }

    return false;
  };

  // Rest of the functions remain the same...
  const canViewRequest = (request: LeaveRequest): boolean => {
    if (!currentUser || !userData) return false;

    // Admin can view all requests
    if (isAdmin) return true;

    // Manager can view requests from their sites
    if (userData.role === 'manager') {
      return userData.sites?.includes(request.site) || false;
    }

    // Staff can only view their own requests
    return request.userId === currentUser.uid;
  };

  // Filter leave requests based on user role and filters
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter(request => {
      // First check if user can view this request
      if (!canViewRequest(request)) return false;

      // Then apply other filters
      if (filters.status !== 'all' && request.status !== filters.status) {
        return false;
      }

      if (filters.leaveType !== 'all' && request.leaveType !== filters.leaveType) {
        return false;
      }

      if (isAdmin && filters.site !== 'all' && request.site !== filters.site) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const startDate = parseISO(request.startDate);
        let rangeStart: Date;
        let rangeEnd: Date;

        switch (filters.dateRange) {
          case 'thisMonth':
            rangeStart = startOfMonth(new Date());
            rangeEnd = endOfMonth(new Date());
            break;
          case 'nextMonth':
            rangeStart = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() + 1)));
            rangeEnd = endOfMonth(new Date(new Date().setMonth(new Date().getMonth() + 1)));
            break;
          case 'custom':
            if (filters.startDate && filters.endDate) {
              rangeStart = parseISO(filters.startDate);
              rangeEnd = parseISO(filters.endDate);
            } else {
              return true;
            }
            break;
          default:
            return true;
        }

        if (!isWithinInterval(startDate, { start: rangeStart, end: rangeEnd })) {
          return false;
        }
      }

      return true;
    });
  }, [leaveRequests, filters, userData, currentUser]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const approved = filteredRequests.filter(r => r.status === 'approved').length;
    const pending = filteredRequests.filter(r => r.status === 'pending').length;
    const declined = filteredRequests.filter(r => r.status === 'declined').length;
    
    const totalDays = filteredRequests.reduce((sum, r) => sum + r.totalDays, 0);
    const approvedDays = filteredRequests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.totalDays, 0);

    // Calculate leave usage by site
    const siteUsage: Record<string, number> = {};
    filteredRequests.forEach(request => {
      if (request.status === 'approved') {
        siteUsage[request.site] = (siteUsage[request.site] || 0) + request.totalDays;
      }
    });

    return {
      total,
      approved,
      pending,
      declined,
      totalDays,
      approvedDays,
      siteUsage
    };
  }, [filteredRequests]);

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'declined':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleEdit = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !currentUser) return;

    try {
      await updateLeaveRequest(selectedRequest.id, {
        status: 'approved',
        approvedBy: currentUser.uid,
        approvalNotes: 'Approved by manager/admin',
        updatedAt: new Date().toISOString()
      });

      notify({
        type: 'system',
        title: 'Leave Request Approved',
        message: `Leave request for ${selectedRequest.staffName} has been approved`,
        userId: selectedRequest.userId
      });

      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving leave request:', error);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest || !currentUser) return;

    try {
      await updateLeaveRequest(selectedRequest.id, {
        status: 'declined',
        approvedBy: currentUser.uid,
        approvalNotes: 'Declined by manager/admin',
        updatedAt: new Date().toISOString()
      });

      notify({
        type: 'system',
        title: 'Leave Request Declined',
        message: `Leave request for ${selectedRequest.staffName} has been declined`,
        userId: selectedRequest.userId
      });

      setSelectedRequest(null);
    } catch (error) {
      console.error('Error declining leave request:', error);
    }
  };

  const handleDelete = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const handleCancel = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedRequest || !currentUser) return;

    try {
      await updateLeaveRequest(selectedRequest.id, { 
        status: 'cancelled' as LeaveStatus,
        updatedAt: new Date().toISOString()
      });

      notify({
        type: 'system',
        title: 'Leave Cancelled',
        message: `Leave request for ${format(parseISO(selectedRequest.startDate), 'dd MMM yyyy')} has been cancelled`,
        userId: selectedRequest.userId
      });

      setIsCancelDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error cancelling leave request:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRequest || !currentUser) return;

    try {
      await updateLeaveRequest(selectedRequest.id, { 
        status: 'declined' as LeaveStatus,
        updatedAt: new Date().toISOString()
      });
      setIsDeleteDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error deleting leave request:', error);
    }
  };

  const checkRotaConflict = (request: LeaveRequest): boolean => {
    if (!currentRota) return false;
    
    const leaveStart = parseISO(request.startDate);
    const leaveEnd = parseISO(request.endDate);
    const rotaStart = parseISO(currentRota.startDate);
    const rotaEnd = parseISO(currentRota.endDate);

    return isWithinInterval(leaveStart, { start: rotaStart, end: rotaEnd }) ||
           isWithinInterval(leaveEnd, { start: rotaStart, end: rotaEnd });
  };

  const isLeaveInCurrentYear = (request: LeaveRequest): boolean => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 3, 1); // April 1st
    const yearEnd = new Date(now.getFullYear() + 1, 2, 31); // March 31st next year
    const leaveStart = parseISO(request.startDate);
    
    return isAfter(leaveStart, yearStart) && isBefore(leaveStart, yearEnd);
  };

  const columns: DataTableColumn<LeaveRequest>[] = [
    {
      id: 'staffName' as LeaveRequestColumn,
      label: 'Staff Name',
      format: (value) => value as string
    },
    {
      id: 'startDate' as LeaveRequestColumn,
      label: 'Start Date',
      format: (value) => format(parseISO(value as string), 'dd MMM yyyy')
    },
    {
      id: 'endDate' as LeaveRequestColumn,
      label: 'End Date',
      format: (value) => format(parseISO(value as string), 'dd MMM yyyy')
    },
    {
      id: 'totalDays' as LeaveRequestColumn,
      label: 'Days',
      align: 'center'
    },
    {
      id: 'leaveType' as LeaveRequestColumn,
      label: 'Type'
    },
    ...(isAdmin ? [{
      id: 'site' as LeaveRequestColumn,
      label: 'Site'
    }] : []),
    {
      id: 'status' as LeaveRequestColumn,
      label: 'Status',
      format: (value, row) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={value as string}
            color={getStatusColor(value as LeaveStatus)}
            size="small"
          />
          {checkRotaConflict(row as LeaveRequest) && (
            <Tooltip title="Conflicts with current rota">
              <WarningIcon color="warning" fontSize="small" />
            </Tooltip>
          )}
          {!isLeaveInCurrentYear(row as LeaveRequest) && (
            <Tooltip title="Leave is in different leave year">
              <EventIcon color="info" fontSize="small" />
            </Tooltip>
          )}
        </Stack>
      )
    },
    {
      id: 'actions' as LeaveRequestColumn,
      label: 'Actions',
      align: 'right',
      format: (_: any, row?: LeaveRequest) => {
        if (!row) return null;

        const isOwnRequest = currentUser && row.userId === currentUser.uid;
        const canManage = isAdmin || (userData?.role === 'manager' && userData.sites?.includes(row.site));

        return (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {/* Show approve/decline buttons for pending requests */}
            {row.status === 'pending' && canManage && !isOwnRequest && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => {
                    setSelectedRequest(row);
                    handleApprove();
                  }}
                  startIcon={<CheckCircleIcon />}
                  sx={{ minWidth: '100px' }}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={() => {
                    setSelectedRequest(row);
                    handleDecline();
                  }}
                  startIcon={<CloseIcon />}
                  sx={{ minWidth: '100px' }}
                >
                  Decline
                </Button>
              </>
            )}

            {/* Staff can only cancel their approved requests */}
            {isOwnRequest && row.status === 'approved' && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleCancel(row)}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
            )}

            {/* Show delete button for pending requests */}
            {row.status === 'pending' && (isOwnRequest || canManage) && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleDelete(row)}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            )}
          </Stack>
        );
      }
    }
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">
          Leave Requests
          {!isAdmin && userData?.role === 'manager' && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({userData.sites?.join(', ')})
            </Typography>
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Toggle Filters">
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Statistics">
            <IconButton onClick={() => setShowStats(!showStats)}>
              <AssessmentIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Statistics Section */}
      <Collapse in={showStats}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: '12px'
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Request Statistics
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  Total Requests: {stats.total}
                </Typography>
                <Typography variant="body2" color="success.main">
                  Approved: {stats.approved}
                </Typography>
                <Typography variant="body2" color="warning.main">
                  Pending: {stats.pending}
                </Typography>
                <Typography variant="body2" color="error.main">
                  Declined: {stats.declined}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: '12px'
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Leave Days Summary
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  Total Days Requested: {stats.totalDays}
                </Typography>
                <Typography variant="body2">
                  Approved Days: {stats.approvedDays}
                </Typography>
                {leaveEntitlement && (
                  <Typography variant="body2">
                    Remaining Balance: {leaveEntitlement.remainingDays} days
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
          {isAdmin && (
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: '12px'
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Leave Usage by Site
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(stats.siteUsage).map(([site, days]) => (
                    <Grid item xs={6} sm={4} md={3} key={site}>
                      <Typography variant="body2">
                        {site}: {days} days
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Collapse>

      {/* Filters Section */}
      <Collapse in={showFilters}>
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            borderRadius: '12px'
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                size="small"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="declined">Declined</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Leave Type"
                value={filters.leaveType}
                onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                size="small"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Annual Leave">Annual Leave</MenuItem>
                <MenuItem value="Unpaid Leave">Unpaid Leave</MenuItem>
                <MenuItem value="Emergency Leave">Emergency Leave</MenuItem>
              </TextField>
            </Grid>
            {isAdmin && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Site"
                  value={filters.site}
                  onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                  size="small"
                >
                  <MenuItem value="all">All Sites</MenuItem>
                  {Array.from(new Set(leaveRequests.map(r => r.site))).map(site => (
                    <MenuItem key={site} value={site}>{site}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Date Range"
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterState['dateRange'] })}
                size="small"
              >
                <MenuItem value="all">All Dates</MenuItem>
                <MenuItem value="thisMonth">This Month</MenuItem>
                <MenuItem value="nextMonth">Next Month</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </TextField>
            </Grid>
            {filters.dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    type="date"
                    fullWidth
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    type="date"
                    fullWidth
                    label="End Date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      </Collapse>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        emptyMessage="No leave requests found"
      />

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={handleEditDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Review Leave Request
          <IconButton
            aria-label="close"
            onClick={handleEditDialogClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Staff Member
                </Typography>
                <Typography variant="body1">
                  {selectedRequest.staffName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Leave Type
                </Typography>
                <Typography variant="body1">
                  {selectedRequest.leaveType}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1">
                  {format(parseISO(selectedRequest.startDate), 'PPP')} - {format(parseISO(selectedRequest.endDate), 'PPP')}
                  <Typography variant="body2" color="text.secondary">
                    ({selectedRequest.totalDays} working {selectedRequest.totalDays === 1 ? 'day' : 'days'})
                  </Typography>
                </Typography>
              </Box>
              {selectedRequest.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.notes}
                  </Typography>
                </Box>
              )}
              {checkRotaConflict(selectedRequest) && (
                <Alert 
                  severity="warning" 
                  icon={<EventIcon />}
                >
                  This request conflicts with the current rota.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>
            Cancel
          </Button>
          {selectedRequest && (isAdmin || (userData?.role === 'manager' && userData.sites?.includes(selectedRequest.site))) && selectedRequest.userId !== currentUser?.uid && (
            <>
              <Button
                onClick={handleDecline}
                color="error"
                startIcon={<CloseIcon />}
              >
                Decline
              </Button>
              <Button
                onClick={handleApprove}
                color="success"
                variant="contained"
                startIcon={<CheckCircleIcon />}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this leave request?
          </Typography>
          {selectedRequest && checkRotaConflict(selectedRequest) && (
            <Alert 
              severity="warning" 
              icon={<EventIcon />}
              sx={{ mt: 2 }}
            >
              This request conflicts with the current rota. Deleting it may affect shift assignments.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Leave Dialog */}
      <Dialog
        open={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Leave Request</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to cancel this approved leave request?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will:
          </Typography>
          <ul>
            <li>Return the days to your leave balance</li>
            <li>Remove the block-out from the rota</li>
            <li>Notify relevant staff members</li>
          </ul>
          {selectedRequest && checkRotaConflict(selectedRequest) && (
            <Alert 
              severity="warning" 
              icon={<EventIcon />}
              sx={{ mt: 2 }}
            >
              This leave period is within the current rota period. Cancelling it will affect shift assignments.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCancelDialogOpen(false)}>
            Keep Leave
          </Button>
          <Button
            onClick={handleCancelConfirm}
            color="primary"
            variant="contained"
            startIcon={<RefreshIcon />}
          >
            Cancel Leave
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveRequestList;
