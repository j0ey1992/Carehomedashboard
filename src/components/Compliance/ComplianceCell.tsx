import React, { useState, useEffect } from 'react';
import {
  TableCell,
  Box,
  IconButton,
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
  Error as ExpiredIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  AttachFile as FileIcon,
  Done as DoneIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { format, isAfter } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { THEME } from '../../theme/colors';
import { User } from '../../types';
import { 
  ComplianceItem, 
  StaffCompliance, 
  HealthCheckItem,
  HealthCheckForm,
  CompetencyItem 
} from '../../types/compliance';
import FileUploadButton from './FileUploadButton';
import ComplianceInputDialog from './ComplianceInputDialog';
import HealthCheckDialog from './HealthCheckDialog';

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
  onUpdateCompliance?: (userId: string, field: keyof StaffCompliance, data: ComplianceItem | HealthCheckItem | CompetencyItem) => Promise<void>;
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
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [healthCheckDialogOpen, setHealthCheckDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'valid' | 'expired'>('expired');

  const isHealthCheck = field === 'healthCheck';
  const isCompetencyAssessment = field === 'albacMat';
  const item = record?.[field] as ComplianceItem | HealthCheckItem | CompetencyItem | undefined;
  const healthCheckItem = isHealthCheck ? item as HealthCheckItem : undefined;
  const standardComplianceItem = !isHealthCheck ? item as ComplianceItem | CompetencyItem : undefined;

  // Update status whenever item changes
  useEffect(() => {
    if (!item?.date) {
      setCurrentStatus('expired');
      return;
    }

    const now = new Date();
    const expiryDate = item.expiryDate?.toDate();

    if (!expiryDate || isAfter(now, expiryDate)) {
      setCurrentStatus('expired');
    } else {
      setCurrentStatus('valid');
    }
  }, [item]);

  const getStatusInfo = () => {
    if (!item?.date) {
      return {
        icon: <AddIcon />,
        color: THEME.error,
        label: 'EXPIRED',
        description: 'Not started',
        bgColor: `${THEME.error}15`
      };
    }

    const now = new Date();
    const expiryDate = item.expiryDate?.toDate();

    if (!expiryDate || isAfter(now, expiryDate)) {
      return {
        icon: <ExpiredIcon />,
        color: THEME.error,
        label: 'EXPIRED',
        description: expiryDate ? `Expired on ${format(expiryDate, 'dd/MM/yyyy')}` : 'No expiry date',
        bgColor: `${THEME.error}15`
      };
    }

    return {
      icon: <ValidIcon />,
      color: THEME.success,
      label: 'COMPLIANT',
      description: `Valid until ${format(expiryDate, 'dd/MM/yyyy')}`,
      bgColor: `${THEME.success}15`
    };
  };

  const status = getStatusInfo();

  const handleClick = () => {
    if (isHealthCheck) {
      setHealthCheckDialogOpen(true);
    } else if (onEdit) {
      onEdit(user.id, field);
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHealthCheck) {
      setHealthCheckDialogOpen(true);
    } else {
      setCompleteDialogOpen(true);
    }
  };

  const handleSubmitComplete = async (data: ComplianceItem | CompetencyItem) => {
    if (onUpdateCompliance) {
      await onUpdateCompliance(user.id, field, {
        ...data,
        status: data.expiryDate && isAfter(data.expiryDate.toDate(), new Date()) ? 'valid' : 'expired',
      });
      setCompleteDialogOpen(false);
    }
  };

  const handleSubmitHealthCheck = async (form: HealthCheckForm) => {
    if (onUpdateCompliance) {
      const now = Timestamp.now();
      const expiryDate = Timestamp.fromDate(new Date(now.toDate().getFullYear() + 1, now.toDate().getMonth(), now.toDate().getDate()));
      const healthCheckItem: HealthCheckItem = {
        type: 'healthCheck',
        date: now,
        expiryDate,
        status: 'valid',
        completed: true,
        form,
      };
      await onUpdateCompliance(user.id, field, healthCheckItem);
      setHealthCheckDialogOpen(false);
    }
  };

  const showMarkComplete = onUpdateCompliance && currentStatus === 'expired';

  return (
    <>
      <TableCell 
        sx={{ 
          p: 1,
          minWidth: { xs: '100%', sm: 250 },
          maxWidth: { xs: '100%', sm: 300 },
          bgcolor: status.bgColor,
          transition: 'background-color 0.3s ease',
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
            bgcolor: 'transparent',
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Chip
                icon={status.icon}
                label={status.label}
                size="small"
                sx={{
                  bgcolor: 'white',
                  color: status.color,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  '& .MuiChip-icon': {
                    color: 'inherit'
                  },
                  boxShadow: `0 0 0 1px ${status.color}`,
                }}
              />
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-label="show more"
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Stack>

            <Typography 
              variant="subtitle2" 
              component="div" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
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

                {isHealthCheck && healthCheckItem?.form && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Emergency Contact: {healthCheckItem.form.questions.emergencyContact.name}
                    </Typography>
                    {healthCheckItem.form.questions.conditions.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {healthCheckItem.form.questions.conditions.map((condition) => (
                          <Chip
                            key={condition}
                            label={condition}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}

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

      {!isHealthCheck && (
        <ComplianceInputDialog
          open={completeDialogOpen}
          onClose={() => setCompleteDialogOpen(false)}
          onSubmit={handleSubmitComplete}
          title={`Complete ${field.split(/(?=[A-Z])/).join(' ')}`}
          description="Enter completion details below"
          initialData={standardComplianceItem}
          isCompetencyAssessment={isCompetencyAssessment}
        />
      )}

      {isHealthCheck && (
        <HealthCheckDialog
          open={healthCheckDialogOpen}
          onClose={() => setHealthCheckDialogOpen(false)}
          onSubmit={handleSubmitHealthCheck}
          initialData={healthCheckItem?.form}
        />
      )}
    </>
  );
};

export default ComplianceCell;
