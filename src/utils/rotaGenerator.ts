import { 
  Rota, 
  Staff, 
  Shift, 
  ShiftTime, 
  ShiftRole, 
  AISchedulerOptions, 
  RotaConfiguration,
  AIShiftSuggestion,
  StaffSuggestion,
  ShiftAssignment,
  StaffEvaluation,
  ShiftType
} from '../types/rota';
import { addDays, parseISO, format, isWithinInterval, differenceInHours } from 'date-fns';

interface StaffScore {
  staff: Staff;
  score: number;
  evaluation: StaffEvaluation;
  reason: string;
}

// Calculate training compliance score (30%)
const calculateTrainingScore = (staff: Staff): { score: number; details: any; reasons: string[] } => {
  const reasons: string[] = [];
  const details = {
    mandatoryTraining: 0,
    certificationStatus: 0,
    supervisionAttendance: 0
  };

  // Check mandatory training completion (12%)
  const mandatoryTrainingComplete = staff.trainingModules.filter(m => m.required).every(m => m.status === 'completed');
  if (mandatoryTrainingComplete) {
    details.mandatoryTraining = 12;
    reasons.push('All mandatory training completed');
  } else {
    const completionRate = staff.trainingModules.filter(m => m.required && m.status === 'completed').length / 
                          staff.trainingModules.filter(m => m.required).length;
    details.mandatoryTraining = Math.round(completionRate * 12);
    reasons.push(`${Math.round(completionRate * 100)}% mandatory training completed`);
  }

  // Check certification status (10%)
  const validCertifications = staff.certifications.filter(c => c.status === 'valid').length;
  const totalCertifications = staff.certifications.length;
  if (totalCertifications > 0) {
    details.certificationStatus = Math.round((validCertifications / totalCertifications) * 10);
    reasons.push(`${validCertifications}/${totalCertifications} certifications valid`);
  }

  // Check supervision attendance (8%)
  if (staff.performanceMetrics.supervisionAttendance) {
    details.supervisionAttendance = Math.round((staff.performanceMetrics.supervisionAttendance / 100) * 8);
    reasons.push(`${staff.performanceMetrics.supervisionAttendance}% supervision attendance`);
  }

  const totalScore = details.mandatoryTraining + details.certificationStatus + details.supervisionAttendance;
  return { score: totalScore, details, reasons };
};

// Calculate performance metrics score (25%)
const calculatePerformanceScore = (staff: Staff): { score: number; details: any; reasons: string[] } => {
  const reasons: string[] = [];
  const details = {
    attendance: 0,
    punctuality: 0,
    clientFeedback: 0
  };

  // Attendance record (10%)
  details.attendance = Math.round((staff.performanceMetrics.attendanceRate / 100) * 10);
  reasons.push(`${staff.performanceMetrics.attendanceRate}% attendance rate`);

  // Punctuality (7.5%)
  details.punctuality = Math.round((staff.performanceMetrics.punctualityScore / 100) * 7.5);
  reasons.push(`${staff.performanceMetrics.punctualityScore}% punctuality score`);

  // Client feedback (7.5%)
  if (staff.performanceMetrics.clientFeedbackScore) {
    details.clientFeedback = Math.round((staff.performanceMetrics.clientFeedbackScore / 100) * 7.5);
    reasons.push(`${staff.performanceMetrics.clientFeedbackScore}% client feedback score`);
  }

  const totalScore = details.attendance + details.punctuality + details.clientFeedback;
  return { score: totalScore, details, reasons };
};

// Calculate working patterns score (25%)
const calculateWorkingPatternsScore = (
  staff: Staff,
  shift: Shift,
  currentRota: Rota,
  configuration: RotaConfiguration
): { score: number; details: any; reasons: string[] } => {
  const reasons: string[] = [];
  const details = {
    contractedHours: 0,
    restPeriods: 0,
    preferences: 0,
    consecutiveDays: 0
  };

  // Check contracted hours remaining (7.5%)
  const assignedHours = calculateAssignedHours(staff, currentRota);
  const remainingHours = staff.contractedHours - assignedHours;
  const hoursScore = Math.min(7.5, Math.max(0, (remainingHours / 7.5) * 7.5));
  details.contractedHours = hoursScore;
  reasons.push(`${remainingHours.toFixed(1)} contracted hours remaining`);

  // Check rest period compliance (7.5%)
  const hasAdequateRest = checkRestPeriodCompliance(staff, shift, currentRota, configuration);
  if (hasAdequateRest) {
    details.restPeriods = 7.5;
    reasons.push('Adequate rest period maintained');
  }

  // Check consecutive days (5%)
  const consecutiveDays = calculateConsecutiveDays(staff, shift, currentRota);
  if (consecutiveDays < configuration.staffingRules.maxConsecutiveDays) {
    details.consecutiveDays = 5;
    reasons.push(`Within maximum consecutive days (${consecutiveDays}/${configuration.staffingRules.maxConsecutiveDays})`);
  } else {
    reasons.push(`Exceeds maximum consecutive days (${consecutiveDays}/${configuration.staffingRules.maxConsecutiveDays})`);
  }

  // Check shift pattern preferences (5%)
  if (staff.preferences.preferredShifts.includes(shift.time)) {
    details.preferences = 5;
    reasons.push('Matches preferred shift pattern');
  } else if (staff.preferences.flexibleHours) {
    details.preferences = 2.5;
    reasons.push('Staff has flexible hours preference');
  }

  // Night shift preference check
  if (shift.type === 'night' && !staff.preferences.nightShiftOnly) {
    details.preferences = 0;
    reasons.push('Staff not preferred for night shifts');
  }

  // Check leave conflicts
  const shiftDate = parseISO(shift.date);
  const hasLeaveConflict = staff.leave.some(leave => 
    isWithinInterval(shiftDate, {
      start: parseISO(leave.startDate),
      end: parseISO(leave.endDate)
    })
  );
  if (hasLeaveConflict) {
    details.contractedHours = 0;
    details.preferences = 0;
    details.consecutiveDays = 0;
    reasons.push('Staff on leave during this shift');
    return { score: 0, details, reasons };
  }

  const totalScore = details.contractedHours + details.restPeriods + details.preferences + details.consecutiveDays;
  return { score: totalScore, details, reasons };
};

// Calculate skills and experience score (20%)
const calculateSkillsScore = (staff: Staff, shift: Shift): { score: number; details: any; reasons: string[] } => {
  const reasons: string[] = [];
  const details = {
    qualifications: 0,
    specialSkills: 0,
    serviceLength: 0
  };

  // Role qualifications (10%)
  const hasRequiredRole = staff.roles.some(role => 
    shift.requiredRoles.some(req => req.role === role)
  );
  if (hasRequiredRole) {
    details.qualifications = 10;
    reasons.push('Qualified for required role');
  }

  // Special skills (5%)
  if (staff.roles.includes('Shift Leader')) {
    details.specialSkills = 5;
    reasons.push('Has Shift Leader qualification');
  } else if (staff.roles.includes('Driver')) {
    details.specialSkills = 3;
    reasons.push('Has Driver qualification');
  }

  // Length of service (5%)
  details.serviceLength = 5; // TODO: Calculate based on staff.startDate
  reasons.push('Experienced staff member');

  const totalScore = details.qualifications + details.specialSkills + details.serviceLength;
  return { score: totalScore, details, reasons };
};

// Helper function to calculate assigned hours
const calculateAssignedHours = (staff: Staff, rota: Rota): number => {
  return rota.shifts.reduce((total, shift) => {
    const isAssigned = shift.assignedStaff.some(assignment => 
      typeof assignment === 'string' 
        ? assignment === staff.id
        : assignment.userId === staff.id
    );
    if (!isAssigned) return total;

    const shiftHours = differenceInHours(
      parseISO(shift.endTime),
      parseISO(shift.startTime)
    );
    return total + shiftHours;
  }, 0);
};

// Helper function to check rest period compliance
const checkRestPeriodCompliance = (
  staff: Staff,
  shift: Shift,
  rota: Rota,
  configuration: RotaConfiguration
): boolean => {
  const shiftStart = parseISO(`${shift.date} ${shift.startTime}`);
  
  return !rota.shifts.some(existingShift => {
    if (!existingShift.assignedStaff.some(assignment => 
      typeof assignment === 'string' 
        ? assignment === staff.id
        : assignment.userId === staff.id
    )) {
      return false;
    }

    const existingShiftEnd = parseISO(`${existingShift.date} ${existingShift.endTime}`);
    const hoursBetween = Math.abs(differenceInHours(shiftStart, existingShiftEnd));
    return hoursBetween < configuration.staffingRules.minRestBetweenShifts;
  });
};

// Helper function to calculate consecutive working days
const calculateConsecutiveDays = (staff: Staff, shift: Shift, rota: Rota): number => {
  const shiftDate = parseISO(shift.date);
  let consecutiveDays = 1;

  // Check previous days
  let currentDate = addDays(shiftDate, -1);
  while (true) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const hasShift = rota.shifts.some(s => 
      s.date === dateStr && 
      s.assignedStaff.some(assignment => 
        typeof assignment === 'string' 
          ? assignment === staff.id
          : assignment.userId === staff.id
      )
    );
    if (!hasShift) break;
    consecutiveDays++;
    currentDate = addDays(currentDate, -1);
  }

  // Check following days
  currentDate = addDays(shiftDate, 1);
  while (true) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const hasShift = rota.shifts.some(s => 
      s.date === dateStr && 
      s.assignedStaff.some(assignment => 
        typeof assignment === 'string' 
          ? assignment === staff.id
          : assignment.userId === staff.id
      )
    );
    if (!hasShift) break;
    consecutiveDays++;
    currentDate = addDays(currentDate, 1);
  }

  return consecutiveDays;
};

// Generate shift suggestions for a specific shift
export const generateShiftSuggestions = (
  shift: Shift,
  availableStaff: Staff[],
  currentRota: Rota,
  configuration: RotaConfiguration
): AIShiftSuggestion => {
  const staffScores: StaffScore[] = availableStaff.map(staff => {
    const training = calculateTrainingScore(staff);
    const performance = calculatePerformanceScore(staff);
    const workingPatterns = calculateWorkingPatternsScore(staff, shift, currentRota, configuration);
    const skills = calculateSkillsScore(staff, shift);

    // Adjust scores based on role requirements
    let roleMultiplier = 1;
    if (shift.requiredRoles.some(req => req.role === 'Shift Leader' && staff.roles.includes('Shift Leader'))) {
      roleMultiplier = 1.2; // Prioritize shift leaders
    }

    const totalScore = (
      (training.score * 0.3) +
      (performance.score * 0.25) +
      (workingPatterns.score * 0.25) +
      (skills.score * 0.2)
    ) * roleMultiplier;

    const evaluation: StaffEvaluation = {
      trainingCompliance: {
        score: training.score,
        details: training.details
      },
      performanceMetrics: {
        score: performance.score,
        details: performance.details
      },
      workingPatterns: {
        score: workingPatterns.score,
        details: workingPatterns.details
      },
      skillsExperience: {
        score: skills.score,
        details: skills.details
      },
      overallScore: totalScore,
      recommendations: [
        ...training.reasons,
        ...performance.reasons,
        ...workingPatterns.reasons,
        ...skills.reasons
      ]
    };

    return {
      staff,
      score: totalScore,
      evaluation,
      reason: [
        ...training.reasons,
        ...performance.reasons,
        ...workingPatterns.reasons,
        ...skills.reasons
      ].join('. ')
    };
  });

  // Sort staff by score
  staffScores.sort((a, b) => b.score - a.score);

  // Create evaluations map
  const evaluations: Record<string, StaffEvaluation> = {};
  staffScores.forEach(score => {
    evaluations[score.staff.id] = score.evaluation;
  });

  // Convert to suggestions format
  const suggestions: StaffSuggestion[] = staffScores.slice(0, 3).map(score => ({
    staffId: score.staff.id,
    userId: score.staff.id,
    role: score.staff.roles[0],
    confidence: score.score / 100,
    reason: score.reason,
    score: score.score,
    evaluation: score.evaluation
  }));

  const alternatives: StaffSuggestion[] = staffScores.slice(3, 6).map(score => ({
    staffId: score.staff.id,
    userId: score.staff.id,
    role: score.staff.roles[0],
    confidence: score.score / 100,
    reason: score.reason,
    score: score.score,
    evaluation: score.evaluation
  }));

  return {
    shiftId: shift.id,
    suggestedStaff: suggestions,
    alternativeStaff: alternatives,
    confidence: suggestions[0]?.confidence || 0,
    reasoning: suggestions[0]?.reason.split('. ') || [],
    evaluations
  };
};

// Generate a complete rota
export const generateRota = (
  startDate: string,
  endDate: string,
  staff: Staff[],
  configuration: RotaConfiguration,
  options: AISchedulerOptions
): Rota => {
  const shifts: Shift[] = [];
  let currentDate = parseISO(startDate);
  const end = parseISO(endDate);

  // Generate shifts for each day
  while (currentDate <= end) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    // Generate shifts for each time slot
    configuration.shiftPatterns.forEach(pattern => {
      const timeDetails = pattern.time.split('-');
      const shiftType: ShiftType = pattern.time.includes('7:30-14:30') ? 'morning' :
                                  pattern.time.includes('14:30-21:30') ? 'afternoon' : 'night';

      const shift: Shift = {
        id: `${dateStr}-${pattern.time}-${Date.now()}`,
        date: dateStr,
        time: pattern.time,
        startTime: timeDetails[0],
        endTime: timeDetails[1],
        type: shiftType,
        requiredStaff: pattern.defaultRequirements.reduce((sum, req) => sum + req.count, 0),
        requiredRoles: pattern.defaultRequirements,
        assignedStaff: [],
        status: 'Unfilled',
        complianceStatus: 'High',
        trainingRequired: []
      };

      // Get suggestions for this shift
      const tempRota: Rota = {
        id: '',
        startDate,
        endDate,
        shifts,
        configuration,
        status: 'draft',
        createdBy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        modifiedBy: ''
      };

      const suggestions = generateShiftSuggestions(shift, staff, tempRota, configuration);

      // Assign staff based on suggestions and requirements
      if (options.allowPartialFill || suggestions.suggestedStaff.length >= shift.requiredStaff) {
        // First, assign a Shift Leader if required
        const shiftLeaderReq = shift.requiredRoles.find(r => r.role === 'Shift Leader');
        if (shiftLeaderReq && shiftLeaderReq.count > 0) {
          const shiftLeader = suggestions.suggestedStaff.find(s => 
            staff.find(st => st.id === s.staffId)?.roles.includes('Shift Leader')
          );
          if (shiftLeader) {
            shift.assignedStaff.push({
              userId: shiftLeader.userId,
              role: 'Shift Leader',
              assignedAt: new Date().toISOString(),
              assignedBy: 'AI_SCHEDULER'
            });
            suggestions.suggestedStaff = suggestions.suggestedStaff.filter(s => s.staffId !== shiftLeader.staffId);
          }
        }

        // Then assign remaining staff
        const remainingSlots = shift.requiredStaff - shift.assignedStaff.length;
        shift.assignedStaff.push(...suggestions.suggestedStaff
          .slice(0, remainingSlots)
          .map(suggestion => ({
            userId: suggestion.userId,
            role: suggestion.role,
            assignedAt: new Date().toISOString(),
            assignedBy: 'AI_SCHEDULER'
          })));

        shift.status = shift.assignedStaff.length >= shift.requiredStaff
          ? 'Fully Staffed'
          : 'Partially Staffed';

        // Calculate compliance status
        const assignedStaffCompliance = shift.assignedStaff.map(assignment => {
          const staffMember = staff.find(s => s.id === (typeof assignment === 'string' ? assignment : assignment.userId));
          return staffMember?.complianceScore.overall || 0;
        });

        const averageCompliance = assignedStaffCompliance.reduce((sum, score) => sum + score, 0) / assignedStaffCompliance.length;
        shift.complianceStatus = averageCompliance >= 90 ? 'High' : averageCompliance >= 70 ? 'Medium' : 'Low';

        // Check for required training
        const requiredTraining = new Set<string>();
        shift.assignedStaff.forEach(assignment => {
          const staffMember = staff.find(s => s.id === (typeof assignment === 'string' ? assignment : assignment.userId));
          if (staffMember) {
            staffMember.trainingModules
              .filter(m => m.required && m.status !== 'completed')
              .forEach(m => requiredTraining.add(m.name));
          }
        });
        shift.trainingRequired = Array.from(requiredTraining);
      }

      shifts.push(shift);
    });

    currentDate = addDays(currentDate, 1);
  }

  return {
    id: '',
    startDate,
    endDate,
    shifts,
    configuration,
    status: 'draft',
    createdBy: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    modifiedBy: ''
  };
};
