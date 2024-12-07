export interface CommunicationEntry {
  id: string;
  date: string;
  subject: string;
  details: string;
  tags: string[];
  attachments?: string[];
  assignedTo?: string;
  createdBy: string;
  visibility: 'public' | 'restricted';
  status: 'open' | 'in-progress' | 'resolved';
  lastModified: string;
  comments: CommunicationComment[];
  aiEnhanced?: boolean;
  originalContent?: string;
  site?: string;
}

export interface CommunicationComment {
  id: string;
  entryId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  attachments?: string[];
  aiEnhanced?: boolean;
  originalContent?: string;
}

export interface CommunicationFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  assignedTo?: string;
  status?: 'open' | 'in-progress' | 'resolved';
  searchQuery?: string;
  site?: string;
}

export const DEFAULT_TAGS = [
  'Urgent',
  'Follow-Up',
  'General',
  'Maintenance',
  'Medical',
  'Resident Care',
  'Staff',
  'Training'
];

export type AIEnhancementType = 'summarize' | 'improve';
