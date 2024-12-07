import React, { useState, useMemo } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Grid,
  Chip,
  Fade,
  TextField,
  InputAdornment,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  SortByAlpha as SortIcon,
  Clear as ClearIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { Timestamp } from 'firebase/firestore';
import { format, isToday, isPast } from 'date-fns';
import SicknessCard from './SicknessCard';
import { SicknessRecord } from '../../../types/sickness';

interface Props {
  records: SicknessRecord[];
  isAdmin?: boolean;
  onScheduleMeeting?: (record: SicknessRecord) => void;
  onAddNotes?: (record: SicknessRecord) => void;
  onEdit?: (record: SicknessRecord) => void;
  onUploadForm?: (record: SicknessRecord) => void;
  onComplete?: (record: SicknessRecord) => void;
}

const toDate = (value: Date | Timestamp | null | undefined): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return value.toDate();
};

const SicknessTabs: React.FC<Props> = ({ 
  records, 
  isAdmin, 
  onScheduleMeeting, 
  onAddNotes,
  onEdit,
  onUploadForm,
  onComplete,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [quickFilter, setQuickFilter] = useState('all');

  // Organize and filter records
  const organizedRecords = useMemo(() => {
    // First, filter by search term
    const searchFiltered = records.filter(record => 
      record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Split into status categories
    const current = searchFiltered.filter(record => record.status === 'current');
    const review = searchFiltered.filter(record => record.status === 'review');
    const completed = searchFiltered.filter(record => record.status === 'completed');

    // Apply quick filters
    const applyQuickFilter = (records: SicknessRecord[]) => {
      switch (quickFilter) {
        case 'today':
          return records.filter(r => isToday(toDate(r.startDate)));
        case 'overdue':
          return records.filter(r => 
            r.reviewDate && isPast(toDate(r.reviewDate))
          );
        case 'urgent':
          return records.filter(r => 
            (r.status === 'review' && r.reviewDate && isPast(toDate(r.reviewDate))) ||
            (r.status === 'current' && !r.endDate)
          );
        default:
          return records;
      }
    };

    // Sort records
    const sortRecords = (records: SicknessRecord[]) => {
      switch (sortBy) {
        case 'name':
          return [...records].sort((a, b) => a.staffName.localeCompare(b.staffName));
        case 'date':
          return [...records].sort((a, b) => toDate(b.startDate).getTime() - toDate(a.startDate).getTime());
        case 'duration':
          return [...records].sort((a, b) => {
            const getDuration = (record: SicknessRecord) => {
              const start = toDate(record.startDate);
              const end = record.endDate ? toDate(record.endDate) : new Date();
              return end.getTime() - start.getTime();
            };
            return getDuration(b) - getDuration(a);
          });
        default:
          return records;
      }
    };

    return {
      current: sortRecords(applyQuickFilter(current)),
      review: sortRecords(applyQuickFilter(review)),
      completed: sortRecords(applyQuickFilter(completed)),
    };
  }, [records, searchTerm, sortBy, quickFilter]);

  const renderFilters = () => (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={2} 
      sx={{ mb: 3 }}
      alignItems="center"
    >
      <TextField
        placeholder="Search staff or reason..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        sx={{ minWidth: 200 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearchTerm('')}>
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Sort By</InputLabel>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          label="Sort By"
          startAdornment={<SortIcon sx={{ mr: 1 }} />}
        >
          <MenuItem value="date">Date</MenuItem>
          <MenuItem value="name">Staff Name</MenuItem>
          <MenuItem value="duration">Duration</MenuItem>
        </Select>
      </FormControl>

      <Stack direction="row" spacing={1}>
        <Tooltip title="All Records">
          <Chip
            label="All"
            onClick={() => setQuickFilter('all')}
            color={quickFilter === 'all' ? 'primary' : 'default'}
            icon={<FilterIcon />}
          />
        </Tooltip>
        <Tooltip title="Started Today">
          <Chip
            label="Today"
            onClick={() => setQuickFilter('today')}
            color={quickFilter === 'today' ? 'primary' : 'default'}
            icon={<TodayIcon />}
          />
        </Tooltip>
        <Tooltip title="Overdue Reviews">
          <Chip
            label="Overdue"
            onClick={() => setQuickFilter('overdue')}
            color={quickFilter === 'overdue' ? 'error' : 'default'}
            icon={<WarningIcon />}
          />
        </Tooltip>
        <Tooltip title="Urgent Attention">
          <Chip
            label="Urgent"
            onClick={() => setQuickFilter('urgent')}
            color={quickFilter === 'urgent' ? 'error' : 'default'}
            icon={<ScheduleIcon />}
          />
        </Tooltip>
      </Stack>
    </Stack>
  );

  const renderContent = () => {
    const currentRecords = activeTab === 0 ? organizedRecords.current :
                         activeTab === 1 ? organizedRecords.review :
                         organizedRecords.completed;

    return (
      <Fade in timeout={500}>
        <Box>
          {currentRecords.length > 0 ? (
            <Grid container spacing={3}>
              {currentRecords.map(record => (
                <Grid item xs={12} sm={6} md={4} key={record.id}>
                  <SicknessCard
                    record={record}
                    onScheduleMeeting={onScheduleMeeting}
                    onAddNotes={onAddNotes}
                    onEdit={onEdit}
                    onUploadForm={onUploadForm}
                    onComplete={onComplete}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper 
              elevation={0}
              sx={{ 
                p: 4,
                textAlign: 'center',
                bgcolor: 'background.default',
                borderRadius: 2
              }}
            >
              <Typography color="textSecondary" variant="h6" gutterBottom>
                {searchTerm ? 'No matching records found' :
                 activeTab === 0 ? 'No current sickness records' :
                 activeTab === 1 ? 'No records requiring review' :
                 'No completed records'}
              </Typography>
              <Typography color="textSecondary" variant="body2">
                {searchTerm ? `Try adjusting your search terms or filters` :
                 'Records will appear here when available'}
              </Typography>
            </Paper>
          )}
        </Box>
      </Fade>
    );
  };

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': {
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
            },
          },
        }}
      >
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>Current</Typography>
              {organizedRecords.current.length > 0 && (
                <Chip 
                  label={organizedRecords.current.length} 
                  color="error" 
                  size="small"
                  sx={{ minWidth: 32 }}
                />
              )}
            </Box>
          }
        />
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>Need Review</Typography>
              {organizedRecords.review.length > 0 && (
                <Chip 
                  label={organizedRecords.review.length} 
                  color="warning" 
                  size="small"
                  sx={{ minWidth: 32 }}
                />
              )}
            </Box>
          }
        />
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>Completed</Typography>
              {organizedRecords.completed.length > 0 && (
                <Chip 
                  label={organizedRecords.completed.length} 
                  color="default" 
                  size="small"
                  sx={{ minWidth: 32 }}
                />
              )}
            </Box>
          }
        />
      </Tabs>

      {renderFilters()}
      {renderContent()}
    </Box>
  );
};

export default SicknessTabs;
