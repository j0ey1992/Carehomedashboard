import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from '../../components/Dashboard/AdminDashboard';
import ManagerDashboard from '../../components/Dashboard/ManagerDashboard';
import StaffDashboard from '../../components/Dashboard/StaffDashboard';

const Dashboard: React.FC = () => {
  const { userData, isAdmin, isSiteManager, isStaff } = useAuth();

  if (!userData) {
    return null;
  }

  // Render appropriate dashboard based on user role
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isSiteManager) {
    return <ManagerDashboard />;
  }

  if (isStaff) {
    return <StaffDashboard />;
  }

  return null;
};

export default Dashboard;
