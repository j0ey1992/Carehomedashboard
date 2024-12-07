import React, { useRef } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { StaffCompliance } from '../../types/compliance';

type ComplianceField = keyof StaffCompliance | string;

interface FileUploadButtonProps {
  field: ComplianceField;
  onUpload: (field: ComplianceField, file: File) => Promise<void>;
  disabled?: boolean;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ field, onUpload, disabled }) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;

    try {
      const file = event.target.files[0];
      await onUpload(field, file);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  return (
    <>
      <Tooltip title="Upload Evidence">
        <IconButton 
          size="small" 
          onClick={handleUploadClick}
          disabled={disabled}
          sx={{ 
            color: theme.palette.info.main,
            '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.1) }
          }}
        >
          <UploadIcon />
        </IconButton>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        hidden
        onChange={handleFileChange}
      />
    </>
  );
};

export default FileUploadButton;
