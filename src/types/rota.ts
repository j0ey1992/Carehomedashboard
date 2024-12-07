import { User } from './index';

export type ShiftTime = '7:30-14:30' | '14:30-21:30' | '21:30-7:30';
export type ShiftType = 'morning' | 'afternoon' | 'night';
export type ShiftRole = 'Driver' | 'Shift Leader' | 'Care Staff';
export type ShiftStatus = 'Unfilled' | 'Partially Staffed' | 'Fully Staffed' | 'Conflict';
export type LeaveType = 'Annual' | 'Sick' | 'Maternity' | 'Training' | 'Other';
export type ComplianceLevel = 'High' | 'Medium' | 'Low';

export interface ShiftTimeDetails {
  start: string;
  end: string;
  type: ShiftType;
}

export interface ShiftRequirements {
  total: number;
  shiftLeader: boolean;
  driver: boolean;
}

export interface SingleShiftRequirements {
  total: number;
  shiftLeader: boolean;
  driver: boolean;
}

export interface ShiftTemplate {
  name: string;
  requirements: {
    [key in ShiftTime]: SingleShiftRequirements;
  };
}

export const SHIFT_TIME_DETAILS: Record<ShiftTime, ShiftTimeDetails> = {
  '7:30-14:30': { start: '7:30', end: '14:30', type: 'morning' },
  '14:30-21:30': { start: '14:30', end: '21:30', type: 'afternoon' },
  '21:30-7:30': { start: '21:30', end: '7:30', type: 'night' }
};

export interface ShiftAssignment {
  userId: string;
  role: ShiftRole;
  assignedAt: string;
  assignedBy: string;
}

export interface ShiftRequirementWithRoles {
  role: ShiftRole;
  count: number;
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  time: ShiftTime;
  type: ShiftType;
  requiredStaff: number;
  requiredRoles: ShiftRequirementWithRoles[];
  assignedStaff: (ShiftAssignment | string)[];
  status: ShiftStatus;
  complianceStatus?: ComplianceLevel;
  trainingRequired?: string[];
}

export interface StaffLeave {
  type: LeaveType;
  startDate: string;
  endDate: string;
  approved: boolean;
  notes?: string;
}

export interface TrainingModule {
  id: string;
  name: string;
  completionDate?: string;
  expiryDate?: string;
  required: boolean;
  status: 'completed' | 'pending' | 'expired';
}

export interface StaffPreferences {
  preferredShifts: ShiftTime[];
  unavailableDates: string[];
  maxShiftsPerWeek?: number;
  preferredRoles?: ShiftRole[];
  flexibleHours: boolean;
  nightShiftOnly: boolean;
  preferredWorkingDays?: string[];
  preferredSites?: string[];
  maxConsecutiveDays?: number;
  minRestPeriod?: number;
  teamPreferences?: string[];
}

export interface StaffPerformanceMetrics {
  attendanceRate: number;
  punctualityScore: number;
  shiftCompletionRate: number;
  feedbackScore: number;
  clientFeedbackScore?: number;
  supervisionAttendance?: number;
  trainingCompletionRate?: number;
}

export interface ComplianceScore {
  overall: number;
  training: number;
  certification: number;
  supervision: number;
  documentation: number;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  roles: ShiftRole[];
  contractedHours: number;
  preferences: StaffPreferences;
  performanceMetrics: StaffPerformanceMetrics;
  trainingStatus: Record<string, boolean>;
  leave: StaffLeave[];
  complianceScore: ComplianceScore;
  trainingModules: TrainingModule[];
  certifications: {
    name: string;
    expiryDate: string;
    status: 'valid' | 'expiring' | 'expired';
  }[];
}

export interface RotaConfiguration {
  shiftPatterns: {
    time: ShiftTime;
    defaultRequirements: ShiftRequirementWithRoles[];
  }[];
  staffingRules: {
    minStaffPerShift: number;
    maxConsecutiveDays: number;
    minRestBetweenShifts: number;
  };
}

export interface WeeklyShiftRequirements {
  morning: {
    total: number;
    shiftLeader: number;
    driver: number;
  };
  afternoon: {
    total: number;
    shiftLeader: number;
    driver: number;
  };
  night: {
    total: number;
    shiftLeader: number;
    driver: number;
  };
}

export interface Rota {
  id: string;
  startDate: string;
  endDate: string;
  shifts: Shift[];
  configuration: RotaConfiguration;
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastModified: string;
  modifiedBy: string;
}

export interface RotaValidationError {
  type: string;
  message: string;
  severity: 'error' | 'warning';
  shiftId?: string;
  staffId?: string;
  affectedStaff?: string[];
}

export interface StaffEvaluation {
  trainingCompliance: {
    score: number;
    details: {
      mandatoryTraining: number;
      certificationStatus: number;
      supervisionAttendance: number;
    };
  };
  performanceMetrics: {
    score: number;
    details: {
      attendance: number;
      punctuality: number;
      clientFeedback: number;
    };
  };
  workingPatterns: {
    score: number;
    details: {
      contractedHours: number;
      restPeriods: number;
      preferences: number;
    };
  };
  skillsExperience: {
    score: number;
    details: {
      qualifications: number;
      specialSkills: number;
      serviceLength: number;
    };
  };
  overallScore: number;
  recommendations: string[];
}

export interface AISchedulerOptions {
  optimizationPriority: 'balanced' | 'staff-preference' | 'coverage';
  considerTrainingStatus: boolean;
  considerPerformanceMetrics: boolean;
  allowPartialFill: boolean;
  maxIterations: number;
  shiftRequirements: WeeklyShiftRequirements;
  staff: Staff[];
  weightings?: {
    trainingCompliance?: number;
    performanceMetrics?: number;
    workingPatterns?: number;
    skillsExperience?: number;
  };
}

export interface AIShiftSuggestion {
  shiftId: string;
  suggestedStaff: StaffSuggestion[];
  alternativeStaff: StaffSuggestion[];
  confidence: number;
  reasoning: string[];
  evaluations: Record<string, StaffEvaluation>;
}

export interface StaffSuggestion {
  staffId: string;
  userId: string;
  role: ShiftRole;
  confidence: number;
  reason: string;
  score: number;
  evaluation?: StaffEvaluation;
}

export interface RotaStats {
  totalShifts: number;
  filledShifts: number;
  unfilledShifts: number;
  conflictShifts: number;
  staffUtilization: Record<string, number>;
  roleDistribution: Record<ShiftRole, number>;
  staffPreferenceMatch: number;
  roleGaps: Record<ShiftRole, number>;
  complianceStats: {
    highCompliance: number;
    mediumCompliance: number;
    lowCompliance: number;
  };
  leaveImpact: {
    totalLeave: number;
    coverageNeeded: number;
  };
}

export interface RotaImportData {
  shifts: {
    date: string;
    time: ShiftTime;
    staff: string[];
  }[];
}

export const defaultRotaConfiguration: RotaConfiguration = {
  shiftPatterns: [
    {
      time: '7:30-14:30',
      defaultRequirements: [
        { role: 'Shift Leader', count: 1 },
        { role: 'Driver', count: 1 },
        { role: 'Care Staff', count: 3 }
      ]
    },
    {
      time: '14:30-21:30',
      defaultRequirements: [
        { role: 'Shift Leader', count: 1 },
        { role: 'Care Staff', count: 3 }
      ]
    },
    {
      time: '21:30-7:30',
      defaultRequirements: [
        { role: 'Shift Leader', count: 1 },
        { role: 'Care Staff', count: 1 }
      ]
    }
  ],
  staffingRules: {
    minStaffPerShift: 2,
    maxConsecutiveDays: 5,
    minRestBetweenShifts: 11
  }
};

export const defaultTemplates: ShiftTemplate[] = [
  {
    name: "Standard Week (Mon-Thu)",
    requirements: {
      "7:30-14:30": { total: 5, shiftLeader: true, driver: true },
      "14:30-21:30": { total: 4, shiftLeader: true, driver: false },
      "21:30-7:30": { total: 2, shiftLeader: true, driver: false }
    }
  },
  {
    name: "Friday Pattern",
    requirements: {
      "7:30-14:30": { total: 4, shiftLeader: true, driver: true },
      "14:30-21:30": { total: 4, shiftLeader: true, driver: false },
      "21:30-7:30": { total: 2, shiftLeader: true, driver: false }
    }
  },
  {
    name: "Weekend Pattern",
    requirements: {
      "7:30-14:30": { total: 4, shiftLeader: true, driver: true },
      "14:30-21:30": { total: 4, shiftLeader: true, driver: false },
      "21:30-7:30": { total: 2, shiftLeader: true, driver: false }
    }
  }
];

export const initialRoleDistribution: Record<ShiftRole, number> = {
  'Driver': 0,
  'Shift Leader': 0,
  'Care Staff': 0
};

export const createEmptyRoleDistribution = (): Record<ShiftRole, number> => ({
  'Driver': 0,
  'Shift Leader': 0,
  'Care Staff': 0
});

export const createValidationError = (error: Partial<RotaValidationError>): RotaValidationError => ({
  type: 'error',
  message: 'Unknown error',
  severity: 'error',
  ...error
});

export const createEmptyRotaStats = (): RotaStats => ({
  totalShifts: 0,
  filledShifts: 0,
  unfilledShifts: 0,
  conflictShifts: 0,
  staffUtilization: {},
  roleDistribution: initialRoleDistribution,
  staffPreferenceMatch: 0,
  roleGaps: initialRoleDistribution,
  complianceStats: {
    highCompliance: 0,
    mediumCompliance: 0,
    lowCompliance: 0
  },
  leaveImpact: {
    totalLeave: 0,
    coverageNeeded: 0
  }
});

export const createAIShiftSuggestion = (shiftId: string): AIShiftSuggestion => ({
  shiftId,
  suggestedStaff: [],
  alternativeStaff: [],
  confidence: 0,
  reasoning: [],
  evaluations: {}
});

export const compareRequirements = (a: ShiftRequirements, b: ShiftRequirements): boolean => {
  return (
    a.total === b.total &&
    a.shiftLeader === b.shiftLeader &&
    a.driver === b.driver
  );
};
