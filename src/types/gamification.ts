import { Timestamp } from 'firebase/firestore';

export interface PointAction {
  type: string;
  points: number;
  description: string;
}

export interface UserRank {
  level: number;
  title: string;
  minPoints: number;
  badge: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export interface PointHistoryEntry {
  timestamp: Timestamp;
  action: string;
  points: number;
  description: string;
}

export interface UserGameStats {
  userId: string;
  points: number;
  rank: number;
  achievements: Achievement[];
  history: PointHistoryEntry[];
  site?: string;
}

export const POINT_ACTIONS = {
  TASK_COMPLETE: {
    type: 'TASK_COMPLETE',
    points: 10,
    description: 'Completed a task on time'
  },
  TASK_LATE: {
    type: 'TASK_LATE',
    points: -5,
    description: 'Completed a task late'
  },
  TRAINING_ATTEND: {
    type: 'TRAINING_ATTEND',
    points: 20,
    description: 'Attended training session'
  },
  TRAINING_MISS: {
    type: 'TRAINING_MISS',
    points: -15,
    description: 'Missed training session'
  },
  FEEDBACK_PROVIDE: {
    type: 'FEEDBACK_PROVIDE',
    points: 5,
    description: 'Provided feedback'
  },
  SUPERVISION_COMPLETE: {
    type: 'SUPERVISION_COMPLETE',
    points: 15,
    description: 'Completed supervision session'
  },
  SUPERVISION_MISS: {
    type: 'SUPERVISION_MISS',
    points: -10,
    description: 'Missed supervision session'
  }
} as const;

export const RANKS: UserRank[] = [
  {
    level: 1,
    title: 'Novice',
    minPoints: 0,
    badge: '🌱'
  },
  {
    level: 2,
    title: 'Apprentice',
    minPoints: 100,
    badge: '⭐'
  },
  {
    level: 3,
    title: 'Proficient',
    minPoints: 250,
    badge: '🌟'
  },
  {
    level: 4,
    title: 'Expert',
    minPoints: 500,
    badge: '💫'
  },
  {
    level: 5,
    title: 'Master',
    minPoints: 1000,
    badge: '👑'
  }
];

// Achievement definitions
export const ACHIEVEMENTS = {
  FIRST_TASK: {
    id: 'FIRST_TASK',
    title: 'First Steps',
    description: 'Complete your first task',
    icon: '🎯'
  },
  TRAINING_MASTER: {
    id: 'TRAINING_MASTER',
    title: 'Training Master',
    description: 'Complete 5 training sessions',
    icon: '📚'
  },
  FEEDBACK_CHAMPION: {
    id: 'FEEDBACK_CHAMPION',
    title: 'Feedback Champion',
    description: 'Provide feedback 10 times',
    icon: '💭'
  },
  PERFECT_ATTENDANCE: {
    id: 'PERFECT_ATTENDANCE',
    title: 'Perfect Attendance',
    description: 'Maintain perfect attendance for a month',
    icon: '⭐'
  },
  SUPERVISION_PRO: {
    id: 'SUPERVISION_PRO',
    title: 'Supervision Pro',
    description: 'Complete 3 supervision sessions',
    icon: '👥'
  }
} as const;
