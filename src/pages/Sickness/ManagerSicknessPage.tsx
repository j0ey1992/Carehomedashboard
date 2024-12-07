import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSickness } from '../../contexts/SicknessContext';
import useUserData from '../../hooks/useUserData';
import SicknessRecordDialog from './components/SicknessRecordDialog';
import SicknessMeetingDialog from './components/SicknessMeetingDialog';
import SicknessCard from './components/SicknessCard';
import SicknessStats from './components/SicknessStats';
import SicknessTabs from './components/SicknessTabs';

const ManagerSicknessPage = () => {
  const { userData, isAdmin } = useAuth();
  const { sicknessRecords } = useSickness();
  const { users } = useUserData();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<string>('');

  // Initialize selected site
  React.useEffect(() => {
    if (userData?.sites && userData.sites.length > 0) {
      setSelectedSite(userData.sites[0]);
    } else if (userData?.site) {
      setSelectedSite(userData.site);
    }
  }, [userData]);

  // Filter records for manager's sites
  const filteredRecords = useMemo(() => {
    if (!selectedSite) return [];
    
    // For managers with multiple sites
    if (userData?.sites) {
      // Only show records for the selected site if it's one of the manager's sites
      if (userData.sites.includes(selectedSite)) {
        return sicknessRecords.filter(record => record.site === selectedSite);
      }
    }
    
    // For managers with single site
    if (userData?.site === selectedSite) {
      return sicknessRecords.filter(record => record.site === selectedSite);
    }

    return [];
  }, [sicknessRecords, userData, selectedSite]);

  // Get available staff for manager's selected site
  const availableStaff = useMemo(() => {
    if (!selectedSite) return [];
    return users.filter(user => 
      user.role === 'staff' && 
      user.site === selectedSite
    );
  }, [users, selectedSite]);

  const handleScheduleMeeting = (record: any) => {
    setSelectedRecord(record);
    setMeetingDialogOpen(true);
  };

  const handleAddNotes = (record: any) => {
    setSelectedRecord(record);
    setMeetingDialogOpen(true);
  };

  // Get manager's available sites
  const availableSites = useMemo(() => {
    if (isAdmin) {
      // Admin can see all sites
      return Array.from(new Set(users.map(user => user.site).filter(Boolean)));
    }
    return userData?.sites || (userData?.site ? [userData.site] : []);
  }, [userData, users, isAdmin]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Staff Sickness Management</Typography>
          {availableSites.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Site</InputLabel>
              <Select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                label="Site"
              >
                {availableSites.map((site) => (
                  <MenuItem key={site} value={site}>
                    {site}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setRecordDialogOpen(true)}
        >
          Add Record
        </Button>
      </Box>

      <SicknessStats records={filteredRecords} />
      
      <SicknessTabs 
        records={filteredRecords}
        onScheduleMeeting={handleScheduleMeeting}
        onAddNotes={handleAddNotes}
      />

      <SicknessRecordDialog
        open={recordDialogOpen}
        onClose={() => setRecordDialogOpen(false)}
        selectedSite={selectedSite}
      />

      {selectedRecord && (
        <SicknessMeetingDialog
          open={meetingDialogOpen}
          onClose={() => {
            setMeetingDialogOpen(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
        />
      )}
    </Box>
  );
};

export default ManagerSicknessPage;
