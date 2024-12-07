import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
  Button,
  useTheme,
  alpha,
  Stack
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TrainingIcon from '@mui/icons-material/School';
import SupervisionIcon from '@mui/icons-material/SupervisorAccount';
import TaskIcon from '@mui/icons-material/Assignment';
import SystemIcon from '@mui/icons-material/Settings';
import MessageIcon from '@mui/icons-material/Message';
import CourseIcon from '@mui/icons-material/Book';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../../types';

const NotificationMenu: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const unreadNotifications = notifications.filter(n => !n.read);
  const hasUnread = unreadNotifications.length > 0;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    handleClose();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'training':
        return <TrainingIcon />;
      case 'supervision':
        return <SupervisionIcon />;
      case 'task':
        return <TaskIcon />;
      case 'system':
        return <SystemIcon />;
      case 'course':
        return <CourseIcon />;
      case 'message':
        return <MessageIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'training':
        return theme.palette.info.main;
      case 'supervision':
        return theme.palette.warning.main;
      case 'task':
        return theme.palette.success.main;
      case 'system':
        return theme.palette.error.main;
      case 'course':
        return theme.palette.primary.main;
      case 'message':
        return theme.palette.secondary.main;
      default:
        return theme.palette.text.primary;
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1)
          }
        }}
      >
        <Badge 
          badgeContent={unreadNotifications.length} 
          color="error"
          variant="dot"
          invisible={!hasUnread}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            overflow: 'auto'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Stack spacing={0}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ p: 2 }}
          >
            <Typography variant="h6" component="div">Notifications</Typography>
            {hasUnread && (
              <Button
                startIcon={<DoneAllIcon />}
                onClick={() => {
                  markAllAsRead();
                  handleClose();
                }}
                size="small"
              >
                Mark all as read
              </Button>
            )}
          </Stack>

          <Divider />

          {notifications.length === 0 ? (
            <Typography color="textSecondary" align="center" sx={{ p: 2 }}>
              No notifications
            </Typography>
          ) : (
            notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                {index > 0 && <Divider />}
                <MenuItem
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    bgcolor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.05)
                  }}
                >
                  <ListItemIcon sx={{ color: getNotificationColor(notification.type) }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <Stack spacing={0.5} component="span">
                        <Typography variant="body2" color="textSecondary" component="span">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" component="span">
                          {formatDistanceToNow(
                            notification.timestamp instanceof Date 
                              ? notification.timestamp 
                              : notification.timestamp.toDate(), 
                            { addSuffix: true }
                          )}
                        </Typography>
                      </Stack>
                    }
                    primaryTypographyProps={{
                      variant: 'subtitle2',
                      color: notification.read ? 'textPrimary' : 'primary'
                    }}
                  />
                </MenuItem>
              </React.Fragment>
            ))
          )}
        </Stack>
      </Menu>
    </>
  );
};

export default NotificationMenu;
