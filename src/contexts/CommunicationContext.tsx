import React, { createContext, useContext, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { CommunicationEntry, CommunicationComment, CommunicationFilter, AIEnhancementType } from '../types/communication';
import { enhanceWithAI } from '../utils/geminiAI';

interface CommunicationContextType {
  sendMessage: (data: MassMessageData) => Promise<any>;
  addEntry: (entry: Omit<CommunicationEntry, 'id' | 'date' | 'lastModified' | 'comments'>) => Promise<string>;
  updateEntry: (id: string, updates: Partial<CommunicationEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addComment: (entryId: string, comment: Omit<CommunicationComment, 'id' | 'entryId' | 'createdAt'>) => Promise<string>;
  getEntries: (filter?: CommunicationFilter) => Promise<CommunicationEntry[]>;
  enhanceContent: (content: string, type: AIEnhancementType) => Promise<string>;
  loading: boolean;
  error: string | null;
}

interface MassMessageData {
  type: 'email' | 'sms' | 'both';
  subject: string;
  message: string;
  recipients?: string[];
  recipientGroups?: string[];
  template?: string;
  variables?: {
    [key: string]: string;
  };
  site?: string;
}

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

export const useCommunication = () => {
  const context = useContext(CommunicationContext);
  if (!context) {
    throw new Error('useCommunication must be used within a CommunicationProvider');
  }
  return context;
};

export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, userData, isAdmin } = useAuth();
  const functions = getFunctions();

  // Helper function to create notifications
  const createNotification = async (userId: string, title: string, message: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };

  // AI enhancement function
  const enhanceContent = async (content: string, type: AIEnhancementType): Promise<string> => {
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const enhancedContent = await enhanceWithAI({ type, content });
      return enhancedContent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mass messaging function
  const sendMessage = async (data: MassMessageData) => {
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const sendMassMessage = httpsCallable(functions, 'sendMassMessage');
      const result = await sendMassMessage({
        ...data,
        site: data.site || userData?.site || '',
      });
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Communication book functions
  const addEntry = async (entry: Omit<CommunicationEntry, 'id' | 'date' | 'lastModified' | 'comments'>) => {
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const newEntry = {
        ...entry,
        date: now,
        lastModified: now,
        comments: [],
        createdBy: currentUser.uid,
        site: entry.site || userData?.site || '',
      };

      const docRef = await addDoc(collection(db, 'communicationBook'), newEntry);

      if (entry.assignedTo) {
        await createNotification(
          entry.assignedTo,
          'New Communication Entry',
          `You have been assigned to: ${entry.subject}`
        );
      }

      return docRef.id;
    } catch (err) {
      console.error('Error adding entry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (id: string, updates: Partial<CommunicationEntry>) => {
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const entryRef = doc(db, 'communicationBook', id);
      await updateDoc(entryRef, {
        ...updates,
        lastModified: new Date().toISOString(),
        site: updates.site || userData?.site || '',
      });
    } catch (err) {
      console.error('Error updating entry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      await deleteDoc(doc(db, 'communicationBook', id));
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (entryId: string, comment: Omit<CommunicationComment, 'id' | 'entryId' | 'createdAt'>) => {
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const newComment = {
        ...comment,
        entryId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'communicationComments'), newComment);
      
      // Update the lastModified timestamp of the parent entry
      await updateDoc(doc(db, 'communicationBook', entryId), {
        lastModified: new Date().toISOString()
      });

      return docRef.id;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getEntries = async (filter?: CommunicationFilter) => {
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      let baseQuery = query(collection(db, 'communicationBook'));

      // Apply site-based filtering
      if (isAdmin) {
        // Admin can see all entries
        baseQuery = query(collection(db, 'communicationBook'), orderBy('date', 'desc'));
      } else if (userData?.role === 'manager' && userData.sites) {
        // Manager can only see entries for their sites
        baseQuery = query(
          collection(db, 'communicationBook'),
          where('site', 'in', userData.sites),
          orderBy('date', 'desc')
        );
      } else {
        // Staff can only see entries for their site
        baseQuery = query(
          collection(db, 'communicationBook'),
          where('site', '==', userData?.site || ''),
          orderBy('date', 'desc')
        );
      }

      const querySnapshot = await getDocs(baseQuery);
      const entries: CommunicationEntry[] = [];

      for (const doc of querySnapshot.docs) {
        // Get comments for this entry
        const commentsQuery = query(
          collection(db, 'communicationComments'),
          where('entryId', '==', doc.id),
          orderBy('createdAt', 'asc')
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        
        const comments = commentsSnapshot.docs.map(commentDoc => ({
          id: commentDoc.id,
          ...commentDoc.data()
        })) as CommunicationComment[];

        const entry = {
          id: doc.id,
          ...doc.data(),
          comments
        } as CommunicationEntry;

        // Apply additional filters in memory
        if (filter) {
          let include = true;

          if (filter.tags && filter.tags.length > 0) {
            include = entry.tags.some(tag => filter.tags?.includes(tag));
          }

          if (include && filter.status) {
            include = entry.status === filter.status;
          }

          if (include && filter.assignedTo) {
            include = entry.assignedTo === filter.assignedTo;
          }

          if (include && filter.searchQuery) {
            const searchLower = filter.searchQuery.toLowerCase();
            include = entry.subject.toLowerCase().includes(searchLower) ||
                     entry.details.toLowerCase().includes(searchLower);
          }

          if (include && filter.site) {
            include = entry.site === filter.site;
          }

          if (include) {
            entries.push(entry);
          }
        } else {
          entries.push(entry);
        }
      }

      return entries;
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    sendMessage,
    addEntry,
    updateEntry,
    deleteEntry,
    addComment,
    getEntries,
    enhanceContent,
    loading,
    error,
  };

  return (
    <CommunicationContext.Provider value={value}>
      {children}
    </CommunicationContext.Provider>
  );
};
