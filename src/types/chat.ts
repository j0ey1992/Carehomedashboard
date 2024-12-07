export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatFeedback {
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  timestamp: Date;
}

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  suggestedPrompts: string[];
}

export const DEFAULT_HELP_TOPICS: HelpTopic[] = [
  {
    id: 'smart-goals',
    title: 'SMART Goals',
    description: 'Guidance on creating and reviewing SMART goals for people we support',
    suggestedPrompts: [
      'How can I create SMART goals for a person we support?',
      'What makes a goal SMART in brain injury rehabilitation?',
      'How often should I review SMART goals?'
    ]
  },
  {
    id: 'headway-standards',
    title: 'Headway Standards',
    description: 'Information about Headway accreditation standards and requirements',
    suggestedPrompts: [
      'What are the Headway standards for supporting someone with a brain injury?',
      'How do I ensure compliance with Headway accreditation?',
      'What documentation is required for Headway standards?'
    ]
  },
  {
    id: 'uk-laws',
    title: 'UK Healthcare Laws',
    description: 'Guidance on relevant UK healthcare laws and regulations',
    suggestedPrompts: [
      'What steps should I take to ensure compliance with the Mental Capacity Act 2005?',
      'How do I apply the Care Act 2014 in my daily work?',
      'What are my responsibilities under the Health and Social Care Act?'
    ]
  },
  {
    id: 'best-practices',
    title: 'Care Best Practices',
    description: 'Best practices for supporting people with brain injuries',
    suggestedPrompts: [
      'What are the best practices for supporting someone with memory difficulties?',
      'How can I help someone manage their fatigue?',
      'What strategies work well for emotional regulation support?'
    ]
  }
];

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  selectedTopic: HelpTopic | null;
  helpTopics: HelpTopic[];
}

export interface ChatContextValue {
  state: ChatState;
  sendMessage: (content: string) => Promise<void>;
  provideFeedback: (feedback: ChatFeedback) => Promise<void>;
  selectTopic: (topic: HelpTopic) => void;
  clearChat: () => void;
}
