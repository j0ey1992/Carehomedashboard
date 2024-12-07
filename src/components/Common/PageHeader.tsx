import React from 'react';
import {
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  Button,
  Breadcrumbs,
  Link,
  Stack
} from '@mui/material';
import {
  Help as HelpIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeaderProps, ActionButton } from '../../types';

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  helpText,
  bookmarkable,
  breadcrumbs,
  color,
}) => {
  const theme = useTheme();
  const [showHelp, setShowHelp] = React.useState(false);
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  const handleBookmarkToggle = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark functionality
  };

  const renderAction = (action: ActionButton) => {
    const buttonProps = {
      onClick: action.onClick,
      disabled: action.disabled,
      color: action.color || 'primary',
      variant: action.variant || 'contained',
      startIcon: action.icon,
      size: 'medium' as const,
      sx: {
        ...(action.priority === 'high' && {
          backgroundColor: theme.palette.error.main,
          '&:hover': {
            backgroundColor: theme.palette.error.dark,
          },
        }),
      },
    };

    return action.tooltip ? (
      <Tooltip key={action.label} title={action.tooltip}>
        <Button {...buttonProps}>{action.label}</Button>
      </Tooltip>
    ) : (
      <Button key={action.label} {...buttonProps}>
        {action.label}
      </Button>
    );
  };

  return (
    <Stack
      spacing={3}
      sx={{
        mb: 3,
        position: 'relative',
        '&::after': color
          ? {
              content: '""',
              position: 'absolute',
              left: -24,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: color,
              borderRadius: 1,
            }
          : undefined,
      }}
    >
      {breadcrumbs && (
        <Breadcrumbs
          aria-label="breadcrumb"
          separator="›"
        >
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            sx={{ textDecoration: 'none' }}
          >
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast || !crumb.path ? (
              <Typography key={crumb.label} color="textPrimary" component="span">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.label}
                component={RouterLink}
                to={crumb.path}
                color="inherit"
                sx={{ textDecoration: 'none' }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack spacing={subtitle ? 1 : 0}>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="subtitle1"
                color="textSecondary"
                component="div"
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  maxWidth: '600px',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Stack>
          {(helpText || bookmarkable) && (
            <Stack direction="row" spacing={1}>
              {helpText && (
                <Tooltip
                  title={showHelp ? 'Hide help' : 'Show help'}
                  placement="top"
                >
                  <IconButton
                    size="small"
                    onClick={() => setShowHelp(!showHelp)}
                    color={showHelp ? 'primary' : 'default'}
                  >
                    <HelpIcon />
                  </IconButton>
                </Tooltip>
              )}
              {bookmarkable && (
                <Tooltip
                  title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  placement="top"
                >
                  <IconButton
                    size="small"
                    onClick={handleBookmarkToggle}
                    color={isBookmarked ? 'primary' : 'default'}
                  >
                    {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Stack>

        {actions && (
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            justifyContent="flex-end"
            alignItems="center"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {actions.map(renderAction)}
          </Stack>
        )}
      </Stack>

      {showHelp && helpText && (
        <Stack
          spacing={1}
          sx={{
            p: 2,
            backgroundColor: theme.palette.background.default,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" color="textSecondary" component="div">
            {helpText}
          </Typography>
          <Button
            size="small"
            onClick={() => setShowHelp(false)}
          >
            Got it
          </Button>
        </Stack>
      )}
    </Stack>
  );
};

export default PageHeader;
