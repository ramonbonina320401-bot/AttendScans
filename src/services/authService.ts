import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  applyActionCode,
} from 'firebase/auth';

interface AuthError {
  code: string;
  message: string;
}

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (email: string, password: string) => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Send verification email
    await sendEmailVerification(user);
    return { success: true, user };
  } catch (error) {
    const authError = error as AuthError;
    console.error('Error in sendVerificationEmail:', authError);
    return { 
      success: false, 
      error: authError.code === 'auth/email-already-in-use' 
        ? 'Email already registered' 
        : 'Failed to create account'
    };
  }
};

export const verifyOTP = (inputOTP: string, originalOTP: string) => {
  return inputOTP === originalOTP;
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    const authError = error as AuthError;
    console.error('Error in loginUser:', authError);
    return { 
      success: false, 
      error: authError.code === 'auth/wrong-password' 
        ? 'Invalid password' 
        : 'Login failed'
    };
  }
};

export const verifyEmailWithCode = async (code: string) => {
  try {
    await applyActionCode(auth, code);
    return { success: true };
  } catch (error) {
    const authError = error as AuthError;
    console.error('Error in verifyEmailWithCode:', authError);
    return { 
      success: false, 
      error: 'Invalid verification code'
    };
  }
};