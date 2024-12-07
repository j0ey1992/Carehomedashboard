import { Timestamp } from 'firebase/firestore';

export interface ComplianceItem {
  type: 'compliance';
  date: Timestamp | null;
  expiryDate: Timestamp | null;
  status: 'valid' | 'expired' | 'pending';
  notes?: string;
  evidence?: {
    fileUrl: string;
    fileName: string;
    uploadedAt: Timestamp;
  };
}

export interface HealthCheckItem extends Omit<ComplianceItem, 'type'> {
  type: 'healthCheck';
  completed: boolean;
  answers?: {
    [key: string]: string | boolean | number;
  };
}

export interface SignableItem extends Omit<ComplianceItem, 'type'> {
  type: 'signable';
  signed: boolean;
}

export interface CompetencyItem extends Omit<ComplianceItem, 'type'> {
  type: 'competency';
  assessedBy?: string;
  score?: number;
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
  donningAndDoffing?: ComplianceItem;
  cprScenario?: ComplianceItem;
  dynamicItems?: { [key: string]: DynamicComplianceItem };
}

export type ComplianceField = keyof Omit<
  StaffCompliance,
  'userId' | 'site' | 'dynamicItems'
>;

export type ComplianceFormData = {
  [K in keyof StaffCompliance]: K extends 'userId' | 'site'
    ? StaffCompliance[K]
    : K extends 'dynamicItems'
    ? { [key: string]: DynamicComplianceItem }
    : K extends 'healthCheck'
    ? HealthCheckItem
    : K extends 'supervisionAgreement' | 'beneficiaryOnFile'
    ? SignableItem
    : K extends 'albacMat'
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
  pending: number;
  completionRate: number;
}

export interface ComplianceFilter {
  status?: 'valid' | 'expired' | 'pending' | 'all';
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
    [key: string]: DynamicComplianceItem;
  };
};

export type ComplianceItemUpdate<T extends ComplianceItemType> = {
  [K in keyof T]: T[K];
} & { status: 'valid' | 'expired' | 'pending' };

export type ComplianceStateUpdater = (
  prev: StaffCompliance | undefined
) => StaffCompliance | undefined;

export type ComplianceFieldUpdate<K extends keyof StaffCompliance> = {
  [P in K]: StaffCompliance[P];
};
