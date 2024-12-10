import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  LinearProgress,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Mail as MailIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as ValidIcon,
  Error as ExpiredIcon,
  AccessTime as ExpiringIcon,
} from '@mui/icons-material';
import { TrainingRecord } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { alpha, useTheme } from '@mui/material/styles';

interface TrainingTableProps {
  records: TrainingRecord[];
  selectedRecords: string[];
  onSelectRecord: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (record: TrainingRecord) => void;
  onDelete: (id: string) => void;
  onSendReminder: (record: TrainingRecord) => void;
  onScheduleReminder: (record: TrainingRecord) => void;
}

const TrainingTable: React.FC<TrainingTableProps> = ({
  records,
  selectedRecords,
  onSelectRecord,
  onSelectAll,
  onEdit,
  onDelete,
  onSendReminder,
  onScheduleReminder,
}) => {
  const theme = useTheme();

  const getStatusInfo = (record: TrainingRecord) => {
    const now = new Date();
    const expiryDate = new Date(record.expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiryDate < now) {
      return {
        status: 'expired',
        color: theme.palette.error.main,
        icon: <ExpiredIcon />,
        label: 'Expired',
        urgency: 3
      };
    } else if (expiryDate <= thirtyDaysFromNow) {
      return {
        status: 'expiring',
        color: theme.palette.warning.main,
        icon: <ExpiringIcon />,
        label: 'Expiring Soon',
        urgency: 2
      };
    } else {
      return {
        status: 'valid',
        color: theme.palette.success.main,
        icon: <ValidIcon />,
        label: 'Valid',
        urgency: 1
      };
    }
  };

  const calculateCompletion = (record: TrainingRecord) => {
    const statusInfo = getStatusInfo(record);
    switch (statusInfo.status) {
      case 'valid':
        return 100;
      case 'expiring':
        return 70;
      case 'expired':
        return 0;
      default:
        return 0;
    }
  };

  // Sort records by urgency
  const sortedRecords = [...records].sort((a, b) => {
    const statusA = getStatusInfo(a).urgency;
    const statusB = getStatusInfo(b).urgency;
    return statusB - statusA;
  });

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        borderRadius: 2, 
        boxShadow: 2,
        '& .MuiTableCell-root': {
          fontSize: '1rem',
          padding: '16px',
        },
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ 
            bgcolor: theme.palette.grey[100],
            '& .MuiTableCell-head': {
              fontWeight: 600,
              color: theme.palette.text.primary,
            }
          }}>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedRecords.length > 0 && selectedRecords.length < records.length}
                checked={records.length > 0 && selectedRecords.length === records.length}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </TableCell>
            <TableCell>Staff Member</TableCell>
            <TableCell>Course</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>Expiry Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRecords.map((record) => {
            const statusInfo = getStatusInfo(record);
            const completion = calculateCompletion(record);
            const isSelected = selectedRecords.includes(record.id);

            return (
              <TableRow
                key={record.id}
                selected={isSelected}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                  borderLeft: `4px solid ${statusInfo.color}`,
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onSelectRecord(record.id)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body1" fontWeight={500}>
                    {record.staffName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">
                    {record.courseTitle}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={statusInfo.icon}
                    label={statusInfo.label}
                    size="medium"
                    sx={{
                      bgcolor: alpha(statusInfo.color, 0.1),
                      color: statusInfo.color,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      '& .MuiChip-icon': {
                        color: 'inherit'
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Stack spacing={1}>
                    <LinearProgress
                      variant="determinate"
                      value={completion}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: alpha(statusInfo.color, 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: statusInfo.color,
                          borderRadius: 5,
                        },
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: statusInfo.color,
                        fontWeight: 500,
                        fontSize: '0.875rem'
                      }}
                    >
                      {`${completion}% Complete`}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {statusInfo.icon}
                    <Typography
                      sx={{
                        color: statusInfo.color,
                        fontWeight: 500
                      }}
                    >
                      {formatDate(record.expiryDate)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit Record" arrow>
                      <IconButton
                        size="medium"
                        onClick={() => onEdit(record)}
                        sx={{ 
                          color: theme.palette.primary.main,
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.1)
                          }
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Send Reminder" arrow>
                      <IconButton
                        size="medium"
                        onClick={() => onSendReminder(record)}
                        sx={{ 
                          color: theme.palette.info.main,
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.info.main, 0.1)
                          }
                        }}
                      >
                        <MailIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Schedule Reminder" arrow>
                      <IconButton
                        size="medium"
                        onClick={() => onScheduleReminder(record)}
                        sx={{ 
                          color: theme.palette.warning.main,
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.warning.main, 0.1)
                          }
                        }}
                      >
                        <ScheduleIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Record" arrow>
                      <IconButton
                        size="medium"
                        onClick={() => onDelete(record.id)}
                        sx={{ 
                          color: theme.palette.error.main,
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.error.main, 0.1)
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TrainingTable;
