import { 
  Rota, Staff, ShiftRequirementWithRoles, Shift, ShiftRole, ShiftTime, ShiftType,
  RotaValidationError, RotaStats, AIShiftSuggestion, StaffSuggestion,
  createValidationError, createEmptyRotaStats, createAIShiftSuggestion,
  createEmptyRoleDistribution, defaultRotaConfiguration, AISchedulerOptions, ShiftRequirements
} from '../types/rota';
import { addDays, isSameDay, parseISO, differenceInHours } from 'date-fns';

// Constants and Types
export const SHIFT_TIMES: ShiftTime[] = ['7:30-14:30', '14:30-21:30', '21:30-7:30'];

export interface ShiftTimeDetails {
  start: string;
  end: string;
  type: ShiftType;
}

export const SHIFT_TIME_DETAILS: Record<ShiftTime, ShiftTimeDetails> = {
  '7:30-14:30': { start: '7:30', end: '14:30', type: 'morning' },
  '14:30-21:30': { start: '14:30', end: '21:30', type: 'afternoon' },
  '21:30-7:30': { start: '21:30', end: '7:30', type: 'night' }
};

export const SHIFT_TYPES: ShiftType[] = ['morning', 'afternoon', 'night'];

// Helper Functions
export const parseShiftTime = (time: ShiftTime): ShiftTimeDetails => {
  return SHIFT_TIME_DETAILS[time];
};

export const getShiftTimeByType = (type: ShiftType): ShiftTime => {
  const entry = Object.entries(SHIFT_TIME_DETAILS).find(([_, details]) => details.type === type);
  return entry ? entry[0] as ShiftTime : '7:30-14:30';
};

export const getShiftType = (time: ShiftTime): ShiftType => {
  return SHIFT_TIME_DETAILS[time].type;
};

export const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes / 60);
};

export const calculateShiftHours = (shift: Shift): number => {
  const start = parseTime(shift.startTime);
  const end = parseTime(shift.endTime);
  return end > start ? end - start : (24 - start) + end;
};

export const isStaffAvailable = (staff: Staff, shift: Shift): boolean => {
  const shiftDate = parseISO(shift.date);
  return !staff.preferences.unavailableDates.some(date => 
    isSameDay(parseISO(date), shiftDate)
  );
};

export const hasRequiredRole = (staff: Staff, shift: Shift): boolean => {
  return shift.requiredRoles.some(requirement =>
    staff.roles.includes(requirement.role)
  );
};

export const matchesPreferences = (staff: Staff, shift: Shift): boolean => {
  return staff.preferences.preferredShifts.includes(shift.time);
};

export const calculateWorkloadScore = (staff: Staff, rota: Rota): number => {
  const assignedHours = calculateAssignedHours(staff, rota);
  const targetHours = staff.contractedHours / 4; // Weekly hours divided by 4
  const ratio = assignedHours / targetHours;
  
  if (ratio <= 1) return 20;
  if (ratio <= 1.1) return 10;
  return 0;
};

export const calculatePerformanceScore = (staff: Staff): number => {
  const { attendanceRate, punctualityScore } = staff.performanceMetrics;
  return Math.floor((attendanceRate + punctualityScore) / 2 * 15);
};

export const determineOptimalRole = (staff: Staff, shift: Shift): ShiftRole => {
  const availableRoles = staff.roles.filter(role =>
    shift.requiredRoles.some(req => req.role === role)
  );
  return availableRoles[0] || 'Care Staff';
};

export const calculateAssignedHours = (staff: Staff, rota: Rota): number => {
  return rota.shifts.reduce((total, shift) => {
    const isAssigned = shift.assignedStaff.some(assignment =>
      typeof assignment === 'object' && assignment.userId === staff.id
    );
    if (isAssigned) {
      const hours = calculateShiftHours(shift);
      return total + hours;
    }
    return total;
  }, 0);
};

export const countAssignedRoles = (shift: Shift, role: ShiftRole): number => {
  return shift.assignedStaff.filter(assignment =>
    typeof assignment === 'object' && assignment.role === role
  ).length;
};

export const exceedsWorkingHours = (staff: Staff, rota: Rota): boolean => {
  const assignedHours = calculateAssignedHours(staff, rota);
  return assignedHours > staff.contractedHours;
};

// Helper function for checking rest periods
const hasAdequateRest = (staff: Staff, shift: Shift, rota: Rota): boolean => {
  const shiftStart = parseISO(shift.date);
  const previousShifts = rota.shifts.filter(s => 
    s.assignedStaff.some(a => 
      typeof a === 'object' && a.userId === staff.id
    )
  );

  return !previousShifts.some(prevShift => {
    const prevEnd = parseISO(prevShift.date);
    const restHours = differenceInHours(shiftStart, prevEnd);
    return restHours < rota.configuration.staffingRules.minRestBetweenShifts;
  });
};

// Calculate shift priority based on requirements and time
const calculateShiftPriority = (shift: Shift): number => {
  let priority = 0;
  
  // Prioritize shifts that need specific roles
  priority += shift.requiredRoles.reduce((sum, req) => 
    sum + (req.role === 'Shift Leader' ? 3 : req.role === 'Driver' ? 2 : 1) * req.count, 0);

  // Prioritize upcoming shifts
  const daysUntilShift = differenceInHours(parseISO(shift.date), new Date());
  priority += Math.max(0, 7 - Math.floor(daysUntilShift / 24)) * 2;

  return priority;
};

export const canAssignStaff = (
  staffId: string,
  shift: Shift,
  rota: Rota,
  staff: Staff[]
): boolean => {
  const staffMember = staff.find(s => s.id === staffId);
  if (!staffMember) return false;

  return (
    isStaffAvailable(staffMember, shift) &&
    hasRequiredRole(staffMember, shift) &&
    !exceedsWorkingHours(staffMember, rota) &&
    hasAdequateRest(staffMember, shift, rota)
  );
};

// Calculate staff scores for AI suggestions
const calculateStaffScores = (
  shift: Shift,
  availableStaff: Staff[],
  rota: Rota,
  options: AISchedulerOptions
): StaffSuggestion[] => {
  return availableStaff.map(staff => {
    let score = 0;
    const reasons: string[] = [];

    // Base availability and role requirements (mandatory)
    if (isStaffAvailable(staff, shift)) {
      score += 30;
      reasons.push('Available for shift');
    }

    if (hasRequiredRole(staff, shift)) {
      score += 20;
      reasons.push('Has required role');
    }

    // Training status consideration
    if (options.considerTrainingStatus && staff.trainingStatus) {
      const trainingScore = calculateTrainingScore(staff);
      score += trainingScore;
      if (trainingScore > 0) reasons.push('Training up to date');
    }

    // Performance metrics consideration
    if (options.considerPerformanceMetrics) {
      const performanceScore = calculatePerformanceScore(staff);
      score += performanceScore;
      if (performanceScore > 0) reasons.push('Good performance history');
    }

    // Preference matching
    if (matchesPreferences(staff, shift)) {
      score += 15;
      reasons.push('Matches preferences');
    }

    // Workload balance
    const workloadScore = calculateWorkloadScore(staff, rota);
    score += workloadScore;
    if (workloadScore > 0) reasons.push('Good workload balance');

    // Adjust score based on optimization priority
    score = adjustScoreByPriority(score, staff, shift, options.optimizationPriority);

    return {
      staffId: staff.id,
      userId: staff.id,
      role: determineOptimalRole(staff, shift),
      confidence: score / 100,
      reason: reasons.join(', '),
      score
    };
  });
};

// Adjust score based on optimization priority
const adjustScoreByPriority = (
  baseScore: number,
  staff: Staff,
  shift: Shift,
  priority: AISchedulerOptions['optimizationPriority']
): number => {
  switch (priority) {
    case 'staff-preference':
      return baseScore * (matchesPreferences(staff, shift) ? 1.3 : 0.7);
    case 'coverage':
      return baseScore * (hasRequiredRole(staff, shift) ? 1.3 : 0.7);
    default: // 'balanced'
      return baseScore;
  }
};

// Calculate training score
const calculateTrainingScore = (staff: Staff): number => {
  const trainingStatuses = Object.values(staff.trainingStatus);
  if (trainingStatuses.length === 0) return 0;
  
  const completedTraining = trainingStatuses.filter(status => status).length;
  return Math.floor((completedTraining / trainingStatuses.length) * 15);
};

// Update shift statuses based on assignments
const updateShiftStatuses = (rota: Rota): void => {
  rota.shifts.forEach(shift => {
    const totalAssigned = shift.assignedStaff.length;
    const totalRequired = shift.requiredStaff;
    
    if (totalAssigned === 0) {
      shift.status = 'Unfilled';
    } else if (totalAssigned < totalRequired) {
      shift.status = 'Partially Staffed';
    } else if (totalAssigned === totalRequired) {
      shift.status = 'Fully Staffed';
    }

    // Check for role-specific requirements
    const missingRoles = shift.requiredRoles.some(requirement => {
      const assignedCount = countAssignedRoles(shift, requirement.role);
      return assignedCount < requirement.count;
    });

    if (missingRoles) {
      shift.status = 'Partially Staffed';
    }
  });
};

// Main rota generation function
export const generateRota = (
  startDate: string,
  endDate: string,
  staff: Staff[],
  configuration: Rota['configuration'] = defaultRotaConfiguration,
  options: AISchedulerOptions
): Rota => {
  // Initialize empty rota
  const shifts: Shift[] = [];
  let currentDate = parseISO(startDate);
  const lastDate = parseISO(endDate);

  // Generate all shifts
  while (currentDate <= lastDate) {
    configuration.shiftPatterns.forEach(pattern => {
      const shiftTimeDetails = parseShiftTime(pattern.time);
      const shift: Shift = {
        id: `${currentDate.toISOString()}-${pattern.time}`,
        date: currentDate.toISOString(),
        startTime: shiftTimeDetails.start,
        endTime: shiftTimeDetails.end,
        time: pattern.time,
        type: shiftTimeDetails.type,
        requiredStaff: pattern.defaultRequirements.reduce((sum, req) => sum + req.count, 0),
        requiredRoles: pattern.defaultRequirements,
        assignedStaff: [],
        status: 'Unfilled'
      };
      shifts.push(shift);
    });
    currentDate = addDays(currentDate, 1);
  }

  const rota: Rota = {
    id: `rota-${startDate}`,
    startDate,
    endDate,
    shifts,
    configuration,
    status: 'draft',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    modifiedBy: 'system'
  };

  // Assign staff using AI optimization
  let iteration = 0;
  let unfilledShifts = [...shifts];

  while (unfilledShifts.length > 0 && iteration < options.maxIterations) {
    // Sort shifts by priority (e.g., harder to fill shifts first)
    unfilledShifts.sort((a, b) => calculateShiftPriority(b) - calculateShiftPriority(a));

    const currentShift = unfilledShifts[0];
    const staffScores = calculateStaffScores(currentShift, staff, rota, options);
    
    // Sort staff by score and assign the best matches
    staffScores.sort((a, b) => b.score - a.score);
    
    let assigned = false;
    for (const staffSuggestion of staffScores) {
      if (canAssignStaff(staffSuggestion.staffId, currentShift, rota, staff)) {
        const assignment = {
          userId: staffSuggestion.staffId,
          role: staffSuggestion.role,
          assignedAt: new Date().toISOString(),
          assignedBy: 'system'
        };
        currentShift.assignedStaff.push(assignment);
        assigned = true;
        break;
      }
    }

    if (!assigned && !options.allowPartialFill) {
      currentShift.status = 'Conflict';
    }

    unfilledShifts = rota.shifts.filter(shift => 
      shift.status === 'Unfilled' || 
      (shift.status === 'Partially Staffed' && !options.allowPartialFill)
    );
    iteration++;
  }

  // Update final shift statuses
  updateShiftStatuses(rota);

  return rota;
};

// Validate rota
export const validateRota = (rota: Rota, staff: Staff[]): RotaValidationError[] => {
  const errors: RotaValidationError[] = [];

  // Validate each shift
  rota.shifts.forEach(shift => {
    // Check role requirements
    shift.requiredRoles.forEach(requirement => {
      const assignedCount = countAssignedRoles(shift, requirement.role);
      if (assignedCount < requirement.count) {  // Direct comparison instead of compareRequirements
        errors.push(createValidationError({
          type: 'missing-role',
          message: `Missing ${requirement.role} requirement (${assignedCount}/${requirement.count})`,
          severity: 'error',
          shiftId: shift.id
        }));
      }
    });

    // Check staff assignments
    shift.assignedStaff.forEach(assignment => {
      if (typeof assignment === 'object') {
        const staffMember = staff.find(s => s.id === assignment.userId);
        if (staffMember) {
          // Check availability
          if (!isStaffAvailable(staffMember, shift)) {
            errors.push(createValidationError({
              type: 'unavailable',
              message: `${staffMember.name} is not available for this shift`,
              severity: 'error',
              shiftId: shift.id,
              staffId: staffMember.id
            }));
          }

          // Check working hours
          if (exceedsWorkingHours(staffMember, rota)) {
            errors.push(createValidationError({
              type: 'over-hours',
              message: `${staffMember.name} exceeds maximum working hours`,
              severity: 'error',
              shiftId: shift.id,
              staffId: staffMember.id
            }));
          }

          // Check rest periods
          if (!hasAdequateRest(staffMember, shift, rota)) {
            errors.push(createValidationError({
              type: 'rest-period',
              message: `${staffMember.name} has insufficient rest period`,
              severity: 'warning',
              shiftId: shift.id,
              staffId: staffMember.id
            }));
          }
        }
      }
    });
  });

  return errors;
};

// Generate AI shift suggestions
export const generateShiftSuggestions = (
  shift: Shift,
  availableStaff: Staff[],
  rota: Rota
): AIShiftSuggestion => {
  const suggestion = createAIShiftSuggestion(shift.id);
  const staffScores = calculateStaffScores(shift, availableStaff, rota, {
    optimizationPriority: 'balanced',
    considerTrainingStatus: true,
    considerPerformanceMetrics: true,
    allowPartialFill: false,
    maxIterations: 100,
    shiftRequirements: {
      morning: { total: 5, shiftLeader: 1, driver: 1 },
      afternoon: { total: 4, shiftLeader: 1, driver: 1 },
      night: { total: 2, shiftLeader: 1, driver: 0 }
    },
    staff: availableStaff
  });

  // Sort staff by score and split into primary and alternative suggestions
  const sortedStaff = [...staffScores].sort((a, b) => b.score - a.score);
  suggestion.suggestedStaff = sortedStaff.slice(0, 3);
  suggestion.alternativeStaff = sortedStaff.slice(3, 6);

  return suggestion;
};

// Export wrapper functions with defaults
export const generateRotaWithDefaults = (startDate: string): Rota => {
  const endDate = addDays(parseISO(startDate), 6).toISOString(); // Default to 1 week
  return generateRota(startDate, endDate, [], defaultRotaConfiguration, {
    optimizationPriority: 'balanced',
    considerTrainingStatus: true,
    considerPerformanceMetrics: true,
    allowPartialFill: false,
    maxIterations: 100,
    shiftRequirements: {
      morning: { total: 5, shiftLeader: 1, driver: 1 },
      afternoon: { total: 4, shiftLeader: 1, driver: 1 },
      night: { total: 2, shiftLeader: 1, driver: 0 }
    },
    staff: []
  });
};

export const generateRotaStatsWithDefaults = (rota: Rota): RotaStats => {
  return generateRotaStats(rota, []); // Default to empty staff array
};

export const validateRotaWithDefaults = (rota: Rota): RotaValidationError[] => {
  return validateRota(rota, []); // Default to empty staff array
};

export const generateShiftSuggestionsWithDefaults = (shift: Shift): AIShiftSuggestion => {
  return generateShiftSuggestions(shift, [], { // Default to empty rota
    id: '',
    startDate: '',
    endDate: '',
    shifts: [],
    configuration: defaultRotaConfiguration,
    status: 'draft',
    lastModified: new Date().toISOString(),
    modifiedBy: 'system',
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    updatedAt: new Date().toISOString()
  });
};

// Generate comprehensive rota statistics
export const generateRotaStats = (rota: Rota, staff: Staff[]): RotaStats => {
  const stats = createEmptyRotaStats();
  const roleDistribution = createEmptyRoleDistribution();
  const staffUtilization: Record<string, number> = {};

  rota.shifts.forEach(shift => {
    // Count total shifts
    stats.totalShifts++;

    // Count shift status
    if (shift.status === 'Fully Staffed') stats.filledShifts++;
    if (shift.status === 'Unfilled') stats.unfilledShifts++;
    if (shift.status === 'Conflict') stats.conflictShifts++;

    // Calculate role distribution
    shift.assignedStaff.forEach(assignment => {
      if (typeof assignment === 'object') {
        roleDistribution[assignment.role]++;
        staffUtilization[assignment.userId] = 
          (staffUtilization[assignment.userId] || 0) + calculateShiftHours(shift);
      }
    });

    // Calculate role gaps
    shift.requiredRoles.forEach(requirement => {
      const assigned = countAssignedRoles(shift, requirement.role);
      if (assigned < requirement.count) {
        stats.roleGaps[requirement.role] += requirement.count - assigned;
      }
    });
  });

  // Calculate staff preference match
  const totalAssignments = Object.values(staffUtilization).length;
  const preferredAssignments = rota.shifts.reduce((count, shift) => {
    return count + shift.assignedStaff.filter(assignment => {
      if (typeof assignment === 'object') {
        const staffMember = staff.find(s => s.id === assignment.userId);
        return staffMember && matchesPreferences(staffMember, shift);
      }
      return false;
    }).length;
  }, 0);

  stats.staffUtilization = staffUtilization;
  stats.roleDistribution = roleDistribution;
  stats.staffPreferenceMatch = totalAssignments > 0 
    ? (preferredAssignments / totalAssignments) * 100 
    : 0;

  return stats;
};
