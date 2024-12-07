import { firestore } from 'firebase-admin';

export const toDate = (date: Date | firestore.Timestamp): Date => {
  if (date instanceof firestore.Timestamp) {
    return date.toDate();
  }
  return date;
};
