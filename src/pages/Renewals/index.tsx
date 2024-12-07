import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useTraining } from '../../contexts/TrainingContext';
import PageHeader from '../../components/Common/PageHeader';
import StatsCard from '../../components/Common/StatsCard';
import { TrainingRecord } from '../../types';
import { format, differenceInDays } from 'date-fns';
import { COMPLIANCE_COURSES } from '../../utils/excelParser';

const RenewalsPage: React.FC = () => {
  const { trainingRecords, loading } = useTraining();

  // Filter records to only show compliance courses
  const complianceRecords = useMemo(() => 
    trainingRecords.filter(record => 
      record.recordType === 'compliance' && 
      COMPLIANCE_COURSES.includes(record.courseTitle)
    ),
    [trainingRecords]
  );

  // Calculate stats
  const stats = useMemo(() => ({
    total: complianceRecords.length,
    valid: complianceRecords.filter(r => r.status === 'valid').length,
    expiring: complianceRecords.filter(r => r.status === 'expiring').length,
    expired: complianceRecords.filter(r => r.status === 'expired').length,
  }), [complianceRecords]);

  const renderComplianceCard = (record: TrainingRecord) => {
    const daysUntilExpiry = differenceInDays(new Date(record.expiryDate), new Date());
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'valid':
          return 'success';
        case 'expiring':
          return 'warning';
        case 'expired':
          return 'error';
        default:
          return 'default';
      }
    };

    return (
      <Grid item xs={12} sm={6} md={4} key={record.id}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="h6" gutterBottom>
                {record.courseTitle}
              </Typography>
              <Chip
                label={record.status}
                color={getStatusColor(record.status)}
                size="small"
              />
            </Box>

            <Typography variant="body2" color="textSecondary">
              Staff: {record.staffName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Completion Date: {format(new Date(record.completionDate || new Date()), 'MMM d, yyyy')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Expiry Date: {format(new Date(record.expiryDate), 'MMM d, yyyy')}
            </Typography>

            {record.status !== 'valid' && (
              <Typography 
                variant="body2" 
                color="error" 
                sx={{ mt: 1 }}
              >
                {record.status === 'expired' 
                  ? 'Course has expired'
                  : `Expires in ${daysUntilExpiry} days`
                }
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <PageHeader
        title="Compliance Renewals"
        subtitle="Track and manage compliance training renewals"
        helpText="Monitor staff compliance training status and upcoming renewals."
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Courses"
            mainStat={stats.total}
            mainLabel="Total"
            icon={<AssessmentIcon />}
            severity="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Valid"
            mainStat={stats.valid}
            mainLabel="Up to date"
            icon={<CheckCircleIcon />}
            severity="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Expiring Soon"
            mainStat={stats.expiring}
            mainLabel="Need renewal"
            icon={<WarningIcon />}
            severity="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Expired"
            mainStat={stats.expired}
            mainLabel="Overdue"
            icon={<ErrorIcon />}
            severity="error"
          />
        </Grid>
      </Grid>

      {/* Compliance Records */}
      {complianceRecords.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography color="textSecondary">
            No compliance records found.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {complianceRecords.map(renderComplianceCard)}
        </Grid>
      )}
    </Box>
  );
};

export default RenewalsPage;
