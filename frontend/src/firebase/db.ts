import {
  getFirestore,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { app } from "@/firebase/app";
import { useCommonStore } from "@/store/common";

export const db = getFirestore(app);

const tracksRef = collection(db, "tracks");
const stepsRef = collection(db, "steps");

let tracksUnsubscribe;
let stepsUnsubscribe;

let tracksLoaded = false;
let resolveTracksLoaded;
export const tracksLoadedPromise = new Promise((resolve) => (resolveTracksLoaded = resolve));

const prepareObjectNode = (parent) => {
  for (const [key, node] of Object.entries(parent)) {
    if (node instanceof Timestamp) {
      parent[key] = node.toDate();
    } else if (typeof node === "object" && node !== null) {
      parent[key] = prepareObjectNode(node);
    }
  }
  return parent;
};

const unpackSnapshotDoc = (doc) => {
  const result = prepareObjectNode(doc.data());
  result._id = doc.id;
  return result;
};
const unpackSnapshotDocs = (docs) => docs.map(unpackSnapshotDoc);

const unsubscribeSteps = () => {
  if (stepsUnsubscribe) {
    stepsUnsubscribe();
    stepsUnsubscribe = undefined;
  }
};

const unsubscribeTracks = () => {
  if (tracksUnsubscribe) {
    tracksUnsubscribe();
    tracksUnsubscribe = undefined;
  }
};

export const unsubscribe = () => {
  unsubscribeSteps();
  unsubscribeTracks();
};

export const subscribeToTracks = (userId, callback) => {
  if (!userId) {
    unsubscribeSteps();
    unsubscribeTracks();
  }
  tracksUnsubscribe = onSnapshot(
    query(tracksRef, where("userId", "==", userId), orderBy("createdAt", "desc")),
    (querySnapshot) => {
      const tracks = unpackSnapshotDocs(querySnapshot.docs);
      callback(tracks);
      if (!tracksLoaded) {
        tracksLoaded = true;
        resolveTracksLoaded();
      }
    },
    (err) => {
      useCommonStore().addTransientError(err.message);
    }
  );
};

export const createTrack = async (userId, track) => {
  if (!userId || !track) return;
  const now = new Date();
  await addDoc(tracksRef, {
    ...track,
    userId,
    createdAt: now,
    updatedAt: now,
  });
};
export const updateTrack = async (trackId, track) => {
  if (!trackId || !track) return;
  const now = new Date();
  const trackRef = doc(tracksRef, trackId);
  await setDoc(
    trackRef,
    {
      ...track,
      updatedAt: now,
    },
    { merge: true }
  );
};

export const deleteTrack = async (trackId) => {
  if (!trackId) return;
  const trackRef = doc(tracksRef, trackId);
  await deleteDoc(trackRef);
};

export const subscribeToSteps = (userId, trackId, callback) => {
  if (!userId || !trackId) {
    unsubscribeSteps();
  }
  stepsUnsubscribe = onSnapshot(
    query(stepsRef, where("userId", "==", userId), where("trackId", "==", trackId), orderBy("createdAt", "desc")),
    (querySnapshot) => {
      const steps = unpackSnapshotDocs(querySnapshot.docs);
      callback(steps);
    },
    (err) => {
      useCommonStore().addTransientError(err.message);
    }
  );
};

export const createStep = async (userId, trackId, step) => {
  if (!userId || !trackId || !step) return;
  const now = new Date();
  await addDoc(stepsRef, {
    ...step,
    userId,
    trackId,
    createdAt: now,
    updatedAt: now,
  });
};
