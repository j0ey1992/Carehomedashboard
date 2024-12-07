import React, { useMemo, useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  Zoom,
  Fade,
  Tooltip,
  Badge,
} from '@mui/material'
import {
  School as TrainingIcon,
  CheckCircle as CheckCircleIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Upload as UploadIcon,
  Leaderboard as LeaderboardIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useTraining } from '../../contexts/TrainingContext'
import { useAuth } from '../../contexts/AuthContext'
import { useGamification } from '../../contexts/GamificationContext'
import { format, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns'
import { alpha, useTheme } from '@mui/material/styles'
import { TrainingRecord, NewUserData } from '../../types'
import { TRAINING_COURSES } from '../../utils/courseConstants'
import PointsBadge from '../../components/Gamification/PointsBadge'
import GamificationDialog from '../../components/Gamification/GamificationDialog'
import TrainingUploadDialog from '../../components/Training/TrainingUploadDialog'

const Training: React.FC = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const { currentUser, isAdmin, isSiteManager, userData } = useAuth()
  const { trainingRecords, loading, uploadTrainingData } = useTraining()
  const { userStats, getRankInfo } = useGamification()
  const [activeTab, setActiveTab] = useState(0)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [gamificationDialogOpen, setGamificationDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Filter records based on user role
  const filteredRecords = useMemo(() => {
    if (isAdmin) {
      return trainingRecords
    }
    if (isSiteManager && userData?.sites) {
      return trainingRecords.filter(record => record.siteId && userData.sites.includes(record.siteId))
    }
    return trainingRecords.filter(record => record.staffId === currentUser?.uid)
  }, [trainingRecords, currentUser, isAdmin, isSiteManager, userData])

  // Filter and organize records
  const organizedRecords = useMemo(() => {
    const today = startOfDay(new Date())
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    // First filter to only include staff training courses
    const staffTrainingRecords = filteredRecords.filter(record =>
      TRAINING_COURSES.includes(record.courseTitle)
    )

    // Process completed records
    const completed = staffTrainingRecords.filter(record => {
      if (!record.completionDate) return false
      const completionDate = new Date(record.completionDate)

      if (record.expiryDate) {
        const expiryDate = new Date(record.expiryDate)
        return isAfter(expiryDate, today)
      }

      return true
    }).sort((a, b) => {
      const dateA = new Date(b.completionDate!)
      const dateB = new Date(a.completionDate!)
      return dateA.getTime() - dateB.getTime()
    })

    // Process expired records
    const expired = staffTrainingRecords.filter(record => {
      if (!record.expiryDate) return false
      const expiryDate = new Date(record.expiryDate)
      return isBefore(expiryDate, today)
    }).sort((a, b) => {
      const dateA = new Date(a.expiryDate)
      const dateB = new Date(b.expiryDate)
      return dateA.getTime() - dateB.getTime()
    })

    // Process expiring records
    const expiring = staffTrainingRecords.filter(record => {
      if (!record.expiryDate) return false
      const expiryDate = new Date(record.expiryDate)
      return isAfter(expiryDate, today) &&
             isBefore(expiryDate, thirtyDaysFromNow)
    }).sort((a, b) => {
      const dateA = new Date(a.expiryDate)
      const dateB = new Date(b.expiryDate)
      return dateA.getTime() - dateB.getTime()
    })

    return { expired, expiring, completed }
  }, [filteredRecords])

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const staffTrainingRecords = filteredRecords.filter(record =>
      TRAINING_COURSES.includes(record.courseTitle)
    )
    if (staffTrainingRecords.length === 0) return 100
    const totalRecords = staffTrainingRecords.length
    const expiredRecords = organizedRecords.expired.length
    return Math.round(((totalRecords - expiredRecords) / totalRecords) * 100)
  }, [filteredRecords, organizedRecords])

  // Calculate achievements (only for staff view)
  const achievements = useMemo(() => {
    if (isAdmin) return null

    const allOnTime = organizedRecords.expired.length === 0
    const allUpToDate = organizedRecords.expiring.length === 0
    const hasCompletions = organizedRecords.completed.length > 0

    return {
      perfectScore: progressPercentage === 100,
      allOnTime,
      allUpToDate,
      hasCompletions,
      totalAchievements: [allOnTime, allUpToDate, hasCompletions].filter(Boolean).length,
    }
  }, [organizedRecords, progressPercentage, isAdmin])

  const handleUpload = async (file: File, userData: NewUserData) => {
    try {
      await uploadTrainingData(file, userData);
      setUploadDialogOpen(false);
      setError(null);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  const renderAchievements = () => {
    if (!achievements) return null

    return (
      <Fade in timeout={1000}>
        <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Tooltip title="All Training On Time" TransitionComponent={Zoom}>
            <Badge
              badgeContent={achievements.allOnTime ? '✓' : ''}
              color="success"
            >
              <CheckCircleIcon
                color={achievements.allOnTime ? 'success' : 'disabled'}
                sx={{ fontSize: 40 }}
              />
            </Badge>
          </Tooltip>
          <Tooltip title="All Training Up to Date" TransitionComponent={Zoom}>
            <Badge
              badgeContent={achievements.allUpToDate ? '✓' : ''}
              color="success"
            >
              <TrainingIcon
                color={achievements.allUpToDate ? 'primary' : 'disabled'}
                sx={{ fontSize: 40 }}
              />
            </Badge>
          </Tooltip>
          <Tooltip title="Active Learner" TransitionComponent={Zoom}>
            <Badge
              badgeContent={achievements.hasCompletions ? '✓' : ''}
              color="success"
            >
              <StarIcon
                color={achievements.hasCompletions ? 'info' : 'disabled'}
                sx={{ fontSize: 40 }}
              />
            </Badge>
          </Tooltip>
          {achievements.perfectScore && (
            <Tooltip title="Perfect Score!" TransitionComponent={Zoom}>
              <TrophyIcon
                color="primary"
                sx={{
                  fontSize: 40,
                  animation: 'bounce 1s infinite',
                }}
              />
            </Tooltip>
          )}
        </Box>
      </Fade>
    )
  }

  const renderTrainingCard = (record: TrainingRecord) => {
    const today = startOfDay(new Date())
    const expiryDate = record.expiryDate ? new Date(record.expiryDate) : null
    const completionDate = record.completionDate ? new Date(record.completionDate) : null
    const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null
    const remindersSent = record.remindersSent || 0

    const isCompleted = completionDate &&
                       isBefore(completionDate, today) &&
                       (!expiryDate || isAfter(expiryDate, today))

    const cardKey = `${record.id}-${record.staffName}`

    return (
      <Zoom in timeout={300}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease',
            transform: hoveredCard === cardKey ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
            boxShadow: hoveredCard === cardKey ? 4 : 1,
            bgcolor: isCompleted ? alpha(theme.palette.success.main, 0.1) : 'background.paper',
          }}
          onMouseEnter={() => setHoveredCard(cardKey)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Stack spacing={2}>
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                sx={{
                  transition: 'all 0.3s ease',
                  '& .MuiSvgIcon-root': {
                    transition: 'transform 0.3s ease',
                  },
                  '&:hover .MuiSvgIcon-root': {
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <TrainingIcon
                  color={isCompleted ? 'success' :
                         daysUntilExpiry && daysUntilExpiry <= 0 ? 'error' : 'warning'}
                />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {record.staffName}
                </Typography>
                {remindersSent > 0 && (
                  <Tooltip title={`${remindersSent} reminders sent`} TransitionComponent={Zoom}>
                    <Chip
                      icon={<NotificationIcon />}
                      label={remindersSent}
                      size="small"
                      color="info"
                      sx={{
                        transition: 'transform 0.3s ease',
                        transform: hoveredCard === cardKey ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  </Tooltip>
                )}
              </Box>

              <Typography variant="body1" color="textSecondary">
                {record.courseTitle}
              </Typography>

              <Box>
                {isCompleted ? (
                  <Fade in timeout={500}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Completed: {format(completionDate!, 'PPP')}
                    </Typography>
                  </Fade>
                ) : (
                  <>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Due: {expiryDate ? format(expiryDate, 'PPP') : 'No due date'}
                    </Typography>
                    {daysUntilExpiry && daysUntilExpiry <= 0 && (
                      <Typography
                        variant="body2"
                        color="error"
                        sx={{
                          fontWeight: 'bold',
                          animation: 'pulse 2s infinite',
                        }}
                      >
                        Overdue by {Math.abs(daysUntilExpiry)} days
                      </Typography>
                    )}
                  </>
                )}
              </Box>

              {!isCompleted && (
                <Button
                  variant="contained"
                  color={daysUntilExpiry && daysUntilExpiry <= 0 ? 'error' : 'warning'}
                  startIcon={<CalendarIcon />}
                  onClick={() => navigate(`/training/${record.id}`)}
                  fullWidth
                  sx={{
                    transition: 'all 0.3s ease',
                    transform: hoveredCard === cardKey ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  Update Training
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Zoom>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 0: // Expired
        return (
          <Box>
            {organizedRecords.expired.length > 0 ? (
              <Grid container spacing={3}>
                {organizedRecords.expired.map(record => (
                  <Grid item xs={12} sm={6} md={4} key={record.id}>
                    {renderTrainingCard(record)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="200px"
                textAlign="center"
                gap={2}
              >
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
                <Typography color="success.main" variant="h6">
                  No expired training! 🎉
                </Typography>
              </Box>
            )}
          </Box>
        )

      case 1: // Expiring
        return (
          <Box>
            {organizedRecords.expiring.length > 0 ? (
              <Grid container spacing={3}>
                {organizedRecords.expiring.map(record => (
                  <Grid item xs={12} sm={6} md={4} key={record.id}>
                    {renderTrainingCard(record)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="200px"
                textAlign="center"
                gap={2}
              >
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
                <Typography color="textSecondary" variant="h6">
                  No training expiring in the next 30 days
                </Typography>
              </Box>
            )}
          </Box>
        )

      case 2: // Completed
        return (
          <Box>
            {organizedRecords.completed.length > 0 ? (
              <Grid container spacing={3}>
                {organizedRecords.completed.map(record => (
                  <Grid item xs={12} sm={6} md={4} key={record.id}>
                    {renderTrainingCard(record)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="200px"
                textAlign="center"
                gap={2}
              >
                <TrainingIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                <Typography color="textSecondary" variant="h6">
                  No completed training records
                </Typography>
              </Box>
            )}
          </Box>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Fade in timeout={800}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Typography variant="h4">
                {isAdmin ? 'Staff Training Management' : 'My Training'}
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={progressPercentage}
                  size={60}
                  thickness={4}
                  sx={{
                    color: progressPercentage === 100 ? 'success.main' :
                           progressPercentage >= 80 ? 'info.main' :
                           progressPercentage >= 60 ? 'warning.main' : 'error.main',
                    transition: 'all 0.3s ease',
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
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      transform: progressPercentage === 100 ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {progressPercentage}%
                  </Typography>
                </Box>
              </Box>
              {!isAdmin && (
                <>
                  <PointsBadge />
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<LeaderboardIcon />}
                    onClick={() => setGamificationDialogOpen(true)}
                    sx={{
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  >
                    View Progress
                  </Button>
                </>
              )}
            </Box>
            {isAdmin && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                Upload Training
              </Button>
            )}
          </Box>

          {!isAdmin && renderAchievements()}

          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                },
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Expired</Typography>
                  {organizedRecords.expired.length > 0 && (
                    <Chip
                      label={organizedRecords.expired.length}
                      color="error"
                      size="small"
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Expiring</Typography>
                  {organizedRecords.expiring.length > 0 && (
                    <Chip
                      label={organizedRecords.expiring.length}
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Completed</Typography>
                  {organizedRecords.completed.length > 0 && (
                    <Chip
                      label={organizedRecords.completed.length}
                      color="success"
                      size="small"
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>
      </Fade>

      {/* Main Content */}
      <Fade in timeout={1000}>
        <Box>
          {renderContent()}
        </Box>
      </Fade>

      {/* Upload Dialog */}
      {isAdmin && (
        <TrainingUploadDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          onUpload={handleUpload}
        />
      )}

      {/* Gamification Dialog */}
      {!isAdmin && (
        <GamificationDialog
          open={gamificationDialogOpen}
          onClose={() => setGamificationDialogOpen(false)}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '90%',
            width: 500,
          }}
        >
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </Box>
  )
}

export default Training
