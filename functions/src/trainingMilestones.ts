import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { toDate } from './utils';

interface UserData {
  id: string;
  name: string;
  email: string;
  startDate?: admin.firestore.Timestamp;
  probationStatus?: 'pending' | 'completed' | 'extended';
  trainingProgress?: {
    week1Review?: boolean;
    week4Supervision?: boolean;
    week8Review?: boolean;
    week12Supervision?: boolean;
  };
}

// Process training milestones when a new user is created or updated
export const processTrainingMilestones = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const newData = change.after.data() as UserData;
    const previousData = change.before.data() as UserData;

    // Only process if this is a new user or startDate has changed
    if (!newData?.startDate || 
        (previousData?.startDate && 
         toDate(previousData.startDate).getTime() === toDate(newData.startDate).getTime())) {
      return;
    }

    const userId = context.params.userId;
    const startDate = toDate(newData.startDate);
    const now = new Date();

    // Calculate milestone dates
    const milestones = {
      week1: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      week4: new Date(startDate.getTime() + 28 * 24 * 60 * 60 * 1000),
      week8: new Date(startDate.getTime() + 56 * 24 * 60 * 60 * 1000),
      week12: new Date(startDate.getTime() + 84 * 24 * 60 * 60 * 1000),
    };

    const batch = admin.firestore().batch();

    // Create supervision tasks for each milestone
    if (!newData.trainingProgress?.week1Review && now <= milestones.week1) {
      batch.set(admin.firestore().collection('supervisions').doc(), {
        staffId: userId,
        type: 'probation_review',
        title: 'Week 1 Probation Review',
        dueDate: admin.firestore.Timestamp.fromDate(milestones.week1),
        status: 'scheduled',
        questionnaireCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        milestone: 'week1',
        description: 'Initial probation review to assess training progress and adaptation to role.',
      });
    }

    if (!newData.trainingProgress?.week4Supervision && now <= milestones.week4) {
      batch.set(admin.firestore().collection('supervisions').doc(), {
        staffId: userId,
        type: 'supervision',
        title: 'Week 4 Supervision',
        dueDate: admin.firestore.Timestamp.fromDate(milestones.week4),
        status: 'scheduled',
        questionnaireCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        milestone: 'week4',
        description: 'First month supervision to review training completion and identify any support needs.',
      });
    }

    if (!newData.trainingProgress?.week8Review && now <= milestones.week8) {
      batch.set(admin.firestore().collection('supervisions').doc(), {
        staffId: userId,
        type: 'probation_review',
        title: 'Week 8 Probation Review',
        dueDate: admin.firestore.Timestamp.fromDate(milestones.week8),
        status: 'scheduled',
        questionnaireCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        milestone: 'week8',
        description: 'Mid-probation review to assess progress and address any concerns.',
      });
    }

    if (!newData.trainingProgress?.week12Supervision && now <= milestones.week12) {
      batch.set(admin.firestore().collection('supervisions').doc(), {
        staffId: userId,
        type: 'supervision',
        title: 'Week 12 Supervision',
        dueDate: admin.firestore.Timestamp.fromDate(milestones.week12),
        status: 'scheduled',
        questionnaireCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        milestone: 'week12',
        description: 'End of probation supervision to review overall progress and confirm permanent status.',
      });
    }

    // Create notifications for upcoming milestones
    const notifications = [];
    for (const [milestone, date] of Object.entries(milestones)) {
      if (now <= date) {
        notifications.push({
          userId,
          type: 'training_milestone',
          title: `Upcoming ${milestone.replace(/week/, 'Week ')} Review`,
          message: `Your ${milestone.replace(/week/, 'Week ')} ${
            milestone === 'week1' || milestone === 'week8' ? 'probation review' : 'supervision'
          } is scheduled for ${date.toLocaleDateString()}`,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          link: '/supervision',
        });
      }
    }

    // Add notifications to batch
    notifications.forEach(notification => {
      batch.set(admin.firestore().collection('notifications').doc(), notification);
    });

    // Commit all changes
    await batch.commit();
  });

// Update training progress when supervision is completed
export const updateTrainingProgress = functions.firestore
  .document('supervisions/{supervisionId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    // Only process if supervision was just completed
    if (newData.status === 'completed' && previousData.status !== 'completed' && newData.milestone) {
      const userRef = admin.firestore().collection('users').doc(newData.staffId);
      
      // Update the corresponding milestone in trainingProgress
      const progressUpdate = {
        [`trainingProgress.${newData.milestone}${
          newData.type === 'probation_review' ? 'Review' : 'Supervision'
        }`]: true,
      };

      await userRef.update(progressUpdate);

      // If this was the week 12 supervision, update probation status
      if (newData.milestone === 'week12') {
        await userRef.update({
          probationStatus: 'completed',
        });
      }
    }
  });
