import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getChatResponse } from '../utils/geminiAI';
import {
  ChatMessage,
  ChatFeedback,
  HelpTopic,
  ChatState,
  ChatContextValue,
  DEFAULT_HELP_TOPICS
} from '../types/chat';

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  selectedTopic: null,
  helpTopics: DEFAULT_HELP_TOPICS,
};

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SELECT_TOPIC'; payload: HelpTopic }
  | { type: 'CLEAR_CHAT' };

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SELECT_TOPIC':
      return { ...state, selectedTopic: action.payload };
    case 'CLEAR_CHAT':
      return { ...initialState, helpTopics: state.helpTopics };
    default:
      return state;
  }
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const context = state.selectedTopic 
        ? `Topic: ${state.selectedTopic.title}\n${state.selectedTopic.description}`
        : '';
      
      const aiResponse = await getChatResponse(content, context);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to get response. Please try again.',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.selectedTopic]);

  const provideFeedback = useCallback(async (feedback: ChatFeedback) => {
    // TODO: Implement feedback storage in Firebase
    console.log('Feedback received:', feedback);
  }, []);

  const selectTopic = useCallback((topic: HelpTopic) => {
    dispatch({ type: 'SELECT_TOPIC', payload: topic });
  }, []);

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_CHAT' });
  }, []);

  const value: ChatContextValue = {
    state,
    sendMessage,
    provideFeedback,
    selectTopic,
    clearChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
