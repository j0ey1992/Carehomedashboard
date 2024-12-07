import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useAuth } from '../../../contexts/AuthContext';
import { useSickness } from '../../../contexts/SicknessContext';
import useUserData from '../../../hooks/useUserData';
import { SicknessRecord, SicknessType } from '../../../types/sickness';
import { User } from '../../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedSite?: string;
  record?: SicknessRecord;
}

interface FormData {
  staffId: string;
  staffName: string;
  reason: string;
  startDate: Date;
  endDate: Date | null;
  notes: string;
  site: string;
  type: SicknessType;
}

const SicknessRecordDialog: React.FC<Props> = ({ 
  open, 
  onClose, 
  selectedSite,
  record 
}) => {
  const { currentUser, userData, isAdmin } = useAuth();
  const { addSicknessRecord, updateSicknessRecord } = useSickness();
  const { users } = useUserData();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    staffId: '',
    staffName: '',
    reason: '',
    startDate: new Date(),
    endDate: null,
    notes: '',
    site: selectedSite === 'all' ? '' : selectedSite || '',
    type: 'sickness',
  });

  // Get available sites for manager
  const availableSites = useMemo(() => {
    if (isAdmin) {
      // Get unique sites and filter out any undefined/null values
      const sites = Array.from(new Set(users.map(user => user.site)));
      return sites.filter((site): site is string => Boolean(site));
    }
    // For managers, use their assigned sites or single site
    return userData?.sites || (userData?.site ? [userData.site] : []);
  }, [isAdmin, userData, users]);

  // Filter staff by selected site
  const availableStaff = useMemo(() => {
    if (!formData.site) return [];
    return users.filter(user => user.site === formData.site && user.role === 'staff');
  }, [users, formData.site]);

  useEffect(() => {
    if (record) {
      setFormData({
        staffId: record.staffId,
        staffName: record.staffName,
        reason: record.reason,
        startDate: record.startDate instanceof Date ? record.startDate : record.startDate.toDate(),
        endDate: record.endDate ? (record.endDate instanceof Date ? record.endDate : record.endDate.toDate()) : null,
        notes: record.notes || '',
        site: record.site || '',
        type: record.type || 'sickness',
      });
    } else {
      // Set initial site for new records
      setFormData(prev => ({
        ...prev,
        site: selectedSite === 'all' ? (availableSites[0] || '') : selectedSite || availableSites[0] || '',
      }));
    }
  }, [record, selectedSite, availableSites]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.staffId || !formData.reason || !formData.startDate || !formData.type || !formData.site) {
        throw new Error('Please fill in all required fields');
      }

      const staffMember = users.find(u => u.id === formData.staffId);
      if (!staffMember) {
        throw new Error('Selected staff member not found');
      }

      const recordData = {
        staffId: formData.staffId,
        staffName: staffMember.name,
        reason: formData.reason,
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes,
        site: formData.site,
        type: formData.type,
        status: 'current' as const,
        createdBy: currentUser!.uid,
      };

      if (record) {
        await updateSicknessRecord(record.id, recordData);
      } else {
        await addSicknessRecord(recordData);
      }

      onClose();
    } catch (err) {
      console.error('Error saving sickness record:', err);
      setError(err instanceof Error ? err.message : 'Failed to save sickness record');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, startDate: date }));
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    setFormData(prev => ({ ...prev, endDate: date }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {record ? 'Edit Record' : 'New Record'}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Site Selection for managers with multiple sites */}
          {availableSites.length > 1 && (
            <FormControl fullWidth>
              <InputLabel>Site</InputLabel>
              <Select
                value={formData.site}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    site: e.target.value as string,
                    staffId: '', // Reset staff selection when site changes
                    staffName: '',
                  }));
                }}
                label="Site"
                required
              >
                {availableSites.map((site) => (
                  <MenuItem key={site} value={site}>
                    {site}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth>
            <InputLabel>Staff Member</InputLabel>
            <Select
              value={formData.staffId}
              onChange={(e) => {
                const staffMember = users.find(u => u.id === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  staffId: e.target.value,
                  staffName: staffMember?.name || '',
                }));
              }}
              label="Staff Member"
              required
              disabled={!formData.site} // Disable until site is selected
            >
              {availableStaff.map((staff: User) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as SicknessType }))}
              label="Type"
              required
            >
              <MenuItem value="sickness">Sickness</MenuItem>
              <MenuItem value="authorised_unpaid">Authorised Unpaid Leave</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Reason"
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            multiline
            rows={2}
            required
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Start Date"
              value={formData.startDate}
              onChange={handleStartDateChange}
              sx={{ flex: 1 }}
            />
            <DatePicker
              label="End Date (Optional)"
              value={formData.endDate}
              onChange={handleEndDateChange}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="Additional Notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            multiline
            rows={3}
          />

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.staffId || !formData.reason || !formData.startDate || !formData.type || !formData.site}
        >
          {loading ? 'Saving...' : record ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SicknessRecordDialog;
