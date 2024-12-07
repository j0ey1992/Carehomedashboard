import React from 'react';
import {
  Box,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Link,
} from '@mui/material';
import {
  Edit as EditIcon,
  Download as DownloadIcon,
  AttachFile as FileIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { THEME } from '../../theme/colors';
import FileUploadButton from './FileUploadButton';
import { DynamicComplianceItem } from '../../types/compliance';

interface DynamicComplianceCellProps {
  item: DynamicComplianceItem;
  onEdit: () => void;
  onUpload: (file: File) => Promise<void>;
  canEdit: boolean;
  uploading: boolean;
  itemId: string;
}

const DynamicComplianceCell: React.FC<DynamicComplianceCellProps> = ({
  item,
  onEdit,
  onUpload,
  canEdit,
  uploading,
  itemId,
}) => {
  const theme = useTheme();

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return '-';
    return format(timestamp.toDate(), 'MMM d, yyyy');
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'valid':
        return THEME.success;
      case 'expired':
        return THEME.error;
      default:
        return THEME.warning;
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          label={String(item.status)}
          size="medium"
          sx={{
            minWidth: 90,
            color: '#fff',
            bgcolor: getStatusChipColor(item.status),
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        />
        <Stack direction="row" spacing={1}>
          {canEdit && (
            <Tooltip title={`Update ${item.title}`}>
              <IconButton
                size="small"
                onClick={onEdit}
                sx={{
                  color: theme.palette.primary.main,
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          <FileUploadButton
            field={itemId}
            onUpload={(_, file) => onUpload(file)}
            disabled={uploading}
          />
        </Stack>
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.secondary,
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        {formatDate(item.date)}
      </Typography>

      {item.expiryDate && (
        <Typography
          variant="caption"
          sx={{
            color: item.status === 'expired' ? THEME.error : theme.palette.text.secondary,
            fontSize: '0.8125rem',
            fontWeight: item.status === 'expired' ? 500 : 400,
          }}
        >
          Expires: {formatDate(item.expiryDate)}
        </Typography>
      )}

      {item.evidence && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 0.5,
          }}
        >
          <FileIcon fontSize="small" sx={{ color: theme.palette.info.main }} />
          <Link
            href={item.evidence.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: theme.palette.info.main,
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {item.evidence.fileName}
            <DownloadIcon fontSize="small" />
          </Link>
        </Box>
      )}

      {item.questions && item.answers && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              display: 'block',
              mb: 0.5,
            }}
          >
            Questionnaire completed
          </Typography>
          <Tooltip
            title={
              <Stack spacing={1}>
                {item.questions.map((q) => (
                  <Box key={q.id}>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {q.text}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      Answer: {String(item.answers?.[q.id] || 'Not answered')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            }
          >
            <Chip
              label="View Answers"
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.info.main, 0.2),
                },
              }}
            />
          </Tooltip>
        </Box>
      )}
    </Stack>
  );
};

export default DynamicComplianceCell;
