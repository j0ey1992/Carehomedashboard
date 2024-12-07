import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Tooltip,
  Zoom,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  School as TrainingIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useGamification } from '../../contexts/GamificationContext';
import { format } from 'date-fns';

const GamificationDashboard: React.FC = () => {
  const { userStats, getRankInfo } = useGamification();

  if (!userStats) return null;

  const currentRank = getRankInfo(userStats.points);
  const nextRank = getRankInfo(userStats.points + 1);
  const pointsToNextRank = nextRank.minPoints - userStats.points;
  const progressToNextRank = ((userStats.points - currentRank.minPoints) / 
    (nextRank.minPoints - currentRank.minPoints)) * 100;

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Current Rank Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrophyIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5">
                    Current Rank: {currentRank.title}
                  </Typography>
                  <Chip 
                    label={currentRank.badge}
                    color="primary"
                    sx={{ ml: 'auto' }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Progress to next rank
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progressToNextRank}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {pointsToNextRank} points needed for {nextRank.title} {nextRank.badge}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Points Summary Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <StarIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5">
                    Points Summary
                  </Typography>
                  <Chip 
                    label={`${userStats.points} pts`}
                    color="success"
                    sx={{ ml: 'auto' }}
                  />
                </Box>

                <Stack spacing={1}>
                  {userStats.history.slice(-5).reverse().map((entry, index) => (
                    <Tooltip 
                      key={index}
                      title={format(entry.timestamp.toDate(), 'PPp')}
                      TransitionComponent={Zoom}
                    >
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'background.default',
                        }}
                      >
                        <TimelineIcon 
                          color={entry.points > 0 ? 'success' : 'error'}
                          fontSize="small"
                        />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {entry.description}
                        </Typography>
                        <Chip
                          label={`${entry.points > 0 ? '+' : ''}${entry.points}`}
                          size="small"
                          color={entry.points > 0 ? 'success' : 'error'}
                        />
                      </Box>
                    </Tooltip>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Achievements Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrainingIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5">
                    Training Achievements
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {userStats.achievements.map((achievement) => (
                    <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                {achievement.title}
                              </Typography>
                              <Typography variant="h4">
                                {achievement.icon}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {achievement.description}
                            </Typography>
                            {achievement.unlockedAt && (
                              <Typography variant="caption" color="success.main">
                                Unlocked: {format(achievement.unlockedAt, 'PPp')}
                              </Typography>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GamificationDashboard;
