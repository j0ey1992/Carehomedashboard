import React from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Tooltip,
  Zoom,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useGamification } from '../../contexts/GamificationContext';
import { format } from 'date-fns';

const PointsHistory: React.FC = () => {
  const { userStats } = useGamification();

  if (!userStats) return null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Points History
      </Typography>
      <List>
        {userStats.history.slice().reverse().map((entry, index) => (
          <ListItem
            key={index}
            divider={index !== userStats.history.length - 1}
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  {entry.points > 0 ? (
                    <TrendingUpIcon color="success" />
                  ) : (
                    <TrendingDownIcon color="error" />
                  )}
                  <Typography variant="body1">
                    {entry.description}
                  </Typography>
                  <Tooltip 
                    title={format(entry.timestamp.toDate(), 'PPp')}
                    TransitionComponent={Zoom}
                  >
                    <Chip
                      label={`${entry.points > 0 ? '+' : ''}${entry.points}`}
                      size="small"
                      color={entry.points > 0 ? 'success' : 'error'}
                      sx={{
                        ml: 'auto',
                        minWidth: 60,
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                        },
                      }}
                    />
                  </Tooltip>
                </Box>
              }
              secondary={format(entry.timestamp.toDate(), 'PPp')}
            />
          </ListItem>
        ))}
        {userStats.history.length === 0 && (
          <ListItem>
            <ListItemText
              primary="No points history yet"
              secondary="Complete training activities to earn points!"
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default PointsHistory;
