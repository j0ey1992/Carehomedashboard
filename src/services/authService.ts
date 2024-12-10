import { getFunctions, httpsCallable } from 'firebase/functions';
import { StaffInfo } from '../utils/excelParser';
import { NewUserData } from '../types';

// Helper function to generate a consistent user ID
const generateUserId = (staffName: string): string => {
  return `user_${staffName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')}`;
};

export const createBulkAuthAccounts = async (
  staffMembers: StaffInfo[],
  userDataMap: { [key: string]: NewUserData }
) => {
  const functions = getFunctions();
  const createBulkAuthAccountsFn = httpsCallable<any, any>(functions, 'createBulkAuthAccounts');

  // Filter staff members that need auth accounts
  const newStaffMembers = staffMembers.filter(staff => staff.needsInfo);

  // Prepare users data for bulk creation
  const users = newStaffMembers.map(staff => {
    const userData = userDataMap[staff.name];
    return {
      userId: generateUserId(staff.name),
      email: userData.email,
      name: staff.name,
    };
  });

  if (users.length === 0) {
    return { success: [], failed: [] };
  }

  try {
    const result = await createBulkAuthAccountsFn({ users });
    return result.data as {
      success: string[];
      failed: { userId: string; error: string }[];
    };
  } catch (error) {
    console.error('Error creating bulk auth accounts:', error);
    throw error;
  }
};
