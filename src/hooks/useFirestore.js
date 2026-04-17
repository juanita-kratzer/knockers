// src/hooks/useFirestore.js
// Core Firestore hooks for real-time data

import { useState, useEffect } from "react";
import { logger } from "../lib/logger";

// Check if Firebase is configured
const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

/**
 * Subscribe to a single document
 */
export function useDocument(collectionName, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName || !docId) {
      setData(null);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setData(null);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchDocument = async () => {
      setLoading(true);

      try {
        const { db } = await import("../firebase");
        const { doc, onSnapshot } = await import("firebase/firestore");

        const docRef = doc(db, collectionName, docId);

        unsub = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              setData({ id: snap.id, ...snap.data() });
            } else {
              setData(null);
            }
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useDocument error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useDocument setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchDocument();
    return () => { unsub?.(); };
  }, [collectionName, docId]);

  return { data, loading, error };
}

/**
 * Subscribe to a collection with optional query constraints
 */
export function useCollection(collectionName, constraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName) {
      setData([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setData([]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchCollection = async () => {
      setLoading(true);

      try {
        const { db } = await import("../firebase");
        const { collection, query, onSnapshot } = await import("firebase/firestore");

        const collectionRef = collection(db, collectionName);
        const q = constraints.length > 0 
          ? query(collectionRef, ...constraints)
          : collectionRef;

        unsub = onSnapshot(
          q,
          (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setData(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useCollection error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useCollection setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchCollection();
    return () => { unsub?.(); };
  }, [collectionName, JSON.stringify(constraints.map(c => c.toString()))]);

  return { data, loading, error };
}

/**
 * Fetch a single document once (not real-time)
 */
export async function fetchDocument(collectionName, docId) {
  if (!collectionName || !docId) return null;
  if (!isFirebaseConfigured()) return null;
  
  const { db } = await import("../firebase");
  const { doc, getDoc } = await import("firebase/firestore");

  const docRef = doc(db, collectionName, docId);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Fetch collection once (not real-time)
 */
export async function fetchCollection(collectionName, constraints = []) {
  if (!collectionName) return [];
  if (!isFirebaseConfigured()) return [];
  
  const { db } = await import("../firebase");
  const { collection, query, getDocs } = await import("firebase/firestore");

  const collectionRef = collection(db, collectionName);
  const q = constraints.length > 0 
    ? query(collectionRef, ...constraints)
    : collectionRef;
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
