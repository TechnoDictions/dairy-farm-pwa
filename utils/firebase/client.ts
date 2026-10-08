import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult, 
  Auth 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize or reuse Firebase App instance
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

// Get Firebase Auth instance
export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();
  return getAuth(app);
}

/**
 * Initializes a visible/normal reCAPTCHA verifier for phone OTP authentication
 * @param containerId HTML element id (default 'recaptcha-container')
 * @param size 'normal' | 'invisible'
 * @param onSolved Callback when user passes the reCAPTCHA challenge
 * @param onExpired Callback when reCAPTCHA expires
 */
export function setupRecaptcha(
  containerId: string = 'recaptcha-container',
  size: 'normal' | 'invisible' = 'normal',
  onSolved?: () => void,
  onExpired?: () => void
): RecaptchaVerifier {
  const auth = getFirebaseAuth();

  // Clear existing verifier if any
  if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Recaptcha clear note:', e);
    }
    (window as any).recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size,
    callback: () => {
      if (onSolved) onSolved();
    },
    'expired-callback': () => {
      if (onExpired) onExpired();
    }
  });

  if (typeof window !== 'undefined') {
    (window as any).recaptchaVerifier = verifier;
  }

  return verifier;
}

/**
 * Sends phone SMS OTP using live Firebase Phone Auth
 * @param phoneNumber E.164 formatted phone number (e.g. +923001234567)
 * @param appVerifier RecaptchaVerifier instance
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

/**
 * Format Firebase Auth errors into clear, actionable messages
 */
export function formatFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Invalid mobile phone number. Please enter a valid number (e.g. 0300 1234567).';
    case 'auth/missing-phone-number':
      return 'Mobile phone number is required.';
    case 'auth/quota-exceeded':
      return 'SMS verification limit reached for today. Please try again tomorrow or contact support.';
    case 'auth/too-many-requests':
      return 'Too many SMS requests. Please wait a few minutes before trying again.';
    case 'auth/invalid-verification-code':
      return 'Incorrect 6-digit SMS code. Please check your SMS and try again.';
    case 'auth/code-expired':
      return 'SMS code has expired. Please go back and request a new code.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed or expired. Please solve the reCAPTCHA box again.';
    case 'auth/invalid-app-credential':
    case 'auth/app-not-authorized':
      return 'Firebase domain unauthorized. Please ensure your current domain is added to Firebase Console Authorized Domains.';
    default:
      return error?.message || 'Phone verification failed. Please try again.';
  }
}
