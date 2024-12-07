import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Zoom,
  Fade,
  Tooltip,
  Badge,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Attachment as AttachmentIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Assignment as DoLSIcon,
} from '@mui/icons-material';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { format, addDays, isBefore, differenceInDays } from 'date-fns';
import { alpha, useTheme } from '@mui/material/styles';

interface DolsRecord {
  id: string;
  residentName: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  applicationDate: string;
  startDate: string;
  endDate: string;
  supervisingBody: string;
  assessor: string;
  documentUrl?: string;
  notes: string;
  urgencyLevel: 'standard' | 'urgent' | 'critical';
  reminderSent: boolean;
}

const DolsPage = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<DolsRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DolsRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    residentName: '',
    status: 'pending',
    applicationDate: '',
    startDate: '',
    endDate: '',
    supervisingBody: '',
    assessor: '',
    notes: '',
    urgencyLevel: 'standard',
  });

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'dols'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dolsData: DolsRecord[] = [];
      snapshot.forEach((doc) => {
        const record = { id: doc.id, ...doc.data() } as DolsRecord;
        
        // Calculate status based on dates
        const today = new Date();
        const endDate = new Date(record.endDate);
        const daysUntilExpiry = differenceInDays(endDate, today);

        if (record.status === 'active' && isBefore(endDate, today)) {
          record.status = 'expired';
        }

        // Set reminder flag if approaching expiry
        if (record.status === 'active' && daysUntilExpiry <= 30 && !record.reminderSent) {
          updateDoc(doc.ref, { reminderSent: true });
        }

        dolsData.push(record);
      });
      setRecords(dolsData.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()));
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Calculate achievements
  const achievements = useMemo(() => {
    const activeRecords = records.filter(r => r.status === 'active').length;
    const expiredRecords = records.filter(r => r.status === 'expired').length;
    const totalRecords = records.length;
    const completionRate = totalRecords > 0 ? ((totalRecords - expiredRecords) / totalRecords) * 100 : 100;

    return {
      perfectScore: completionRate === 100,
      hasActiveRecords: activeRecords > 0,
      noExpiredRecords: expiredRecords === 0,
      totalAchievements: [completionRate === 100, activeRecords > 0, expiredRecords === 0].filter(Boolean).length,
    };
  }, [records]);

  const renderAchievements = () => (
    <Fade in timeout={1000}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Tooltip title="All DoLS Up to Date" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.noExpiredRecords ? '✓' : ''}
            color="success"
          >
            <CheckCircleIcon 
              color={achievements.noExpiredRecords ? 'success' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="Active DoLS Manager" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.hasActiveRecords ? '✓' : ''}
            color="success"
          >
            <DoLSIcon 
              color={achievements.hasActiveRecords ? 'primary' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="Perfect DoLS Management" TransitionComponent={Zoom}>
          <Badge
            badgeContent={achievements.perfectScore ? '✓' : ''}
            color="success"
          >
            <StarIcon 
              color={achievements.perfectScore ? 'info' : 'disabled'} 
              sx={{ fontSize: 40 }}
            />
          </Badge>
        </Tooltip>
        {achievements.totalAchievements === 3 && (
          <Tooltip title="DoLS Champion!" TransitionComponent={Zoom}>
            <TrophyIcon 
              color="primary" 
              sx={{ 
                fontSize: 40,
                animation: 'bounce 1s infinite',
              }} 
            />
          </Tooltip>
        )}
      </Box>
    </Fade>
  );

  const handleOpen = (record?: DolsRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        residentName: record.residentName,
        status: record.status,
        applicationDate: record.applicationDate,
        startDate: record.startDate,
        endDate: record.endDate,
        supervisingBody: record.supervisingBody,
        assessor: record.assessor,
        notes: record.notes,
        urgencyLevel: record.urgencyLevel,
      });
    } else {
      setEditingRecord(null);
      setFormData({
        residentName: '',
        status: 'pending',
        applicationDate: format(new Date(), 'yyyy-MM-dd'),
        startDate: '',
        endDate: '',
        supervisingBody: '',
        assessor: '',
        notes: '',
        urgencyLevel: 'standard',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRecord(null);
    setSelectedFile(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      let documentUrl = editingRecord?.documentUrl;

      if (selectedFile) {
        const storageRef = ref(storage, `dols-documents/${selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        documentUrl = await getDownloadURL(snapshot.ref);
      }

      const dolsData = {
        ...formData,
        documentUrl,
        reminderSent: editingRecord?.reminderSent || false,
      };

      if (editingRecord) {
        await updateDoc(doc(db, 'dols', editingRecord.id), dolsData);
      } else {
        await addDoc(collection(db, 'dols'), dolsData);
      }
      handleClose();
    } catch (error) {
      console.error('Error saving DoLS record:', error);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      await deleteDoc(doc(db, 'dols', recordId));
    } catch (error) {
      console.error('Error deleting DoLS record:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'error';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'error';
      case 'urgent':
        return 'warning';
      case 'standard':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box p={3}>
      <Fade in timeout={800}>
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">DoLS Records</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              New DoLS Application
            </Button>
          </Box>

          {renderAchievements()}

          <Grid container spacing={3}>
            {records.map((record) => (
              <Grid item xs={12} sm={6} md={4} key={record.id}>
                <Zoom in timeout={300}>
                  <Card
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.3s ease',
                      transform: hoveredCard === record.id ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
                      boxShadow: hoveredCard === record.id ? 4 : 1,
                      bgcolor: record.status === 'active' ? alpha(theme.palette.success.main, 0.1) : 'background.paper',
                    }}
                    onMouseEnter={() => setHoveredCard(record.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="h6">
                            {record.residentName}
                          </Typography>
                          <Box>
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpen(record)}
                              sx={{
                                transition: 'transform 0.3s ease',
                                transform: hoveredCard === record.id ? 'scale(1.1)' : 'scale(1)',
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDelete(record.id)}
                              sx={{
                                transition: 'transform 0.3s ease',
                                transform: hoveredCard === record.id ? 'scale(1.1)' : 'scale(1)',
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Box display="flex" gap={1}>
                          <Chip
                            label={record.status}
                            color={getStatusColor(record.status)}
                            size="small"
                            sx={{ 
                              transition: 'transform 0.3s ease',
                              transform: hoveredCard === record.id ? 'scale(1.1)' : 'scale(1)',
                            }}
                          />
                          <Chip
                            label={record.urgencyLevel}
                            color={getUrgencyColor(record.urgencyLevel)}
                            size="small"
                            sx={{ 
                              transition: 'transform 0.3s ease',
                              transform: hoveredCard === record.id ? 'scale(1.1)' : 'scale(1)',
                            }}
                          />
                        </Box>

                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Application Date: {format(new Date(record.applicationDate), 'MMM d, yyyy')}
                          </Typography>
                          {record.startDate && (
                            <Typography variant="body2" color="textSecondary">
                              Start Date: {format(new Date(record.startDate), 'MMM d, yyyy')}
                            </Typography>
                          )}
                          {record.endDate && (
                            <Typography variant="body2" color="textSecondary">
                              End Date: {format(new Date(record.endDate), 'MMM d, yyyy')}
                            </Typography>
                          )}
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Supervising Body: {record.supervisingBody}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Assessor: {record.assessor}
                          </Typography>
                        </Box>

                        {record.notes && (
                          <Typography variant="body2">
                            Notes: {record.notes}
                          </Typography>
                        )}

                        {record.documentUrl && (
                          <Button
                            startIcon={<AttachmentIcon />}
                            size="small"
                            href={record.documentUrl}
                            target="_blank"
                            sx={{
                              transition: 'all 0.3s ease',
                              transform: hoveredCard === record.id ? 'scale(1.05)' : 'scale(1)',
                            }}
                          >
                            View Document
                          </Button>
                        )}

                        {record.status === 'active' && record.endDate && (
                          <Fade in>
                            <Alert 
                              severity={differenceInDays(new Date(record.endDate), new Date()) <= 30 ? 'warning' : 'info'}
                              sx={{ 
                                animation: differenceInDays(new Date(record.endDate), new Date()) <= 30 ? 'pulse 2s infinite' : 'none',
                              }}
                            >
                              {differenceInDays(new Date(record.endDate), new Date())} days until expiry
                            </Alert>
                          </Fade>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Fade>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRecord ? 'Edit DoLS Record' : 'New DoLS Application'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Resident Name"
                  fullWidth
                  required
                  value={formData.residentName}
                  onChange={(e) => setFormData({ ...formData, residentName: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Urgency Level</InputLabel>
                  <Select
                    value={formData.urgencyLevel}
                    label="Urgency Level"
                    onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value as any })}
                  >
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Application Date"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={formData.applicationDate}
                  onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Supervising Body"
                  fullWidth
                  value={formData.supervisingBody}
                  onChange={(e) => setFormData({ ...formData, supervisingBody: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Assessor"
                  fullWidth
                  value={formData.assessor}
                  onChange={(e) => setFormData({ ...formData, assessor: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AttachmentIcon />}
                  fullWidth
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.02)',
                    },
                  }}
                >
                  Upload Document
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </Button>
                {selectedFile && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Selected file: {selectedFile.name}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              {editingRecord ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </Box>
  );
};

export default DolsPage;
