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

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (requireManager && !isSiteManager && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (requireStaff && !isStaff && !isAdmin) {
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