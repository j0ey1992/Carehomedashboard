import { addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';

export type NotificationType = 'training' | 'dols' | 'supervision' | 'task' | 'system' | 'course' | 'message';

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read?: boolean;
  timestamp?: any;
  scheduledFor?: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
}

interface SupervisionData {
  staffId: string;
  supervisorId: string;
  date: Date;
  questionnaireSent: boolean;
  questionnaireCompleted: boolean;
  notes?: string;
  completed: boolean;
}

// Function to create in-app notification
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  scheduledFor?: Date,
  recurring?: NotificationData['recurring']
) => {
  try {
    const notificationData: NotificationData = {
      userId,
      type,
      title,
      message,
      link,
      read: false,
      timestamp: serverTimestamp(),
    };

    // Only add scheduledFor and recurring if they are provided
    if (scheduledFor) {
      notificationData.scheduledFor = scheduledFor;
    }
    if (recurring) {
      notificationData.recurring = recurring;
    }

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Function to send email using Firebase Functions
export const sendEmail = async (
  email: string,
  subject: string,
  message: string,
  templateId?: string,
  templateData?: Record<string, any>
) => {
  try {
    const functions = getFunctions();
    const sendEmailFn = httpsCallable(functions, 'sendEmail');
    
    await sendEmailFn({
      email,
      subject,
      message,
      templateId,
      templateData,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Function to schedule supervision
export const scheduleSupervsion = async (
  staffId: string,
  supervisorId: string,
  date: Date,
  sendQuestionnaire: boolean = true
) => {
  try {
    // Create supervision record with proper date handling
    const supervisionData: SupervisionData = {
      staffId,
      supervisorId,
      date,
      questionnaireSent: false,
      questionnaireCompleted: false,
      completed: false,
    };

    // Add supervision record - this will trigger the Firebase function
    const supervisionRef = await addDoc(collection(db, 'supervisions'), supervisionData);

    // Return the ID for reference
    return supervisionRef.id;
  } catch (error) {
    console.error('Error scheduling supervision:', error);
    throw error;
  }
};

// Function to send supervision questionnaire
export const sendSupervisionQuestionnaire = async (
  staffId: string,
  supervisionId: string
) => {
  try {
    // Update supervision record to trigger the Firebase function
    await updateDoc(doc(db, 'supervisions', supervisionId), {
      questionnaireSent: true,
    });
  } catch (error) {
    console.error('Error sending questionnaire:', error);
    throw error;
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};
