import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_SKEW_MS = 60_000;
const DRIVE_CONNECTION_FLAG = 'study-os-drive-connected';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

export class DriveAuthError extends Error {
  readonly transient = false;

  constructor(message: string) {
    super(message);
    this.name = 'DriveAuthError';
  }
}

let accessToken: string | null = null;
let expiresAt = 0;
let scriptPromise: Promise<void> | null = null;
let tokenRequestPromise: Promise<string> | null = null;

function clientId() {
  return import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined;
}

export function hasDriveClientId() {
  return Boolean(clientId());
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new DriveAuthError('Google Drive authorization could not load.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function requestToken(prompt: string) {
  if (tokenRequestPromise) return tokenRequestPromise;
  const configuredClientId = clientId();
  if (!configuredClientId) {
    throw new DriveAuthError('Configure VITE_GOOGLE_OAUTH_CLIENT_ID to connect Google Drive.');
  }
  const requestPromise = (async () => {
    await loadGoogleIdentityServices();
    const google = window.google;
    if (!google) throw new DriveAuthError('Google Drive authorization could not load.');

    return new Promise<string>((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: configuredClientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (!response.access_token) {
            reject(
              new DriveAuthError(
                response.error_description ??
                  response.error ??
                  'Google Drive consent was not granted.',
              ),
            );
            return;
          }
          accessToken = response.access_token;
          expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
          resolve(response.access_token);
        },
        error_callback: (error) => {
          reject(new DriveAuthError(error.message ?? 'Google Drive consent was not granted.'));
        },
      });
      tokenClient.requestAccessToken({ prompt });
    });
  })();
  tokenRequestPromise = requestPromise;
  try {
    return await requestPromise;
  } finally {
    if (tokenRequestPromise === requestPromise) tokenRequestPromise = null;
  }
}

async function rememberDriveConnection() {
  try {
    localStorage.setItem(DRIVE_CONNECTION_FLAG, 'true');
  } catch {
    // Local storage may be unavailable in privacy-restricted browser contexts.
  }
  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'settings', 'integrations'),
        { driveConnected: true },
        { merge: true },
      );
    } catch {
      // A consented token remains usable even if settings persistence is offline.
    }
  }
}

export async function hasDriveConnectionHint() {
  try {
    if (localStorage.getItem(DRIVE_CONNECTION_FLAG) === 'true') return true;
  } catch {
    // Continue with the signed-in Firestore hint.
  }
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const settings = await getDoc(doc(db, 'users', user.uid, 'settings', 'integrations'));
    return Boolean(settings.data()?.driveConnected || settings.data()?.driveFolderId);
  } catch {
    return false;
  }
}

export async function reconnectGoogleDriveSilently() {
  if (!hasDriveClientId() || !(await hasDriveConnectionHint())) return false;
  try {
    await requestToken('');
    return true;
  } catch {
    clearDriveAccessToken();
    return false;
  }
}

export async function connectGoogleDrive() {
  const token = await requestToken('consent');
  await rememberDriveConnection();
  return token;
}

export async function getDriveAccessToken() {
  if (accessToken && Date.now() < expiresAt - TOKEN_SKEW_MS) return accessToken;
  if (accessToken) {
    try {
      return await requestToken('');
    } catch {
      clearDriveAccessToken();
    }
  }
  accessToken = null;
  expiresAt = 0;
  throw new DriveAuthError('Connect Google Drive to continue.');
}

export function clearDriveAccessToken() {
  accessToken = null;
  expiresAt = 0;
}

export { DRIVE_SCOPE };
