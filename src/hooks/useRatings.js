// src/hooks/useRatings.js
// Rating and review system with anonymous period

import { useState, useEffect } from "react";
import { BOOKING_STATUS } from "./useBookings";
import { logger } from "../lib/logger";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

// Anonymous period in days (reviews hidden during this time)
export const ANONYMOUS_PERIOD_DAYS = 7;

/**
 * Submit a rating and review
 */
export async function submitRating(ratingData) {
  const {
    bookingId,
    reviewerId,
    reviewerType, // "client" or "entertainer"
    revieweeId,
    revieweeType,
    rating, // 1-5
    review,
  } = ratingData;

  if (!isFirebaseConfigured()) {
    logger.log("Demo: Submit rating", ratingData);
    return "demo-rating-id";
  }

  const { db } = await import("../firebase");
  const { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, increment } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  // Calculate when review becomes visible
  const visibleAfter = new Date();
  visibleAfter.setDate(visibleAfter.getDate() + ANONYMOUS_PERIOD_DAYS);

  const ratingRecord = {
    bookingId,
    reviewerId,
    reviewerType,
    revieweeId,
    revieweeType,
    rating,
    review: review || "",
    visibleAfter,
    isDisputed: false,
    createdAt: serverTimestamp(),
  };

  const ratingRef = await addDoc(collection(db, COL.ratings), ratingRecord);

  // Update average rating on reviewee's profile
  const profileCollection = revieweeType === "entertainer" ? COL.entertainers : COL.users;
  const profileRef = doc(db, profileCollection, revieweeId);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    const profile = profileSnap.data();
    const totalRatings = (profile.totalRatings || 0) + 1;
    const ratingSum = (profile.ratingSum || 0) + rating;
    const averageRating = ratingSum / totalRatings;

    await updateDoc(profileRef, {
      totalRatings,
      ratingSum,
      averageRating: Math.round(averageRating * 10) / 10,
      totalBookings: increment(1),
    });
  }

  // Mark booking as rated by this party
  const bookingRef = doc(db, COL.bookings, bookingId);
  await updateDoc(bookingRef, {
    [`${reviewerType}Rated`]: true,
    [`${reviewerType}RatingId`]: ratingRef.id,
  });

  return ratingRef.id;
}

/**
 * Get ratings for an entertainer (visible to all)
 */
export function useEntertainerRatings(entertainerId) {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entertainerId) {
      setRatings([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      // Demo data
      setRatings([
        {
          id: "demo-1",
          rating: 5,
          review: "Amazing performance, everyone loved it!",
          reviewerType: "client",
          createdAt: new Date(Date.now() - 86400000 * 14),
        },
        {
          id: "demo-2",
          rating: 4,
          review: "Professional and on time.",
          reviewerType: "client",
          createdAt: new Date(Date.now() - 86400000 * 30),
        },
      ]);
      setStats({ average: 4.5, total: 2 });
      setLoading(false);
      return;
    }

    const fetchRatings = async () => {
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const now = new Date();
        const q = query(
          collection(db, COL.ratings),
          where("revieweeId", "==", entertainerId),
          where("revieweeType", "==", "entertainer"),
          where("visibleAfter", "<=", now),
          where("isDisputed", "==", false),
          orderBy("visibleAfter", "desc"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRatings(docs);

        if (docs.length > 0) {
          const sum = docs.reduce((acc, r) => acc + r.rating, 0);
          setStats({
            average: Math.round((sum / docs.length) * 10) / 10,
            total: docs.length,
          });
        } else {
          setStats({ average: 0, total: 0 });
        }

        setLoading(false);
      } catch (err) {
        logger.error("useEntertainerRatings error:", err);
        setLoading(false);
      }
    };

    fetchRatings();
  }, [entertainerId]);

  return { ratings, stats, loading };
}

/**
 * Get ratings for a client (visible only to entertainers)
 */
export function useClientRatings(clientId, viewerIsEntertainer = false) {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only entertainers can see client reviews
    if (!viewerIsEntertainer || !clientId) {
      setRatings([]);
      setStats({ average: 0, total: 0 });
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setRatings([
        {
          id: "demo-1",
          rating: 5,
          review: "Great host, very respectful.",
          reviewerType: "entertainer",
          createdAt: new Date(Date.now() - 86400000 * 10),
        },
      ]);
      setStats({ average: 5, total: 1 });
      setLoading(false);
      return;
    }

    const fetchRatings = async () => {
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const now = new Date();
        const q = query(
          collection(db, COL.ratings),
          where("revieweeId", "==", clientId),
          where("revieweeType", "==", "client"),
          where("visibleAfter", "<=", now),
          where("isDisputed", "==", false),
          orderBy("visibleAfter", "desc"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRatings(docs);

        if (docs.length > 0) {
          const sum = docs.reduce((acc, r) => acc + r.rating, 0);
          setStats({
            average: Math.round((sum / docs.length) * 10) / 10,
            total: docs.length,
          });
        } else {
          setStats({ average: 0, total: 0 });
        }

        setLoading(false);
      } catch (err) {
        logger.error("useClientRatings error:", err);
        setLoading(false);
      }
    };

    fetchRatings();
  }, [clientId, viewerIsEntertainer]);

  return { ratings, stats, loading };
}

/**
 * Dispute a review (entertainer only)
 */
export async function disputeReview(ratingId, reason) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo: Dispute review", { ratingId, reason });
    return;
  }

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp, collection, addDoc } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  // Create dispute record
  await addDoc(collection(db, COL.disputes), {
    ratingId,
    reason,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  // Mark rating as disputed (hides it)
  const ratingRef = doc(db, COL.ratings, ratingId);
  await updateDoc(ratingRef, {
    isDisputed: true,
    disputedAt: serverTimestamp(),
    disputeReason: reason,
  });
}

/**
 * Check if a booking needs rating
 */
export function useBookingRatingStatus(bookingId, userType) {
  const [needsRating, setNeedsRating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setNeedsRating(true);
      setLoading(false);
      return;
    }

    const checkRating = async () => {
      try {
        const { db } = await import("../firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const bookingRef = doc(db, COL.bookings, bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          const booking = bookingSnap.data();
          const ratedField = `${userType}Rated`;
          setNeedsRating(booking.status === BOOKING_STATUS.COMPLETED && !booking[ratedField]);
        }

        setLoading(false);
      } catch (err) {
        logger.error("useBookingRatingStatus error:", err);
        setLoading(false);
      }
    };

    checkRating();
  }, [bookingId, userType]);

  return { needsRating, loading };
}


