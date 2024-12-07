import React, { useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Add as AddIcon, LocationOn as SiteIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSickness } from '../../contexts/SicknessContext';
import useUserData from '../../hooks/useUserData';
import SicknessRecordDialog from './components/SicknessRecordDialog';
import SicknessMeetingDialog from './components/SicknessMeetingDialog';
import SicknessCard from './components/SicknessCard';
import SicknessStats from './components/SicknessStats';
import SicknessTabs from './components/SicknessTabs';
import { SicknessRecord } from '../../types/sickness';

const AdminSicknessPage = () => {
  const { userData } = useAuth();
  const { sicknessRecords, updateSicknessRecord, completeSicknessRecord } = useSickness();
  const { users } = useUserData();
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SicknessRecord | undefined>(undefined);
  const [editMode, setEditMode] = useState(false);

  // Get list of unique sites
  const sites = useMemo(() => {
    const siteSet = new Set<string>();
    users.forEach(user => {
      if (user.site) siteSet.add(user.site);
    });
    return ['all', ...Array.from(siteSet)];
  }, [users]);

  // Filter records by selected site
  const filteredRecords = useMemo(() => {
    return selectedSite === 'all'
      ? sicknessRecords
      : sicknessRecords.filter(record => record.site === selectedSite);
  }, [sicknessRecords, selectedSite]);

  const handleScheduleMeeting = (record: SicknessRecord) => {
    setSelectedRecord(record);
    setMeetingDialogOpen(true);
  };

  const handleAddNotes = (record: SicknessRecord) => {
    setSelectedRecord(record);
    setMeetingDialogOpen(true);
  };

  const handleEdit = (record: SicknessRecord) => {
    setSelectedRecord(record);
    setEditMode(true);
    setRecordDialogOpen(true);
  };

  const handleUploadForm = async (record: SicknessRecord) => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    
    // Handle file selection
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await updateSicknessRecord(record.id, {
            returnToWorkFormUrl: URL.createObjectURL(file) // Temporary URL for demo
          });
        } catch (error) {
          console.error('Error uploading form:', error);
        }
      }
    };
    
    // Trigger file selection
    input.click();
  };

  const handleComplete = async (record: SicknessRecord) => {
    try {
      await completeSicknessRecord(record.id, new Date());
    } catch (error) {
      console.error('Error completing record:', error);
    }
  };

  const handleCloseDialog = () => {
    setRecordDialogOpen(false);
    setMeetingDialogOpen(false);
    setSelectedRecord(undefined);
    setEditMode(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Sickness Management</Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Site</InputLabel>
            <Select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              label="Site"
              startAdornment={<SiteIcon sx={{ mr: 1 }} />}
            >
              {sites.map((site) => (
                <MenuItem key={site} value={site}>
                  {site === 'all' ? 'All Sites' : site}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
        isAdmin
        onScheduleMeeting={handleScheduleMeeting}
        onAddNotes={handleAddNotes}
        onEdit={handleEdit}
        onUploadForm={handleUploadForm}
        onComplete={handleComplete}
      />

      {/* Record Dialog for Add/Edit */}
      <SicknessRecordDialog
        open={recordDialogOpen}
        onClose={handleCloseDialog}
        selectedSite={selectedSite}
        record={editMode ? selectedRecord : undefined}
      />

      {/* Meeting Dialog */}
      {selectedRecord && (
        <SicknessMeetingDialog
          open={meetingDialogOpen}
          onClose={handleCloseDialog}
          record={selectedRecord}
        />
      )}
    </Box>
  );
};

export default AdminSicknessPage;
