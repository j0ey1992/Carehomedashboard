import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  Timestamp,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Task } from '../types';
import { createNotification } from '../utils/notifications';

interface FirestoreTask extends Omit<Task, 'dueDate' | 'createdAt' | 'updatedAt' | 'completedAt' | 'id'> {
  dueDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  site?: string;
}

// Helper function to convert Task to FirestoreTask
const toFirestoreTask = (task: Partial<Task>): Partial<FirestoreTask> => {
  const { dueDate, createdAt, updatedAt, completedAt, id, ...rest } = task;
  const firestoreTask: Partial<FirestoreTask> = { ...rest };

  if (dueDate) {
    firestoreTask.dueDate = Timestamp.fromDate(dueDate);
  }
  if (createdAt) {
    firestoreTask.createdAt = Timestamp.fromDate(createdAt);
  }
  if (updatedAt) {
    firestoreTask.updatedAt = Timestamp.fromDate(updatedAt);
  }
  if (completedAt) {
    firestoreTask.completedAt = Timestamp.fromDate(completedAt);
  }

  return firestoreTask;
};

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createTaskFromTraining: (
    staffId: string,
    staffName: string,
    courseTitle: string,
    dueDate: Date,
    priority: Task['priority']
  ) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser || !userData) return;

    let q;

    if (isAdmin) {
      // Admin can see all tasks
      q = query(
        collection(db, 'tasks'),
        orderBy('dueDate', 'asc')
      );
    } else if (userData.role === 'manager' && userData.sites) {
      // Manager can only see tasks for their sites
      q = query(
        collection(db, 'tasks'),
        where('site', 'in', userData.sites),
        orderBy('dueDate', 'asc')
      );
    } else {
      // Staff can only see tasks assigned to them
      q = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', currentUser.uid),
        orderBy('dueDate', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const taskData: Task[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const task: Task = {
            id: doc.id,
            title: data.title,
            description: data.description,
            dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.dueDate),
            priority: data.priority,
            status: data.status,
            assignedTo: data.assignedTo,
            category: data.category,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
            completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : 
                        data.completedAt ? new Date(data.completedAt) : undefined,
            relatedRecordId: data.relatedRecordId,
            relatedRecordType: data.relatedRecordType,
            site: data.site,
          };
          taskData.push(task);
        });

        setTasks(taskData);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Error processing tasks:', err);
        setError(err instanceof Error ? err : new Error('Failed to process tasks'));
        setLoading(false);
      }
    }, (err) => {
      console.error('Error subscribing to tasks:', err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userData, isAdmin]);

  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date();
      const firestoreTask = toFirestoreTask({
        ...task,
        createdAt: now,
        updatedAt: now,
        site: task.site || userData?.site || '',
      });

      await addDoc(collection(db, 'tasks'), firestoreTask);

      // Create notification for assigned user
      if (task.assignedTo) {
        await createNotification(
          task.assignedTo,
          'task',
          'New Task Assigned',
          `You have been assigned a new task: ${task.title}`,
          '/tasks'
        );
      }
    } catch (err) {
      console.error('Error adding task:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    try {
      const docRef = doc(db, 'tasks', id);
      const now = new Date();
      const updateData = toFirestoreTask({
        ...data,
        updatedAt: now,
        ...(data.status === 'completed' && !data.completedAt ? { completedAt: now } : {}),
      });

      await updateDoc(docRef, updateData);

      // Create notification for status changes
      if (data.status) {
        const task = tasks.find(t => t.id === id);
        if (task?.assignedTo) {
          await createNotification(
            task.assignedTo,
            'task',
            'Task Status Updated',
            `Task "${task.title}" has been marked as ${data.status}`,
            '/tasks'
          );
        }
      }
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const createTaskFromTraining = async (
    staffId: string,
    staffName: string,
    courseTitle: string,
    dueDate: Date,
    priority: Task['priority']
  ) => {
    try {
      const task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        title: `Book ${courseTitle} for ${staffName}`,
        description: `Management task to book ${courseTitle} training for ${staffName}`,
        dueDate,
        priority,
        status: 'pending',
        assignedTo: currentUser?.uid,
        category: 'training',
        site: userData?.site || '',
      };

      await addTask(task);
    } catch (err) {
      console.error('Error creating task from training:', err);
      throw err;
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        addTask,
        updateTask,
        deleteTask,
        createTaskFromTraining,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
