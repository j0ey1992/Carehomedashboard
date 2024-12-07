import { Timestamp } from 'firebase/firestore';

export type SicknessType = 'sickness' | 'authorised_unpaid';

export interface SicknessRecord {
  id: string;
  staffId: string;
  staffName: string;
  startDate: Date | Timestamp;
  endDate?: Date | Timestamp | null;
  reason: string;
  notes?: string;
  status: 'current' | 'completed' | 'review';
  type: SicknessType;
  step: 0 | 1 | 2 | 3;  // 0 = No steps, 1 = Record Created, 2 = Review Meeting, 3 = Case Resolved
  returnToWorkDate?: Date | Timestamp;
  returnToWorkFormUrl?: string;
  tasks?: string[];
  reviewDate?: Date | Timestamp;
  reviewNotes?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  createdBy: string;
  site?: string;
  isArchived?: boolean;
}

export interface SicknessPattern {
  type: string;
  description: string;
}

export interface TriggerStatus {
  occurrences: number;
  totalDays: number;
  isNearingTrigger: boolean;
  hasReachedTrigger: boolean;
  patterns: SicknessPattern[];
}

export type NewSicknessRecord = Omit<SicknessRecord, 'id' | 'createdAt' | 'updatedAt' | 'step'>;

export interface SicknessContextType {
  sicknessRecords: SicknessRecord[];
  loading: boolean;
  error: string | null;
  addSicknessRecord: (record: NewSicknessRecord) => Promise<string>;
  updateSicknessRecord: (id: string, updates: Partial<SicknessRecord>) => Promise<void>;
  scheduleReview: (record: SicknessRecord, reviewDate: Date) => Promise<void>;
  completeSicknessRecord: (id: string, endDate: Date) => Promise<void>;
  uploadReturnToWorkForm: (recordId: string, file: File) => Promise<void>;
  progressToNextStep: (record: SicknessRecord) => Promise<void>;
  archiveRecord: (id: string) => Promise<void>;
  getTriggerStatus: (staffId: string) => TriggerStatus;
}
