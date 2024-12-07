import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useSickness } from '../../contexts/SicknessContext';
import SicknessCard from './components/SicknessCard';
import SicknessStats from './components/SicknessStats';
import SicknessTabs from './components/SicknessTabs';

const StaffSicknessPage = () => {
  const { currentUser, userData } = useAuth();
  const { sicknessRecords, getTriggerStatus } = useSickness();

  // Filter records for current user
  const personalRecords = useMemo(() => {
    if (!currentUser) return [];
    return sicknessRecords.filter(record => record.staffId === currentUser.uid);
  }, [sicknessRecords, currentUser]);

  // Get trigger status
  const triggerStatus = useMemo(() => {
    if (!currentUser) return null;
    return getTriggerStatus(currentUser.uid);
  }, [currentUser, getTriggerStatus]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Sickness Records
      </Typography>

      {triggerStatus?.isNearingTrigger && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
        >
          You are nearing sickness trigger points:
          <br />
          • {triggerStatus.occurrences} occurrences this year (threshold: 4)
          <br />
          • {triggerStatus.totalDays} total days (threshold: 10)
        </Alert>
      )}

      <SicknessStats records={personalRecords} />
      
      <SicknessTabs 
        records={personalRecords}
      />
    </Box>
  );
};

export default StaffSicknessPage;
