import React from 'react';
import { Chip, ChipProps, Box, Tooltip, Typography } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AccessTime as PendingIcon,
  Block as BlockedIcon,
  HourglassEmpty as ExpiredIcon,
} from '@mui/icons-material';

export type StatusType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'blocked'
  | 'expired'
  | 'active'
  | 'inactive'
  | 'completed'
  | 'overdue';

interface StatusConfig {
  label: string;
  color: ChipProps['color'];
  icon: React.ReactElement;
  description?: string;
}

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'small' | 'medium';
  className?: string;
  style?: React.CSSProperties;
  customLabel?: string;
  customColor?: ChipProps['color'];
  customIcon?: React.ReactElement;
  tooltip?: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  success: {
    label: 'Success',
    color: 'success',
    icon: <SuccessIcon />,
    description: 'Operation completed successfully',
  },
  error: {
    label: 'Error',
    color: 'error',
    icon: <ErrorIcon />,
    description: 'An error occurred',
  },
  warning: {
    label: 'Warning',
    color: 'warning',
    icon: <WarningIcon />,
    description: 'Attention required',
  },
  info: {
    label: 'Info',
    color: 'info',
    icon: <InfoIcon />,
    description: 'Information available',
  },
  pending: {
    label: 'Pending',
    color: 'default',
    icon: <PendingIcon />,
    description: 'Waiting for action',
  },
  blocked: {
    label: 'Blocked',
    color: 'error',
    icon: <BlockedIcon />,
    description: 'Action is blocked',
  },
  expired: {
    label: 'Expired',
    color: 'error',
    icon: <ExpiredIcon />,
    description: 'Item has expired',
  },
  active: {
    label: 'Active',
    color: 'success',
    icon: <SuccessIcon />,
    description: 'Item is active',
  },
  inactive: {
    label: 'Inactive',
    color: 'default',
    icon: <BlockedIcon />,
    description: 'Item is inactive',
  },
  completed: {
    label: 'Completed',
    color: 'success',
    icon: <SuccessIcon />,
    description: 'Task completed',
  },
  overdue: {
    label: 'Overdue',
    color: 'error',
    icon: <ErrorIcon />,
    description: 'Past due date',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  showLabel = true,
  size = 'small',
  className,
  style,
  customLabel,
  customColor,
  customIcon,
  tooltip,
}) => {
  const config = statusConfigs[status];

  const chipContent = (
    <Chip
      icon={showIcon ? customIcon || config.icon : undefined}
      label={showLabel ? customLabel || config.label : ''}
      color={customColor || config.color}
      size={size}
      className={className}
      style={style}
      sx={{
        '& .MuiChip-icon': {
          fontSize: size === 'small' ? 16 : 20,
        },
      }}
    />
  );

  if (tooltip || config.description) {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="body2">{tooltip || config.description}</Typography>
          </Box>
        }
      >
        <span>{chipContent}</span>
      </Tooltip>
    );
  }

  return chipContent;
};

// Compound components for specific statuses
export const SuccessStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="success" {...props} />
);

export const ErrorStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="error" {...props} />
);

export const WarningStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="warning" {...props} />
);

export const InfoStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="info" {...props} />
);

export const PendingStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="pending" {...props} />
);

export const BlockedStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="blocked" {...props} />
);

export const ExpiredStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="expired" {...props} />
);

export const ActiveStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="active" {...props} />
);

export const InactiveStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="inactive" {...props} />
);

export const CompletedStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="completed" {...props} />
);

export const OverdueStatus: React.FC<Omit<StatusBadgeProps, 'status'>> = (props) => (
  <StatusBadge status="overdue" {...props} />
);

export default StatusBadge;
