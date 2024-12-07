import React from 'react';
import { Box, Typography, Tooltip, Badge } from '@mui/material';
import { useGamification } from '../../contexts/GamificationContext';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';

const PointsBadge: React.FC = () => {
  const { userStats, getRankInfo } = useGamification();

  if (!userStats) return null;

  const rank = getRankInfo(userStats.points);

  return (
    <Tooltip 
      title={`${rank.title} - ${userStats.points} points`}
      arrow
    >
      <Badge
        badgeContent={rank.badge}
        overlap="circular"
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'background.paper',
            borderRadius: 2,
            px: 2,
            py: 1,
            boxShadow: 1,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 3,
            },
          }}
        >
          <TrophyIcon color="primary" />
          <Typography variant="body2" fontWeight="bold">
            {userStats.points} pts
          </Typography>
        </Box>
      </Badge>
    </Tooltip>
  );
};

export default PointsBadge;
