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
  Card,
  CardContent,
  CardActions,
  Collapse,
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
  ExpandMore as ExpandMoreIcon,
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
  const [expanded, setExpanded] = useState(false);

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
        sx={{ 
          p: 1,
          minWidth: { xs: '100%', sm: 250 },
          maxWidth: { xs: '100%', sm: 300 },
        }}
      >
        <Card 
          elevation={2}
          sx={{
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: theme.shadows[4],
            },
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Chip
                icon={status.icon}
                label={status.label}
                size="small"
                sx={{
                  bgcolor: `${status.color}15`,
                  color: status.color,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  '& .MuiChip-icon': {
                    color: 'inherit'
                  }
                }}
              />
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-label="show more"
              >
                <ExpandMoreIcon />
              </IconButton>
            </Stack>

            <Typography variant="h6" component="div" gutterBottom>
              {field.split(/(?=[A-Z])/).join(' ')}
            </Typography>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Stack spacing={1}>
                {item?.date && (
                  <Typography variant="body2" color="text.secondary">
                    Updated: {format(item.date.toDate(), 'dd/MM/yyyy')}
                  </Typography>
                )}

                <Typography variant="body2" color={status.color} fontWeight="medium">
                  {status.description}
                </Typography>

                {item?.evidence && (
                  <Link
                    href={item.evidence.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      fontSize: '0.875rem',
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
              </Stack>
            </Collapse>
          </CardContent>

          <CardActions>
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
                variant="contained"
                onClick={handleComplete}
                sx={{
                  bgcolor: THEME.success,
                  color: '#fff',
                  '&:hover': {
                    bgcolor: theme.palette.success.dark,
                  }
                }}
              >
                Complete
              </Button>
            )}
          </CardActions>
        </Card>
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