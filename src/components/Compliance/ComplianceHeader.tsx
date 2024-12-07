import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Grid,
  Stack,
  Tooltip,
  IconButton,
  alpha,
  Zoom,
  Fade,
} from '@mui/material';
import {
  CheckCircle as ValidIcon,
  Warning as PendingIcon,
  Error as ExpiredIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { THEME } from '../../theme/colors';

interface ComplianceStats {
  upToDate: number;
  total: number;
  completionRate: number;
  expired: number;
  pending: number;
}

interface ComplianceHeaderProps {
  stats: ComplianceStats;
  userRole?: string;
  onExport?: () => void;
}

const StatCard = ({ 
  title, 
  value, 
  total, 
  icon, 
  color,
  helpText,
  index,
}: { 
  title: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
  helpText: string;
  index: number;
}) => {
  const theme = useTheme();
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <Zoom in style={{ transitionDelay: `${index * 100}ms` }}>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          height: '100%',
          bgcolor: alpha(color, 0.05),
          border: `1px solid ${alpha(color, 0.2)}`,
          borderRadius: 2,
          transition: 'all 0.3s ease-in-out',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
            bgcolor: alpha(color, 0.1),
          },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {title}
            </Typography>
            <Box sx={{ 
              color,
              animation: 'pulse 2s infinite',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              {icon}
              {percentage >= 90 && <TrendingUpIcon fontSize="small" />}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 600, 
              color,
              transition: 'all 0.3s ease-in-out',
            }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              / {total}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              flexGrow: 1, 
              bgcolor: alpha(color, 0.1), 
              borderRadius: 1, 
              height: 6,
              overflow: 'hidden',
            }}>
              <Box
                sx={{
                  width: `${percentage}%`,
                  bgcolor: color,
                  height: '100%',
                  borderRadius: 1,
                  transition: 'width 1s ease-in-out',
                  animation: 'shimmer 2s infinite',
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ 
              color: theme.palette.text.secondary,
              minWidth: '40px',
              textAlign: 'right',
            }}>
              {Math.round(percentage)}%
            </Typography>
          </Box>

          <Tooltip 
            title={helpText} 
            placement="bottom" 
            arrow
            TransitionComponent={Zoom}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                color: color,
              },
            }}>
              <InfoIcon sx={{ fontSize: 16, color: 'inherit' }} />
              <Typography variant="caption" sx={{ color: 'inherit' }}>
                More Info
              </Typography>
            </Box>
          </Tooltip>
        </Stack>

        {/* Background effect */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at top right, ${alpha(color, 0.2)} 0%, transparent 70%)`,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
      </Paper>
    </Zoom>
  );
};

const ComplianceHeader: React.FC<ComplianceHeaderProps> = ({ stats, userRole, onExport }) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 4 }}>
      <Fade in timeout={800}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 600,
            background: `linear-gradient(45deg, ${theme.palette.text.primary} 30%, ${alpha(theme.palette.text.primary, 0.7)} 90%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {userRole === 'admin' ? 'Staff Records' : 
             userRole === 'manager' ? 'Site Staff Records' :
             'My Records'}
          </Typography>
          {(userRole === 'admin' || userRole === 'manager') && onExport && (
            <Tooltip title="Export compliance records" arrow>
              <IconButton 
                onClick={onExport}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    color: theme.palette.primary.main,
                  },
                }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Fade>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Valid Records"
            value={stats.upToDate}
            total={stats.total}
            icon={<ValidIcon />}
            color={THEME.success}
            helpText="Staff members with all compliance records up to date"
            index={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Records"
            value={stats.pending}
            total={stats.total}
            icon={<PendingIcon />}
            color={THEME.warning}
            helpText="Staff members with pending compliance tasks"
            index={1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Expired Records"
            value={stats.expired}
            total={stats.total}
            icon={<ExpiredIcon />}
            color={THEME.error}
            helpText="Staff members with expired compliance records"
            index={2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Zoom in style={{ transitionDelay: '300ms' }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                height: '100%',
                bgcolor: alpha(THEME.info, 0.05),
                border: `1px solid ${alpha(THEME.info, 0.2)}`,
                borderRadius: 2,
                transition: 'all 0.3s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  bgcolor: alpha(THEME.info, 0.1),
                },
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={stats.completionRate}
                    size={80}
                    thickness={8}
                    sx={{
                      color: stats.completionRate === 100 ? THEME.success :
                             stats.completionRate >= 80 ? THEME.info :
                             stats.completionRate >= 60 ? THEME.warning : THEME.error,
                      transition: 'all 0.3s ease-in-out',
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600,
                      color: stats.completionRate === 100 ? THEME.success :
                             stats.completionRate >= 80 ? THEME.info :
                             stats.completionRate >= 60 ? THEME.warning : THEME.error,
                    }}>
                      {Math.round(stats.completionRate)}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, textAlign: 'center' }}>
                  Overall Compliance Rate
                </Typography>
              </Stack>

              {/* Background effect */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `radial-gradient(circle at top right, ${alpha(THEME.info, 0.2)} 0%, transparent 70%)`,
                  opacity: 0.5,
                  pointerEvents: 'none',
                }}
              />
            </Paper>
          </Zoom>
        </Grid>
      </Grid>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes shimmer {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default ComplianceHeader;
