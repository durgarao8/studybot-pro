import { collection, doc, getDoc, getDocs, query, setDoc, where, orderBy, limit, addDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firestoreService = {
  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error: any) {
      if (error?.message?.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. ");
      }
    }
  },

  async getUserProfile(uid: string) {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async saveUserProfile(uid: string, data: any) {
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveStudyLog(data: any) {
    const path = 'studyLogs';
    try {
      return await addDoc(collection(db, 'studyLogs'), {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getRecentLogs(uid: string, count: number = 7) {
    const path = 'studyLogs';
    try {
      const q = query(
        collection(db, 'studyLogs'),
        where('uid', '==', uid),
        orderBy('date', 'desc'),
        limit(count)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async saveDailyPlan(data: any) {
    const path = 'dailyPlans';
    try {
      return await addDoc(collection(db, 'dailyPlans'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getLatestPlan(uid: string) {
    const path = 'dailyPlans';
    try {
      const q = query(
        collection(db, 'dailyPlans'),
        where('uid', '==', uid),
        where('date', '==', new Date().toISOString().split('T')[0]),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }
};
