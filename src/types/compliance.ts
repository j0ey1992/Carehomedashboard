import { Timestamp } from 'firebase/firestore';

export interface ComplianceEvidence {
  fileUrl: string;
  fileName: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
  fileSize: number;
  fileType: string;
}

export interface ComplianceItem {
  type: 'compliance';
  date: Timestamp | null;
  expiryDate: Timestamp | null;
  status: 'valid' | 'expired';
  notes?: string;
  evidence?: ComplianceEvidence;
}

export interface HealthCheckForm {
  questions: {
    generalHealth: string;
    medications: string;
    allergies: string;
    conditions: string[];
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  completed: boolean;
  submittedDate: Timestamp;
  expiryDate: Timestamp;
}

export interface HealthCheckItem extends Omit<ComplianceItem, 'type'> {
  type: 'healthCheck';
  completed: boolean;
  form?: HealthCheckForm;
  answers?: {
    [key: string]: string | boolean | number;
  };
}

export interface SignableItem extends Omit<ComplianceItem, 'type'> {
  type: 'signable';
  signed: boolean;
}

export interface CompetencyAssessment {
  type: 'albacMat' | 'dysphagia' | 'manualHandling' | 'basicLifeSupport';
  assessedBy: string;
  assessmentDate: Timestamp;
  expiryDate: Timestamp;
  score: number;
  notes: string;
  evidence: ComplianceEvidence[];
}

export interface CompetencyItem extends Omit<ComplianceItem, 'type'> {
  type: 'competency';
  assessedBy?: string;
  score?: number;
  assessment?: CompetencyAssessment;
}

export interface DynamicComplianceQuestion {
  id: string;
  text: string;
  type: 'text' | 'yesno' | 'multiple';
  required: boolean;
  options?: string[];
}

export interface DynamicComplianceItem extends Omit<ComplianceItem, 'type'> {
  type: 'dynamic';
  title: string;
  description: string;
  recurrence: 'monthly' | 'yearly' | 'custom';
  customRecurrence?: {
    interval: number;
    unit: 'days' | 'months' | 'years';
  };
  questions?: DynamicComplianceQuestion[];
  answers?: {
    [questionId: string]: string | boolean;
  };
}

export type ComplianceItemType =
  | ComplianceItem
  | HealthCheckItem
  | SignableItem
  | CompetencyItem
  | DynamicComplianceItem;

export interface StaffCompliance {
  userId?: string;
  site?: string;
  dbsCheck?: ComplianceItem;
  healthCheck?: HealthCheckItem;
  supervisionAgreement?: SignableItem;
  beneficiaryOnFile?: SignableItem;
  induction?: ComplianceItem;
  stressRiskAssessment?: ComplianceItem;
  albacMat?: CompetencyItem;
  dysphagia?: CompetencyItem;
  manualHandling?: CompetencyItem;
  basicLifeSupport?: CompetencyItem;
  donningAndDoffing?: ComplianceItem;
  cprScenario?: ComplianceItem;
  dynamicItems?: { [key: string]: DynamicComplianceItem };
}

export type ComplianceField = keyof Omit<
  StaffCompliance,
  'userId' | 'site' | 'dynamicItems'
>;

export interface FocusModeProps {
  enabled: boolean;
  onToggle: () => void;
  expiredTasks: ComplianceItem[];
}

export interface ResponsiveTableProps {
  breakpoints: {
    xs: React.ReactNode;
    sm: React.ReactNode;
    md: React.ReactNode;
  };
  data: ComplianceItem[];
  focusModeEnabled: boolean;
}

export type ComplianceFormData = {
  [K in keyof StaffCompliance]: K extends 'userId' | 'site'
    ? StaffCompliance[K]
    : K extends 'dynamicItems'
    ? { [key: string]: DynamicComplianceItem }
    : K extends 'healthCheck'
    ? HealthCheckItem
    : K extends 'supervisionAgreement' | 'beneficiaryOnFile'
    ? SignableItem
    : K extends 'albacMat' | 'dysphagia' | 'manualHandling' | 'basicLifeSupport'
    ? CompetencyItem
    : ComplianceItem;
};

export type ComplianceFormState = Partial<ComplianceFormData>;

export type ComplianceFormUpdater = (
  prev: ComplianceFormState
) => ComplianceFormState;

export type FormDataChangeHandler = {
  (data: ComplianceFormState): void;
  (updater: ComplianceFormUpdater): void;
};

export interface ComplianceStats {
  total: number;
  upToDate: number;
  expired: number;
  completionRate: number;
}

export interface ComplianceFilter {
  status?: 'valid' | 'expired' | 'all';
  site?: string;
  search?: string;
  type?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type ComplianceStateUpdate = StaffCompliance;

export type DynamicItemUpdate = {
  dynamicItems: {
    [key: string]: DynamicComplianceItem | undefined;
  };
};

export type ComplianceItemUpdate<T extends ComplianceItemType> = {
  [K in keyof T]: T[K];
} & { status: 'valid' | 'expired' };

export type ComplianceStateUpdater = (
  prev: StaffCompliance | undefined
) => StaffCompliance | undefined;

export type ComplianceFieldUpdate<K extends keyof StaffCompliance> = {
  [P in K]: StaffCompliance[P];
};
