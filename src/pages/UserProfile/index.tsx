import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/dateUtils';

const UserProfile = () => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!currentUser) {
    return null;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    mb: 2,
                    bgcolor: 'primary.main',
                  }}
                >
                  {currentUser.email?.charAt(0).toUpperCase() || <PersonIcon />}
                </Avatar>
                <Typography variant="h6">{currentUser.displayName || 'User'}</Typography>
                <Typography color="textSecondary">{currentUser.email}</Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Email"
                    secondary={currentUser.email}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Account Created"
                    secondary={currentUser.metadata.creationTime ? formatDateTime(currentUser.metadata.creationTime) : 'N/A'}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Last Sign In"
                    secondary={currentUser.metadata.lastSignInTime ? formatDateTime(currentUser.metadata.lastSignInTime) : 'N/A'}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Email Verified"
                    secondary={currentUser.emailVerified ? 'Yes' : 'No'}
                  />
                </ListItem>
              </List>

              {!currentUser.emailVerified && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  // TODO: Implement email verification
                  onClick={() => {}}
                >
                  Verify Email
                </Button>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                sx={{ mb: 2 }}
                // TODO: Implement password change
                onClick={() => {}}
              >
                Change Password
              </Button>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                // TODO: Implement account deletion
                onClick={() => {}}
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserProfile;
