import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Slider,
  Box,
  Divider
} from '@mui/material';
import {
  AISchedulerOptions,
  WeeklyShiftRequirements,
  ShiftRole
} from '../../types/rota';

interface AutoSchedulerProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (options: AISchedulerOptions) => void;
}

const defaultShiftRequirements: WeeklyShiftRequirements = {
  morning: {
    total: 5,
    shiftLeader: 1,
    driver: 1
  },
  afternoon: {
    total: 4,
    shiftLeader: 1,
    driver: 0
  },
  night: {
    total: 2,
    shiftLeader: 1,
    driver: 0
  }
};

const defaultWeightings = {
  trainingCompliance: 25,
  performanceMetrics: 25,
  workingPatterns: 25,
  skillsExperience: 25
};

const AutoScheduler: React.FC<AutoSchedulerProps> = ({
  open,
  onClose,
  onGenerate
}) => {
  const [optimizationPriority, setOptimizationPriority] = useState<'balanced' | 'staff-preference' | 'coverage'>('balanced');
  const [considerTrainingStatus, setConsiderTrainingStatus] = useState(true);
  const [considerPerformanceMetrics, setConsiderPerformanceMetrics] = useState(true);
  const [allowPartialFill, setAllowPartialFill] = useState(false);
  const [maxIterations, setMaxIterations] = useState(1000);
  const [shiftRequirements, setShiftRequirements] = useState<WeeklyShiftRequirements>(defaultShiftRequirements);
  const [weightings, setWeightings] = useState(defaultWeightings);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = useCallback(() => {
    const options: AISchedulerOptions = {
      optimizationPriority,
      considerTrainingStatus,
      considerPerformanceMetrics,
      allowPartialFill,
      maxIterations,
      shiftRequirements,
      staff: [],
      weightings: {
        trainingCompliance: weightings.trainingCompliance / 100,
        performanceMetrics: weightings.performanceMetrics / 100,
        workingPatterns: weightings.workingPatterns / 100,
        skillsExperience: weightings.skillsExperience / 100
      }
    };

    onGenerate(options);
    onClose();
  }, [
    optimizationPriority,
    considerTrainingStatus,
    considerPerformanceMetrics,
    allowPartialFill,
    maxIterations,
    shiftRequirements,
    weightings,
    onGenerate,
    onClose
  ]);

  const handleShiftRequirementChange = useCallback((
    shift: keyof WeeklyShiftRequirements,
    field: keyof WeeklyShiftRequirements[keyof WeeklyShiftRequirements],
    value: number
  ) => {
    setShiftRequirements(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        [field]: value
      }
    }));
  }, []);

  const handleWeightingChange = useCallback((field: keyof typeof defaultWeightings, value: number) => {
    setWeightings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Auto Scheduler Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Optimization Priority</InputLabel>
            <Select
              value={optimizationPriority}
              onChange={(e) => setOptimizationPriority(e.target.value as typeof optimizationPriority)}
              label="Optimization Priority"
            >
              <MenuItem value="balanced">Balanced</MenuItem>
              <MenuItem value="staff-preference">Staff Preference</MenuItem>
              <MenuItem value="coverage">Coverage</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="h6">Shift Requirements</Typography>
          <Stack spacing={2}>
            {Object.entries(shiftRequirements).map(([shift, requirements]) => (
              <Box key={shift} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    type="number"
                    label="Total Staff"
                    value={requirements.total}
                    onChange={(e) => handleShiftRequirementChange(
                      shift as keyof WeeklyShiftRequirements,
                      'total',
                      parseInt(e.target.value)
                    )}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    type="number"
                    label="Shift Leaders"
                    value={requirements.shiftLeader}
                    onChange={(e) => handleShiftRequirementChange(
                      shift as keyof WeeklyShiftRequirements,
                      'shiftLeader',
                      parseInt(e.target.value)
                    )}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    type="number"
                    label="Drivers"
                    value={requirements.driver}
                    onChange={(e) => handleShiftRequirementChange(
                      shift as keyof WeeklyShiftRequirements,
                      'driver',
                      parseInt(e.target.value)
                    )}
                    inputProps={{ min: 0 }}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
            }
            label="Show Advanced Settings"
          />

          {showAdvanced && (
            <>
              <Divider />
              <Typography variant="h6">Advanced Settings</Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={considerTrainingStatus}
                      onChange={(e) => setConsiderTrainingStatus(e.target.checked)}
                    />
                  }
                  label="Consider Training Status"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={considerPerformanceMetrics}
                      onChange={(e) => setConsiderPerformanceMetrics(e.target.checked)}
                    />
                  }
                  label="Consider Performance Metrics"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={allowPartialFill}
                      onChange={(e) => setAllowPartialFill(e.target.checked)}
                    />
                  }
                  label="Allow Partial Fill"
                />
                <TextField
                  type="number"
                  label="Max Iterations"
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(parseInt(e.target.value))}
                  inputProps={{ min: 100, max: 10000 }}
                />

                <Typography variant="subtitle1">Weightings</Typography>
                {Object.entries(weightings).map(([key, value]) => (
                  <Box key={key}>
                    <Typography gutterBottom>
                      {key.split(/(?=[A-Z])/).join(' ')} ({value}%)
                    </Typography>
                    <Slider
                      value={value}
                      onChange={(_, newValue) => handleWeightingChange(
                        key as keyof typeof defaultWeightings,
                        newValue as number
                      )}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleGenerate} variant="contained" color="primary">
          Generate Rota
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutoScheduler;
