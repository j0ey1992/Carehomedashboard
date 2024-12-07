import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useSupervision } from '../../contexts/SupervisionContext';
import NotificationMenu from '../Notifications/NotificationMenu';
import { alpha } from '@mui/material/styles';

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

  const { userData, isAdmin, logout } = useAuth();
  const { stats } = useData();
  const { stats: supervisionStats } = useSupervision();
  const navigate = useNavigate();
  const location = useLocation();

  // Menu positioning
  const transformOrigin: PopoverOrigin = {
    vertical: 'top',
    horizontal: 'right',
  };

  const anchorOrigin: PopoverOrigin = {
    vertical: 'bottom',
    horizontal: 'right',
  };

  // Updated menuItems with staff/admin specific items
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
      description: 'Get help with SMART goals, Headway standards, and care practices',
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
      description: 'Import existing rotas from external sources',
      section: 'Staff',
      adminOnly: true,
    },
    { 
      path: '/training', 
      label: 'Training', 
      icon: <TrainingIcon />,
      badge: stats.expiredTraining + stats.expiringTraining,
      description: isAdmin ? 'Manage staff training records' : 'View your training records',
      section: 'Training',
    },
    { 
      path: '/f2f', 
      label: 'Face-to-Face', 
      icon: <EventIcon />,
      description: isAdmin ? 'Schedule face-to-face training sessions' : 'View your F2F training sessions',
      section: 'Training',
    },
    { 
      path: '/tasks', 
      label: 'Tasks', 
      icon: <TasksIcon />,
      badge: stats.pendingTasks,
      description: isAdmin ? 'Manage all tasks' : 'View your assigned tasks',
      section: 'Tasks',
    },
    { 
      path: '/compliance', 
      label: 'Staff Compliance', 
      icon: <ComplianceIcon />,
      description: isAdmin ? 'Manage staff compliance records' : 'View your compliance status',
      section: 'Compliance',
    },
    { 
      path: '/sickness', 
      label: 'Sickness', 
      icon: <SickIcon />,
      description: isAdmin ? 'Manage staff sickness records' : 'View your sickness records',
      section: 'Compliance',
    },
    { 
      path: '/leave', 
      label: 'Leave', 
      icon: <LeaveIcon />,
      description: isAdmin ? 'Manage staff leave requests' : 'Request and manage your leave',
      section: 'Compliance',
    },
    {
      path: '/communication-book',
      label: 'Communication Book',
      icon: <BookIcon />,
      description: 'Staff communication log and updates',
      section: 'Communication',
    },
    // Admin only items
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
      description: 'Manage DoLS applications and records',
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
      description: 'Send mass messages and shift notifications',
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) => {
    if (isAdmin) return !item.staffOnly; // Admins see everything except staff-only items
    return !item.adminOnly; // Staff only see non-admin items
  });

  // Group menu items by their 'section' property
  const sections = filteredMenuItems.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  const drawer = (
    <Box>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" noWrap component="div" gutterBottom>
          Care Home
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 2 }}>
        {Object.entries(sections).map(([sectionName, items]) => (
          <Box key={sectionName}>
            <Typography
              variant="subtitle2"
              sx={{ mt: 2, mb: 1, color: 'text.secondary', textTransform: 'uppercase', fontWeight: 'bold' }}
            >
              {sectionName}
            </Typography>
            {items.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.2),
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
                    secondary={item.description}
                    primaryTypographyProps={{
                      fontWeight: location.pathname === item.path ? 600 : 400,
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: { opacity: 0.7 },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider sx={{ mt: 2 }} />
          </Box>
        ))}
      </List>
    </Box>
  );

  const userInitial = userData?.name ? userData.name.charAt(0).toUpperCase() : '?';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <NotificationMenu />

          <Tooltip title={userData?.name || 'Profile'}>
            <IconButton
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{
                ml: 1,
                bgcolor: theme.palette.mode === 'light' ? 'grey.100' : 'grey.800',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'light' ? 'grey.200' : 'grey.700',
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
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
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

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
            },
          },
        }}
        transformOrigin={transformOrigin}
        anchorOrigin={anchorOrigin}
      >
        <MuiMenuItem onClick={() => handleNavigation('/profile')}>
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
