import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Skeleton,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  CardActionArea,
  PaletteColor
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export type StatsTrend = 'up' | 'down' | 'neutral';
export type StatsColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

export interface StatsCardProps {
  title: string;
  value?: string | number;
  mainStat?: string | number;
  mainLabel?: string;
  previousValue?: string | number;
  trend?: StatsTrend;
  trendPercentage?: number;
  color?: StatsColor;
  icon?: React.ReactNode;
  tooltip?: string;
  isLoading?: boolean;
  onClick?: () => void;
  subtitle?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  severity?: StatsColor;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  mainStat,
  mainLabel,
  previousValue,
  trend = 'neutral',
  trendPercentage,
  color = 'primary',
  icon,
  tooltip,
  isLoading = false,
  onClick,
  subtitle,
  valuePrefix = '',
  valueSuffix = '',
  severity
}) => {
  const theme = useTheme();

  // Use mainStat if provided, otherwise fall back to value
  const displayValue = mainStat !== undefined ? mainStat : value;
  const displayLabel = mainLabel || subtitle;

  // Use severity for color if provided, otherwise use color prop
  const cardColor = (severity || color) as keyof typeof theme.palette;

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon sx={{ color: getTrendColor() }} />;
      case 'down':
        return <TrendingDownIcon sx={{ color: getTrendColor() }} />;
      default:
        return null;
    }
  };

  const getColorFromPalette = (colorKey: keyof typeof theme.palette) => {
    const paletteColor = theme.palette[colorKey] as PaletteColor;
    return paletteColor?.main || theme.palette.primary.main;
  };

  const cardContent = (
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography 
            variant="subtitle2" 
            color="textSecondary" 
            gutterBottom
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontWeight: 'medium'
            }}
          >
            {icon && (
              <Box 
                component="span"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: getColorFromPalette(cardColor)
                }}
              >
                {icon}
              </Box>
            )}
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            {isLoading ? (
              <Skeleton width={100} height={40} />
            ) : (
              <Typography 
                variant="h4" 
                component="div"
                sx={{ 
                  color: getColorFromPalette(cardColor),
                  fontWeight: 'bold'
                }}
              >
                {valuePrefix}{displayValue}{valueSuffix}
              </Typography>
            )}
            {getTrendIcon() && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: alpha(getTrendColor(), 0.1),
                  px: 1,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                {getTrendIcon()}
                {trendPercentage && (
                  <Typography 
                    variant="caption"
                    sx={{ 
                      color: getTrendColor(),
                      fontWeight: 'medium'
                    }}
                  >
                    {trendPercentage}%
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {displayLabel && (
            <Typography 
              variant="body2" 
              color="textSecondary"
              sx={{ mt: 1 }}
            >
              {displayLabel}
            </Typography>
          )}

          {previousValue !== undefined && (
            <Typography 
              variant="caption" 
              color="textSecondary"
              sx={{ display: 'block', mt: 1 }}
            >
              Previous: {previousValue}
            </Typography>
          )}
        </Box>

        {tooltip && (
          <Tooltip title={tooltip}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </CardContent>
  );

  const cardProps = {
    sx: { 
      height: '100%',
      bgcolor: alpha(getColorFromPalette(cardColor), 0.05),
      transition: 'all 0.3s ease',
      '&:hover': onClick ? {
        bgcolor: alpha(getColorFromPalette(cardColor), 0.1),
        transform: 'translateY(-4px)'
      } : {}
    }
  };

  return onClick ? (
    <Card {...cardProps}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        {cardContent}
      </CardActionArea>
    </Card>
  ) : (
    <Card {...cardProps}>
      {cardContent}
    </Card>
  );
};

export default StatsCard;
