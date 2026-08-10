import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Asset } from '../types';
import type { AssetsAdapter } from './assetsAdapter';

export function firestoreAssetsAdapter(uid: string): AssetsAdapter {
  return {
    async list(topicId) {
      const snapshot = await getDocs(
        query(collection(db, 'users', uid, 'assets'), where('topicId', '==', topicId)),
      );
      return snapshot.docs.map((item) => item.data() as Asset);
    },
    async save(asset) {
      const firestoreAsset = Object.fromEntries(
        Object.entries(asset).filter(([, value]) => value !== undefined),
      ) as Asset;
      await setDoc(doc(db, 'users', uid, 'assets', asset.assetId), firestoreAsset);
    },
  };
}
