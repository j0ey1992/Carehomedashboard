import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { SnackbarProvider } from 'notistack'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import theme from './theme'

// Contexts
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { TrainingProvider } from './contexts/TrainingContext'
import { TaskProvider } from './contexts/TaskContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { SupervisionProvider } from './contexts/SupervisionContext'
import { ComplianceProvider } from './contexts/ComplianceContext'
import { CommunicationProvider } from './contexts/CommunicationContext'
import { LeaderboardProvider } from './contexts/LeaderboardContext'
import { GamificationProvider } from './contexts/GamificationContext'
import { SicknessProvider } from './contexts/SicknessContext'
import { LeaveProvider } from './contexts/LeaveContext'
import { ChatProvider } from './contexts/ChatContext'
import { RotaProvider } from './contexts/RotaContext'
import { UserProvider } from './contexts/UserContext'

// Components
import MainLayout from './components/Layout/MainLayout'
import LoadingScreen from './components/Common/LoadingScreen'
import ProtectedRoute from './components/Auth/ProtectedRoute'

// Pages
import Login from './pages/Auth/Login'
import MagicLinkCallback from './pages/Auth/MagicLinkCallback'
import Dashboard from './pages/Dashboard'
import Training from './pages/Training'
import TrainingEdit from './pages/Training/TrainingEdit'
import Supervision from './pages/Supervision'
import Tasks from './pages/Tasks'
import Dols from './pages/Dols'
import F2F from './pages/F2F'
import Compliance from './pages/Compliance'
import Communication from './pages/Communication'
import CommunicationBook from './pages/CommunicationBook'
import UserProfile from './pages/UserProfile'
import UserManagement from './pages/UserManagement'
import Renewals from './pages/Renewals'
import Sickness from './pages/Sickness'
import Leave from './pages/Leave'
import Chat from './pages/Chat'
import RotaPage from './pages/Rota'
import ImportRotaPage from './pages/Rota/ImportRota'

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SnackbarProvider maxSnack={3}>
          <AuthProvider>
            <UserProvider>
              <DataProvider>
                <GamificationProvider>
                  <NotificationProvider>
                    <TrainingProvider>
                      <TaskProvider>
                        <SupervisionProvider>
                          <ComplianceProvider>
                            <CommunicationProvider>
                              <LeaderboardProvider>
                                <SicknessProvider>
                                  <LeaveProvider>
                                    <ChatProvider>
                                      <RotaProvider>
                                        <Router>
                                          <React.Suspense fallback={<LoadingScreen />}>
                                            <Routes>
                                              <Route path="/login" element={<Login />} />
                                              <Route path="/auth/magic-link-callback" element={<MagicLinkCallback />} />
                                              <Route
                                                path="/"
                                                element={<MainLayout />}
                                              >
                                                {/* Dashboard - Different views for different roles */}
                                                <Route index element={<Dashboard />} />

                                                {/* Staff and Manager accessible routes */}
                                                <Route
                                                  path="training"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<Training />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="f2f"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<F2F />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="tasks"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<Tasks />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="profile"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      element={<UserProfile />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="compliance"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<Compliance />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="sickness"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<Sickness />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="leave"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<Leave />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="communication-book"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<CommunicationBook />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="chat"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<Chat />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="rota"
                                                  element={
                                                    <ProtectedRoute
                                                      requireStaff
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<RotaPage />}
                                                    />
                                                  }
                                                />

                                                {/* Manager and Admin accessible routes */}
                                                <Route
                                                  path="rota/import"
                                                  element={
                                                    <ProtectedRoute
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<ImportRotaPage />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="training/:id"
                                                  element={
                                                    <ProtectedRoute
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<TrainingEdit />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="supervision"
                                                  element={
                                                    <ProtectedRoute
                                                      requireManager
                                                      allowedSites={['Willowbrook']}
                                                      element={<Supervision />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="users"
                                                  element={
                                                    <ProtectedRoute
                                                      requireManager
                                                      element={<UserManagement />}
                                                    />
                                                  }
                                                />

                                                {/* Admin only routes */}
                                                <Route
                                                  path="dols"
                                                  element={
                                                    <ProtectedRoute
                                                      requireAdmin
                                                      element={<Dols />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="communication"
                                                  element={
                                                    <ProtectedRoute
                                                      requireAdmin
                                                      element={<Communication />}
                                                    />
                                                  }
                                                />
                                                <Route
                                                  path="renewals"
                                                  element={
                                                    <ProtectedRoute
                                                      requireAdmin
                                                      element={<Renewals />}
                                                    />
                                                  }
                                                />
                                              </Route>
                                            </Routes>
                                          </React.Suspense>
                                        </Router>
                                      </RotaProvider>
                                    </ChatProvider>
                                  </LeaveProvider>
                                </SicknessProvider>
                              </LeaderboardProvider>
                            </CommunicationProvider>
                          </ComplianceProvider>
                        </SupervisionProvider>
                      </TaskProvider>
                    </TrainingProvider>
                  </NotificationProvider>
                </GamificationProvider>
              </DataProvider>
            </UserProvider>
          </AuthProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
