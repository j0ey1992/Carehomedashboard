import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

export interface FileUploadProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  acceptedFileTypes: string[];
  maxFileSize: number;
  title: string;
  description: string;
  multiple?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  open,
  onClose,
  onUpload,
  maxFileSize,
  title,
  description,
  multiple = false,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Clear any previous errors
      setError(null);

      // Filter files based on size and extension
      const validFiles = acceptedFiles.filter(file => {
        const extension = file.name.toLowerCase().split('.').pop();
        const isValidSize = file.size <= maxFileSize;
        const isValidType = extension === 'xlsx' || extension === 'xls';

        if (!isValidSize) {
          setError(`File "${file.name}" exceeds maximum size of ${formatFileSize(maxFileSize)}`);
          return false;
        }

        if (!isValidType) {
          setError(`File "${file.name}" is not an Excel file (.xlsx or .xls)`);
          return false;
        }

        return true;
      });

      if (validFiles.length > 0) {
        setSelectedFiles(multiple ? [...selectedFiles, ...validFiles] : [validFiles[0]]);
      }
    },
    [maxFileSize, multiple, selectedFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple,
    maxSize: maxFileSize,
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of selectedFiles) {
        await onUpload(file);
        setUploadProgress((prev) => prev + (100 / selectedFiles.length));
      }
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFiles([]);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setError(null);
      setUploadProgress(0);
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" paragraph>
          {description}
        </Typography>

        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography>
            Drag and drop files here, or click to select files
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Maximum file size: {formatFileSize(maxFileSize)}
          </Typography>
          <Typography variant="caption" display="block" color="textSecondary">
            Accepted formats: .xlsx, .xls
          </Typography>
        </Box>

        {selectedFiles.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Files:
            </Typography>
            {selectedFiles.map((file, index) => (
              <Typography key={index} variant="body2">
                {file.name} ({formatFileSize(file.size)})
              </Typography>
            ))}
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" color="textSecondary">
              Uploading... {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          variant="contained"
          color="primary"
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUpload;
