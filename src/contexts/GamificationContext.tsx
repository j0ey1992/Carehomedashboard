import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc, setDoc, Timestamp, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserGameStats, POINT_ACTIONS, RANKS } from '../types/gamification';
import { useAuth } from './AuthContext';

interface GamificationContextType {
  userStats: UserGameStats | null;
  addPoints: (actionType: keyof typeof POINT_ACTIONS) => Promise<void>;
  getRankInfo: (points: number) => typeof RANKS[number];
  leaderboard: UserGameStats[];
  loading: boolean;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, isAdmin } = useAuth();
  const [userStats, setUserStats] = useState<UserGameStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserGameStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Subscribe to user's game stats
    const unsubscribeStats = onSnapshot(
      doc(db, 'gameStats', currentUser.uid),
      async (doc) => {
        if (doc.exists()) {
          setUserStats(doc.data() as UserGameStats);
        } else {
          // Initialize new user stats
          const initialStats: UserGameStats = {
            userId: currentUser.uid,
            points: 0,
            rank: 1,
            achievements: [],
            history: [],
            site: userData?.site || '',
          };
          await setDoc(doc.ref, initialStats);
          setUserStats(initialStats);
        }
        setLoading(false);
      }
    );

    // Subscribe to leaderboard with site-based filtering
    let leaderboardQuery;

    if (isAdmin) {
      // Admin can see all stats
      leaderboardQuery = query(
        collection(db, 'gameStats'),
        orderBy('points', 'desc'),
        limit(10)
      );
    } else if (userData?.role === 'manager' && userData.sites) {
      // Manager can only see stats for their sites
      leaderboardQuery = query(
        collection(db, 'gameStats'),
        where('site', 'in', userData.sites),
        orderBy('points', 'desc'),
        limit(10)
      );
    } else {
      // Staff can only see stats for their site
      leaderboardQuery = query(
        collection(db, 'gameStats'),
        where('site', '==', userData?.site || ''),
        orderBy('points', 'desc'),
        limit(10)
      );
    }

    const unsubscribeLeaderboard = onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        const stats = snapshot.docs.map(doc => doc.data() as UserGameStats);
        setLeaderboard(stats);
      }
    );

    return () => {
      unsubscribeStats();
      unsubscribeLeaderboard();
    };
  }, [currentUser?.uid, userData, isAdmin]);

  const getRankInfo = (points: number) => {
    return RANKS.reduce((prev, current) => {
      return points >= current.minPoints ? current : prev;
    });
  };

  const addPoints = async (actionType: keyof typeof POINT_ACTIONS) => {
    if (!currentUser?.uid || !userStats) return;

    const action = POINT_ACTIONS[actionType];
    const newPoints = userStats.points + action.points;
    const newRank = getRankInfo(newPoints).level;

    const historyEntry = {
      timestamp: Timestamp.now(),
      action: actionType,
      points: action.points,
      description: action.description
    };

    await updateDoc(doc(db, 'gameStats', currentUser.uid), {
      points: newPoints,
      rank: newRank,
      history: [...userStats.history, historyEntry],
      site: userData?.site || userStats.site || '',
    });
  };

  return (
    <GamificationContext.Provider value={{
      userStats,
      addPoints,
      getRankInfo,
      leaderboard,
      loading
    }}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
