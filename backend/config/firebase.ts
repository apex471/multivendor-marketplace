import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, DocumentSnapshot, QueryDocumentSnapshot, Timestamp, FieldPath } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Firebase Admin SDK — singleton pattern for serverless environments
// (Next.js API routes / Netlify Functions). The SDK manages its own
// connection pooling; we just need to initialize it once per process.
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var _firebaseAdmin: App | undefined;
  var _firestore: Firestore | undefined;
}

function getApp(): App {
  if (global._firebaseAdmin) {
    return global._firebaseAdmin;
  }

  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK credentials are missing.\n' +
      'Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY ' +
      'to your environment variables (Netlify → Site Settings → Env Vars).'
    );
  }

  // Check if already initialized (e.g., hot-reload in dev)
  const apps = getApps();
  if (!apps.length) {
    global._firebaseAdmin = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    global._firebaseAdmin = apps[0];
  }

  return global._firebaseAdmin;
}

export function getDB(): Firestore {
  if (global._firestore) {
    return global._firestore;
  }
  const app = getApp();
  const dbInstance = getFirestore(app);
  dbInstance.settings({ ignoreUndefinedProperties: true });
  global._firestore = dbInstance;
  return dbInstance;
}

// Convenience alias — drop-in replacement for `await connectDB()` calls
// (just call getDB() wherever you previously called connectDB())
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getDB() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Helper: convert a Firestore document snapshot to a plain object with `id`
export function docToObject<T>(
  snap: DocumentSnapshot
): (T & { id: string }) | null {
  if (!snap.exists) return null;
  const data = snap.data()!;
  // Convert Firestore Timestamps to JS Dates
  const converted = convertTimestamps(data);
  return { id: snap.id, ...converted } as T & { id: string };
}

// Helper: convert a QueryDocumentSnapshot to plain object
export function snapToObject<T>(
  snap: QueryDocumentSnapshot
): T & { id: string } {
  const data = snap.data();
  const converted = convertTimestamps(data);
  return { id: snap.id, ...converted } as T & { id: string };
}

// Recursively convert Firestore Timestamps → JS Date objects
function convertTimestamps(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
      result[key] = (value as Timestamp).toDate();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertTimestamps(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? convertTimestamps(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

export { Timestamp, admin, FieldPath };

