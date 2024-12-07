import React from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  Grid,
} from '@mui/material';
import { ShiftRole } from '../../types/rota';

interface UserInfoInputProps {
  contractedHours: number;
  setContractedHours: (hours: number) => void;
  annualLeave: number;
  setAnnualLeave: (days: number) => void;
  sickness: number;
  setSickness: (days: number) => void;
  roles: ShiftRole[];
  setRoles: (roles: ShiftRole[]) => void;
  email: string;
  setEmail: (email: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  site: string;
  setSite: (site: string) => void;
  name: string;
  setName: (name: string) => void;
}

const roleOptions: ShiftRole[] = ['Driver', 'Shift Leader', 'Care Staff'];

const siteOptions = [
  'Willowbrook',
  'Oakwood',
  'Riverside',
];

const UserInfoInput: React.FC<UserInfoInputProps> = ({
  contractedHours,
  setContractedHours,
  annualLeave,
  setAnnualLeave,
  sickness,
  setSickness,
  roles,
  setRoles,
  email,
  setEmail,
  phoneNumber,
  setPhoneNumber,
  site,
  setSite,
  name,
  setName,
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Staff Information
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Autocomplete
            value={site}
            onChange={(_, newValue) => setSite(newValue || 'Willowbrook')}
            options={siteOptions}
            renderInput={(params) => (
              <TextField {...params} label="Care Home Site" />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contracted Hours"
            type="number"
            value={contractedHours}
            onChange={(e) => setContractedHours(Number(e.target.value))}
            inputProps={{ min: 0, max: 48 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Annual Leave Days"
            type="number"
            value={annualLeave}
            onChange={(e) => setAnnualLeave(Number(e.target.value))}
            inputProps={{ min: 0, max: 30 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Sickness Days"
            type="number"
            value={sickness}
            onChange={(e) => setSickness(Number(e.target.value))}
            inputProps={{ min: 0 }}
          />
        </Grid>

        <Grid item xs={12}>
          <Autocomplete
            multiple
            value={roles}
            onChange={(_, newValue) => setRoles(newValue)}
            options={roleOptions}
            renderInput={(params) => (
              <TextField {...params} label="Roles" />
            )}
            sx={{ mt: 1 }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserInfoInput;
