import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadProgress {
  progress: number;
  downloadURL?: string;
  error?: Error;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  downloadURL: string;
}

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Helper function to generate a unique file name
export const generateFileName = (file: File): string => {
  const extension = file.name.split('.').pop();
  return `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
};

// Helper function to validate file type
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', ''));
    }
    return file.type === type;
  });
};

// Helper function to validate file size
export const isValidFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

/**
 * Upload a file to Firebase Storage with progress tracking
 */
export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void,
  options: {
    maxSizeInMB?: number;
    allowedTypes?: string[];
    generateUniqueName?: boolean;
  } = {}
): Promise<string> => {
  const {
    maxSizeInMB = 10,
    allowedTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.*'],
    generateUniqueName = true,
  } = options;

  // Validate file type
  if (!isValidFileType(file, allowedTypes)) {
    throw new Error('Invalid file type');
  }

  // Validate file size
  if (!isValidFileSize(file, maxSizeInMB)) {
    throw new Error(`File size must be less than ${maxSizeInMB}MB`);
  }

  // Generate file name if needed
  const fileName = generateUniqueName ? generateFileName(file) : file.name;
  const fullPath = `${path}/${fileName}`;
  const storageRef = ref(storage, fullPath);

  // Create upload task
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({ progress });
      },
      (error) => {
        onProgress?.({ progress: 0, error });
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({ progress: 100, downloadURL });
          resolve(downloadURL);
        } catch (error) {
          onProgress?.({ progress: 0, error: error as Error });
          reject(error);
        }
      }
    );
  });
};

/**
 * Delete a file from Firebase Storage
 */
export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

/**
 * List all files in a directory
 */
export const listFiles = async (path: string): Promise<FileMetadata[]> => {
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);

  const files = await Promise.all(
    result.items.map(async (item) => {
      const downloadURL = await getDownloadURL(item);
      const metadata = await getMetadata(item);

      return {
        name: metadata.name,
        size: metadata.size,
        type: metadata.contentType || 'application/octet-stream',
        lastModified: new Date(metadata.timeCreated),
        downloadURL,
      };
    })
  );

  return files;
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (path: string): Promise<FileMetadata> => {
  const storageRef = ref(storage, path);
  const metadata = await getMetadata(storageRef);
  const downloadURL = await getDownloadURL(storageRef);

  return {
    name: metadata.name,
    size: metadata.size,
    type: metadata.contentType || 'application/octet-stream',
    lastModified: new Date(metadata.timeCreated),
    downloadURL,
  };
};

/**
 * Format file metadata for display
 */
export const formatFileMetadata = (metadata: FileMetadata): {
  displayName: string;
  displaySize: string;
  displayType: string;
  displayDate: string;
} => {
  return {
    displayName: metadata.name,
    displaySize: formatFileSize(metadata.size),
    displayType: metadata.type.split('/').pop() || 'Unknown',
    displayDate: metadata.lastModified.toLocaleDateString(),
  };
};

/**
 * Create a download link for a file
 */
export const createDownloadLink = async (path: string, fileName: string): Promise<void> => {
  const storageRef = ref(storage, path);
  const downloadURL = await getDownloadURL(storageRef);

  const link = document.createElement('a');
  link.href = downloadURL;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Upload multiple files with progress tracking
 */
export const uploadMultipleFiles = async (
  files: File[],
  path: string,
  onProgress?: (fileName: string, progress: UploadProgress) => void,
  options?: {
    maxSizeInMB?: number;
    allowedTypes?: string[];
    generateUniqueName?: boolean;
  }
): Promise<string[]> => {
  const uploadPromises = files.map(file =>
    uploadFile(
      file,
      path,
      progress => onProgress?.(file.name, progress),
      options
    )
  );

  return Promise.all(uploadPromises);
};
