import { useState, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface UploadProgress {
  progress: number;
  downloadUrl?: string;
  error?: Error;
}

interface UseFileUploadReturn {
  uploadFile: (file: File, path: string) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
  uploadProgress: UploadProgress;
  isUploading: boolean;
  error: Error | null;
}

const useFileUpload = (): UseFileUploadReturn => {
  const { currentUser } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ progress: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File, path: string): Promise<string> => {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      setIsUploading(true);
      setError(null);
      setUploadProgress({ progress: 0 });

      try {
        // Create a unique filename
        const timestamp = new Date().getTime();
        const uniquePath = `${path}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, uniquePath);

        // Start upload
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Return a promise that resolves with the download URL
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              // Track upload progress
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress({ progress });
            },
            (error) => {
              // Handle upload errors
              console.error('Upload error:', error);
              setError(error);
              setIsUploading(false);
              reject(error);
            },
            async () => {
              // Upload completed successfully
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                setUploadProgress({ progress: 100, downloadUrl });
                setIsUploading(false);
                resolve(downloadUrl);
              } catch (error) {
                console.error('Error getting download URL:', error);
                setError(error as Error);
                setIsUploading(false);
                reject(error);
              }
            }
          );
        });
      } catch (err) {
        console.error('Error initiating upload:', err);
        setError(err as Error);
        setIsUploading(false);
        throw err;
      }
    },
    [currentUser]
  );

  const deleteFile = useCallback(
    async (path: string): Promise<void> => {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      try {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
      } catch (err) {
        console.error('Error deleting file:', err);
        setError(err as Error);
        throw err;
      }
    },
    [currentUser]
  );

  return {
    uploadFile,
    deleteFile,
    uploadProgress,
    isUploading,
    error,
  };
};

// Allowed file types and their corresponding MIME types
export const AllowedFileTypes = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALL: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

// Helper function to validate file type
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

// Helper function to validate file size (in bytes)
export const isValidFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default useFileUpload;
