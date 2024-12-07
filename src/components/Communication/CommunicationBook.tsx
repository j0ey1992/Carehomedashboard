import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Badge,
  Card,
  CardContent,
  Avatar,
  Collapse,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Zoom,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Comment as CommentIcon,
  Assignment as AssignmentIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  ViewDay as ViewDayIcon,
  FormatListBulleted as ListIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { alpha, useTheme } from '@mui/material/styles';
import { useCommunication } from '../../contexts/CommunicationContext';
import { useAuth } from '../../contexts/AuthContext';
import { CommunicationEntry, CommunicationFilter, DEFAULT_TAGS } from '../../types/communication';
import useData from '../../hooks/useData';
import { styled } from '@mui/material/styles';
import CommunicationEntryDialog from './CommunicationEntryDialog';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

type EntryStatus = 'open' | 'in-progress' | 'resolved';
type ViewMode = 'card' | 'list';

const FocusModeContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'focusMode',
})<{ focusMode: boolean }>(({ theme, focusMode }) => ({
  transition: 'all 0.3s ease',
  filter: focusMode ? 'grayscale(0.7)' : 'none',
  opacity: focusMode ? 0.7 : 1,
  '&:hover': {
    filter: 'none',
    opacity: 1,
  },
}));

const AnimatedCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

const getStatusColor = (status: EntryStatus): 'default' | 'primary' | 'secondary' | 'success' => {
  switch (status) {
    case 'open':
      return 'primary';
    case 'in-progress':
      return 'secondary';
    case 'resolved':
      return 'success';
    default:
      return 'default';
  }
};


const CommunicationBook: React.FC = () => {
  const theme = useTheme();
  const [entries, setEntries] = useState<CommunicationEntry[]>([]);
  const [filter, setFilter] = useState<CommunicationFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<EntryStatus | ''>('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEntry, setEditEntry] = useState<CommunicationEntry | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [weekSummary, setWeekSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const { getEntries, loading: contextLoading, deleteEntry, enhanceContent } = useCommunication();
  const { currentUser } = useAuth();
  const { data: users = [] } = useData<User>('users');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!currentUser || !isMountedRef.current) return;
    
    try {
      console.log('Fetching entries...');
      const fetchedEntries = await getEntries({
        ...filter,
        searchQuery: searchQuery || undefined,
      });
      
      if (isMountedRef.current) {
        console.log('Setting entries:', fetchedEntries);
        setEntries(fetchedEntries);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
      if (isMountedRef.current) {
        setError('Failed to fetch entries. Please try again.');
      }
    }
  }, [getEntries, filter, searchQuery, currentUser]);

  // Initial fetch and handle filter changes
  useEffect(() => {
    console.log('Filter or search changed, fetching entries...');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchEntries();
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filter, searchQuery, fetchEntries]);

  useEffect(() => {
    if (focusMode) {
      setFocusMode(false);
    }
  }, [entries, focusMode]);

  const handleSummarizeWeek = async () => {
    if (!isMountedRef.current) return;

    try {
      const recentEntries = entries
        .filter(e => new Date(e.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
        .map(e => e.details)
        .join('\n');
      
      const summary = await enhanceContent(recentEntries, 'summarize');
      if (isMountedRef.current) {
        setWeekSummary(summary);
        setShowSummary(true);
      }
    } catch (err) {
      console.error('Error summarizing week:', err);
      if (isMountedRef.current) {
        setError('Failed to generate weekly summary.');
      }
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    setFilter(prev => ({
      ...prev,
      searchQuery: value,
    }));
  };

  const handleTagSelect = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    setFilter(prev => ({
      ...prev,
      tags: newTags.length > 0 ? newTags : undefined,
    }));
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    const status = event.target.value as EntryStatus | '';
    setSelectedStatus(status);
    setFilter(prev => ({
      ...prev,
      status: status || undefined,
    }));
  };

  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
    if (!focusMode) {
      setExpandedEntry(null);
      setShowSummary(false);
    }
  };

  const handleExpandEntry = (entryId: string) => {
    if (focusMode) {
      setExpandedEntry(entryId);
      return;
    }
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  const handleMarkComplete = (entryId: string) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
        setTimeout(() => {
          const element = document.getElementById(`entry-${entryId}`);
          if (element) {
            element.classList.add('completion-animation');
            setTimeout(() => {
              element.classList.remove('completion-animation');
            }, 1000);
          }
        }, 0);
      }
      return newSet;
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, entryId: string) => {
    if (focusMode) return;
    setAnchorEl(event.currentTarget);
    setSelectedEntry(entryId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEntry(null);
  };

  const handleEdit = () => {
    const entry = entries.find(e => e.id === selectedEntry);
    if (entry) {
      setEditEntry(entry);
      setShowAddDialog(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedEntry || !isMountedRef.current) return;

    try {
      await deleteEntry(selectedEntry);
      if (isMountedRef.current) {
        await fetchEntries();
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      if (isMountedRef.current) {
        setError('Failed to delete entry. Please try again.');
      }
    }
    setShowDeleteDialog(false);
    handleMenuClose();
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setEditEntry(undefined);
  };

  const handleDialogSuccess = useCallback(async () => {
    handleDialogClose();
    if (isMountedRef.current) {
      await fetchEntries();
    }
  }, [fetchEntries]);

  const renderAIToolbar = () => (
    <Fade in timeout={500}>
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          justifyContent="space-between" 
          alignItems="center"
        >
          <Tooltip title={entries.length === 0 ? "No entries to summarize" : ""}>
            <span>
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleSummarizeWeek}
                disabled={entries.length === 0 || contextLoading}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.9),
                  '&:hover': {
                    bgcolor: theme.palette.primary.main,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Summarize Week
              </Button>
            </span>
          </Tooltip>
          <Button
            variant={focusMode ? "contained" : "outlined"}
            startIcon={<LightbulbIcon />}
            onClick={toggleFocusMode}
            color={focusMode ? "secondary" : "primary"}
            disabled={contextLoading}
            sx={{
              transition: 'all 0.2s ease',
            }}
          >
            {focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
          </Button>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Card View">
              <span>
                <IconButton 
                  onClick={() => setViewMode('card')}
                  color={viewMode === 'card' ? 'primary' : 'default'}
                  disabled={contextLoading}
                >
                  <ViewDayIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="List View">
              <span>
                <IconButton 
                  onClick={() => setViewMode('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  disabled={contextLoading}
                >
                  <ListIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>
    </Fade>
  );

  const renderWeekSummary = () => (
    <Collapse in={showSummary}>
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: alpha(theme.palette.info.main, 0.05),
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" color="info.main">
            Weekly Summary
          </Typography>
          <IconButton size="small" onClick={() => setShowSummary(false)}>
            <ExpandMoreIcon />
          </IconButton>
        </Stack>
        <Typography variant="body1">
          {weekSummary || "Generating summary..."}
        </Typography>
      </Paper>
    </Collapse>
  );

  const renderFilters = () => (
    <Collapse in={!focusMode}>
      <Paper 
        sx={{ 
          p: 2, 
          mb: 2,
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 3,
          },
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={handleSearchChange}
              disabled={contextLoading}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  transition: 'all 0.2s ease',
                  '&:focus-within': {
                    boxShadow: 2,
                  },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={handleStatusChange}
                label="Status"
                disabled={contextLoading}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {DEFAULT_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => handleTagSelect(tag)}
                  color={selectedTags.includes(tag) ? 'primary' : 'default'}
                  variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                  disabled={contextLoading}
                  sx={{
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Collapse>
  );

  const renderEntryCard = (entry: CommunicationEntry) => {
    const isExpanded = expandedEntry === entry.id;
    const creator = users.find(user => user.id === entry.createdBy);
    const assignedUser = entry.assignedTo ? users.find(user => user.id === entry.assignedTo) : null;
    const isCompleted = completedTasks.has(entry.id);

    return (
      <Zoom in timeout={300} key={entry.id}>
        <AnimatedCard 
          id={`entry-${entry.id}`}
          sx={{ 
            mb: 2,
            opacity: focusMode && !isExpanded ? 0.7 : 1,
            filter: focusMode && !isExpanded ? 'grayscale(0.5)' : 'none',
            bgcolor: isCompleted ? alpha(theme.palette.success.main, 0.05) : 'background.paper',
          }}
        >
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              mb: 2 
            }}>
              <Stack spacing={1} flex={1}>
                <Typography 
                  variant="h6" 
                  sx={{
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isCompleted ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {entry.subject}
                  {isCompleted && (
                    <CheckIcon 
                      sx={{ 
                        ml: 1, 
                        color: 'success.main',
                        animation: 'checkmark-pop 0.3s ease-out',
                      }} 
                    />
                  )}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    size="small"
                    label={entry.status}
                    color={getStatusColor(entry.status)}
                    sx={{ 
                      transition: 'all 0.2s ease',
                    }}
                  />
                  {entry.tags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      variant="outlined"
                      sx={{ 
                        transition: 'all 0.2s ease',
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
              {!focusMode && (
                <IconButton
                  onClick={(e) => handleMenuOpen(e, entry.id)}
                  size="small"
                  disabled={contextLoading}
                  sx={{
                    transition: 'all 0.2s ease',
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              )}
            </Box>

            <Typography 
              variant="body1" 
              sx={{ 
                mb: 2,
                color: isCompleted ? 'text.secondary' : 'text.primary',
              }}
            >
              {entry.details}
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Tooltip title={creator?.name || 'Unknown'}>
                  <Avatar 
                    sx={{ 
                      width: 24, 
                      height: 24,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {creator?.name?.charAt(0) || '?'}
                  </Avatar>
                </Tooltip>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(entry.date), 'MMM d, yyyy HH:mm')}
                </Typography>
                {!focusMode && assignedUser && (
                  <Tooltip title={`Assigned to ${assignedUser.name}`}>
                    <Chip
                      size="small"
                      icon={<AssignmentIcon />}
                      label={assignedUser.name}
                      variant="outlined"
                      sx={{
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </Tooltip>
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant={isCompleted ? "outlined" : "contained"}
                  color={isCompleted ? "success" : "primary"}
                  onClick={() => handleMarkComplete(entry.id)}
                  startIcon={isCompleted ? <CheckIcon /> : undefined}
                  disabled={contextLoading}
                  sx={{
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </Button>
                {!focusMode && (
                  <Badge badgeContent={entry.comments.length} color="primary">
                    <Button
                      startIcon={<CommentIcon />}
                      onClick={() => handleExpandEntry(entry.id)}
                      size="small"
                      variant="outlined"
                      disabled={contextLoading}
                    >
                      Comments
                    </Button>
                  </Badge>
                )}
              </Stack>
            </Box>
          </CardContent>

          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comments
              </Typography>
              <Stack spacing={2}>
                {entry.comments.map((comment) => {
                  const commentUser = users.find(user => user.id === comment.createdBy);
                  return (
                    <Box 
                      key={comment.id} 
                      sx={{ 
                        p: 2,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          {commentUser?.name?.charAt(0) || '?'}
                        </Avatar>
                        <Typography variant="subtitle2">
                          {commentUser?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(comment.createdAt), 'MMM d, yyyy HH:mm')}
                        </Typography>
                      </Stack>
                      <Typography variant="body2">
                        {comment.content}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Collapse>
        </AnimatedCard>
      </Zoom>
    );
  };

  const renderContent = () => {
    console.log('Rendering content with entries:', entries);
    console.log('Loading state:', contextLoading);

    if (contextLoading && entries.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (entries.length === 0) {
      return (
        <Paper 
          sx={{ 
            p: 3, 
            textAlign: 'center',
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
          }}
        >
          <Typography color="textSecondary" variant="h6" gutterBottom>
            No entries found
          </Typography>
          <Typography color="textSecondary">
            Create a new entry to get started
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
            disabled={contextLoading}
            sx={{ mt: 2 }}
          >
            New Entry
          </Button>
        </Paper>
      );
    }

    return (
      <FocusModeContainer focusMode={focusMode}>
        {entries.map(entry => {
          console.log('Rendering entry:', entry);
          return renderEntryCard(entry);
        })}
      </FocusModeContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Fade in timeout={800}>
        <Box 
          sx={{ 
            mb: 3,
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography 
            variant="h4" 
            component="h1"
            sx={{
              fontWeight: 'bold',
              color: theme.palette.primary.main,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -4,
                left: 0,
                width: '40%',
                height: 2,
                bgcolor: theme.palette.primary.main,
                borderRadius: 1,
              },
            }}
          >
            Staff Communication Book
          </Typography>
          <Stack direction="row" spacing={2}>
            {!focusMode && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setShowAddDialog(true)}
                disabled={contextLoading}
                sx={{
                  transition: 'all 0.2s ease',
                }}
              >
                New Entry
              </Button>
            )}
          </Stack>
        </Box>
      </Fade>

      {renderAIToolbar()}
      {renderWeekSummary()}

      {error && (
        <Zoom in>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              animation: 'slide-in 0.3s ease-out',
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </Zoom>
      )}

      {!focusMode && renderFilters()}
      {renderContent()}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            minWidth: 120,
            borderRadius: 2,
            '& .MuiMenuItem-root': {
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
            },
          },
        }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem 
          onClick={() => setShowDeleteDialog(true)} 
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <CommunicationEntryDialog
        open={showAddDialog}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        entry={editEntry}
        mode={editEntry ? 'edit' : 'create'}
      />

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Delete Entry</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete this entry?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setShowDeleteDialog(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            sx={{
              transition: 'all 0.2s ease',
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <style>
        {`
          @keyframes slide-in {
            from {
              transform: translateY(-20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes checkmark-pop {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            70% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .completion-animation {
            animation: completion-pulse 1s ease-out;
          }

          @keyframes completion-pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
            }
            50% {
              transform: scale(1.02);
              box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default CommunicationBook;
