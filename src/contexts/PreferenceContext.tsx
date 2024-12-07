import React, { createContext, useContext, useState, useCallback } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import {
  StaffPreferences,
  PreferenceValidationResult,
  PreferenceStats,
  WorkingPatternPreference,
  SitePreference,
  TeamPreference,
  RolePreference
} from '../types/preferences';
import { ShiftRole } from '../types/rota';

type ConflictType = 'pattern' | 'site' | 'team' | 'role';
type ConflictSeverity = 'error' | 'warning';

interface PreferenceContextType {
  savePreferences: (preferences: Omit<StaffPreferences, 'updatedAt' | 'lastReviewedAt'>) => Promise<void>;
  getPreferences: (userId: string) => Promise<StaffPreferences | null>;
  validatePreferences: (preferences: StaffPreferences) => Promise<PreferenceValidationResult>;
  getPreferenceStats: () => Promise<PreferenceStats>;
  updateWorkingPattern: (userId: string, pattern: Partial<WorkingPatternPreference>) => Promise<void>;
  updateSitePreferences: (userId: string, sites: Partial<SitePreference>) => Promise<void>;
  updateTeamPreferences: (userId: string, teams: Partial<TeamPreference>) => Promise<void>;
  updateRolePreferences: (userId: string, roles: Partial<RolePreference>) => Promise<void>;
  reviewPreferences: (userId: string, notes?: string) => Promise<void>;
}

const PreferenceContext = createContext<PreferenceContextType | null>(null);

export const usePreferences = () => {
  const context = useContext(PreferenceContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferenceProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const PreferenceProvider: React.FC<Props> = ({ children }) => {
  const { currentUser } = useAuth();
  const { notify } = useNotifications();

  const savePreferences = useCallback(async (
    preferences: Omit<StaffPreferences, 'updatedAt' | 'lastReviewedAt'>
  ) => {
    if (!currentUser) return;

    try {
      const now = new Date().toISOString();
      const preferenceData: StaffPreferences = {
        ...preferences,
        updatedAt: now,
        lastReviewedAt: now
      };

      await setDoc(doc(db, 'preferences', preferences.id), preferenceData);

      notify({
        type: 'system',
        title: 'Preferences Updated',
        message: 'Staff preferences have been updated successfully',
        userId: currentUser.uid,
        priority: 'low'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      notify({
        type: 'system',
        title: 'Error',
        message: 'Failed to save preferences',
        userId: currentUser.uid,
        priority: 'high'
      });
    }
  }, [currentUser, notify]);

  const getPreferences = useCallback(async (userId: string): Promise<StaffPreferences | null> => {
    try {
      const preferencesQuery = query(
        collection(db, 'preferences'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(preferencesQuery);
      
      if (snapshot.empty) return null;
      
      return snapshot.docs[0].data() as StaffPreferences;
    } catch (error) {
      console.error('Error getting preferences:', error);
      return null;
    }
  }, []);

  const validatePreferences = useCallback(async (
    preferences: StaffPreferences
  ): Promise<PreferenceValidationResult> => {
    const conflicts: { type: ConflictType; message: string; severity: ConflictSeverity }[] = [];

    // Validate working pattern
    if (preferences.workingPattern.maxConsecutiveDays > 7) {
      conflicts.push({
        type: 'pattern',
        message: 'Maximum consecutive days cannot exceed 7',
        severity: 'error'
      });
    }

    if (preferences.workingPattern.minRestPeriodHours < 11) {
      conflicts.push({
        type: 'pattern',
        message: 'Minimum rest period should be at least 11 hours',
        severity: 'error'
      });
    }

    // Validate team preferences
    const hasTeamConflict = preferences.teams.preferredTeammates.some(
      teammate => preferences.teams.avoidTeammates.includes(teammate)
    );
    if (hasTeamConflict) {
      conflicts.push({
        type: 'team',
        message: 'Same staff member cannot be in both preferred and avoid lists',
        severity: 'error'
      });
    }

    // Validate role preferences
    const hasInvalidRole = preferences.roles.preferredRoles.some(role => {
      // Check if staff member is qualified for preferred roles
      // This would need to be checked against their qualifications
      return false; // Placeholder
    });
    if (hasInvalidRole) {
      conflicts.push({
        type: 'role',
        message: 'Staff member not qualified for some preferred roles',
        severity: 'warning'
      });
    }

    return {
      isValid: conflicts.filter(c => c.severity === 'error').length === 0,
      conflicts
    };
  }, []);

  const getPreferenceStats = useCallback(async (): Promise<PreferenceStats> => {
    try {
      const snapshot = await getDocs(collection(db, 'preferences'));
      const preferences = snapshot.docs.map(doc => doc.data() as StaffPreferences);

      // Calculate preference match rate
      const totalPreferences = preferences.length;
      let matchedPreferences = 0;
      // This would need to be calculated based on actual shift assignments
      const preferenceMatchRate = matchedPreferences / totalPreferences;

      // Analyze common patterns
      const patternMap = new Map<string, number>();
      preferences.forEach(pref => {
        const key = JSON.stringify(pref.workingPattern);
        patternMap.set(key, (patternMap.get(key) || 0) + 1);
      });

      const commonPatterns = Array.from(patternMap.entries())
        .map(([pattern, count]) => ({
          pattern: JSON.parse(pattern),
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate site distribution
      const siteMap = new Map<string, number>();
      preferences.forEach(pref => {
        pref.sites.preferredSites.forEach(site => {
          siteMap.set(site, (siteMap.get(site) || 0) + 1);
        });
      });

      const siteDistribution = Array.from(siteMap.entries())
        .map(([siteId, staffCount]) => ({
          siteId,
          staffCount
        }));

      // Calculate role distribution
      const roleMap = new Map<ShiftRole, number>();
      preferences.forEach(pref => {
        pref.roles.preferredRoles.forEach(role => {
          roleMap.set(role, (roleMap.get(role) || 0) + 1);
        });
      });

      const roleDistribution = Array.from(roleMap.entries())
        .map(([role, staffCount]) => ({
          role,
          staffCount
        }));

      return {
        preferenceMatchRate,
        commonPatterns,
        siteDistribution,
        roleDistribution
      };
    } catch (error) {
      console.error('Error getting preference stats:', error);
      return {
        preferenceMatchRate: 0,
        commonPatterns: [],
        siteDistribution: [],
        roleDistribution: []
      };
    }
  }, []);

  const updateWorkingPattern = useCallback(async (
    userId: string,
    pattern: Partial<WorkingPatternPreference>
  ) => {
    if (!currentUser) return;

    try {
      const preferences = await getPreferences(userId);
      if (!preferences) throw new Error('Preferences not found');

      const updatedPreferences: StaffPreferences = {
        ...preferences,
        workingPattern: {
          ...preferences.workingPattern,
          ...pattern
        },
        updatedAt: new Date().toISOString()
      };

      await savePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating working pattern:', error);
      throw error;
    }
  }, [currentUser, getPreferences, savePreferences]);

  const updateSitePreferences = useCallback(async (
    userId: string,
    sites: Partial<SitePreference>
  ) => {
    if (!currentUser) return;

    try {
      const preferences = await getPreferences(userId);
      if (!preferences) throw new Error('Preferences not found');

      const updatedPreferences: StaffPreferences = {
        ...preferences,
        sites: {
          ...preferences.sites,
          ...sites
        },
        updatedAt: new Date().toISOString()
      };

      await savePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating site preferences:', error);
      throw error;
    }
  }, [currentUser, getPreferences, savePreferences]);

  const updateTeamPreferences = useCallback(async (
    userId: string,
    teams: Partial<TeamPreference>
  ) => {
    if (!currentUser) return;

    try {
      const preferences = await getPreferences(userId);
      if (!preferences) throw new Error('Preferences not found');

      const updatedPreferences: StaffPreferences = {
        ...preferences,
        teams: {
          ...preferences.teams,
          ...teams
        },
        updatedAt: new Date().toISOString()
      };

      await savePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating team preferences:', error);
      throw error;
    }
  }, [currentUser, getPreferences, savePreferences]);

  const updateRolePreferences = useCallback(async (
    userId: string,
    roles: Partial<RolePreference>
  ) => {
    if (!currentUser) return;

    try {
      const preferences = await getPreferences(userId);
      if (!preferences) throw new Error('Preferences not found');

      const updatedPreferences: StaffPreferences = {
        ...preferences,
        roles: {
          ...preferences.roles,
          ...roles
        },
        updatedAt: new Date().toISOString()
      };

      await savePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating role preferences:', error);
      throw error;
    }
  }, [currentUser, getPreferences, savePreferences]);

  const reviewPreferences = useCallback(async (
    userId: string,
    notes?: string
  ) => {
    if (!currentUser) return;

    try {
      const preferences = await getPreferences(userId);
      if (!preferences) throw new Error('Preferences not found');

      const updatedPreferences: StaffPreferences = {
        ...preferences,
        lastReviewedAt: new Date().toISOString(),
        reviewedBy: currentUser.uid,
        notes: notes || preferences.notes,
        updatedAt: new Date().toISOString()
      };

      await savePreferences(updatedPreferences);

      notify({
        type: 'system',
        title: 'Preferences Reviewed',
        message: 'Staff preferences have been reviewed and updated',
        userId: currentUser.uid,
        priority: 'low'
      });
    } catch (error) {
      console.error('Error reviewing preferences:', error);
      throw error;
    }
  }, [currentUser, getPreferences, savePreferences, notify]);

  const value = {
    savePreferences,
    getPreferences,
    validatePreferences,
    getPreferenceStats,
    updateWorkingPattern,
    updateSitePreferences,
    updateTeamPreferences,
    updateRolePreferences,
    reviewPreferences
  };

  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  );
};
