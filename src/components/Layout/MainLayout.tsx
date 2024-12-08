import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem as MuiMenuItem,
  Divider,
  Badge,
  ListItemButton,
  Tooltip,
  PopoverOrigin,
  Switch,
  Stack,
  alpha,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  School as TrainingIcon,
  SupervisorAccount as SupervisionIcon,
  Gavel as DolsIcon,
  Refresh as RenewalsIcon,
  Task as TasksIcon,
  Group as UsersIcon,
  Person as ProfileIcon,
  Notifications as NotificationsIcon,
  ExitToApp as LogoutIcon,
  Event as EventIcon,
  VerifiedUser as ComplianceIcon,
  Message as MessageIcon,
  Sick as SickIcon,
  EventAvailable as LeaveIcon,
  Book as BookIcon,
  QuestionAnswer as ChatIcon,
  CalendarMonth as CalendarIcon,
  CloudUpload as ImportIcon,
  FilterList as FilterIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useSupervision } from '../../contexts/SupervisionContext';
import NotificationMenu from '../Notifications/NotificationMenu';

const drawerWidth = 280;

interface MenuItem {
  path: string;
  label: string;
  icon: JSX.Element;
  adminOnly?: boolean;
  staffOnly?: boolean;
  badge?: number;
  description: string;
  section?: string;
}

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [focusMode, setFocusMode] = useState<boolean>(false);

  const { userData, isAdmin, logout } = useAuth();
  const { stats } = useData();
  const { stats: supervisionStats } = useSupervision();
  const navigate = useNavigate();
  const location = useLocation();

  const transformOrigin: PopoverOrigin = { vertical: 'top', horizontal: 'right' };
  const anchorOrigin: PopoverOrigin = { vertical: 'bottom', horizontal: 'right' };

  const menuItems: MenuItem[] = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: <DashboardIcon />,
      description: 'Overview of all activities',
      section: 'Main',
    },
    { 
      path: '/chat', 
      label: 'AI Assistant', 
      icon: <ChatIcon />,
      description: 'Help with SMART goals and care practices',
      section: 'Main',
    },
    { 
      path: '/rota', 
      label: 'Rota', 
      icon: <CalendarIcon />,
      description: 'View and manage staff rotas',
      section: 'Staff',
    },
    { 
      path: '/rota/import', 
      label: 'Import Rota', 
      icon: <ImportIcon />,
      description: 'Import existing rotas',
      section: 'Staff',
      adminOnly: true,
    },
    { 
      path: '/training', 
      label: 'Training', 
      icon: <TrainingIcon />,
      badge: stats.expiredTraining + stats.expiringTraining,
      description: isAdmin ? 'Manage staff training records' : 'Your training records',
      section: 'Training',
    },
    { 
      path: '/f2f', 
      label: 'Face-to-Face', 
      icon: <EventIcon />,
      description: isAdmin ? 'Schedule face-to-face sessions' : 'View your sessions',
      section: 'Training',
    },
    { 
      path: '/tasks', 
      label: 'Tasks', 
      icon: <TasksIcon />,
      badge: stats.pendingTasks,
      description: isAdmin ? 'Manage all tasks' : 'Your assigned tasks',
      section: 'Tasks',
    },
    { 
      path: '/compliance', 
      label: 'Staff Compliance', 
      icon: <ComplianceIcon />,
      description: isAdmin ? 'Manage compliance' : 'View your compliance',
      section: 'Compliance',
    },
    { 
      path: '/sickness', 
      label: 'Sickness', 
      icon: <SickIcon />,
      description: isAdmin ? 'Manage sickness records' : 'Your sickness records',
      section: 'Compliance',
    },
    { 
      path: '/leave', 
      label: 'Leave', 
      icon: <LeaveIcon />,
      description: isAdmin ? 'Manage leave requests' : 'Request your leave',
      section: 'Compliance',
    },
    {
      path: '/communication-book',
      label: 'Communication Book',
      icon: <BookIcon />,
      description: 'Staff communication log',
      section: 'Communication',
    },
    { 
      path: '/supervision', 
      label: 'Supervision', 
      icon: <SupervisionIcon />,
      badge: supervisionStats.overdue + supervisionStats.scheduled,
      description: 'Track and schedule supervisions',
      section: 'Supervision',
      adminOnly: true,
    },
    { 
      path: '/dols', 
      label: 'DoLS', 
      icon: <DolsIcon />,
      description: 'Manage DoLS applications',
      section: 'Supervision',
      adminOnly: true,
    },
    { 
      path: '/renewals', 
      label: 'Renewals', 
      icon: <RenewalsIcon />,
      description: 'Track compliance renewals',
      section: 'Compliance',
      adminOnly: true,
    },
    {
      path: '/communication',
      label: 'Mass Communication',
      icon: <MessageIcon />,
      description: 'Send mass messages',
      section: 'Communication',
      adminOnly: true,
    },
    { 
      path: '/users', 
      label: 'Users', 
      icon: <UsersIcon />, 
      description: 'Manage user accounts',
      section: 'Admin',
      adminOnly: true,
    },
  ];

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter based on user role
  const filteredMenuItems = menuItems.filter((item) => {
    if (isAdmin) return !item.staffOnly; 
    return !item.adminOnly;
  });

  // In focus mode, hide less critical sections
  const focusSectionsToShow = ['Main', 'Tasks', 'Training', 'Compliance']; // Example: only show main, tasks, training, compliance
  const finalMenuItems = useMemo(() => {
    if (!focusMode) return filteredMenuItems;
    return filteredMenuItems.filter(item => focusSectionsToShow.includes(item.section || 'Other'));
  }, [focusMode, filteredMenuItems]);

  // Group by section
  const sections = finalMenuItems.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  const userInitial = userData?.name ? userData.name.charAt(0).toUpperCase() : '?';

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h5" noWrap sx={{ fontWeight: 'bold' }}>
          Care Home
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
            Focus Mode
          </Typography>
          <Switch checked={focusMode} onChange={() => setFocusMode(!focusMode)} />
        </Stack>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
        {Object.entries(sections).map(([sectionName, items]) => (
          <Box key={sectionName} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{ 
                mt: 2, 
                mb: 1, 
                color: 'text.secondary', 
                textTransform: 'uppercase', 
                fontWeight: 'bold', 
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
              }}
            >
              {sectionName}
            </Typography>
            {items.map((item) => (
              <Tooltip key={item.path} title={item.description} placement="right" arrow>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.2),
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Badge
                        badgeContent={item.badge}
                        color={item.badge && item.badge > 0 ? 'error' : 'default'}
                      >
                        {item.icon}
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: location.pathname === item.path ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.1),
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 500 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <NotificationMenu />

          <Tooltip title={userData?.name || 'Profile'}>
            <IconButton
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{
                ml: 1,
                bgcolor: 'action.hover',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Avatar
                alt={userData?.name || undefined}
                src={userData?.photoURL || undefined}
                sx={{ width: 32, height: 32 }}
              >
                {userInitial}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        PaperProps={{
          elevation: 2,
          sx: {
            mt: 1.5,
            minWidth: 180,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
            },
          },
        }}
        transformOrigin={transformOrigin}
        anchorOrigin={anchorOrigin}
      >
        <MuiMenuItem onClick={() => { navigate('/profile'); setUserMenuAnchor(null); }}>
          <ListItemIcon>
            <ProfileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Profile"
            secondary={userData?.email}
          />
        </MuiMenuItem>
        <Divider />
        <MuiMenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </MuiMenuItem>
      </Menu>
    </Box>
  );
};

export default MainLayout;
