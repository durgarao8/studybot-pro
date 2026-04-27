
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs,
  onSnapshot,
  Timestamp,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google sign in failed:", error);
    throw error;
  }
};

export const linkWithGoogle = async () => {
  if (!auth.currentUser) return;
  try {
    const result = await linkWithPopup(auth.currentUser, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Linking Google account failed:", error);
    throw error;
  }
};

// Data structure helpers
export interface TodayTask {
  id: string;
  name: string;
  completed: boolean;
}

export interface HistoryItem {
  id: string;
  topic: string;
  date: string;
  day?: string;
  formattedDate?: string;
  duration: number; // in seconds
}

export interface UserStats {
  gateCoverage: number;
  placementCoverage: number;
  mlAiCoverage: number;
  streak: number;
  completedThisWeek: string[];
  pendingThisWeek: string[];
  weakAreas: string[];
  rescheduleQueue: string[];
  todayTasks: TodayTask[];
  studyHistory: HistoryItem[];
  lastUpdated: any;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: any;
}

export const syncUserStats = async (uid: string, stats: Partial<UserStats>) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { ...stats, uid, lastUpdated: serverTimestamp() }, { merge: true });
};

export const getUserStats = async (uid: string): Promise<UserStats | null> => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() as UserStats : null;
};

export const saveMessage = async (uid: string, message: Omit<ChatMessage, 'timestamp'>) => {
  const messagesRef = collection(db, 'users', uid, 'messages');
  await addDoc(messagesRef, {
    ...message,
    timestamp: serverTimestamp()
  });
};

export const subscribeToMessages = (uid: string, callback: (msgs: ChatMessage[]) => void) => {
  const q = query(collection(db, 'users', uid, 'messages'), orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(doc => doc.data() as ChatMessage);
    callback(msgs);
  });
};
