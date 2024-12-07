// src/hooks/useProtectedRoute.ts
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteOptions {
  requireAdmin?: boolean
  requireManager?: boolean
  requireStaff?: boolean
  allowedSites?: string[]
}

export const useProtectedRoute = (options: ProtectedRouteOptions = {}) => {
  const { currentUser, userData, isAdmin, isSiteManager, isStaff } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect if not logged in
    if (!currentUser || !userData) {
      navigate('/login', { replace: true })
      return
    }

    // Admin can access everything
    if (isAdmin) {
      return
    }

    // Check role-based access
    if (options.requireAdmin && !isAdmin) {
      navigate('/', { replace: true })
      return
    }

    // Manager can access manager and staff pages
    if (options.requireManager && !isSiteManager && !isAdmin) {
      navigate('/', { replace: true })
      return
    }

    // Staff pages are accessible by staff, managers, and admins
    if (options.requireStaff && !isStaff && !isSiteManager && !isAdmin) {
      navigate('/', { replace: true })
      return
    }

    // Check site-based access only if not admin
    if (!isAdmin && options.allowedSites && userData?.sites) {
      const hasAccess = options.allowedSites.some(site => {
        // For managers, check their sites array
        if (isSiteManager) {
          return userData.sites.includes(site)
        }
        // For staff, check their assigned site
        return userData.site === site
      })
      
      if (!hasAccess) {
        navigate('/', { replace: true })
        return
      }
    }
  }, [currentUser, userData, isAdmin, isSiteManager, isStaff, navigate, options])

  return { 
    currentUser, 
    userData, 
    isAdmin, 
    isSiteManager, 
    isStaff,
    // Helper functions for role checks
    canAccessAdminFeatures: isAdmin,
    canAccessManagerFeatures: isAdmin || isSiteManager,
    canAccessStaffFeatures: isAdmin || isSiteManager || isStaff,
    // Helper function for site access
    hasAccessToSite: (site: string) => 
      isAdmin || 
      (isSiteManager && userData?.sites?.includes(site)) ||
      userData?.site === site
  }
}
