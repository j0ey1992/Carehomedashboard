import React, { useState, useMemo } from 'react';
import { Box, Fade } from '@mui/material';
import PageHeader from '../../components/Common/PageHeader';
import { useCompliance } from '../../contexts/ComplianceContext';
import { useAuth } from '../../contexts/AuthContext';
import useData from '../../hooks/useData';
import { User } from '../../types';
import { 
  StaffCompliance, 
  ComplianceItem, 
  DynamicComplianceItem,
  HealthCheckItem,
  CompetencyItem 
} from '../../types/compliance';
import { default as ComplianceTableComponent } from '../../components/Compliance/ComplianceTable';
import ComplianceAchievements from '../../components/Compliance/ComplianceAchievements';
import ComplianceHeader from '../../components/Compliance/ComplianceHeader';

interface ComplianceRecord extends StaffCompliance {
  userId: string;
}

const CompliancePage = () => {
  const {
    updateCompliance,
    uploadEvidence,
    addDynamicItem,
    completeItem,
    allStaffCompliance,
  } = useCompliance();
  const { data: users = [] } = useData<User>('users');
  const { userData } = useAuth();

  // State
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Convert StaffCompliance[] to ComplianceRecord[]
  const complianceRecords = useMemo(() => 
    allStaffCompliance.map(record => ({
      ...record,
      userId: record.userId || '',
    })) as ComplianceRecord[],
  [allStaffCompliance]);

  // Filter data based on user role and site
  const filteredData = useMemo(() => {
    if (!userData) return { users: [], complianceRecords: [] };

    switch (userData.role) {
      case 'admin':
        return { users, complianceRecords };
      case 'manager':
        const managerSiteUsers = users.filter(user => user.site === userData.site);
        const managerSiteRecords = complianceRecords.filter(record =>
          managerSiteUsers.some(user => user.id === record.userId)
        );
        return { users: managerSiteUsers, complianceRecords: managerSiteRecords };
      case 'staff':
        const staffUser = users.filter(user => user.id === userData.id);
        const staffRecords = complianceRecords.filter(record => record.userId === userData.id);
        return { users: staffUser, complianceRecords: staffRecords };
      default:
        return { users: [], complianceRecords: [] };
    }
  }, [users, complianceRecords, userData]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredData.users.length || 10; // Use actual user count or default to 10
    let upToDate = 0;
    let expired = total; // Initially all records are expired

    filteredData.complianceRecords.forEach(record => {
      // Get all compliance fields excluding userId and site
      const complianceFields = Object.entries(record)
        .filter(([key]) => key !== 'userId' && key !== 'site' && key !== 'dynamicItems')
        .map(([_, value]) => value?.status);

      // Include dynamic items in status calculation
      const dynamicStatuses: string[] = [];
      if (record.dynamicItems) {
        Object.values(record.dynamicItems).forEach(item => {
          if (item?.status) dynamicStatuses.push(item.status);
        });
      }

      // Combine all statuses
      const allStatuses = [...complianceFields, ...dynamicStatuses];

      // A record is valid only if all items are valid
      const allValid = allStatuses.length > 0 && allStatuses.every(status => status === 'valid');

      if (allValid) {
        upToDate++;
        expired--;
      }
    });

    // Calculate completion rate
    const completionRate = (upToDate / total) * 100;

    return {
      total,
      upToDate,
      expired,
      completionRate,
    };
  }, [filteredData]);

  // Calculate achievements
  const achievements = useMemo(() => {
    const allCompliant = stats.expired === 0;
    const highCompletion = stats.completionRate >= 90;
    const noExpired = stats.expired === 0;

    return {
      perfectScore: allCompliant,
      achiever: highCompletion,
      noExpired,
      totalAchievements: [allCompliant, highCompletion, noExpired].filter(Boolean).length,
    };
  }, [stats]);

  const handleEdit = async (userId: string, field: keyof StaffCompliance) => {
    if (!userData) return;

    const canEdit =
      userData.role === 'admin' ||
      (userData.role === 'manager' && filteredData.users.some(u => u.id === userId)) ||
      (userData.role === 'staff' && userData.id === userId);

    if (!canEdit) return;
  };

  const handleFileUpload = async (field: keyof StaffCompliance, file: File) => {
    if (!userData?.id) return;

    const canUpload =
      userData.role === 'admin' ||
      userData.role === 'manager' ||
      (userData.role === 'staff' && field !== 'dbsCheck');

    if (!canUpload) return;

    setUploading(true);

    try {
      await uploadEvidence(userData.id, field, file);
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleAddTask = (userId: string) => {
    if (!userData) return;

    const canAddTask =
      userData.role === 'admin' ||
      (userData.role === 'manager' && filteredData.users.some(u => u.id === userId));

    if (!canAddTask) return;

    console.log('Adding task for user:', userId);
  };

  const handleUpdateCompliance = async (
    userId: string, 
    field: keyof StaffCompliance, 
    data: ComplianceItem | HealthCheckItem | CompetencyItem
  ) => {
    if (!userData) return;

    const canUpdate =
      userData.role === 'admin' ||
      (userData.role === 'manager' && filteredData.users.some(u => u.id === userId)) ||
      (userData.role === 'staff' && userData.id === userId && field !== 'dbsCheck');

    if (!canUpdate) return;

    try {
      // Get current compliance record
      const currentRecord = complianceRecords.find(record => record.userId === userId);
      if (!currentRecord) return;

      // Create update data with userId and site
      const updateData: StaffCompliance = {
        userId,
        site: currentRecord.site,
        [field]: {
          ...data,
        },
      };

      await updateCompliance(userId, updateData);
    } catch (err) {
      console.error('Error updating compliance:', err);
    }
  };

  const handleCreateDynamicCompliance = async (data: Omit<DynamicComplianceItem, 'date' | 'expiryDate' | 'status' | 'evidence'>) => {
    if (!userData || !userData.id) return;

    const canCreate = userData.role === 'admin' || userData.role === 'manager';
    if (!canCreate) return;

    try {
      await addDynamicItem(userData.id, data);
    } catch (err) {
      console.error('Error creating dynamic compliance:', err);
    }
  };

  const handleComplete = async (userId: string, field: keyof StaffCompliance) => {
    if (!userData) return;

    const canComplete =
      userData.role === 'admin' ||
      (userData.role === 'manager' && filteredData.users.some(u => u.id === userId)) ||
      (userData.role === 'staff' && userData.id === userId);

    if (!canComplete) return;

    try {
      await completeItem(userId, field);
    } catch (err) {
      console.error('Error completing item:', err);
    }
  };

  const pageTitle = userData?.role === 'admin' ? 'Staff Compliance' :
                   userData?.role === 'manager' ? `${userData.site} Staff Compliance` :
                   'My Compliance Records';

  const pageSubtitle = userData?.role === 'admin' ?
    `${stats.upToDate} of ${stats.total} staff members fully compliant` :
    userData?.role === 'manager' ?
    `${stats.upToDate} of ${stats.total} site staff members fully compliant` :
    'View and track your compliance records';

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Fade in timeout={600}>
        <Box>
          <PageHeader
            title={pageTitle}
            subtitle={pageSubtitle}
            helpText="Track and manage compliance records including DBS checks, health assessments, and required documentation."
          />

          <ComplianceAchievements achievements={achievements} />

          <Fade in timeout={800}>
            <Box>
              <ComplianceHeader
                stats={stats}
                userRole={userData?.role}
              />

              <ComplianceTableComponent
                users={filteredData.users}
                complianceRecords={filteredData.complianceRecords}
                hoveredRow={hoveredRow}
                onHoverChange={setHoveredRow}
                uploading={uploading}
                onEdit={handleEdit}
                onFileUpload={handleFileUpload}
                onAddTask={handleAddTask}
                onUpdateCompliance={handleUpdateCompliance}
                onCreateDynamicCompliance={handleCreateDynamicCompliance}
                onComplete={handleComplete}
              />
            </Box>
          </Fade>
        </Box>
      </Fade>
    </Box>
  );
};

export default CompliancePage;
