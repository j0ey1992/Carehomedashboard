import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { LeaderboardEntry, User } from '../types';
import { useAuth } from './AuthContext';

interface LeaderboardContextType {
  leaderboard: LeaderboardEntry[];
  userRank: number;
  loading: boolean;
  calculatePoints: (user: User) => number;
}

interface UserAchievements {
  supervisionStar: boolean;
  trainingStar: boolean;
  f2fStar: boolean;
  perfectAttendance: boolean;
  quickLearner: boolean;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

export const useLeaderboard = () => {
  const context = useContext(LeaderboardContext);
  if (!context) {
    throw new Error('useLeaderboard must be used within a LeaderboardProvider');
  }
  return context;
};

export const LeaderboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  const calculatePoints = (user: User): number => {
    let points = 800; // Starting points

    // Training completion bonuses
    if (user.trainingProgress?.week1Review) points += 50;
    if (user.trainingProgress?.week4Supervision) points += 50;
    if (user.trainingProgress?.week8Review) points += 50;
    if (user.trainingProgress?.week12Supervision) points += 50;

    // Attendance bonuses
    if (user.attendance) {
      if (user.attendance.attendanceRate >= 98) points += 100;
      else if (user.attendance.attendanceRate >= 95) points += 50;
      points -= (user.attendance.lateDays * 5); // Deduct points for lateness
    }

    // Probation status bonus
    if (user.probationStatus === 'completed') points += 100;

    return Math.max(0, points); // Ensure points don't go negative
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('points', 'desc'), limit(10)),
      (snapshot) => {
        const entries: LeaderboardEntry[] = [];
        snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>, index: number) => {
          const userData = doc.data() as User;
          const achievements: UserAchievements = {
            supervisionStar: false, // Will be calculated based on supervision records
            trainingStar: false, // Will be calculated based on training records
            f2fStar: false, // Will be calculated based on F2F attendance
            perfectAttendance: userData.attendance?.attendanceRate === 100 || false,
            quickLearner: userData.trainingProgress?.week12Supervision || false,
          };

          entries.push({
            userId: doc.id,
            name: userData.name || '',
            points: userData.points || calculatePoints(userData),
            rank: index + 1,
            achievements: achievements.supervisionStar || 
                         achievements.trainingStar || 
                         achievements.f2fStar || 
                         achievements.perfectAttendance || 
                         achievements.quickLearner ? 
                         Object.keys(achievements).filter(key => achievements[key as keyof UserAchievements]) : [],
          });
        });
        setLeaderboard(entries);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const userRank = userData
    ? leaderboard.findIndex((entry) => entry.userId === userData.id) + 1
    : 0;

  return (
    <LeaderboardContext.Provider
      value={{
        leaderboard,
        userRank,
        loading,
        calculatePoints,
      }}
    >
      {children}
    </LeaderboardContext.Provider>
  );
};
