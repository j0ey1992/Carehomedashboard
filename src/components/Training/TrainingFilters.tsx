import React from 'react';
import {
  Box,
  Card,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';

interface FilterOption {
  value: string;
  label: string;
  color?: 'error' | 'warning' | 'success' | 'default';
}

interface SortOption {
  value: string;
  label: string;
}

interface TrainingFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
}

const TrainingFilters: React.FC<TrainingFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedFilters,
  onFilterChange,
  sortBy,
  sortDirection,
  onSortChange,
}) => {
  const theme = useTheme();
  const [filterAnchor, setFilterAnchor] = React.useState<null | HTMLElement>(null);
  const [sortAnchor, setSortAnchor] = React.useState<null | HTMLElement>(null);

  const filterOptions: FilterOption[] = [
    { value: 'expired', label: 'Expired', color: 'error' },
    { value: 'expiring', label: 'Expiring Soon', color: 'warning' },
    { value: 'valid', label: 'Valid', color: 'success' },
    { value: 'requiresDiscussion', label: 'Requires Discussion', color: 'error' },
  ];

  const sortOptions: SortOption[] = [
    { value: 'expiryDate', label: 'Expiry Date' },
    { value: 'staffName', label: 'Staff Name' },
    { value: 'courseTitle', label: 'Course Title' },
    { value: 'status', label: 'Status' },
    { value: 'completionDate', label: 'Completion Date' },
  ];

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const handleSortClose = () => {
    setSortAnchor(null);
  };

  const handleFilterChange = (value: string) => {
    const newFilters = selectedFilters.includes(value)
      ? selectedFilters.filter(f => f !== value)
      : [...selectedFilters, value];
    onFilterChange(newFilters);
  };

  const handleSortChange = (value: string) => {
    if (sortBy === value) {
      onSortChange(value, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(value, 'asc');
    }
    handleSortClose();
  };

  const clearFilters = () => {
    onFilterChange([]);
    onSortChange('expiryDate', 'asc');
    onSearchChange('');
  };

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      <Stack spacing={2}>
        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search by staff name, course title, or status..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onSearchChange('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        {/* Active Filters Display */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Filter Button */}
            <Tooltip title="Filter Records">
              <IconButton
                onClick={handleFilterClick}
                sx={{
                  bgcolor: filterAnchor || selectedFilters.length > 0
                    ? alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                }}
              >
                <FilterIcon color={selectedFilters.length > 0 ? 'primary' : 'action'} />
              </IconButton>
            </Tooltip>

            {/* Sort Button */}
            <Tooltip title="Sort Records">
              <IconButton
                onClick={handleSortClick}
                sx={{
                  bgcolor: sortAnchor ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                }}
              >
                <SortIcon color={sortBy !== 'expiryDate' || sortDirection !== 'asc' ? 'primary' : 'action'} />
              </IconButton>
            </Tooltip>

            {/* Clear Filters */}
            {(selectedFilters.length > 0 || sortBy !== 'expiryDate' || sortDirection !== 'asc' || searchQuery) && (
              <Tooltip title="Clear All Filters">
                <IconButton onClick={clearFilters} size="small">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Active Filter Chips */}
          {selectedFilters.map((filter) => {
            const filterOption = filterOptions.find(f => f.value === filter);
            return filterOption ? (
              <Chip
                key={filter}
                label={filterOption.label}
                onDelete={() => handleFilterChange(filter)}
                color={filterOption.color}
                size="small"
              />
            ) : null;
          })}

          {/* Active Sort Chip */}
          {(sortBy !== 'expiryDate' || sortDirection !== 'asc') && (
            <Chip
              label={`${sortOptions.find(s => s.value === sortBy)?.label || 'Sort'} (${
                sortDirection === 'asc' ? '↑' : '↓'
              })`}
              onDelete={() => onSortChange('expiryDate', 'asc')}
              color="primary"
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Stack>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={handleFilterClose}
        PaperProps={{
          sx: { width: 250 },
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Filter by Status
        </Typography>
        {filterOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            sx={{
              bgcolor: selectedFilters.includes(option.value)
                ? alpha(theme.palette.primary.main, 0.1)
                : 'transparent',
            }}
          >
            <Checkbox checked={selectedFilters.includes(option.value)} />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={handleSortClose}
        PaperProps={{
          sx: { width: 250 },
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Sort by
        </Typography>
        {sortOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            sx={{
              bgcolor: sortBy === option.value
                ? alpha(theme.palette.primary.main, 0.1)
                : 'transparent',
            }}
          >
            <ListItemText 
              primary={option.label}
              secondary={sortBy === option.value ? (sortDirection === 'asc' ? '↑' : '↓') : null}
            />
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
};

export default TrainingFilters;
