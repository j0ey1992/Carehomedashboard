import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  Card,
  CardContent,
  CircularProgress,
  Rating,
  useTheme,
  alpha,
  styled,
  Button,
  Tooltip,
  Fade,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import { useChat } from '../../contexts/ChatContext';
import { ChatMessage, HelpTopic } from '../../types/chat';

// ADHD-friendly styled components
const MessageContainer = styled(Box)(({ theme }) => ({
  maxHeight: '60vh',
  overflowY: 'auto',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  // Smooth scrolling for better focus
  scrollBehavior: 'smooth',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: alpha(theme.palette.primary.main, 0.05),
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.primary.main, 0.2),
    borderRadius: '4px',
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.3),
    },
  },
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  maxWidth: '80%',
  wordWrap: 'break-word',
  // Softer, more soothing colors for chat bubbles
  backgroundColor: isUser 
    ? alpha(theme.palette.primary.main, 0.1) 
    : alpha(theme.palette.secondary.light, 0.1),
  color: theme.palette.text.primary,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  borderRadius: '16px',
  // Gentle shadow for depth
  boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.05)}`,
  // Smooth transition for hover effect
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: `0 4px 8px ${alpha(theme.palette.common.black, 0.1)}`,
  },
  // Enhanced typography styling
  '& strong': {
    fontWeight: 600,
    display: 'block',
    marginBottom: theme.spacing(1),
    color: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
  },
  '& ul, & ol': {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    paddingLeft: theme.spacing(3),
  },
  '& li': {
    marginBottom: theme.spacing(1),
    lineHeight: 1.6,
  },
  '& p': {
    marginBottom: theme.spacing(1),
    lineHeight: 1.6,
  },
}));

const TopicCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  borderRadius: '12px',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
}));

// Enhanced message formatting
const formatMessage = (content: string) => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*\*\s(.*)$/gm, '<ul><li>$1</li></ul>')
    .replace(/^\s*(\d+)\.\s(.*)$/gm, '<ol><li>$2</li></ol>')
    .split('\n\n').join('</p><p>')
    .split('\n').join('<br />');
};

const ChatPage: React.FC = () => {
  const theme = useTheme();
  const { state, sendMessage, provideFeedback, selectTopic, clearChat } = useChat();
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleTopicSelect = (topic: HelpTopic) => {
    selectTopic(topic);
    if (topic.suggestedPrompts.length > 0) {
      setInputMessage(topic.suggestedPrompts[0]);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Help Topics Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: '16px',
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(8px)',
            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                color: 'primary.main',
                fontWeight: 600,
                mb: 3,
                borderBottom: '2px solid',
                borderColor: 'primary.light',
                pb: 1,
              }}
            >
              Help Topics
            </Typography>
            <List sx={{ '& > *': { mb: 2 } }}>
              {state.helpTopics.map((topic: HelpTopic) => (
                <TopicCard
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic)}
                  sx={{
                    bgcolor: state.selectedTopic?.id === topic.id 
                      ? (theme) => alpha(theme.palette.primary.main, 0.08)
                      : 'background.paper',
                    borderLeft: state.selectedTopic?.id === topic.id ? 4 : 0,
                    borderLeftColor: 'primary.main',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="subtitle1"
                      sx={{ 
                        color: state.selectedTopic?.id === topic.id 
                          ? 'primary.main' 
                          : 'text.primary',
                        fontWeight: 500,
                        mb: 1,
                      }}
                    >
                      {topic.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        opacity: 0.8,
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {topic.description}
                    </Typography>
                  </CardContent>
                </TopicCard>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={9}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              height: '80vh',
              borderRadius: '16px',
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(8px)',
              boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
            }}
          >
            {/* Messages */}
            <MessageContainer>
              <Box display="flex" flexDirection="column">
                {state.messages.map((message: ChatMessage) => (
                  <Fade in timeout={400} key={message.id}>
                    <Box>
                      <MessageBubble isUser={message.role === 'user'}>
                        <Typography 
                          component="div" 
                          sx={{ 
                            fontSize: '1rem',
                            lineHeight: 1.6,
                          }}
                        >
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: `<p>${formatMessage(message.content)}</p>` 
                            }} 
                          />
                        </Typography>
                        {message.role === 'assistant' && (
                          <Box 
                            mt={1}
                            sx={{
                              opacity: 0.8,
                              transition: 'opacity 0.2s ease',
                              '&:hover': { opacity: 1 },
                            }}
                          >
                            <Rating
                              size="small"
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
                                  color: 'primary.main',
                                },
                                '& .MuiRating-iconHover': {
                                  color: 'primary.light',
                                },
                              }}
                            />
                          </Box>
                        )}
                      </MessageBubble>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          textAlign: message.role === 'user' ? 'right' : 'left',
                          mb: 1,
                          opacity: 0.7,
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                        }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Fade>
                ))}
              </Box>
            </MessageContainer>

            {/* Input Area */}
            <Box 
              sx={{ 
                mt: 'auto', 
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <form onSubmit={handleSendMessage}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={state.isLoading}
                      multiline
                      maxRows={4}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: (theme) => 
                            alpha(theme.palette.background.paper, 0.6),
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: (theme) => 
                              alpha(theme.palette.background.paper, 0.8),
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'background.paper',
                            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Send message">
                        <IconButton
                          color="primary"
                          type="submit"
                          disabled={!inputMessage.trim() || state.isLoading}
                          sx={{
                            backgroundColor: (theme) => 
                              alpha(theme.palette.primary.main, 0.1),
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: (theme) => 
                                alpha(theme.palette.primary.main, 0.2),
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          {state.isLoading ? (
                            <CircularProgress size={24} />
                          ) : (
                            <SendIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Clear chat">
                        <IconButton
                          color="error"
                          onClick={clearChat}
                          disabled={state.isLoading}
                          sx={{
                            backgroundColor: (theme) => 
                              alpha(theme.palette.error.main, 0.1),
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: (theme) => 
                                alpha(theme.palette.error.main, 0.2),
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ChatPage;