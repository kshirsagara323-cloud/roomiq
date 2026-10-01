import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export const IMAGE_MODE = env.VITE_IMAGE_STORAGE === 'storage' ? 'storage' : 'firestore';

const app = initializeApp(isConfigured ? config : { apiKey: 'unset', projectId: 'unset', appId: 'unset' });

// App Check blocks traffic that does not come from your real site (optional, needs a free reCAPTCHA v3 key)
if (isConfigured && env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('App Check not started', e);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
// Storage is only created when it is really used (it needs the Blaze plan)
export const getStorageInstance = () => getStorage(app);
