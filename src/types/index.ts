import { Timestamp } from 'firebase/firestore'
import { ShiftRole, ShiftTime, StaffPreferences, StaffPerformanceMetrics } from './rota'

export interface TrainingRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail?: string;
  courseTitle: string;
  location: string;
  category: string;
  expiryDate: Date;
  status: 'valid' | 'expiring' | 'expired' | 'completed';
  completionDate?: Date;
  remindersSent: number;
  lastReminderDate?: Date;
  requiresDiscussion: boolean;
  discussionCompleted: boolean;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
  notificationSchedule?: {
    time: string;
    days: number[];
  };
  ragStatus: string;
  statsCategory: string;
  recordType: 'f2f' | 'training' | 'supervision' | 'compliance';
  isManuallyScheduled: boolean;
  supervisionType?: string;
  supervisor?: string;
  notes?: string;
  concerns?: string[];
  actionPoints?: string[];
  trainer?: string;
  siteId?: string;
}

export interface TrainingStats {
  totalStaff: number;
  totalRecords: number;
  expiringCount: number;
  expiredCount: number;
  completionRate: number;
  staffPerformance: {
    [staffId: string]: StaffPerformance;
  };
}

export interface StaffPerformance {
  totalCourses: number;
  onTime: number;
  late: number;
  expired: number;
  expiringCourses: string[];
  expiredCourses: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'manager';
  roles: ShiftRole[];
  phoneNumber?: string;
  startDate?: Date;
  departmentId: string;
  managerId?: string;
  probationStatus: 'pending' | 'completed' | 'failed';
  trainingProgress: {
    week1Review: boolean;
    week4Supervision: boolean;
    week8Review: boolean;
    week12Supervision: boolean;
  };
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
  sites: string[];
  site?: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  authCreated: boolean;
  location?: string;
  isAdmin?: boolean;
  photoURL?: string;
  points?: number;
  attendance?: {
    attendanceRate: number;
    lateDays: number;
    sickDays: number;
    totalDays: number;
  };
  contractedHours?: number;
  annualLeave?: number;
  sickness?: number;
  preferences?: StaffPreferences;
  performanceMetrics?: StaffPerformanceMetrics;
  password?: string;
  trainingStatus?: Record<string, any>;
  leave?: Array<{
    startDate: string;
    endDate: string;
    type: 'annual' | 'sick' | 'maternity' | 'other';
    approved: boolean;
  }>;
  complianceScore?: {
    overall: number;
    training: number;
    certification: number;
    supervision: number;
    documentation: number;
  };
  trainingModules?: Array<{
    id: string;
    name: string;
    status: 'completed' | 'in_progress' | 'not_started';
    completionDate?: string;
    expiryDate?: string;
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issueDate: string;
    expiryDate: string;
    status: 'valid' | 'expired' | 'expiring';
  }>;
}

export interface NewUserData {
  name: string;
  email: string;
  phoneNumber: string;
  role: 'staff';
  roles: ShiftRole[];
  site: string;
  sites: string[];
  contractedHours: number;
  annualLeave: number;
  sickness: number;
  preferences: StaffPreferences;
  performanceMetrics: StaffPerformanceMetrics;
  attendance: {
    attendanceRate: number;
    lateDays: number;
    sickDays: number;
    totalDays: number;
  };
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
  // Metadata fields
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
  authCreated?: boolean;
  probationStatus?: 'pending' | 'completed' | 'failed';
  trainingProgress?: {
    week1Review: boolean;
    week4Supervision: boolean;
    week8Review: boolean;
    week12Supervision: boolean;
  };
  departmentId?: string;
  managerId?: string;
  location?: string;
  photoURL?: string;
  points?: number;
  password?: string;
  trainingStatus?: Record<string, any>;
  leave?: Array<{
    startDate: string;
    endDate: string;
    type: 'annual' | 'sick' | 'maternity' | 'other';
    approved: boolean;
  }>;
  complianceScore?: {
    overall: number;
    training: number;
    certification: number;
    supervision: number;
    documentation: number;
  };
  trainingModules?: Array<{
    id: string;
    name: string;
    status: 'completed' | 'in_progress' | 'not_started';
    completionDate?: string;
    expiryDate?: string;
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issueDate: string;
    expiryDate: string;
    status: 'valid' | 'expired' | 'expiring';
  }>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  category: 'training' | 'supervision' | 'compliance' | 'general' | 'sickness';
  assignedTo?: string;
  assignedBy?: string;
  relatedRecordType?: string;
  relatedRecordId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  site?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'training' | 'supervision' | 'task' | 'system' | 'course' | 'message';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date | Timestamp;
  link?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt?: Date | Timestamp;
  scheduledFor?: Date | Timestamp;
  site?: string;
  deleted?: boolean;
}

export interface Supervision {
  id: string;
  staffId: string;
  supervisorId: string;
  staffName?: string;
  supervisor?: string;
  date: Date;
  nextDueDate?: Date;
  type: 'supervision' | 'appraisal' | 'probation' | 'induction';
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  notes?: string;
  topics?: string[];
  concerns?: string[];
  actionPoints?: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  notificationSchedule?: any;
  site?: string;
}

export interface SupervisionFeedback {
  id: string;
  supervisionId: string;
  staffId: string;
  staffName?: string;
  topics: string[];
  concerns: string[];
  suggestions: string[];
  comments: string;
  rating: number;
  isConfidential: boolean;
  submittedAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  photoURL?: string;
  points: number;
  rank: number;
  achievements: string[];
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string;
  onRowClick?: (row: T) => void;
  rowsPerPage?: number;
  page?: number;
  onPageChange?: (newPage: number) => void;
  onRowsPerPageChange?: (newRowsPerPage: number) => void;
  totalCount?: number;
  selectable?: boolean;
  selected?: string[];
  onSelectionChange?: (selected: string[]) => void;
  emptyMessage?: string;
}

export interface DataTableColumn<T> {
  id: keyof T | 'actions';
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: any, row?: T) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  minWidth?: number;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; path?: string }[];
  actions?: ActionButton[];
  stats?: {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  }[];
  helpText?: string;
  bookmarkable?: boolean;
  color?: string;
}

export interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  variant?: 'text' | 'outlined' | 'contained';
  disabled?: boolean;
  priority?: 'high' | 'medium' | 'low';
  tooltip?: string;
  sx?: any;
}

export interface UploadError {
  row: number;
  column: string;
  value: string;
  issue: string;
  suggestion: string;
}

export interface UploadResult {
  success: boolean;
  updatedRecords: number;
  newRecords: number;
  skippedRows: number;
  errors: UploadError[];
  processingDetails: {
    totalRows: number;
    processedAt: Timestamp;
    uploadedBy: string;
  };
}

export interface ProcessedRecord {
  status: 'updated' | 'new' | 'skipped';
  record?: TrainingRecord;
  error?: UploadError;
}
