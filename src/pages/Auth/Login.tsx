// src/pages/Auth/Login.tsx
import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Snackbar,
} from '@mui/material'
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Microsoft as MicrosoftIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Visibility,
  VisibilityOff,
  ArrowForward as ArrowIcon,
  Lock as LockIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { styled } from '@mui/material/styles'

// Styled components for enhanced UI
const StyledCard = styled(motion.div)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(4),
  width: '100%',
  maxWidth: 440,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `0 50px 100px -20px ${alpha(theme.palette.common.black, 0.25)},
               0 30px 60px -30px ${alpha(theme.palette.common.black, 0.3)}`,
}))

const GradientButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1.5, 3),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
  },
  transition: 'all 0.3s ease',
}))

const SocialButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 1.5,
  padding: theme.spacing(1.5),
  color: theme.palette.text.primary,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  '&:hover': {
    backgroundColor: alpha(theme.palette.background.paper, 0.9),
    transform: 'translateY(-2px)',
  },
  transition: 'all 0.3s ease',
}))

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    backdropFilter: 'blur(10px)',
    borderRadius: theme.shape.borderRadius * 1.5,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
    },
    '&.Mui-focused': {
      backgroundColor: alpha(theme.palette.background.paper, 0.9),
      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
}))

interface AuthMethod {
  id: 'email' | 'phone' | 'magic'
  label: string
  icon: React.ReactNode
}

const Login = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, loginWithGithub, loginWithMicrosoft, loginWithPhone, loginWithMagicLink, userData } = useAuth()

  // State management
  const [authMethod, setAuthMethod] = useState<AuthMethod['id']>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVerificationInput, setShowVerificationInput] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // Background gradient animation
  const [gradientPosition, setGradientPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      setGradientPosition({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const authMethods: AuthMethod[] = [
    { id: 'email', label: 'Email', icon: <EmailIcon /> },
    { id: 'phone', label: 'Phone', icon: <PhoneIcon /> },
    { id: 'magic', label: 'Magic Link', icon: <AutoAwesomeIcon /> },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (authMethod === 'email') {
        await login(email, password)
        if (userData?.role === 'admin' || userData?.role === 'manager') {
          navigate('/admindashboard')
        } else {
          navigate('/staffdashboard')
        }
      } else if (authMethod === 'phone') {
        if (!showVerificationInput) {
          await loginWithPhone(phoneNumber)
          setShowVerificationInput(true)
        } else {
          // Handle verification code submission
          // Add your verification logic here
        }
      } else if (authMethod === 'magic') {
        await loginWithMagicLink(email)
        setMagicLinkSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'github' | 'microsoft') => {
    setError(null)
    setLoading(true)

    try {
      switch (provider) {
        case 'google':
          await loginWithGoogle()
          break
        case 'github':
          await loginWithGithub()
          break
        case 'microsoft':
          await loginWithMicrosoft()
          break
      }
      if (userData?.role === 'admin' || userData?.role === 'manager') {
        navigate('/admindashboard')
      } else {
        navigate('/staffdashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(3),
        position: 'relative',
        background: `radial-gradient(circle at ${gradientPosition.x}% ${gradientPosition.y}%,
                    ${alpha(theme.palette.primary.main, 0.15)},
                    ${alpha(theme.palette.background.default, 0.95)})`,
        transition: 'background 0.3s ease',
      }}
    >
      <StyledCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Loading Overlay */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.background.paper, 0.7),
              backdropFilter: 'blur(4px)',
              zIndex: 2,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Header */}
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            textAlign: 'center',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome Back
        </Typography>

        <Typography
          variant="body1"
          align="center"
          color="textSecondary"
          gutterBottom
          sx={{ mb: 4 }}
        >
          Sign in to access your dashboard
        </Typography>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert
                severity="error"
                sx={{ mb: 3 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Method Selector */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
          {authMethods.map((method) => (
            <Button
              key={method.id}
              variant={authMethod === method.id ? 'contained' : 'outlined'}
              onClick={() => {
                setAuthMethod(method.id)
                setShowVerificationInput(false)
                setMagicLinkSent(false)
              }}
              startIcon={method.icon}
              sx={{
                flex: 1,
                py: 1,
                borderRadius: theme.shape.borderRadius * 1.5,
              }}
            >
              {method.label}
            </Button>
          ))}
        </Box>

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {authMethod === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StyledTextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <StyledTextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </motion.div>
            )}
            {authMethod === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {!showVerificationInput ? (
                  <StyledTextField
                    fullWidth
                    label="Phone Number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    margin="normal"
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                ) : (
                  <StyledTextField
                    fullWidth
                    label="Verification Code"
                    type="number"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    margin="normal"
                    required
                  />
                )}
              </motion.div>
            )}
            {authMethod === 'magic' && (
              <motion.div
                key="magic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StyledTextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <GradientButton
            type="submit"
            fullWidth
            size="large"
            disabled={loading}
            endIcon={<ArrowIcon />}
            sx={{ mt: 3 }}
          >
            {authMethod === 'email'
              ? 'Sign In'
              : authMethod === 'phone'
              ? showVerificationInput
                ? 'Verify Code'
                : 'Send Code'
              : magicLinkSent
              ? 'Magic Link Sent'
              : 'Send Magic Link'}
          </GradientButton>
        </form>

        {/* Social Login */}
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="body2"
            color="textSecondary"
            align="center"
            sx={{ mb: 2 }}
          >
            Or continue with
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <SocialButton
              onClick={() => handleSocialLogin('google')}
              startIcon={<GoogleIcon />}
            >
              Google
            </SocialButton>
            <SocialButton
              onClick={() => handleSocialLogin('microsoft')}
              startIcon={<MicrosoftIcon />}
            >
              Microsoft
            </SocialButton>
            <SocialButton
              onClick={() => handleSocialLogin('github')}
              startIcon={<GitHubIcon />}
            >
              GitHub
            </SocialButton>
          </Box>
        </Box>

        {/* Footer */}
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 4 }}
        >
          Need help? Contact your administrator
        </Typography>
      </StyledCard>

      {/* Magic Link Success Snackbar */}
      <Snackbar
        open={magicLinkSent}
        autoHideDuration={6000}
        onClose={() => setMagicLinkSent(false)}
        message="Magic link sent! Check your email to sign in."
      />
    </Box>
  )
}

export default Login
