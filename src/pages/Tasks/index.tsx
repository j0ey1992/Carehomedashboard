import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Zoom,
  Fade,
  Tooltip,
  Badge,
  Stack,
  Menu,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Assignment as TaskIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { Task } from '../../types';
import PageHeader from '../../components/Common/PageHeader';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { alpha, useTheme } from '@mui/material/styles';

const TasksPage = () => {
  const theme = useTheme();
  const { currentUser, userData } = useAuth();
  const { tasks, loading, error, addTask, updateTask, deleteTask } = useTask();
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as Task['priority'],
    category: 'general' as Task['category'],
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snoozeTaskId, setSnoozeTaskId] = useState<string | null>(null);

  const [showAllOverdue, setShowAllOverdue] = useState(false);
  const [showAllToday, setShowAllToday] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // Filter tasks to show only those assigned to the current user
  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter(task => task.assignedTo === currentUser.uid);
  }, [tasks, currentUser]);

  // Calculate achievements based on filtered tasks
  const achievements = useMemo(() => {
    const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
    const totalTasks = filteredTasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const noOverdueTasks = filteredTasks.every(task => 
      task.status === 'completed' || new Date(task.dueDate) > new Date()
    );

    return {
      perfectScore: completionRate === 100,
      allOnTime: noOverdueTasks,
      hasCompletions: completedTasks > 0,
      totalAchievements: [completionRate === 100, noOverdueTasks, completedTasks > 0].filter(Boolean).length,
    };
  }, [filteredTasks]);

  // Group filtered tasks
  const groupedTasks = useMemo(() => {
    const today = new Date();
    const overdue: Task[] = [];
    const todayTasks: Task[] = [];
    const upcoming: Task[] = [];

    filteredTasks.forEach(task => {
      const dueDate = new Date(task.dueDate);
      if (task.status !== 'completed') {
        if (dueDate < today && dueDate.toDateString() !== today.toDateString()) {
          overdue.push(task);
        } else if (dueDate.toDateString() === today.toDateString()) {
          todayTasks.push(task);
        } else {
          upcoming.push(task);
        }
      }
    });

    return { overdue, todayTasks, upcoming };
  }, [filteredTasks]);

  const renderAchievements = () => (
    <Fade in timeout={1000}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Tooltip title="All Tasks Completed" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.perfectScore ? '✓' : ''}
            color="success"
          >
            <CheckCircleIcon 
              color={achievements.perfectScore ? 'success' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="No Overdue Tasks" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.allOnTime ? '✓' : ''}
            color="success"
          >
            <TaskIcon 
              color={achievements.allOnTime ? 'primary' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="Active Task Manager" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.hasCompletions ? '✓' : ''}
            color="success"
          >
            <StarIcon 
              color={achievements.hasCompletions ? 'info' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        {achievements.perfectScore && achievements.allOnTime && (
          <Tooltip title="Perfect Task Management!" TransitionComponent={Zoom}>
            <TrophyIcon 
              color="primary" 
              sx={{ 
                fontSize: 40,
                animation: 'bounce 1s infinite',
              }} 
            />
          </Tooltip>
        )}
      </Box>
    </Fade>
  );

  const handleOpen = (task?: Task) => {
    if (task) {
      // Only allow editing if the task is assigned to the current user
      if (task.assignedTo === currentUser?.uid) {
        setEditingTask(task);
        setFormData({
          title: task.title,
          description: task.description,
          dueDate: new Date(task.dueDate).toISOString().split('T')[0],
          priority: task.priority,
          category: task.category,
        });
        setOpen(true);
      }
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        category: 'general',
      });
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title,
      description: formData.description,
      dueDate: new Date(formData.dueDate),
      priority: formData.priority,
      status: editingTask?.status || 'pending',
      assignedTo: currentUser.uid, // Always assign to current user
      category: formData.category,
      completedAt: editingTask?.completedAt,
    };

    try {
      if (editingTask) {
        // Only allow updating if the task is assigned to the current user
        if (editingTask.assignedTo === currentUser.uid) {
          await updateTask(editingTask.id, taskData);
        }
      } else {
        await addTask(taskData);
      }
      handleClose();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleStatusToggle = async (task: Task) => {
    // Only allow toggling if the task is assigned to the current user
    if (task.assignedTo !== currentUser?.uid) return;

    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await updateTask(task.id, { 
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date() : undefined,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleSnoozeClick = (event: React.MouseEvent<HTMLElement>, taskId: string) => {
    // Only allow snoozing if the task is assigned to the current user
    const task = tasks.find(t => t.id === taskId);
    if (task?.assignedTo === currentUser?.uid) {
      setAnchorEl(event.currentTarget);
      setSnoozeTaskId(taskId);
    }
  };

  const handleSnoozeClose = () => {
    setAnchorEl(null);
    setSnoozeTaskId(null);
  };

  const handleSnoozeDuration = async (duration: number) => {
    if (!snoozeTaskId || !currentUser) return;

    const task = tasks.find(t => t.id === snoozeTaskId);
    if (!task || task.assignedTo !== currentUser.uid) return;

    try {
      const newDueDate = new Date(task.dueDate);
      newDueDate.setDate(newDueDate.getDate() + duration);
      await updateTask(snoozeTaskId, {
        dueDate: newDueDate,
      });
      handleSnoozeClose();
    } catch (error) {
      console.error('Error snoozing task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Only allow deleting if the task is assigned to the current user
    const task = tasks.find(t => t.id === taskId);
    if (task?.assignedTo === currentUser?.uid) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getPriorityColor = (priority: Task['priority']): 'error' | 'warning' | 'success' | 'default' => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const renderTaskCard = (task: Task) => (
    <Grid item xs={12} sm={6} md={4} key={task.id}>
      <Zoom in timeout={300}>
        <Card
          sx={{ 
            height: '100%',
            transition: 'all 0.3s ease',
            transform: hoveredCard === task.id ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
            boxShadow: hoveredCard === task.id ? 4 : 1,
            bgcolor: task.status === 'completed' ? alpha(theme.palette.success.main, 0.1) : 'background.paper',
          }}
          onMouseEnter={() => setHoveredCard(task.id)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <CardContent>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h6">
                  {task.title}
                </Typography>
                <Box>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpen(task)}
                    sx={{
                      transition: 'transform 0.3s ease',
                      transform: hoveredCard === task.id ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteTask(task.id)}
                    sx={{
                      transition: 'transform 0.3s ease',
                      transform: hoveredCard === task.id ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              <Typography color="textSecondary">
                {task.description}
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Chip
                    label={task.priority}
                    color={getPriorityColor(task.priority)}
                    size="small"
                    sx={{ 
                      mr: 1,
                      transition: 'transform 0.3s ease',
                      transform: hoveredCard === task.id ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                  <Chip
                    label={task.category}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      transition: 'transform 0.3s ease',
                      transform: hoveredCard === task.id ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Due: {format(task.dueDate, 'MMM d, yyyy')}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  color={task.status === 'completed' ? 'success' : 'primary'}
                  size="small"
                  onClick={() => handleStatusToggle(task)}
                  fullWidth
                  sx={{
                    transition: 'all 0.3s ease',
                    transform: hoveredCard === task.id ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {task.status === 'completed' ? 'Completed' : 'Mark Complete'}
                </Button>
                {task.status !== 'completed' && (
                  <Button
                    variant="text"
                    color="secondary"
                    size="small"
                    onClick={(e) => handleSnoozeClick(e, task.id)}
                    sx={{
                      transition: 'all 0.3s ease',
                      transform: hoveredCard === task.id ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    Snooze
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Zoom>
    </Grid>
  );

  if (loading) return <LoadingScreen />;
  if (error) return <Typography color="error">{error.message}</Typography>;

  return (
    <Box p={3}>
      <Fade in timeout={800}>
        <Box>
          <PageHeader
            title="My Tasks"
            actions={[
              {
                label: 'Add Task',
                onClick: () => handleOpen(),
                icon: <AddIcon />,
                color: 'primary',
                variant: 'contained',
              },
            ]}
          />

          {renderAchievements()}

          {groupedTasks.overdue.length > 0 && (
            <Box mb={2}>
              <Typography variant="h5" gutterBottom>
                Overdue Tasks
              </Typography>
              <Grid container spacing={3}>
                {(showAllOverdue ? groupedTasks.overdue : groupedTasks.overdue.slice(0, 5)).map(renderTaskCard)}
              </Grid>
              {groupedTasks.overdue.length > 5 && (
                <Button onClick={() => setShowAllOverdue(prev => !prev)}>
                  {showAllOverdue ? 'Show Less' : 'Show All Overdue Tasks'}
                </Button>
              )}
            </Box>
          )}

          {groupedTasks.todayTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="h5" gutterBottom>
                Today's Tasks
              </Typography>
              <Grid container spacing={3}>
                {(showAllToday ? groupedTasks.todayTasks : groupedTasks.todayTasks.slice(0, 5)).map(renderTaskCard)}
              </Grid>
              {groupedTasks.todayTasks.length > 5 && (
                <Button onClick={() => setShowAllToday(prev => !prev)}>
                  {showAllToday ? 'Show Less' : "Show All Today's Tasks"}
                </Button>
              )}
            </Box>
          )}

          {groupedTasks.upcoming.length > 0 && (
            <Box mb={2}>
              <Typography variant="h5" gutterBottom>
                Upcoming Tasks
              </Typography>
              <Grid container spacing={3}>
                {(showAllUpcoming ? groupedTasks.upcoming : groupedTasks.upcoming.slice(0, 5)).map(renderTaskCard)}
              </Grid>
              {groupedTasks.upcoming.length > 5 && (
                <Button onClick={() => setShowAllUpcoming(prev => !prev)}>
                  {showAllUpcoming ? 'Show Less' : 'Show All Upcoming Tasks'}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Fade>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  fullWidth
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Task['category'] })}
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="training">Training</MenuItem>
                    <MenuItem value="supervision">Supervision</MenuItem>
                    <MenuItem value="dols">DoLS</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleSnoozeClose}
      >
        <MenuItem onClick={() => handleSnoozeDuration(1)}>Snooze for 1 day</MenuItem>
        <MenuItem onClick={() => handleSnoozeDuration(7)}>Snooze for 1 week</MenuItem>
      </Menu>

      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </Box>
  );
};

export default TasksPage;
