import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { 
  Rota, 
  Staff, 
  RotaValidationError, 
  AISchedulerOptions, 
  defaultRotaConfiguration,
  AIShiftSuggestion,
  Shift,
  ShiftAssignment,
  ShiftRole,
  ShiftStatus,
  createEmptyRotaStats,
  ShiftTime,
  SHIFT_TIME_DETAILS,
  ShiftRequirementWithRoles
} from '../types/rota';
import { 
  generateRota,
  validateRotaWithDefaults, 
  generateRotaStats,
  generateShiftSuggestions
} from '../utils/rotaUtils';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface ShiftRequirements {
  total: number;
  shiftLeader: boolean;
  driver: boolean;
}

interface RotaContextType {
  currentRota: Rota | null;
  staff: Staff[];
  isLoading: boolean;
  error: string | null;
  loadRotaForWeek: (date: Date) => Promise<void>;
  createRota: (startDate: string) => Promise<void>;
  updateRota: (rota: Rota) => Promise<void>;
  deleteRota: (rotaId: string) => Promise<void>;
  generateAIRota: (options: AISchedulerOptions) => Promise<void>;
  validateCurrentRota: () => Promise<RotaValidationError[]>;
  getRotaStats: () => ReturnType<typeof generateRotaStats>;
  assignStaffToShift: (shiftId: string, assignment: ShiftAssignment) => Promise<void>;
  removeStaffFromShift: (shiftId: string, staffId: string) => Promise<void>;
  getShiftSuggestions: (shift: Shift) => Promise<AIShiftSuggestion>;
  addShift: (date: string, time: ShiftTime, requirements: ShiftRequirements) => Promise<void>;
}

export const RotaContext = createContext<RotaContextType>({
  currentRota: null,
  staff: [],
  isLoading: false,
  error: null,
  loadRotaForWeek: async () => {},
  createRota: async () => {},
  updateRota: async () => {},
  deleteRota: async () => {},
  generateAIRota: async () => {},
  validateCurrentRota: async () => [],
  getRotaStats: () => createEmptyRotaStats(),
  assignStaffToShift: async () => {},
  removeStaffFromShift: async () => {},
  getShiftSuggestions: async () => ({
    shiftId: '',
    suggestedStaff: [],
    alternativeStaff: [],
    confidence: 0,
    reasoning: [],
    evaluations: {}
  }),
  addShift: async () => {}
});

export const useRotaContext = () => useContext(RotaContext);

interface Props {
  children: React.ReactNode;
}

export const RotaProvider: React.FC<Props> = ({ children }) => {
  const [currentRota, setCurrentRota] = useState<Rota | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedStaff, setHasLoadedStaff] = useState(false);

  const { currentUser } = useAuth();
  const { notify } = useNotifications();

  const updateRota = useCallback(async (rota: Rota) => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const { id, ...rotaData } = rota;
      await updateDoc(doc(db, 'rotas', id), {
        ...rotaData,
        updatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.uid
      });
      setCurrentRota(rota);
    } catch (err) {
      console.error('Error updating rota:', err);
      setError('Failed to update rota');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadStaff = useCallback(async () => {
    if (!currentUser || hasLoadedStaff) return;
    setIsLoading(true);

    try {
      const staffQuery = query(collection(db, 'users'), where('role', '==', 'staff'));
      const staffSnapshot = await getDocs(staffQuery);
      const staffData: Staff[] = staffSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unnamed Staff',
          email: data.email || 'no-email@example.com',
          roles: (data.roles || ['Care Staff']) as ShiftRole[],
          contractedHours: data.contractedHours || 37.5,
          preferences: {
            preferredShifts: data.preferences?.preferredShifts || [],
            unavailableDates: data.preferences?.unavailableDates || [],
            flexibleHours: data.preferences?.flexibleHours || false,
            nightShiftOnly: data.preferences?.nightShiftOnly || false,
            preferredWorkingDays: data.preferences?.preferredWorkingDays || [],
            preferredSites: data.preferences?.preferredSites || [],
            maxConsecutiveDays: data.preferences?.maxConsecutiveDays || 5,
            minRestPeriod: data.preferences?.minRestPeriod || 11,
            teamPreferences: data.preferences?.teamPreferences || []
          },
          performanceMetrics: {
            attendanceRate: data.performanceMetrics?.attendanceRate || 100,
            punctualityScore: data.performanceMetrics?.punctualityScore || 100,
            shiftCompletionRate: data.performanceMetrics?.shiftCompletionRate || 100,
            feedbackScore: data.performanceMetrics?.feedbackScore || 100,
            clientFeedbackScore: data.performanceMetrics?.clientFeedbackScore || 100,
            supervisionAttendance: data.performanceMetrics?.supervisionAttendance || 100,
            trainingCompletionRate: data.performanceMetrics?.trainingCompletionRate || 100
          },
          trainingStatus: data.trainingStatus || {},
          leave: data.leave || [],
          complianceScore: data.complianceScore || {
            overall: 100,
            training: 100,
            certification: 100,
            supervision: 100,
            documentation: 100
          },
          trainingModules: data.trainingModules || [],
          certifications: data.certifications || []
        };
      });
      setStaff(staffData);
      setHasLoadedStaff(true);
    } catch (err) {
      console.error('Error loading staff:', err);
      setError('Failed to load staff data');
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to load staff data',
        userId: currentUser.uid
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, notify, hasLoadedStaff]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const loadRotaForWeek = useCallback(async (date: Date) => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      if (!hasLoadedStaff) {
        await loadStaff();
      }

      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      
      const rotaQuery = query(
        collection(db, 'rotas'),
        where('startDate', '>=', format(weekStart, 'yyyy-MM-dd')),
        where('startDate', '<=', format(weekEnd, 'yyyy-MM-dd'))
      );

      const rotaSnapshot = await getDocs(rotaQuery);
      if (!rotaSnapshot.empty) {
        const rotaDoc = rotaSnapshot.docs[0];
        const rotaData = rotaDoc.data() as Rota;
        setCurrentRota({ ...rotaData, id: rotaDoc.id });
      } else {
        setCurrentRota(null);
      }
    } catch (err) {
      console.error('Error loading rota:', err);
      setError('Failed to load rota');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadStaff, hasLoadedStaff]);

  const addShift = useCallback(async (date: string, time: ShiftTime, requirements: ShiftRequirements) => {
    if (!currentRota || !currentUser) return;

    try {
      const timeDetails = SHIFT_TIME_DETAILS[time];
      
      // Create required roles array based on requirements
      const requiredRoles: ShiftRequirementWithRoles[] = [];
      
      if (requirements.shiftLeader) {
        requiredRoles.push({ role: 'Shift Leader', count: 1 });
      }
      
      if (requirements.driver) {
        requiredRoles.push({ role: 'Driver', count: 1 });
      }
      
      // Calculate remaining care staff needed
      const specialRolesCount = (requirements.shiftLeader ? 1 : 0) + (requirements.driver ? 1 : 0);
      const careStaffCount = Math.max(0, requirements.total - specialRolesCount);
      
      if (careStaffCount > 0) {
        requiredRoles.push({ role: 'Care Staff', count: careStaffCount });
      }

      const newShift: Shift = {
        id: `${date}-${time}-${Date.now()}`,
        date,
        time,
        startTime: timeDetails.start,
        endTime: timeDetails.end,
        type: timeDetails.type,
        requiredStaff: requirements.total,
        requiredRoles,
        assignedStaff: [],
        status: 'Unfilled',
        complianceStatus: 'High'
      };

      const updatedRota = {
        ...currentRota,
        shifts: [...currentRota.shifts, newShift],
        updatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.uid
      };

      await updateRota(updatedRota);
      notify({
        type: 'system',
        title: 'Success',
        message: `New shift added for ${format(new Date(date), 'do MMM yyyy')} at ${time}`,
        userId: currentUser.uid
      });
    } catch (err) {
      console.error('Error adding shift:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to add shift',
        userId: currentUser.uid
      });
    }
  }, [currentRota, currentUser, updateRota, notify]);

  const assignStaffToShift = useCallback(async (shiftId: string, assignment: ShiftAssignment) => {
    if (!currentUser || !currentRota) return;

    try {
      const updatedRota = {
        ...currentRota,
        shifts: currentRota.shifts.map(shift => {
          if (shift.id === shiftId) {
            const newAssignedStaff = [...shift.assignedStaff, assignment];
            const newStatus: ShiftStatus = 
              newAssignedStaff.length >= shift.requiredStaff ? 'Fully Staffed' :
              newAssignedStaff.length > 0 ? 'Partially Staffed' : 
              'Unfilled';
            
            return {
              ...shift,
              assignedStaff: newAssignedStaff,
              status: newStatus
            };
          }
          return shift;
        })
      };

      await updateRota(updatedRota);
    } catch (err) {
      console.error('Error assigning staff:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to assign staff member',
        userId: currentUser.uid
      });
    }
  }, [currentUser, currentRota, updateRota, notify]);

  const removeStaffFromShift = useCallback(async (shiftId: string, staffId: string) => {
    if (!currentUser || !currentRota) return;

    try {
      const updatedRota = {
        ...currentRota,
        shifts: currentRota.shifts.map(shift => {
          if (shift.id === shiftId) {
            const newAssignedStaff = shift.assignedStaff.filter(assignment => 
              typeof assignment === 'string'
                ? assignment !== staffId
                : assignment.userId !== staffId
            );
            const newStatus: ShiftStatus = 
              newAssignedStaff.length === 0 ? 'Unfilled' : 
              newAssignedStaff.length >= shift.requiredStaff ? 'Fully Staffed' : 
              'Partially Staffed';

            return {
              ...shift,
              assignedStaff: newAssignedStaff,
              status: newStatus
            };
          }
          return shift;
        })
      };

      await updateRota(updatedRota);
    } catch (err) {
      console.error('Error removing staff:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to remove staff member',
        userId: currentUser.uid
      });
    }
  }, [currentUser, currentRota, updateRota, notify]);

  const createRota = useCallback(async (startDate: string) => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      if (!hasLoadedStaff) {
        await loadStaff();
      }

      const newRota: Rota = {
        id: '',
        startDate,
        endDate: format(endOfWeek(new Date(startDate), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        shifts: [],
        configuration: defaultRotaConfiguration,
        status: 'draft',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.uid
      };

      const rotaRef = doc(collection(db, 'rotas'));
      newRota.id = rotaRef.id;
      await setDoc(rotaRef, newRota);
      setCurrentRota(newRota);
    } catch (err) {
      console.error('Error creating rota:', err);
      setError('Failed to create rota');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadStaff, hasLoadedStaff]);

  const deleteRota = useCallback(async (rotaId: string) => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      await updateDoc(doc(db, 'rotas', rotaId), {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser.uid
      });
      setCurrentRota(null);
    } catch (err) {
      console.error('Error deleting rota:', err);
      setError('Failed to delete rota');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const generateAIRota = useCallback(async (options: AISchedulerOptions) => {
    if (!currentRota) return;
    setIsLoading(true);

    try {
      const generatedRota = generateRota(
        currentRota.startDate,
        currentRota.endDate,
        staff,
        currentRota.configuration,
        options
      );
      await updateRota(generatedRota);
    } catch (err) {
      console.error('Error generating AI rota:', err);
      setError('Failed to generate AI rota');
    } finally {
      setIsLoading(false);
    }
  }, [currentRota, staff, updateRota]);

  const validateCurrentRota = useCallback(async () => {
    if (!currentRota) return [];
    return validateRotaWithDefaults(currentRota);
  }, [currentRota]);

  const getRotaStats = useCallback(() => {
    if (!currentRota || !staff.length) return createEmptyRotaStats();
    return generateRotaStats(currentRota, staff);
  }, [currentRota, staff]);

  const getShiftSuggestions = useCallback(async (shift: Shift) => {
    if (!currentRota || !staff.length) {
      return {
        shiftId: shift.id,
        suggestedStaff: [],
        alternativeStaff: [],
        confidence: 0,
        reasoning: [],
        evaluations: {}
      };
    }
    return generateShiftSuggestions(shift, staff, currentRota);
  }, [currentRota, staff]);

  const value = {
    currentRota,
    staff,
    isLoading,
    error,
    loadRotaForWeek,
    createRota,
    updateRota,
    deleteRota,
    generateAIRota,
    validateCurrentRota,
    getRotaStats,
    assignStaffToShift,
    removeStaffFromShift,
    getShiftSuggestions,
    addShift
  };

  return (
    <RotaContext.Provider value={value}>
      {children}
    </RotaContext.Provider>
  );
};

export default RotaProvider;
