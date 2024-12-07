import React from 'react';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

interface FileUploadInputProps {
  file: File | null;
  setFile: (file: File | null) => void;
}

const FileUploadInput: React.FC<FileUploadInputProps> = ({ file, setFile }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <input
        id="file-input"
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <label htmlFor="file-input">
        <Button
          variant="contained"
          component="span"
          startIcon={<UploadIcon />}
        >
          Select Excel File
        </Button>
      </label>
      {file && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Selected File: {file.name}
        </Typography>
      )}
    </Box>
  );
};

export default FileUploadInput;
