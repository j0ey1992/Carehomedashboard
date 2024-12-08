import React from 'react'
import { Navigate } from 'react-router-dom'
import { useProtectedRoute } from '../../hooks/useProtectedRoute'

interface ProtectedRouteProps {
  element: React.ReactElement
  requireAdmin?: boolean
  requireManager?: boolean
  requireStaff?: boolean
  allowedSites?: string[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element, 
  requireAdmin, 
  requireManager, 
  requireStaff,
  allowedSites 
}) => {
  const { currentUser, userData, isAdmin, isSiteManager, isStaff } = useProtectedRoute({ 
    requireAdmin, 
    requireManager, 
    requireStaff,
    allowedSites 
  })

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  // Admin can access everything
  if (isAdmin) {
    return element
  }

  // Check if the user has any of the required roles
  const hasRequiredRole = (
    (requireAdmin && isAdmin) ||
    (requireManager && (isSiteManager || isAdmin)) ||
    (requireStaff && (isStaff || isSiteManager || isAdmin)) ||
    (!requireAdmin && !requireManager && !requireStaff)
  )

  if (!hasRequiredRole) {
    return <Navigate to="/" replace />
  }

  // Check site-based access
  if (allowedSites && userData?.sites) {
    const hasAccess = allowedSites.some(site => 
      userData.sites.includes(site) || userData.site === site
    )
    if (!hasAccess && !isAdmin) {
      return <Navigate to="/" replace />
    }
  }

  return element
}

export default ProtectedRoute
