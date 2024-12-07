import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  User as FirebaseUser,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  updateEmail,
  updatePassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { User as CustomUser } from '../types'
import { ShiftRole } from '../types/rota'

// Declare global window interface extension
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

interface AuthState {
  currentUser: FirebaseUser | null;
  userData: CustomUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<void>;
  verifyPhoneCode: (code: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  handleMagicLinkSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmReset: (code: string, newPassword: string) => Promise<void>;
  updateUserProfile: (data: Partial<CustomUser>) => Promise<void>;
  updateUserEmail: (newEmail: string, password: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
  isSiteManager: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const DEFAULT_USER_DATA = {
  notificationPreferences: {
    email: true,
    sms: true,
  },
  role: 'staff' as const,
  roles: ['Care Staff'] as ShiftRole[],
  sites: ['Willowbrook'] as string[],
  site: 'Willowbrook',
  departmentId: '',
  probationStatus: 'pending' as const,
  trainingProgress: {
    week1Review: false,
    week4Supervision: false,
    week8Review: false,
    week12Supervision: false,
  },
  points: 0,
  attendance: {
    attendanceRate: 100,
    lateDays: 0,
    sickDays: 0,
    totalDays: 0
  },
  contractedHours: 37.5,
  annualLeave: 28,
  sickness: 0,
  preferences: {
    preferredShifts: [],
    unavailableDates: [],
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    currentUser: null,
    userData: null,
    loading: true,
    error: null,
  });

  // Create user document in Firestore
  const createUserDocument = async (userId: string, userData: Partial<CustomUser>) => {
    const userRef = doc(db, 'users', userId);
    const now = new Date();

    // Get the user's custom claims to check for admin status
    const tokenResult = await state.currentUser?.getIdTokenResult();
    const isAdmin = tokenResult?.claims?.admin === true;

    const newUser: Partial<CustomUser> = {
      id: userId,
      ...DEFAULT_USER_DATA,
      ...userData,
      createdAt: now,
      updatedAt: now,
      lastLogin: now,
      role: isAdmin ? 'admin' : 'staff',
      roles: ['Care Staff'] as ShiftRole[],
      authCreated: true,
    };

    await setDoc(userRef, newUser);
  };

  // Load user data from Firestore
  const loadUserData = async (userId: string): Promise<CustomUser> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }
    return userDoc.data() as CustomUser;
  };

  // Update user data in Firestore
  const updateUserData = async (userId: string, data: Partial<CustomUser>) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date(),
    });
  };

  // Authentication state observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          let userData: CustomUser | null = null;
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          // Get the user's custom claims
          const tokenResult = await user.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true;

          if (!userDoc.exists()) {
            // Create new user document if it doesn't exist
            await createUserDocument(user.uid, {
              email: user.email || '',
              name: user.displayName || '',
              phoneNumber: user.phoneNumber || '',
              photoURL: user.photoURL || '',
              role: isAdmin ? 'admin' : 'staff',
              roles: ['Care Staff'] as ShiftRole[],
            });
            userData = await loadUserData(user.uid);
          } else {
            userData = userDoc.data() as CustomUser;
            
            // Ensure user has required fields
            const updates: Partial<CustomUser> = {};
            
            // Check and set default values for required fields
            if (!userData.roles) updates.roles = DEFAULT_USER_DATA.roles;
            if (!userData.sites) updates.sites = DEFAULT_USER_DATA.sites;
            if (!userData.site) updates.site = DEFAULT_USER_DATA.site;
            if (!userData.notificationPreferences) updates.notificationPreferences = DEFAULT_USER_DATA.notificationPreferences;
            if (!userData.attendance) updates.attendance = DEFAULT_USER_DATA.attendance;
            if (!userData.preferences) updates.preferences = DEFAULT_USER_DATA.preferences;
            if (!userData.performanceMetrics) updates.performanceMetrics = DEFAULT_USER_DATA.performanceMetrics;
            if (userData.contractedHours === undefined) updates.contractedHours = DEFAULT_USER_DATA.contractedHours;
            if (userData.annualLeave === undefined) updates.annualLeave = DEFAULT_USER_DATA.annualLeave;
            if (userData.sickness === undefined) updates.sickness = DEFAULT_USER_DATA.sickness;
            
            // Update role if it doesn't match custom claims
            if ((isAdmin && userData.role !== 'admin') || (!isAdmin && userData.role === 'admin')) {
              updates.role = isAdmin ? 'admin' : 'staff';
            }

            // Update photoURL if it changed
            if (user.photoURL && user.photoURL !== userData.photoURL) {
              updates.photoURL = user.photoURL;
            }

            // Apply updates if needed
            if (Object.keys(updates).length > 0) {
              await updateUserData(user.uid, updates);
              userData = { ...userData, ...updates };
            }

            // Update lastLogin
            await updateUserData(user.uid, { lastLogin: new Date() });
          }

          setState({
            currentUser: user,
            userData,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error('Error loading user data:', error);
          setState({
            currentUser: user,
            userData: null,
            loading: false,
            error: 'Failed to load user data',
          });
        }
      } else {
        setState({
          currentUser: null,
          userData: null,
          loading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  // Authentication methods
  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await updateUserData(result.user.uid, { lastLogin: new Date() });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithMagicLink = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/auth/magic-link-callback',
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
    } catch (error) {
      console.error('Magic link error:', error);
      throw error;
    }
  };

  const handleMagicLinkSignIn = async () => {
    try {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');

        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }

        if (!email) throw new Error('Email required for sign in');

        const result = await signInWithEmailLink(auth, email, window.location.href);
        await updateUserData(result.user.uid, { lastLogin: new Date() });
        window.localStorage.removeItem('emailForSignIn');
      }
    } catch (error) {
      console.error('Magic link sign in error:', error);
      throw error;
    }
  };

  const loginWithPhone = async (phoneNumber: string) => {
    try {
      const recaptchaContainer = document.createElement('div');
      recaptchaContainer.id = 'recaptcha-container';
      document.body.appendChild(recaptchaContainer);

      const verifier = new RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
      }, auth);

      window.recaptchaVerifier = verifier;

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        verifier
      );

      window.localStorage.setItem('phoneAuthVerificationId', confirmationResult.verificationId);
      document.body.removeChild(recaptchaContainer);
    } catch (error) {
      console.error('Phone auth error:', error);
      throw error;
    }
  };

  const verifyPhoneCode = async (code: string) => {
    try {
      const verificationId = window.localStorage.getItem('phoneAuthVerificationId');
      if (!verificationId) {
        throw new Error('No verification ID found');
      }

      const credential = PhoneAuthProvider.credential(verificationId, code);
      const result = await signInWithCredential(auth, credential);
      await updateUserData(result.user.uid, { lastLogin: new Date() });
      window.localStorage.removeItem('phoneAuthVerificationId');

      if (window.recaptchaVerifier) {
        await window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } catch (error) {
      console.error('Phone verification error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await updateUserData(result.user.uid, { lastLogin: new Date() });
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const loginWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await updateUserData(result.user.uid, { lastLogin: new Date() });
    } catch (error) {
      console.error('GitHub login error:', error);
      throw error;
    }
  };

  const loginWithMicrosoft = async () => {
    try {
      const provider = new OAuthProvider('microsoft.com');
      const result = await signInWithPopup(auth, provider);
      await updateUserData(result.user.uid, { lastLogin: new Date() });
    } catch (error) {
      console.error('Microsoft login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const confirmReset = async (code: string, newPassword: string) => {
    try {
      await confirmPasswordReset(auth, code, newPassword);
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<CustomUser>) => {
    if (!state.currentUser) throw new Error('No user logged in');

    try {
      if (data.name || data.photoURL) {
        await updateProfile(state.currentUser, {
          displayName: data.name,
          photoURL: data.photoURL,
        });
      }

      await updateUserData(state.currentUser.uid, data);

      setState((prev) => ({
        ...prev,
        userData: prev.userData ? { ...prev.userData, ...data } : null,
      }));
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const updateUserEmail = async (newEmail: string, password: string) => {
    if (!state.currentUser) throw new Error('No user logged in');

    try {
      await updateEmail(state.currentUser, newEmail);
      await updateUserData(state.currentUser.uid, { email: newEmail });
    } catch (error) {
      console.error('Email update error:', error);
      throw error;
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!state.currentUser) throw new Error('No user logged in');

    try {
      await updatePassword(state.currentUser, newPassword);
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  };

  const value = {
    ...state,
    login,
    loginWithPhone,
    verifyPhoneCode,
    loginWithGoogle,
    loginWithGithub,
    loginWithMicrosoft,
    loginWithMagicLink,
    handleMagicLinkSignIn,
    logout,
    resetPassword,
    confirmReset,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    isAdmin: state.userData?.role === 'admin',
    isSiteManager: state.userData?.role === 'manager',
    isStaff: state.userData?.role === 'staff',
  };

  return (
    <AuthContext.Provider value={value}>
      {!state.loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
