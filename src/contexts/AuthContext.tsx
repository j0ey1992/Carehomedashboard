// Import necessary modules
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  AuthErrorCodes,
  getIdToken,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User as CustomUser } from '../types';
import { ShiftRole } from '../types/rota';

// Token refresh interval (15 minutes)
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000;

// Extend window for recaptcha
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
  loginAttempts: { [key: string]: { count: number; lockoutUntil?: number } };
  lastTokenRefresh: number;
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
  refreshToken: () => Promise<string>;
  isAdmin: boolean;
  isSiteManager: boolean;
  isStaff: boolean;
  rememberMe: (remember: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Default user data
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
    loginAttempts: {},
    lastTokenRefresh: 0,
  });

  // Token refresh mechanism
  const refreshToken = useCallback(async () => {
    if (!state.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const token = await getIdToken(state.currentUser, true);
      setState(prev => ({ ...prev, lastTokenRefresh: Date.now() }));
      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      await auth.signOut();
      throw new Error('Session expired. Please login again.');
    }
  }, [state.currentUser]);

  // Periodic token refresh
  useEffect(() => {
    if (!state.currentUser) return;

    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Periodic token refresh failed:', error);
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [state.currentUser, refreshToken]);

  // Create user document in Firestore
  const createUserDocument = useCallback(async (userId: string, userData: Partial<CustomUser>) => {
    const userRef = doc(db, 'users', userId);
    const tokenResult = await state.currentUser?.getIdTokenResult();
    const isAdmin = tokenResult?.claims?.admin === true;

    const newUserDataForDoc = {
      id: userId,
      ...DEFAULT_USER_DATA,
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: isAdmin ? 'admin' : 'staff',
      roles: ['Care Staff'] as ShiftRole[],
      authCreated: true,
    };

    await setDoc(userRef, newUserDataForDoc);
  }, [state.currentUser]);

  // Update user data in Firestore
  const updateUserData = useCallback(async (userId: string, data: Partial<CustomUser>) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // Load user data from Firestore
  const loadUserData = async (userId: string): Promise<CustomUser> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data() as CustomUser;

    // Convert Timestamps to Date
    if (userData.lastLogin instanceof Timestamp) {
      userData.lastLogin = userData.lastLogin.toDate();
    }
    if (userData.createdAt instanceof Timestamp) {
      userData.createdAt = userData.createdAt.toDate();
    }
    if (userData.updatedAt instanceof Timestamp) {
      userData.updatedAt = userData.updatedAt.toDate();
    }

    return userData;
  };

  // Authentication state observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          let userData: CustomUser | null = null;
          const userRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userRef);

          // Get the user's custom claims
          const tokenResult = await user.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true;

          if (!userDocSnap.exists()) {
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
            userData = await loadUserData(user.uid);

            const updates: Partial<CustomUser> = {};

            // Ensure user has required fields
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
            await updateUserData(user.uid, { lastLogin: serverTimestamp() });
          }

          setState({
            currentUser: user,
            userData,
            loading: false,
            error: null,
            loginAttempts: {},
            lastTokenRefresh: Date.now(),
          });
        } catch (error) {
          console.error('Error loading user data:', error);
          setState(prev => ({
            ...prev,
            currentUser: user,
            userData: null,
            loading: false,
            error: 'Failed to load user data',
          }));
        }
      } else {
        setState({
          currentUser: null,
          userData: null,
          loading: false,
          error: null,
          loginAttempts: {},
          lastTokenRefresh: 0,
        });
      }
    });

    return unsubscribe;
  }, [createUserDocument, updateUserData]);

  // Update login attempts with exponential backoff
  const updateLoginAttempts = (email: string, failed: boolean) => {
    setState(prevState => {
      const newLoginAttempts = { ...prevState.loginAttempts };
      const currentAttempt = newLoginAttempts[email] || { count: 0, lockoutUntil: undefined };

      if (failed) {
        currentAttempt.count += 1;
        if (currentAttempt.count >= 3) {
          // Exponential backoff: 5min, 15min, 30min, 1hr, 2hr, 4hr...
          const lockoutDuration = Math.min(5 * Math.pow(2, currentAttempt.count - 3), 240) * 60 * 1000;
          currentAttempt.lockoutUntil = Date.now() + lockoutDuration;
        }
      } else {
        currentAttempt.count = 0;
        currentAttempt.lockoutUntil = undefined;
      }

      newLoginAttempts[email] = currentAttempt;
      return { ...prevState, loginAttempts: newLoginAttempts };
    });
  };

  // Enhanced error handling for authentication methods
const handleAuthError = (error: any): string => {
    console.error('Auth error:', error);
    const errorCode = error.code;

    switch (errorCode) {
      case AuthErrorCodes.USER_DELETED:
      case AuthErrorCodes.INVALID_EMAIL:
        return 'Email not found. Please check your email or sign up.';
      case AuthErrorCodes.INVALID_PASSWORD:
        return 'Incorrect password. Please try again.';
      case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
        return 'Too many failed login attempts. Please try again later.';
      case AuthErrorCodes.NETWORK_REQUEST_FAILED:
        return 'Network error. Please check your connection and try again.';
      case AuthErrorCodes.EXPIRED_POPUP_REQUEST:
        return 'The login popup was closed. Please try again.';
      case AuthErrorCodes.POPUP_BLOCKED:
        return 'Login popup was blocked. Please allow popups for this site.';
      case AuthErrorCodes.INVALID_PHONE_NUMBER:
        return 'Invalid phone number format. Please use international format (e.g., +44...).';
      case AuthErrorCodes.INVALID_CODE:
        return 'Invalid verification code. Please try again.';
      case AuthErrorCodes.CODE_EXPIRED:
        return 'Verification code expired. Please request a new one.';
      case AuthErrorCodes.EXPIRED_OOB_CODE:
        return 'The magic link has expired. Please request a new one.';
      case AuthErrorCodes.INVALID_OOB_CODE:
        return 'Invalid or expired magic link. Please request a new one.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // Authentication methods
  const login = async (email: string, password: string) => {
    const loginAttempt = state.loginAttempts[email];
    const currentTime = Date.now();
    if (loginAttempt?.lockoutUntil && currentTime < loginAttempt.lockoutUntil) {
      const remainingTime = Math.ceil((loginAttempt.lockoutUntil - currentTime) / 60000);
      throw new Error(`Account is temporarily locked. Please try again in ${remainingTime} minutes.`);
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await updateUserData(result.user.uid, { lastLogin: serverTimestamp() });
      updateLoginAttempts(email, false);
    } catch (error) {
      updateLoginAttempts(email, true);
      throw new Error(handleAuthError(error));
    }
  };

  const loginWithPhone = async (phoneNumber: string) => {
    try {
      const recaptchaContainer = document.createElement('div');
      recaptchaContainer.id = 'recaptcha-container';
      document.body.appendChild(recaptchaContainer);

      const verifier = new RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
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
      throw new Error(handleAuthError(error));
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
      await updateUserData(result.user.uid, { lastLogin: serverTimestamp() });
      window.localStorage.removeItem('phoneAuthVerificationId');

      if (window.recaptchaVerifier) {
        await window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } catch (error) {
      throw new Error(handleAuthError(error));
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
      throw new Error(handleAuthError(error));
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
        await updateUserData(result.user.uid, { lastLogin: serverTimestamp() });
        window.localStorage.removeItem('emailForSignIn');
      }
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await updateUserData(result.user.uid, { lastLogin: serverTimestamp() });
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const loginWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await updateUserData(result.user.uid, { lastLogin: serverTimestamp() });
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const loginWithMicrosoft = async () => {
    try {
      const provider = new OAuthProvider('microsoft.com');
      const result = await signInWithPopup(auth, provider);
      await updateUserData(result.user.uid, { lastLogin: serverTimestamp() });
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const confirmReset = async (code: string, newPassword: string) => {
    try {
      await confirmPasswordReset(auth, code, newPassword);
    } catch (error) {
      throw new Error(handleAuthError(error));
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
      throw new Error(handleAuthError(error));
    }
  };

  const updateUserEmail = async (newEmail: string, password: string) => {
    if (!state.currentUser) throw new Error('No user logged in');

    try {
      // Re-authenticate user before email change
      await signInWithEmailAndPassword(auth, state.currentUser.email!, password);
      await updateEmail(state.currentUser, newEmail);
      await updateUserData(state.currentUser.uid, { email: newEmail });
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!state.currentUser) throw new Error('No user logged in');

    try {
      // Re-authenticate user before password change
      await signInWithEmailAndPassword(auth, state.currentUser.email!, currentPassword);
      await updatePassword(state.currentUser, newPassword);
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const rememberMe = async (remember: boolean) => {
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    } catch (error) {
      console.error('Error setting auth persistence:', error);
    }
  };

  const value: AuthContextType = {
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
    refreshToken,
    isAdmin: state.userData?.role === 'admin',
    isSiteManager: state.userData?.role === 'manager',
    isStaff: state.userData?.role === 'staff',
    rememberMe,
  };

  return (
    <AuthContext.Provider value={value}>
      {!state.loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
