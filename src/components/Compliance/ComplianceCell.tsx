import React, { useState } from 'react';
import {
  TableCell,
  Box,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Stack,
  Link,
  Button,
} from '@mui/material';
import {
  CheckCircle as ValidIcon,
  Warning as PendingIcon,
  Error as ExpiredIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  AttachFile as FileIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { format, isAfter, addDays } from 'date-fns';
import { THEME } from '../../theme/colors';
import { User } from '../../types';
import { ComplianceItem, StaffCompliance } from '../../types/compliance';
import FileUploadButton from './FileUploadButton';
import ComplianceInputDialog from './ComplianceInputDialog';

interface ComplianceRecord extends StaffCompliance {
  userId: string;
}

interface ComplianceCellProps {
  record?: ComplianceRecord;
  field: keyof StaffCompliance;
  user: User;
  uploading: boolean;
  onEdit?: (userId: string, field: keyof StaffCompliance) => void;
  onFileUpload?: (field: keyof StaffCompliance, file: File) => Promise<void>;
  onComplete?: (userId: string, field: keyof StaffCompliance) => Promise<void>;
  onUpdateCompliance?: (userId: string, field: keyof StaffCompliance, data: ComplianceItem) => Promise<void>;
}

const ComplianceCell: React.FC<ComplianceCellProps> = ({
  record,
  field,
  user,
  uploading,
  onEdit,
  onFileUpload,
  onComplete,
  onUpdateCompliance,
}) => {
  const theme = useTheme();
  const item = record?.[field] as ComplianceItem | undefined;
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const getStatusInfo = () => {
    if (!item?.date) {
      return {
        icon: <AddIcon />,
        color: THEME.warning,
        label: 'PENDING',
        description: 'Not started'
      };
    }

    const now = new Date();
    const expiryDate = item.expiryDate?.toDate();
    const warningDate = expiryDate && addDays(expiryDate, -30);

    if (expiryDate && isAfter(now, expiryDate)) {
      return {
        icon: <ExpiredIcon />,
        color: THEME.error,
        label: 'EXPIRED',
        description: `Expired on ${format(expiryDate, 'dd/MM/yyyy')}`
      };
    }

    if (warningDate && isAfter(now, warningDate)) {
      return {
        icon: <PendingIcon />,
        color: THEME.warning,
        label: 'EXPIRING SOON',
        description: `Expires on ${format(expiryDate!, 'dd/MM/yyyy')}`
      };
    }

    return {
      icon: <ValidIcon />,
      color: THEME.success,
      label: 'COMPLIANT',
      description: expiryDate ? `Valid until ${format(expiryDate, 'dd/MM/yyyy')}` : 'No expiry'
    };
  };

  const status = getStatusInfo();

  const handleClick = () => {
    if (onEdit) {
      onEdit(user.id, field);
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleteDialogOpen(true);
  };

  const handleSubmitComplete = async (data: ComplianceItem) => {
    if (onUpdateCompliance) {
      await onUpdateCompliance(user.id, field, {
        ...data,
        status: 'valid'
      });
      setCompleteDialogOpen(false);
    }
  };

  const showMarkComplete = onUpdateCompliance && (
    status.label === 'PENDING' || 
    status.label === 'EXPIRED' || 
    status.label === 'EXPIRING SOON'
  );

  return (
    <>
      <TableCell 
        onClick={handleClick}
        sx={{ 
          cursor: onEdit ? 'pointer' : 'default',
          '&:hover': onEdit ? {
            bgcolor: theme => theme.palette.action.hover,
          } : {},
          p: 1.5,
          minWidth: 150,
          maxWidth: 200,
        }}
      >
        <Stack spacing={1}>
          <Chip
            icon={status.icon}
            label={status.label}
            size="small"
            sx={{
              width: '100%',
              bgcolor: `${status.color}15`,
              color: status.color,
              fontWeight: 600,
              fontSize: '0.75rem',
              '& .MuiChip-icon': {
                color: 'inherit'
              }
            }}
          />

          {item?.date && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: theme.palette.text.secondary,
                fontSize: '0.75rem'
              }}
            >
              Updated: {format(item.date.toDate(), 'dd/MM/yyyy')}
            </Typography>
          )}

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: status.color,
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            {status.description}
          </Typography>

          {item?.evidence && (
            <Link
              href={item.evidence.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: theme.palette.info.main,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <FileIcon fontSize="small" />
              View Document
            </Link>
          )}

          {onFileUpload && (
            <FileUploadButton
              field={field}
              onUpload={(_, file) => onFileUpload(field, file)}
              disabled={uploading}
            />
          )}

          {!item?.date && onEdit && (
            <Button
              startIcon={<AddIcon />}
              size="small"
              fullWidth
              variant="outlined"
              onClick={handleClick}
              sx={{
                color: status.color,
                borderColor: status.color,
                '&:hover': {
                  borderColor: status.color,
                  bgcolor: `${status.color}15`,
                }
              }}
            >
              Add
            </Button>
          )}

          {showMarkComplete && (
            <Button
              startIcon={<DoneIcon />}
              size="small"
              fullWidth
              variant="outlined"
              onClick={handleComplete}
              sx={{
                color: THEME.success,
                borderColor: THEME.success,
                '&:hover': {
                  borderColor: THEME.success,
                  bgcolor: `${THEME.success}15`,
                }
              }}
            >
              Mark Complete
            </Button>
          )}
        </Stack>
      </TableCell>

      <ComplianceInputDialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        onSubmit={handleSubmitComplete}
        title={`Complete ${field.split(/(?=[A-Z])/).join(' ')}`}
        description="Enter completion details below"
        initialData={item}
      />
    </>
  );
};

export default ComplianceCell;
