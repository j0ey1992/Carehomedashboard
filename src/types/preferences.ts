import { ShiftTime, ShiftRole } from './rota';

export interface TeamPreference {
  preferredTeammates: string[];
  avoidTeammates: string[];
}

export interface WorkingPatternPreference {
  preferredShifts: ShiftTime[];
  preferredDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  maxConsecutiveDays: number;
  minRestPeriodHours: number;
  flexibleHours: boolean;
  nightShiftOnly: boolean;
}

export interface SitePreference {
  preferredSites: string[];
  maxTravelDistance?: number;
  travelPreferences?: {
    hasCar: boolean;
    usesPublicTransport: boolean;
    needsParking: boolean;
  };
}

export interface RolePreference {
  preferredRoles: ShiftRole[];
  specialistSkills: string[];
  trainingInterests: string[];
}

export interface StaffPreferences {
  id: string;
  userId: string;
  workingPattern: WorkingPatternPreference;
  sites: SitePreference;
  teams: TeamPreference;
  roles: RolePreference;
  updatedAt: string;
  lastReviewedAt: string;
  reviewedBy?: string;
  notes?: string;
}

export interface PreferenceValidationResult {
  isValid: boolean;
  conflicts: {
    type: 'pattern' | 'site' | 'team' | 'role';
    message: string;
    severity: 'error' | 'warning';
  }[];
}

export interface PreferenceStats {
  preferenceMatchRate: number;
  commonPatterns: {
    pattern: Partial<WorkingPatternPreference>;
    count: number;
  }[];
  siteDistribution: {
    siteId: string;
    staffCount: number;
  }[];
  roleDistribution: {
    role: ShiftRole;
    staffCount: number;
  }[];
}
