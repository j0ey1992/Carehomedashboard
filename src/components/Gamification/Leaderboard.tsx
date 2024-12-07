import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from '@mui/material';
import { useGamification } from '../../contexts/GamificationContext';
import { useAuth } from '../../contexts/AuthContext';

const Leaderboard: React.FC = () => {
  const { leaderboard, getRankInfo } = useGamification();
  const { currentUser } = useAuth();

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Training Leaderboard
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Staff Member</TableCell>
              <TableCell>Points</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Badge</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboard.map((stats, index) => {
              const rank = getRankInfo(stats.points);
              const isCurrentUser = stats.userId === currentUser?.uid;
              
              return (
                <TableRow 
                  key={stats.userId}
                  sx={{
                    backgroundColor: isCurrentUser ? 'action.selected' : 'inherit',
                    '&:hover': {
                      backgroundColor: isCurrentUser ? 'action.selected' : 'action.hover',
                    },
                  }}
                >
                  <TableCell>
                    <Chip 
                      label={`#${index + 1}`}
                      size="small"
                      color={index < 3 ? 'primary' : 'default'}
                      variant={index < 3 ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>{stats.userId}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {stats.points}
                      {index === 0 && '👑'}
                    </Box>
                  </TableCell>
                  <TableCell>{rank.title}</TableCell>
                  <TableCell>{rank.badge}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default Leaderboard;
