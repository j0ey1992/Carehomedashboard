import { useState, useCallback, useEffect } from 'react';
import { useRotaContext } from '../contexts/RotaContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Rota, 
  Staff, 
  ShiftTime, 
  ShiftRole, 
  ShiftAssignment,
  AISchedulerOptions,
  defaultRotaConfiguration,
  ShiftType
} from '../types/rota';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';

interface UseRotaOptions {
  autoLoad?: boolean;
}

interface ShiftRequirements {
  total: number;
  shiftLeader: boolean;
  driver: boolean;
}

export const useRota = (options: UseRotaOptions = {}) => {
  const { autoLoad = false } = options;
  const {
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
  } = useRotaContext();

  const { notify } = useNotifications();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Load rota data when currentDate changes
  useEffect(() => {
    const loadRotaData = async () => {
      if (!autoLoad && !isNavigating) return;

      try {
        setIsNavigating(true);
        await loadRotaForWeek(currentDate);
        
        // If no rota exists for this week, create one
        if (!currentRota) {
          const weekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          await createRota(weekStart);
        }
      } catch (err) {
        console.error('Error loading rota:', err);
        notify({
          type: 'system',
          title: 'Error',
          message: 'Failed to load rota data',
          userId: 'system'
        });
      } finally {
        setIsNavigating(false);
      }
    };

    loadRotaData();
  }, [currentDate, autoLoad, loadRotaForWeek, createRota, notify, currentRota, isNavigating]);

  const navigateToWeek = useCallback(async (date: Date) => {
    setCurrentDate(date);
  }, []);

  const navigateToNextWeek = useCallback(async () => {
    const nextWeek = addDays(currentDate, 7);
    setCurrentDate(nextWeek);
  }, [currentDate]);

  const navigateToPreviousWeek = useCallback(async () => {
    const prevWeek = addDays(currentDate, -7);
    setCurrentDate(prevWeek);
  }, [currentDate]);

  const handleAddShift = useCallback(async (date: string, time: ShiftTime, requirements: ShiftRequirements) => {
    try {
      // Add a small delay if multiple shifts are being added
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await addShift(date, time, requirements);
      notify({
        type: 'system',
        title: 'Success',
        message: `New shift added for ${format(parseISO(date), 'do MMM yyyy')} at ${time}`,
        userId: 'system'
      });
    } catch (err) {
      console.error('Error adding shift:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to add shift',
        userId: 'system'
      });
    }
  }, [addShift, notify]);

  const assignStaff = useCallback(async (shiftId: string, staffId: string, role: ShiftRole) => {
    try {
      // Validate staff member and role
      const staffMember = staff.find(s => s.id === staffId);
      if (!staffMember) {
        throw new Error('Staff member not found');
      }

      if (!staffMember.roles.includes(role)) {
        throw new Error('Staff member does not have the required role');
      }

      const assignment: ShiftAssignment = {
        userId: staffId,
        role,
        assignedAt: new Date().toISOString(),
        assignedBy: 'USER'
      };

      await assignStaffToShift(shiftId, assignment);
      notify({
        type: 'system',
        title: 'Success',
        message: `${staffMember.name} assigned as ${role}`,
        userId: 'system'
      });
    } catch (err) {
      console.error('Error assigning staff:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to assign staff member',
        userId: 'system'
      });
    }
  }, [assignStaffToShift, notify, staff]);

  const removeStaff = useCallback(async (shiftId: string, staffId: string) => {
    try {
      await removeStaffFromShift(shiftId, staffId);
      const staffMember = staff.find(s => s.id === staffId);
      notify({
        type: 'system',
        title: 'Success',
        message: staffMember ? `${staffMember.name} removed from shift` : 'Staff member removed successfully',
        userId: 'system'
      });
    } catch (err) {
      console.error('Error removing staff:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to remove staff member',
        userId: 'system'
      });
    }
  }, [removeStaffFromShift, notify, staff]);

  const generateRota = useCallback(async (options: AISchedulerOptions) => {
    try {
      await generateAIRota(options);
      notify({
        type: 'system',
        title: 'Success',
        message: 'Rota generated successfully',
        userId: 'system'
      });
    } catch (err) {
      console.error('Error generating rota:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to generate rota',
        userId: 'system'
      });
    }
  }, [generateAIRota, notify]);

  const validateRota = useCallback(async () => {
    try {
      const errors = await validateCurrentRota();
      if (errors.length > 0) {
        notify({
          type: 'system',
          title: 'Validation Issues',
          message: `Found ${errors.length} issues with the rota`,
          userId: 'system'
        });
      }
      return errors;
    } catch (err) {
      console.error('Error validating rota:', err);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to validate rota',
        userId: 'system'
      });
      return [];
    }
  }, [validateCurrentRota, notify]);

  return {
    currentRota,
    staff,
    isLoading,
    error,
    currentDate,
    selectedShiftId,
    stats: getRotaStats(),
    setSelectedShiftId,
    navigateToWeek,
    navigateToNextWeek,
    navigateToPreviousWeek,
    addShift: handleAddShift,
    assignStaff,
    removeStaff,
    generateRota,
    validateRota,
    getShiftSuggestions,
    loadRotaForWeek,
    createRota,
    isNavigating
  };
};

export default useRota;
