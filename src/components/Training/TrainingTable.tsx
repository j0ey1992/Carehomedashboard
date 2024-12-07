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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return theme.palette.error.main;
      case 'expiring':
        return theme.palette.warning.main;
      case 'valid':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 90) return theme.palette.success.main;
    if (percentage >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const calculateCompletion = (record: TrainingRecord) => {
    // This is a simplified calculation - adjust based on your actual requirements
    const totalRequired = 100; // Example: total required training points
    const completed = record.status === 'valid' ? 100 : 
                     record.status === 'expiring' ? 70 : 0;
    return completed;
  };

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
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
            <TableCell>Completion</TableCell>
            <TableCell>Expiry Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => {
            const completion = calculateCompletion(record);
            const isSelected = selectedRecords.includes(record.id);
            const statusColor = getStatusColor(record.status);
            const completionColor = getCompletionColor(completion);

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
                <TableCell>{record.courseTitle}</TableCell>
                <TableCell>
                  <Chip
                    label={record.status}
                    size="small"
                    sx={{
                      bgcolor: alpha(statusColor, 0.1),
                      color: statusColor,
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Stack spacing={1}>
                    <LinearProgress
                      variant="determinate"
                      value={completion}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(completionColor, 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: completionColor,
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {`${completion}% Complete`}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {record.status !== 'valid' && (
                      <WarningIcon
                        fontSize="small"
                        sx={{ color: statusColor }}
                      />
                    )}
                    <Typography
                      color={record.status !== 'valid' ? statusColor : 'textPrimary'}
                    >
                      {formatDate(record.expiryDate)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit Record">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(record)}
                        sx={{ color: theme.palette.primary.main }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Send Reminder">
                      <IconButton
                        size="small"
                        onClick={() => onSendReminder(record)}
                        sx={{ color: theme.palette.info.main }}
                      >
                        <MailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Schedule Reminder">
                      <IconButton
                        size="small"
                        onClick={() => onScheduleReminder(record)}
                        sx={{ color: theme.palette.warning.main }}
                      >
                        <ScheduleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Record">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(record.id)}
                        sx={{ color: theme.palette.error.main }}
                      >
                        <DeleteIcon fontSize="small" />
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
