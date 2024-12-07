import React from 'react';
import {
  Box,
  Badge,
  Tooltip,
  Fade,
  Zoom,
  Typography,
  LinearProgress,
  Paper,
  Stack,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Assignment as ComplianceIcon,
} from '@mui/icons-material';
import { THEME } from '../../theme/colors';

interface ComplianceAchievements {
  perfectScore: boolean;
  achiever: boolean;
  noExpired: boolean;
  totalAchievements: number;
}

interface ComplianceAchievementsProps {
  achievements: ComplianceAchievements;
}

const AchievementBadge: React.FC<{
  title: string;
  icon: React.ReactNode;
  achieved: boolean;
  color: string;
}> = ({ title, icon, achieved, color }) => (
  <Tooltip 
    title={title} 
    TransitionComponent={Zoom}
    placement="top"
    arrow
  >
    <Paper
      elevation={achieved ? 3 : 1}
      sx={{ 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        bgcolor: achieved ? alpha(color, 0.1) : 'background.paper',
        borderRadius: 2,
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          transform: achieved ? 'scale(1.05)' : 'none',
          boxShadow: achieved ? 6 : 1,
        },
        position: 'relative',
        overflow: 'hidden',
        minWidth: 100,
      }}
    >
      <Badge 
        badgeContent={achieved ? '✓' : ''} 
        color="success"
        sx={{
          '& .MuiBadge-badge': {
            animation: achieved ? 'bounce 0.5s ease-in-out' : 'none',
          },
        }}
      >
        {React.cloneElement(icon as React.ReactElement, { 
          color: achieved ? 'inherit' : 'disabled',
          sx: { 
            fontSize: 48,
            color: achieved ? color : 'disabled',
            transition: 'all 0.3s ease-in-out',
          }
        })}
      </Badge>
      <Typography 
        variant="caption" 
        sx={{ 
          fontWeight: achieved ? 600 : 400,
          color: achieved ? color : 'text.secondary',
          textAlign: 'center',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {title}
      </Typography>
      {achieved && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at center, ${alpha(color, 0.2)} 0%, transparent 70%)`,
            opacity: 0.5,
            animation: 'pulse 2s infinite',
          }}
        />
      )}
    </Paper>
  </Tooltip>
);

const ComplianceAchievements: React.FC<ComplianceAchievementsProps> = ({ achievements }) => {
  const progress = (achievements.totalAchievements / 3) * 100;

  return (
    <Fade in timeout={1000}>
      <Box>
        <Paper 
          sx={{ 
            mb: 4, 
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 2,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Compliance Achievements
              </Typography>
              {achievements.totalAchievements === 3 && (
                <Tooltip title="Compliance Champion!" TransitionComponent={Zoom} arrow>
                  <TrophyIcon 
                    sx={{ 
                      fontSize: 32, 
                      color: THEME.success,
                      animation: 'bounce 1s infinite',
                    }} 
                  />
                </Tooltip>
              )}
            </Box>

            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <AchievementBadge
                title="All Records Compliant"
                icon={<CheckCircleIcon />}
                achieved={achievements.perfectScore}
                color={THEME.success}
              />
              <AchievementBadge
                title="High Completion Rate"
                icon={<ComplianceIcon />}
                achieved={achievements.achiever}
                color={THEME.info}
              />
              <AchievementBadge
                title="No Expired Records"
                icon={<StarIcon />}
                achieved={achievements.noExpired}
                color={THEME.warning}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {achievements.totalAchievements}/3 Achievements
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(THEME.info, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: progress === 100 ? THEME.success : THEME.info,
                    transition: 'all 0.3s ease-in-out',
                  },
                }}
              />
            </Box>
          </Stack>

          {/* Background effect for visual interest */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at top right, ${alpha(THEME.info, 0.1)} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        </Paper>

        <style>
          {`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
            @keyframes pulse {
              0% { opacity: 0.5; }
              50% { opacity: 0.3; }
              100% { opacity: 0.5; }
            }
          `}
        </style>
      </Box>
    </Fade>
  );
};

export default ComplianceAchievements;
