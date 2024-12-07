import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Tooltip,
  Zoom,
  Skeleton,
  alpha,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Celebration as CelebrationIcon,
  DirectionsRun as RunIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useLeaderboard } from '../../contexts/LeaderboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { LeaderboardEntry } from '../../types';

interface Achievement {
  supervisionStar: boolean;
  trainingStar: boolean;
  perfectAttendance: boolean;
  quickLearner: boolean;
}

const LeaderboardSection: React.FC = () => {
  const theme = useTheme();
  const { leaderboard, userRank, loading } = useLeaderboard();
  const { userData } = useAuth();

  const getAchievementIcons = (achievements: string[]) => {
    const achievementMap: Achievement = {
      supervisionStar: achievements.includes('supervisionStar'),
      trainingStar: achievements.includes('trainingStar'),
      perfectAttendance: achievements.includes('perfectAttendance'),
      quickLearner: achievements.includes('quickLearner'),
    };

    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {achievementMap.supervisionStar && (
          <Tooltip title="Supervision Star" TransitionComponent={Zoom}>
            <StarIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
          </Tooltip>
        )}
        {achievementMap.trainingStar && (
          <Tooltip title="Training Star" TransitionComponent={Zoom}>
            <SchoolIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
          </Tooltip>
        )}
        {achievementMap.perfectAttendance && (
          <Tooltip title="Perfect Attendance" TransitionComponent={Zoom}>
            <RunIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
          </Tooltip>
        )}
        {achievementMap.quickLearner && (
          <Tooltip title="Quick Learner" TransitionComponent={Zoom}>
            <CelebrationIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
          </Tooltip>
        )}
      </Box>
    );
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return theme.palette.text.secondary;
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h6">Leaderboard</Typography>
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Skeleton variant="text" width={200} />
          </Box>
        ))}
      </Paper>
    );
  }

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3,
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Leaderboard</Typography>
        {userData && (
          <Chip 
            label={`Your Rank: ${userRank || 'N/A'}`}
            color="primary"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      <List sx={{ pt: 0 }}>
        {leaderboard.map((entry: LeaderboardEntry) => {
          const isCurrentUser = userData?.id === entry.userId;
          return (
            <ListItem
              key={entry.userId}
              sx={{
                borderRadius: 1,
                mb: 1,
                bgcolor: isCurrentUser ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                '&:hover': {
                  bgcolor: isCurrentUser 
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.action.hover, 0.1),
                },
              }}
            >
              <ListItemAvatar>
                <Box sx={{ position: 'relative' }}>
                  <Avatar 
                    src={entry.photoURL}
                    sx={{ 
                      border: `2px solid ${getRankColor(entry.rank)}`,
                      bgcolor: entry.photoURL ? 'transparent' : theme.palette.primary.main,
                    }}
                  >
                    {entry.name.charAt(0)}
                  </Avatar>
                  <Typography
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: getRankColor(entry.rank),
                      color: '#fff',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: `2px solid ${theme.palette.background.paper}`,
                    }}
                  >
                    {entry.rank}
                  </Typography>
                </Box>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: isCurrentUser ? 700 : 600,
                        color: isCurrentUser ? theme.palette.primary.main : 'inherit',
                      }}
                    >
                      {entry.name}
                    </Typography>
                    {getAchievementIcons(entry.achievements)}
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="textSecondary">
                    {entry.points} points
                  </Typography>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
};

export default LeaderboardSection;
