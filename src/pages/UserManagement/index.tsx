import React, { useState } from 'react';
import { Box } from '@mui/system';
import {
  IconButton,
  Alert,
  AlertTitle,
  Chip,
  Typography,
  Tooltip,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Mail as MailIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../contexts/UserContext';
import DataTable, { DataTableColumn } from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import { UserDialog } from '../../components/User/UserDialog';
import { MessageDialog } from '../../components/User/MessageDialog';
import { User, ActionButton } from '../../types';
import { THEME } from '../../theme/colors';

interface Message {
  subject: string;
  body: string;
}

const UserManagement: React.FC = () => {
  const { isAdmin, isSiteManager, userData } = useAuth();
  const { users, updateUser, createUser } = useUsers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEditUser = (userId: string) => {
    setEditingUser(userId);
    setDialogOpen(true);
  };

  const handleAddUser = () => {
    setEditingUser(undefined);
    setDialogOpen(true);
  };

  const handleMessageUser = (userId: string) => {
    setEditingUser(userId);
    setMessageDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setIsLoading(true);
      try {
        // TODO: Implement user deletion
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderActions = (row: User) => {
    // Only allow editing if user is admin, or if manager and user belongs to their site
    const canEdit = isAdmin || (isSiteManager && row.sites.some(site => userData?.sites.includes(site)));
    
    return (
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {canEdit && (
          <Tooltip title="Edit User">
            <IconButton 
              onClick={() => handleEditUser(row.id)} 
              size="small"
              sx={{
                color: THEME.info,
                '&:hover': {
                  bgcolor: `${THEME.info}15`,
                },
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Tooltip title="Send Message">
          <IconButton 
            onClick={() => handleMessageUser(row.id)} 
            size="small"
            sx={{
              color: THEME.success,
              '&:hover': {
                bgcolor: `${THEME.success}15`,
              },
            }}
          >
            <MailIcon />
          </IconButton>
        </Tooltip>
        
        {isAdmin && (
          <Tooltip title="Delete User">
            <IconButton
              onClick={() => handleDeleteUser(row.id)}
              size="small"
              sx={{
                color: THEME.error,
                '&:hover': {
                  bgcolor: `${THEME.error}15`,
                },
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  const columns: DataTableColumn<User>[] = [
    {
      id: 'name',
      label: 'Name',
      minWidth: 170,
      format: (value: string) => (
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 500,
            color: 'primary.main',
          }}
        >
          {value}
        </Typography>
      ),
    },
    {
      id: 'email',
      label: 'Email',
      minWidth: 170,
      format: (value: string) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <EmailIcon fontSize="small" />
          {value}
        </Typography>
      ),
    },
    {
      id: 'phoneNumber',
      label: 'Mobile',
      minWidth: 130,
      format: (value: string | undefined) => (
        <Typography 
          variant="body2" 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <PhoneIcon fontSize="small" />
          {value || 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'role',
      label: 'Role',
      minWidth: 100,
      format: (value: 'admin' | 'staff' | 'manager') => {
        const roleColors = {
          admin: THEME.error,
          manager: THEME.warning,
          staff: THEME.info,
        };
        return (
          <Chip
            label={value.charAt(0).toUpperCase() + value.slice(1)}
            size="small"
            sx={{
              bgcolor: `${roleColors[value]}15`,
              color: roleColors[value],
              fontWeight: 500,
            }}
          />
        );
      },
    },
    {
      id: 'sites',
      label: 'Sites',
      minWidth: 130,
      format: (value: string[]) => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {value.map((site) => (
            <Chip
              key={site}
              label={site}
              size="small"
              icon={<BusinessIcon />}
              sx={{ 
                bgcolor: `${THEME.info}15`,
                color: THEME.info,
                fontWeight: 500,
              }}
            />
          ))}
        </Box>
      ),
    },
    {
      id: 'notificationPreferences',
      label: 'Notifications',
      minWidth: 130,
      format: (value: { email: boolean; sms: boolean }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {value?.email && (
            <Tooltip title="Email Notifications Enabled">
              <Chip
                label="Email"
                size="small"
                icon={<EmailIcon />}
                sx={{ 
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                  color: THEME.info,
                  fontWeight: 500,
                }}
              />
            </Tooltip>
          )}
          {value?.sms && (
            <Tooltip title="SMS Notifications Enabled">
              <Chip
                label="SMS"
                size="small"
                icon={<PhoneIcon />}
                sx={{ 
                  bgcolor: 'rgba(216, 27, 96, 0.1)',
                  color: THEME.error,
                  fontWeight: 500,
                }}
              />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 130,
      align: 'right',
      format: (value: any, row?: User) => row ? renderActions(row) : null,
    },
  ];

  const headerActions: ActionButton[] = (isAdmin || isSiteManager)
    ? [
        {
          label: 'Add User',
          onClick: handleAddUser,
          icon: <AddIcon />,
          color: 'primary',
          variant: 'contained',
        },
      ]
    : [];

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="User Management"
        subtitle="Manage user accounts and permissions"
        helpText="Add, edit, or remove users from the system. Admins can manage all users, while managers can only manage users in their assigned sites."
        actions={headerActions}
        breadcrumbs={[{ label: 'User Management' }]}
      />

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
        >
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper 
        elevation={2}
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          '& .MuiTableRow-root': {
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.02)',
            },
          },
          '& .MuiTableCell-root': {
            borderColor: 'rgba(0,0,0,0.06)',
          },
        }}
      >
        <DataTable<User>
          columns={columns}
          data={users}
        />
      </Paper>

      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={editingUser}
        onSave={async (userData: Partial<User>) => {
          setIsLoading(true);
          try {
            if (editingUser) {
              await updateUser(editingUser, userData);
            } else {
              await createUser(userData as Omit<User, 'id'>);
            }
            setDialogOpen(false);
            setError(null);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setIsLoading(false);
          }
        }}
      />

      <MessageDialog
        open={messageDialogOpen}
        onClose={() => setMessageDialogOpen(false)}
        userId={editingUser}
        onSend={async (message: Message) => {
          setIsLoading(true);
          try {
            // TODO: Implement message sending
            console.log('Sending message:', message);
            setMessageDialogOpen(false);
            setError(null);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setIsLoading(false);
          }
        }}
      />
    </Box>
  );
};

export default UserManagement;
