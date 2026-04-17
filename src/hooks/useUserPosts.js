// src/hooks/useUserPosts.js
// User request posts - ASAP offers entertainers can apply for

import { useState, useEffect } from "react";
import { logger } from "../lib/logger";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

/**
 * Create a user request post
 */
export async function createUserPost(postData) {
  const {
    userId,
    userName,
    entertainerType,
    location,
    eventDate,
    eventTime,
    eventType,
    description,
    budget,
    bonusAmount = 0, // Extra for ASAP
    isAsap = false,
  } = postData;

  if (!isFirebaseConfigured()) {
    logger.log("Demo: Create user post", postData);
    return "demo-post-id";
  }

  const { db } = await import("../firebase");
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const postRecord = {
    userId,
    userName,
    entertainerType,
    location,
    eventDate,
    eventTime,
    eventType,
    description,
    budget,
    bonusAmount,
    isAsap,
    status: "open", // open, filled, cancelled, expired
    applications: [],
    createdAt: serverTimestamp(),
    expiresAt: isAsap
      ? new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours for ASAP
      : new Date(eventDate),
  };

  const docRef = await addDoc(collection(db, COL.userPosts), postRecord);
  return docRef.id;
}

/**
 * Get user posts near a location (for entertainers)
 */
export function useNearbyUserPosts(entertainerType, location) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Demo data
      setPosts([
        {
          id: "demo-1",
          userName: "Sarah M.",
          entertainerType: "Stripper",
          location: "Sydney CBD",
          eventDate: new Date(Date.now() + 86400000 * 2),
          eventTime: "20:00",
          eventType: "Hens Party",
          description: "Looking for a professional entertainer for a hens party. 15 guests.",
          budget: 400,
          bonusAmount: 50,
          isAsap: false,
          status: "open",
          applications: [],
          createdAt: new Date(),
        },
        {
          id: "demo-2",
          userName: "Mike T.",
          entertainerType: "DJ",
          location: "Bondi",
          eventDate: new Date(),
          eventTime: "ASAP",
          eventType: "House Party",
          description: "Need a DJ ASAP! Will pay extra $100 for anyone available now.",
          budget: 300,
          bonusAmount: 100,
          isAsap: true,
          status: "open",
          applications: [],
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchPosts = async () => {
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const now = new Date();
        const q = query(
          collection(db, COL.userPosts),
          where("status", "==", "open"),
          where("expiresAt", ">", now),
          orderBy("expiresAt", "asc"),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((post) => {
              if (entertainerType && post.entertainerType !== entertainerType) {
                return false;
              }
              return true;
            });

          setPosts(docs);
          setLoading(false);
        });
      } catch (err) {
        logger.error("useNearbyUserPosts error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchPosts();
    return () => { unsub?.(); };
  }, [entertainerType]);

  return { posts, loading, error };
}

/**
 * Get posts created by a user
 */
export function useMyPosts(userId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setPosts([]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchPosts = async () => {
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const q = query(
          collection(db, COL.userPosts),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setPosts(docs);
          setLoading(false);
        });
      } catch (err) {
        logger.error("useMyPosts error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchPosts();
    return () => { unsub?.(); };
  }, [userId]);

  return { posts, loading, error };
}

/**
 * Apply to a user post (entertainer)
 */
export async function applyToPost(postId, applicationData) {
  const {
    entertainerId,
    entertainerName,
    message,
    proposedPrice,
    eta, // For ASAP posts
  } = applicationData;

  if (!isFirebaseConfigured()) {
    logger.log("Demo: Apply to post", { postId, applicationData });
    return;
  }

  const { db } = await import("../firebase");
  const { doc, updateDoc, arrayUnion, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const postRef = doc(db, COL.userPosts, postId);
  await updateDoc(postRef, {
    applications: arrayUnion({
      entertainerId,
      entertainerName,
      message,
      proposedPrice,
      eta,
      appliedAt: new Date(),
      status: "pending",
    }),
  });
}

/**
 * Accept an application (user)
 */
export async function acceptApplication(postId, entertainerId) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo: Accept application", { postId, entertainerId });
    return;
  }

  const { db } = await import("../firebase");
  const { doc, updateDoc, getDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const postRef = doc(db, COL.userPosts, postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) return;

  const post = postSnap.data();
  const updatedApplications = (post.applications || []).map((app) => ({
    ...app,
    status: app.entertainerId === entertainerId ? "accepted" : "declined",
  }));

  await updateDoc(postRef, {
    status: "filled",
    acceptedEntertainerId: entertainerId,
    applications: updatedApplications,
    filledAt: serverTimestamp(),
  });
}

/**
 * Cancel a user post
 */
export async function cancelUserPost(postId) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const postRef = doc(db, COL.userPosts, postId);
  await updateDoc(postRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
  });
}


