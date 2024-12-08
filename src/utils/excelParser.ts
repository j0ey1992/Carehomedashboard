import * as XLSX from 'xlsx';
import { addDays } from 'date-fns';
import { TrainingRecord, User, Task } from '../types';
import { collection, getDocs, query, where, doc, setDoc, Timestamp, addDoc, getDoc, FieldValue } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ShiftRole } from '../types/rota';
import {
  F2F_COURSES,
  TRAINING_COURSES,
  SUPERVISION_COURSES,
  COMPLIANCE_COURSES,
  DIRECT_COMPLETION_COURSES,
} from './courseConstants';

// Re-export the course constants for backward compatibility
export {
  F2F_COURSES,
  TRAINING_COURSES,
  SUPERVISION_COURSES,
  COMPLIANCE_COURSES,
  DIRECT_COMPLETION_COURSES,
} from './courseConstants';

// Helper function to ensure we have a Date object
const ensureDate = (value: Date | Timestamp | FieldValue | undefined): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return new Date();
};

interface ExcelRow {
  [key: string]: string | number | null;
}

export interface StaffInfo {
  name: string;
  exists: boolean;
  email?: string;
  needsInfo: boolean;
}

// Function to determine record type with case-insensitive comparison
const getRecordType = (courseTitle: string, category: string): TrainingRecord['recordType'] => {
  const normalizedTitle = courseTitle.trim();
  const lowerTitle = normalizedTitle.toLowerCase();

  // Debug logging
  console.log('Determining record type for:', courseTitle);

  // Check F2F courses first to ensure they get properly tagged
  if (F2F_COURSES.some(course => course.toLowerCase() === lowerTitle)) {
    console.log('Matched as F2F course');
    return 'f2f';
  }

  // Then check supervision courses
  if (SUPERVISION_COURSES.some(course => course.toLowerCase() === lowerTitle)) {
    console.log('Matched as supervision course');
    return 'supervision';
  }

  // Then check compliance courses
  if (COMPLIANCE_COURSES.some(course => course.toLowerCase() === lowerTitle)) {
    console.log('Matched as compliance course');
    return 'compliance';
  }

  // Finally check training courses
  if (TRAINING_COURSES.some(course => course.toLowerCase() === lowerTitle)) {
    console.log('Matched as training course');
    return 'training';
  }

  // Default to training if not found
  console.log('No match found, defaulting to training');
  return 'training';
};

// Function to determine supervision type
const getSupervisionType = (courseTitle: string): TrainingRecord['supervisionType'] | undefined => {
  const title = courseTitle.toLowerCase();

  if (title.includes('supervision')) {
    return 'supervision';
  }
  if (title.includes('appraisal')) {
    return 'appraisal';
  }
  if (title.includes('induction')) {
    return 'induction';
  }
  if (title.includes('probation')) {
    return 'probation';
  }
  if (title.includes('performance')) {
    return 'performance';
  }
  if (title.includes('annual')) {
    return 'annual';
  }

  return undefined;
};

// Function to generate a consistent user ID
const generateUserId = (staffName: string): string => {
  // Remove all special characters, spaces, and accents
  const normalized = staffName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .replace(/\s+/g, ''); // Remove spaces

  // Add a prefix to ensure it's a valid ID
  return `user_${normalized}`;
};

// Function to generate a consistent email
const generateEmail = (staffName: string): string => {
  // Remove special characters and convert spaces to dots
  const normalized = staffName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric and spaces
    .trim()
    .replace(/\s+/g, '.'); // Convert spaces to dots

  return `${normalized}@carehome.com`;
};

// Function to extract staff information from Excel
export const extractStaffFromExcel = async (file: File): Promise<StaffInfo[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('Failed to read file');
        }

        let data: Uint8Array;
        if (typeof e.target.result === 'string') {
          const bstr = atob(e.target.result.split(',')[1]);
          data = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) {
            data[i] = bstr.charCodeAt(i);
          }
        } else {
          data = new Uint8Array(e.target.result);
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Skip first 3 rows and use 4th row as headers
        const headers = XLSX.utils.sheet_to_json(firstSheet, {
          raw: false,
          range: 3,
          header: 1
        }) as string[][];

        // Read data starting from row 5
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
          raw: false,
          defval: null,
          range: 4,
          header: headers[0],
        }) as ExcelRow[];

        // Extract unique staff members
        const staffMap = new Map<string, StaffInfo>();

        for (const row of rows) {
          if (!row['Users Name']) continue;

          const staffName = String(row['Users Name']).trim();
          if (!staffName) continue;

          if (!staffMap.has(staffName)) {
            const userId = generateUserId(staffName);
            const userDoc = await getDoc(doc(db, 'users', userId));
            
            staffMap.set(staffName, {
              name: staffName,
              exists: userDoc.exists(),
              email: userDoc.exists() ? userDoc.data()?.email : undefined,
              needsInfo: !userDoc.exists()
            });
          }
        }

        resolve(Array.from(staffMap.values()));
      } catch (error) {
        console.error('Excel parsing error:', error);
        reject(error instanceof Error ? error : new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Function to find or create user
const findOrCreateUser = async (
  staffName: string,
  startDate?: Date,
  contractedHours?: number,
  annualLeave?: number,
  sickness?: number,
  roles?: ShiftRole[],
  email?: string,
  phoneNumber?: string,
  password?: string,
  site?: string
): Promise<string> => {
  try {
    const userId = generateUserId(staffName);
    const generatedEmail = generateEmail(staffName);

    // First try to find by ID
    const userDoc = doc(db, 'users', userId);
    const userSnapshot = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));

    if (!userSnapshot.empty) {
      // If user exists but doesn't have a startDate, update it
      const userData = userSnapshot.docs[0].data();
      if (!userData.startDate && startDate) {
        await setDoc(userDoc, {
          startDate: Timestamp.fromDate(startDate),
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (contractedHours !== undefined && userData.contractedHours !== contractedHours) {
        await setDoc(userDoc, {
          contractedHours: contractedHours,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (annualLeave !== undefined && userData.annualLeave !== annualLeave) {
        await setDoc(userDoc, {
          annualLeave: annualLeave,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (sickness !== undefined && userData.sickness !== sickness) {
        await setDoc(userDoc, {
          sickness: sickness,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (roles !== undefined && !arrayEquals(userData.roles, roles)) {
        await setDoc(userDoc, {
          roles: roles,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (email && userData.email !== email) {
        await setDoc(userDoc, {
          email: email,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (phoneNumber && userData.phoneNumber !== phoneNumber) {
        await setDoc(userDoc, {
          phoneNumber: phoneNumber,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (password && userData.password !== password) {
        await setDoc(userDoc, {
          password: password,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (site && userData.site !== site) {
        await setDoc(userDoc, {
          site: site,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      return userId;
    }

    // Then try by email
    const emailSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', generatedEmail)));

    if (!emailSnapshot.empty) {
      const existingUser = emailSnapshot.docs[0];
      if (!existingUser.data().startDate && startDate) {
        await setDoc(existingUser.ref, {
          startDate: Timestamp.fromDate(startDate),
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (contractedHours !== undefined && existingUser.data().contractedHours !== contractedHours) {
        await setDoc(existingUser.ref, {
          contractedHours: contractedHours,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (annualLeave !== undefined && existingUser.data().annualLeave !== annualLeave) {
        await setDoc(existingUser.ref, {
          annualLeave: annualLeave,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (sickness !== undefined && existingUser.data().sickness !== sickness) {
        await setDoc(existingUser.ref, {
          sickness: sickness,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (roles !== undefined && !arrayEquals(existingUser.data().roles, roles)) {
        await setDoc(existingUser.ref, {
          roles: roles,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (email && existingUser.data().email !== email) {
        await setDoc(existingUser.ref, {
          email: email,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (phoneNumber && existingUser.data().phoneNumber !== phoneNumber) {
        await setDoc(existingUser.ref, {
          phoneNumber: phoneNumber,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (password && existingUser.data().password !== password) {
        await setDoc(existingUser.ref, {
          password: password,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (site && existingUser.data().site !== site) {
        await setDoc(existingUser.ref, {
          site: site,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      return existingUser.id;
    }

    // Then try by name
    const nameSnapshot = await getDocs(query(collection(db, 'users'), where('name', '==', staffName)));

    if (!nameSnapshot.empty) {
      const existingUser = nameSnapshot.docs[0];
      if (!existingUser.data().startDate && startDate) {
        await setDoc(existingUser.ref, {
          startDate: Timestamp.fromDate(startDate),
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (contractedHours !== undefined && existingUser.data().contractedHours !== contractedHours) {
        await setDoc(existingUser.ref, {
          contractedHours: contractedHours,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (annualLeave !== undefined && existingUser.data().annualLeave !== annualLeave) {
        await setDoc(existingUser.ref, {
          annualLeave: annualLeave,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (sickness !== undefined && existingUser.data().sickness !== sickness) {
        await setDoc(existingUser.ref, {
          sickness: sickness,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (roles !== undefined && !arrayEquals(existingUser.data().roles, roles)) {
        await setDoc(existingUser.ref, {
          roles: roles,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (email && existingUser.data().email !== email) {
        await setDoc(existingUser.ref, {
          email: email,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (phoneNumber && existingUser.data().phoneNumber !== phoneNumber) {
        await setDoc(existingUser.ref, {
          phoneNumber: phoneNumber,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (password && existingUser.data().password !== password) {
        await setDoc(existingUser.ref, {
          password: password,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      if (site && existingUser.data().site !== site) {
        await setDoc(existingUser.ref, {
          site: site,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      return existingUser.id;
    }

    // If user doesn't exist, create new user with consistent ID
    const newUser: Partial<User> = {
      id: userId,
      name: staffName,
      email: email || generatedEmail,
      role: 'staff',
      roles: roles || ['Care Staff'],
      startDate: startDate || new Date(),
      probationStatus: 'pending',
      trainingProgress: {
        week1Review: false,
        week4Supervision: false,
        week8Review: false,
        week12Supervision: false,
      },
      notificationPreferences: {
        email: true,
        sms: true,
      },
      sites: [],
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      authCreated: false,
      contractedHours: contractedHours || 0,
      annualLeave: annualLeave || 0,
      sickness: sickness || 0,
      phoneNumber: phoneNumber,
      password: password,
      site: site,
      preferences: {
        preferredShifts: ['7:30-14:30', '14:30-21:30'],
        unavailableDates: [],
        maxShiftsPerWeek: 5,
        preferredRoles: roles || ['Care Staff'],
        flexibleHours: true,
        nightShiftOnly: false
      },
      performanceMetrics: {
        attendanceRate: 100,
        punctualityScore: 100,
        shiftCompletionRate: 100,
        feedbackScore: 100
      }
    };

    // Create the user document in the users collection with proper date conversion
    await setDoc(doc(db, 'users', userId), {
      ...newUser,
      startDate: Timestamp.fromDate(ensureDate(newUser.startDate)),
      lastLogin: Timestamp.fromDate(ensureDate(newUser.lastLogin)),
      createdAt: Timestamp.fromDate(ensureDate(newUser.createdAt)),
      updatedAt: Timestamp.fromDate(ensureDate(newUser.updatedAt)),
    });

    console.log('Created new user:', staffName, 'with ID:', userId);
    return userId;

  } catch (err) {
    console.error('Error finding/creating user:', err);
    throw err;
  }
};

// Helper function to compare arrays
const arrayEquals = (a: any[], b: any[]): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

// Function to create a task from a management record
const createManagementTask = async (record: Partial<TrainingRecord>): Promise<void> => {
  try {
    const task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'relatedRecordId'> = {
      title: `Book ${record.courseTitle} for ${record.staffName}`,
      description: `Face-to-face training task: Book ${record.courseTitle} training for ${record.staffName}`,
      dueDate: record.expiryDate || addDays(new Date(), 30),
      priority: record.status === 'expired' ? 'high' : record.status === 'expiring' ? 'medium' : 'low',
      status: 'pending',
      category: 'training',
      relatedRecordType: 'training',
    };

    const taskRef = collection(db, 'tasks');
    await addDoc(taskRef, {
      ...task,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      dueDate: Timestamp.fromDate(ensureDate(task.dueDate)),
    });
  } catch (err) {
    console.error('Error creating F2F task:', err);
    throw err;
  }
};

// Function to update or create a training record
const updateOrCreateTrainingRecord = async (record: Partial<TrainingRecord>): Promise<void> => {
  try {
    const recordId = `${record.staffId}_${record.courseTitle}`;
    const recordDoc = doc(db, 'trainingRecords', recordId);
    const recordSnapshot = await getDoc(recordDoc);

    if (recordSnapshot.exists()) {
      // Update existing record
      await setDoc(recordDoc, {
        ...record,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } else {
      // Create new record
      await setDoc(recordDoc, {
        ...record,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  } catch (err) {
    console.error('Error updating/creating training record:', err);
    throw err;
  }
};

export const parseTrainingExcel = async (file: File): Promise<Partial<TrainingRecord>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('Failed to read file');
        }

        let data: Uint8Array;
        if (typeof e.target.result === 'string') {
          const bstr = atob(e.target.result.split(',')[1]);
          data = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) {
            data[i] = bstr.charCodeAt(i);
          }
        } else {
          data = new Uint8Array(e.target.result);
        }

        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        if (!workbook.SheetNames.length) {
          throw new Error('Excel file is empty');
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
        console.log('Sheet range:', range);

        // Skip first 3 rows and use 4th row as headers
        const headers = XLSX.utils.sheet_to_json(firstSheet, {
          raw: false,
          range: 3,
          header: 1
        }) as string[][];

        console.log('Headers:', headers[0]);

        // Read data starting from row 5
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
          raw: false,
          defval: null,
          range: 4,
          dateNF: 'dd/mm/yyyy HH:mm',
          header: headers[0],
        }) as ExcelRow[];

        console.log('First data row:', rows[0]);
        console.log('Total rows:', rows.length);

        // Group records by staff name
        const staffGroups = new Map<string, Partial<TrainingRecord>[]>();

        await Promise.all(rows.map(async (row) => {
          try {
            if (!row['Users Name']) {
              console.log('Skipping row without Users Name:', row);
              return;
            }

            const staffName = String(row['Users Name']).trim();
            const courseTitle = String(row['Course Title'] || '').trim();
            const completionDateStr = String(row['Completion Date'] || '').trim();
            const expiryDateStr = String(row['Expiry Date'] || '').trim();
            const startDateStr = String(row['Start Date'] || '').trim();
            const category = String(row['Stats Category'] || '').trim();
            const location = String(row['Users Location'] || '')
              .split('\n')
              .map(loc => loc.trim())
              .filter((loc, i, arr) => arr.indexOf(loc) === i)
              .join(', ') || 'Unknown';

            if (!staffName || !courseTitle) {
              console.log('Skipping row with missing required fields:', row);
              return;
            }

            // Parse dates
            const completionDate = completionDateStr ? parseExcelDate(completionDateStr) : null;
            const expiryDate = expiryDateStr ? parseExcelDate(expiryDateStr) : null;
            const startDate = startDateStr ? parseExcelDate(startDateStr) : null;

            // Find or create user with start date if available
            const staffId = await findOrCreateUser(staffName, startDate || undefined);
            if (!staffId) {
              console.log('Could not create user for:', staffName);
              return;
            }

            // Determine record type and supervision type
            const recordType = getRecordType(courseTitle, category);
            const supervisionType = recordType === 'supervision' ? getSupervisionType(courseTitle) : undefined;

            // Calculate status based on RAG Status and Status
            let status: TrainingRecord['status'];
            const ragStatus = String(row['RAG Status'] || '').toLowerCase();
            const rowStatus = String(row['Status'] || '').toLowerCase();

            if (ragStatus.includes('expired') || ragStatus.includes('overdue') || rowStatus.includes('overdue')) {
              status = 'expired';
            } else if (ragStatus.includes('window opens') || ragStatus.includes('expires soon')) {
              status = 'expiring';
            } else if (rowStatus.includes('certified') || rowStatus.includes('completed')) {
              status = 'valid';
            } else {
              status = 'expiring';
            }

            // Create base record without optional fields
            const record: Partial<TrainingRecord> = {
              staffId,
              staffName,
              courseTitle,
              location,
              completionDate: completionDate || new Date(),
              expiryDate: expiryDate || addDays(new Date(), 365),
              status,
              remindersSent: 0,
              requiresDiscussion: status === 'expired',
              notificationPreferences: {
                email: true,
                sms: true,
              },
              category,
              ragStatus: String(row['RAG Status'] || ''),
              statsCategory: String(row['Stats Category'] || ''),
              recordType,
            };

            // Add optional fields only if they have values
            const supervisor = String(row['Supervisor'] || '').trim();
            if (supervisor) {
              record.supervisor = supervisor;
            }

            const notes = String(row['Notes'] || '').trim();
            if (notes) {
              record.notes = notes;
            }

            // Only add supervisionType if it's defined and record type is supervision
            if (recordType === 'supervision' && supervisionType) {
              record.supervisionType = supervisionType;
            }

            // If it's an F2F course, create a task
            if (recordType === 'f2f') {
              await createManagementTask(record);
            }

            // Update or create the training record
            await updateOrCreateTrainingRecord(record);

            // Add record to staff group
            if (!staffGroups.has(staffId)) {
              staffGroups.set(staffId, []);
            }
            const group = staffGroups.get(staffId);
            if (group) {
              group.push(record);
            }

          } catch (err) {
            console.error('Error processing row:', err);
            console.error('Row data:', row);
          }
        }));

        // Convert grouped records to flat array
        const validRecords = Array.from(staffGroups.values()).flat();

        console.log('Total valid records:', validRecords.length);
        if (validRecords.length > 0) {
          console.log('Sample record:', validRecords[0]);
        }

        if (validRecords.length === 0) {
          throw new Error('No valid records found in the Excel file');
        }

        resolve(validRecords);
      } catch (error) {
        console.error('Excel parsing error:', error);
        reject(error instanceof Error ? error : new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };

    // Read the file as ArrayBuffer
    reader.readAsArrayBuffer(file);
  });
};

const parseExcelDate = (value: string | number | null): Date | null => {
  if (!value) return null;

  try {
    const cleanValue = value.toString().trim();
    if (!cleanValue) return null;

    console.log('Parsing date:', cleanValue);

    // Try to parse UK format date with time (DD/MM/YYYY HH:mm:ss)
    const ukDateTimeMatch = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ukDateTimeMatch) {
      const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = ukDateTimeMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );
      if (!isNaN(date.getTime())) {
        console.log('Parsed as UK datetime:', date);
        return date;
      }
    }

    // Try to parse UK format date (DD/MM/YYYY)
    const ukDateMatch = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ukDateMatch) {
      const [, day, month, year] = ukDateMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        console.log('Parsed as UK date:', date);
        return date;
      }
    }

    // Try to parse as ISO date string
    const isoDate = new Date(cleanValue);
    if (!isNaN(isoDate.getTime())) {
      console.log('Parsed as ISO date:', isoDate);
      return isoDate;
    }

    // Handle Excel serial date number
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        console.log('Parsed as Excel serial:', date);
        return date;
      }
    }

    console.warn('Could not parse date:', value);
    return null;
  } catch (err) {
    console.error('Error parsing date:', err);
    console.error('Value:', value);
    return null;
  }
};

export const validateTrainingData = (records: Partial<TrainingRecord>[]): string[] => {
  const errors: string[] = [];

  if (!records.length) {
    errors.push('No records found in the file');
    return errors;
  }

  // Group records by staff name for validation
  const staffGroups = new Map<string, Partial<TrainingRecord>[]>();
  records.forEach(record => {
    if (record.staffId) {
      if (!staffGroups.has(record.staffId)) {
        staffGroups.set(record.staffId, []);
      }
      const group = staffGroups.get(record.staffId);
      if (group) {
        group.push(record);
      }
    }
  });

  // Validate each staff member's records
  staffGroups.forEach((staffRecords, staffId) => {
    const staffName = staffRecords[0]?.staffName || 'Unknown Staff';

    // Check for duplicate courses
    const courses = new Set<string>();
    staffRecords.forEach(record => {
      if (record.courseTitle) {
        if (courses.has(record.courseTitle)) {
          errors.push(`${staffName} has duplicate entries for ${record.courseTitle}`);
        } else {
          courses.add(record.courseTitle);
        }
      }
    });

    // Validate individual records
    staffRecords.forEach(record => {
      if (!record.courseTitle) {
        errors.push(`${staffName}: Course title is required`);
      }
      if (!record.completionDate && record.status !== 'expired') {
        errors.push(`${staffName}: Completion date is required for ${record.courseTitle || 'course'}`);
      }
      if (!record.expiryDate) {
        errors.push(`${staffName}: Expiry date is required for ${record.courseTitle || 'course'}`);
      }
    });
  });

  return errors;
};

export { getRecordType };
