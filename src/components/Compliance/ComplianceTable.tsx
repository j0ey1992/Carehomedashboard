import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Button,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Switch,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  FileDownload as ExportIcon,
  Assignment as TaskIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { User } from '../../types';
import { 
  StaffCompliance, 
  ComplianceItem, 
  HealthCheckItem, 
  SignableItem, 
  CompetencyItem,
  DynamicComplianceItem,
} from '../../types/compliance';
import ComplianceCell from './ComplianceCell';
import ComplianceInputDialog from './ComplianceInputDialog';
import DynamicComplianceDialog from './DynamicComplianceDialog';
import { THEME } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';

interface ComplianceRecord extends StaffCompliance {
  userId: string;
}

interface ComplianceTableProps {
  users: User[];
  complianceRecords: ComplianceRecord[];
  hoveredRow: string | null;
  onHoverChange: (userId: string | null) => void;
  uploading: boolean;
  onEdit?: (userId: string, field: keyof StaffCompliance) => void;
  onFileUpload?: (field: keyof StaffCompliance, file: File) => Promise<void>;
  onAddTask?: (userId: string) => void;
  onUpdateCompliance?: (userId: string, field: keyof StaffCompliance, data: ComplianceItem | CompetencyItem | HealthCheckItem) => Promise<void>;
  onCreateDynamicCompliance?: (data: Omit<DynamicComplianceItem, 'date' | 'expiryDate' | 'status' | 'evidence'>) => Promise<void>;
  onComplete?: (userId: string, field: keyof StaffCompliance) => Promise<void>;
}

const complianceFields: { key: keyof StaffCompliance; label: string }[] = [
  { key: 'dbsCheck', label: 'DBS Check' },
  { key: 'healthCheck', label: 'Health Check' },
  { key: 'supervisionAgreement', label: 'Supervision Agreement' },
  { key: 'beneficiaryOnFile', label: 'Beneficiary On File' },
  { key: 'induction', label: 'Induction' },
  { key: 'stressRiskAssessment', label: 'Risk Assessment' },
  { key: 'albacMat', label: 'Albac Mat' },
  { key: 'dysphagia', label: 'Dysphagia Competency' },
  { key: 'manualHandling', label: 'Manual Handling Competency' },
  { key: 'basicLifeSupport', label: 'Basic Life Support Competency' },
];

const ComplianceTable: React.FC<ComplianceTableProps> = ({
  users,
  complianceRecords,
  hoveredRow,
  onHoverChange,
  uploading,
  onEdit,
  onFileUpload,
  onAddTask,
  onUpdateCompliance,
  onCreateDynamicCompliance,
  onComplete,
}) => {
  const theme = useTheme();
  const { userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [inputDialogOpen, setInputDialogOpen] = useState(false);
  const [dynamicDialogOpen, setDynamicDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<keyof StaffCompliance | null>(null);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get unique sites from users
  const sites = Array.from(new Set(users.map(user => user.site))).filter(Boolean);

  // Get user's compliance status
  const getUserStatus = (record?: ComplianceRecord): 'valid' | 'expired' => {
    if (!record) return 'expired';

    const statuses: ('valid' | 'expired')[] = Object.entries(record)
      .filter(([key]) => key !== 'userId' && key !== 'site' && key !== 'dynamicItems')
      .map(([_, value]) => {
        if (
          typeof value === 'object' && 
          value !== null && 
          'status' in value &&
          (value.status === 'valid' || value.status === 'expired')
        ) {
          return value.status;
        }
        return 'expired';
      });

    // Add dynamic items statuses
    if (record.dynamicItems) {
      Object.values(record.dynamicItems).forEach(item => {
        if (item && typeof item === 'object' && 'status' in item) {
          const status = item.status === 'valid' ? 'valid' : 'expired';
          statuses.push(status);
        }
      });
    }

    return statuses.includes('expired') ? 'expired' : 'valid';
  };

  // Filter users based on search term, filters, and focus mode
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const matchesSite = siteFilter === 'all' || user.site === siteFilter;
    
    const userRecord = complianceRecords.find(r => r.userId === user.id);
    const userStatus = getUserStatus(userRecord);

    if (focusModeEnabled) {
      return matchesSearch && matchesSite && userStatus === 'expired';
    }

    if (statusFilter === 'all') return matchesSearch && matchesSite;
    return matchesSearch && matchesSite && userStatus === statusFilter;
  });

  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'valid':
        return { color: THEME.success, label: 'COMPLIANT', icon: '✓' };
      default:
        return { color: THEME.error, label: 'EXPIRED', icon: '!' };
    }
  };

  const handleAddCompliance = (userId: string, field: keyof StaffCompliance) => {
    setSelectedUser(userId);
    setSelectedField(field);
    setInputDialogOpen(true);
  };

  const handleSubmitCompliance = async (data: ComplianceItem | CompetencyItem) => {
    if (selectedUser && selectedField && onUpdateCompliance) {
      await onUpdateCompliance(selectedUser, selectedField, data);
      setInputDialogOpen(false);
      setSelectedUser(null);
      setSelectedField(null);
    }
  };

  const handleExport = useCallback(() => {
    const data = filteredUsers.map(user => {
      const record = complianceRecords.find(r => r.userId === user.id);
      const status = getUserStatus(record);
      
      const complianceStatuses = complianceFields.reduce<Record<string, string>>((acc, field) => {
        const value = record?.[field.key];
        let status: 'valid' | 'expired' = 'expired';
        
        if (
          value && 
          typeof value === 'object' && 
          'status' in value &&
          (value.status === 'valid' || value.status === 'expired')
        ) {
          status = value.status;
        }

        return {
          ...acc,
          [field.label]: status
        };
      }, {});

      return {
        Name: user.name,
        Role: user.role || '',
        Site: user.site || '',
        Status: status.toUpperCase(),
        ...complianceStatuses
      };
    });

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [filteredUsers, complianceRecords]);

  const getInitialData = (userId: string, field: keyof StaffCompliance) => {
    const userRecord = complianceRecords.find(r => r.userId === userId);
    if (!userRecord) return undefined;

    const item = userRecord[field];
    if (!item || typeof item !== 'object') return undefined;

    if (field === 'healthCheck') {
      return undefined; // Health check items are handled by HealthCheckDialog
    }

    if (field === 'albacMat' || field === 'dysphagia' || field === 'manualHandling' || field === 'basicLifeSupport') {
      return item as CompetencyItem;
    }

    return item as ComplianceItem;
  };

  const canManageCompliance = (targetUserId: string) => {
    if (!userData) return false;
    return (
      userData.role === 'admin' ||
      (userData.role === 'manager' && users.some(u => u.id === targetUserId && u.site === userData.site)) ||
      userData.id === targetUserId
    );
  };

  const canAddTask = (targetUserId: string) => {
    if (!userData) return false;
    return (
      userData.role === 'admin' ||
      (userData.role === 'manager' && users.some(u => u.id === targetUserId && u.site === userData.site))
    );
  };

  const renderMobileView = (user: User) => {
    const userRecord = complianceRecords.find(r => r.userId === user.id);
    const userStatus = getUserStatus(userRecord);
    const { color: statusColor, label: statusLabel, icon: statusIcon } = getStatusChipProps(userStatus);

    return (
      <Paper 
        sx={{ 
          p: 2, 
          mb: 2,
          borderRadius: 2,
          boxShadow: theme.shadows[2],
          '&:hover': {
            boxShadow: theme.shadows[4],
          }
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">{user.name}</Typography>
            <Chip
              label={`${statusIcon} ${statusLabel}`}
              size="small"
              sx={{
                bgcolor: `${statusColor}15`,
                color: statusColor,
                fontWeight: 600,
              }}
            />
          </Box>
          
          <Stack direction="row" spacing={1}>
            {user.role && (
              <Chip label={user.role} size="small" variant="outlined" />
            )}
            {user.site && (
              <Chip label={user.site} size="small" variant="outlined" />
            )}
          </Stack>

          <Box>
            {complianceFields.map(field => (
              <Box key={field.key} sx={{ mt: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  {field.label}
                </Typography>
                <ComplianceCell
                  record={userRecord}
                  field={field.key}
                  user={user}
                  uploading={uploading}
                  onEdit={canManageCompliance(user.id) ? onEdit : undefined}
                  onFileUpload={canManageCompliance(user.id) ? onFileUpload : undefined}
                  onComplete={canManageCompliance(user.id) ? onComplete : undefined}
                  onUpdateCompliance={canManageCompliance(user.id) ? onUpdateCompliance : undefined}
                />
              </Box>
            ))}
          </Box>

          {(canManageCompliance(user.id) || canAddTask(user.id)) && (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {canAddTask(user.id) && onAddTask && (
                <Button
                  startIcon={<TaskIcon />}
                  onClick={() => onAddTask(user.id)}
                  variant="outlined"
                  size="small"
                >
                  Add Task
                </Button>
              )}
              {canManageCompliance(user.id) && (
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => handleAddCompliance(user.id, 'dbsCheck')}
                  variant="contained"
                  size="small"
                >
                  Edit
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Box>
      {/* Filter Bar */}
      <Zoom in timeout={300}>
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3,
            borderRadius: 2,
            boxShadow: theme.shadows[2],
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              boxShadow: theme.shadows[4],
            }
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {!focusModeEnabled && (
              <>
                <Grid item xs={6} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="valid">
                        <Chip 
                          label="COMPLIANT" 
                          size="small"
                          sx={{ 
                            bgcolor: `${THEME.success}15`,
                            color: THEME.success,
                            fontWeight: 600,
                          }}
                        />
                      </MenuItem>
                      <MenuItem value="expired">
                        <Chip 
                          label="EXPIRED" 
                          size="small"
                          sx={{ 
                            bgcolor: `${THEME.error}15`,
                            color: THEME.error,
                            fontWeight: 600,
                          }}
                        />
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {(userData?.role === 'admin' || userData?.role === 'manager') && sites.length > 0 && (
                  <Grid item xs={6} md={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Site</InputLabel>
                      <Select
                        value={siteFilter}
                        onChange={(e) => setSiteFilter(e.target.value)}
                        label="Site"
                      >
                        <MenuItem value="all">All Sites</MenuItem>
                        {sites.map(site => (
                          <MenuItem key={site} value={site}>{site}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </>
            )}

            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                <FormControl component="fieldset">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      Focus Mode
                    </Typography>
                    <Switch
                      checked={focusModeEnabled}
                      onChange={(e) => setFocusModeEnabled(e.target.checked)}
                      color="primary"
                    />
                  </Stack>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={handleExport}
                >
                  Export
                </Button>

                {(userData?.role === 'admin' || userData?.role === 'manager') && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setDynamicDialogOpen(true)}
                  >
                    Add Item
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Zoom>

      {/* Main Content */}
      <Fade in timeout={500}>
        <Box>
          {isMobile ? (
            // Mobile View
            <Stack spacing={2}>
              {filteredUsers.map(user => renderMobileView(user))}
            </Stack>
          ) : (
            // Desktop View
            <TableContainer 
              component={Paper}
              sx={{
                borderRadius: 2,
                boxShadow: theme.shadows[2],
                overflow: 'auto',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                },
                maxHeight: 'calc(100vh - 250px)', // Adjust based on your layout
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      bgcolor: theme.palette.background.default,
                      width: '200px',
                      borderBottom: `2px solid ${theme.palette.divider}`,
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                    }}>
                      Staff Member
                    </TableCell>
                    {complianceFields.map(field => (
                      <TableCell key={field.key} sx={{ 
                        fontWeight: 600,
                        bgcolor: theme.palette.background.default,
                        minWidth: '250px',
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      }}>
                        {field.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ 
                      fontWeight: 600,
                      bgcolor: theme.palette.background.default,
                      width: '100px',
                      borderBottom: `2px solid ${theme.palette.divider}`,
                      position: 'sticky',
                      right: 0,
                      zIndex: 2,
                    }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map(user => {
                    const userRecord = complianceRecords.find(r => r.userId === user.id);
                    const userStatus = getUserStatus(userRecord);
                    const { color: statusColor, label: statusLabel, icon: statusIcon } = getStatusChipProps(userStatus);
                    const canManage = canManageCompliance(user.id);

                    return (
                      <Zoom in key={user.id} timeout={300}>
                        <TableRow 
                          onMouseEnter={() => onHoverChange(user.id)}
                          onMouseLeave={() => onHoverChange(null)}
                          sx={{
                            position: 'relative',
                            '&:hover': {
                              bgcolor: theme.palette.action.hover,
                            },
                            '&:focus-within': {
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                            },
                            transition: 'background-color 0.2s ease-in-out',
                          }}
                        >
                          <TableCell sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: theme.palette.background.paper,
                            zIndex: 1,
                          }}>
                            <Stack spacing={1}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {user.name}
                                </Typography>
                                <Chip
                                  label={`${statusIcon} ${statusLabel}`}
                                  size="small"
                                  sx={{
                                    bgcolor: `${statusColor}15`,
                                    color: statusColor,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      bgcolor: `${statusColor}25`,
                                    },
                                  }}
                                />
                              </Box>
                              <Stack direction="row" spacing={1}>
                                {user.role && (
                                  <Chip
                                    label={user.role}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      transition: 'all 0.2s ease-in-out',
                                      '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                  />
                                )}
                                {user.site && (
                                  <Chip
                                    label={user.site}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      transition: 'all 0.2s ease-in-out',
                                      '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                  />
                                )}
                              </Stack>
                            </Stack>
                          </TableCell>
                          {complianceFields.map(field => (
                            <ComplianceCell
                              key={field.key}
                              record={userRecord}
                              field={field.key}
                              user={user}
                              uploading={uploading}
                              onEdit={canManage ? onEdit : undefined}
                              onFileUpload={canManage ? onFileUpload : undefined}
                              onComplete={canManage ? onComplete : undefined}
                              onUpdateCompliance={canManage ? onUpdateCompliance : undefined}
                            />
                          ))}
                          <TableCell sx={{
                            position: 'sticky',
                            right: 0,
                            bgcolor: theme.palette.background.paper,
                            zIndex: 1,
                          }}>
                            <Stack direction="row" spacing={1}>
                              {canAddTask(user.id) && onAddTask && (
                                <Tooltip title="Add Task">
                                  <IconButton
                                    size="small"
                                    onClick={() => onAddTask(user.id)}
                                    sx={{
                                      color: theme.palette.primary.main,
                                      '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                  >
                                    <TaskIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canManage && (
                                <Tooltip title="Edit Compliance">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleAddCompliance(user.id, 'dbsCheck')}
                                    sx={{
                                      color: theme.palette.primary.main,
                                      '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      </Zoom>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={complianceFields.length + 2}>
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center',
                          color: theme.palette.text.secondary
                        }}>
                          <Typography>
                            No staff members found matching the current filters.
                          </Typography>
                          <Button
                            startIcon={<RefreshIcon />}
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter('all');
                              setSiteFilter('all');
                              setFocusModeEnabled(false);
                            }}
                            sx={{ mt: 2 }}
                          >
                            Reset Filters
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Fade>

      {/* Dialogs */}
      {selectedUser && selectedField && (
        <ComplianceInputDialog
          open={inputDialogOpen}
          onClose={() => {
            setInputDialogOpen(false);
            setSelectedUser(null);
            setSelectedField(null);
          }}
          onSubmit={handleSubmitCompliance}
          title={`Update ${selectedField.split(/(?=[A-Z])/).join(' ')}`}
          description="Enter compliance details below"
          initialData={getInitialData(selectedUser, selectedField)}
          isCompetencyAssessment={selectedField === 'albacMat' || selectedField === 'dysphagia' || selectedField === 'manualHandling' || selectedField === 'basicLifeSupport'}
        />
      )}

      <DynamicComplianceDialog
        open={dynamicDialogOpen}
        onClose={() => setDynamicDialogOpen(false)}
        onSubmit={async (data) => {
          if (onCreateDynamicCompliance) {
            await onCreateDynamicCompliance(data);
            setDynamicDialogOpen(false);
          }
        }}
      />
    </Box>
  );
};

export default ComplianceTable;
