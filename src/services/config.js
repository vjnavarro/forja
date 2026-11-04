export const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
export const cloudConfigured =
  useEmulators ||
  [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_APP_ID',
  ].every((key) => !!import.meta.env[key]);
