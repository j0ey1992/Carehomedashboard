import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Rating,
  useTheme,
  alpha,
  styled,
  Tooltip,
  Fade,
  Chip,
  Fab,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useChat } from '../../contexts/ChatContext';
import { ChatMessage } from '../../types/chat';

const COMMON_QUESTIONS = [
  "How do I write a good care plan?",
  "What should I do in a medical emergency?",
  "How do I support independence?",
  "What are the medication guidelines?",
  "How do I document incidents properly?",
  "What are the safeguarding procedures?",
  "How do I help with emotional regulation?",
  "What are the best practices?",
];

const SuggestionChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0.12)} 100%)`,
  borderRadius: '20px',
  height: '36px',
  transition: 'all 0.3s ease',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
    background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.light, 0.18)} 100%)`,
  },
  '& .MuiChip-label': {
    fontSize: '0.95rem',
    fontWeight: 500,
    padding: theme.spacing(1, 2),
    color: theme.palette.primary.main,
  },
}));

const MessageContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  padding: theme.spacing(3),
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.primary.main, 0.1),
    borderRadius: '20px',
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.2),
    },
  },
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  padding: theme.spacing(2, 2.5),
  marginBottom: theme.spacing(1),
  maxWidth: '85%',
  wordWrap: 'break-word',
  background: isUser 
    ? `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0.12)} 100%)`
    : theme.palette.background.paper,
  color: theme.palette.text.primary,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  borderRadius: '20px',
  boxShadow: isUser 
    ? 'none'
    : `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`,
  border: `1px solid ${alpha(isUser ? theme.palette.primary.main : theme.palette.divider, 0.1)}`,
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
  },
}));

const StyledFab = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
  color: theme.palette.common.white,
  '&:hover': {
    background: `linear-gradient(45deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  },
}));

const formatMessage = (content: string) => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .split('\n').join('<br />');
};

const ChatPage: React.FC = () => {
  const theme = useTheme();
  const { state, sendMessage, provideFeedback } = useChat();
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messageEndRef = useRef<null | HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new (window as any).webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map(result => result.transcript)
          .join('');
        
        setInputMessage(transcript);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      recognition.current?.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
      setShowSuggestions(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInputMessage(question);
    setShowSuggestions(false);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Box sx={{ p: 3, pb: 2, background: `linear-gradient(to right, ${alpha(theme.palette.primary.main, 0.03)}, transparent)` }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 600, 
          mb: 1,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Ask Me Anything
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
          Type your question or choose from suggestions below
        </Typography>
      </Box>

      <MessageContainer>
        {/* Suggestions */}
        {showSuggestions && (
          <Fade in timeout={800}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1, 
              mb: 3,
              p: 2,
              borderRadius: '24px',
              background: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(10px)',
            }}>
              {COMMON_QUESTIONS.map((question, index) => (
                <SuggestionChip
                  key={index}
                  label={question}
                  onClick={() => handleQuestionClick(question)}
                  clickable
                />
              ))}
            </Box>
          </Fade>
        )}

        {/* Chat messages */}
        <Box display="flex" flexDirection="column">
          {state.messages.map((message: ChatMessage) => (
            <Fade in timeout={400} key={message.id}>
              <Box display="flex" flexDirection="column" alignItems={message.role === 'user' ? 'flex-end' : 'flex-start'}>
                <MessageBubble isUser={message.role === 'user'}>
                  <Typography variant="body1" sx={{ fontSize: '1rem', lineHeight: 1.6 }}>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: formatMessage(message.content)
                      }} 
                    />
                  </Typography>
                  {message.role === 'assistant' && (
                    <Box 
                      mt={1.5}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        opacity: 0.8,
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <Rating
                        size="medium"
                        onChange={(_, value) => {
                          if (value) {
                            provideFeedback({
                              messageId: message.id,
                              rating: value as 1 | 2 | 3 | 4 | 5,
                              timestamp: new Date(),
                            });
                          }
                        }}
                        sx={{
                          '& .MuiRating-iconFilled': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                      <Tooltip title="Listen to response">
                        <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
                          <VolumeUpIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </MessageBubble>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    mb: 1.5,
                    color: 'text.secondary',
                    fontSize: '0.8rem',
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </Fade>
          ))}
          <div ref={messageEndRef} />
        </Box>
      </MessageContainer>

      {/* Input Area */}
      <Box sx={{ 
        p: 2, 
        background: `linear-gradient(to top, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.paper, 0.7)})`,
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <form onSubmit={handleSendMessage}>
          <Box display="flex" gap={1} alignItems="center">
            <TextField
              fullWidth
              variant="outlined"
              placeholder={isListening ? 'Listening...' : 'Type your question or click the mic to talk...'}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={state.isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.background.paper, 0.95),
                  },
                  '&.Mui-focused': {
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                },
              }}
            />
            <IconButton
              color={isListening ? 'primary' : 'default'}
              onClick={toggleListening}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <MicIcon />
            </IconButton>
            <IconButton
              color="primary"
              type="submit"
              disabled={!inputMessage.trim() || state.isLoading}
              sx={{
                background: inputMessage.trim() ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})` : 'none',
                color: inputMessage.trim() ? 'white' : undefined,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  background: inputMessage.trim() ? `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` : 'none',
                },
              }}
            >
              {state.isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </Box>
        </form>
      </Box>

      {/* Floating Action Button for Suggestions */}
      {!showSuggestions && (
        <StyledFab 
          size="medium" 
          onClick={() => setShowSuggestions(true)}
          sx={{ transition: 'all 0.3s ease' }}
        >
          <LightbulbIcon />
        </StyledFab>
      )}
    </Box>
  );
};

export default ChatPage;
