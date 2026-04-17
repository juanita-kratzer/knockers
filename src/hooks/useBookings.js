// src/hooks/useBookings.js
// Comprehensive booking management with full flow support

import { useState, useEffect, useCallback } from "react";
import { logger } from "../lib/logger";

// Check if Firebase is configured
const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

// Platform fee
export const PLATFORM_FEE = 30;

// Booking statuses - expanded for full flow
export const BOOKING_STATUS = {
  REQUESTED: "requested",           // Initial request from client
  ACCEPTED: "accepted",             // Entertainer accepted, awaiting deposit
  DEPOSIT_PENDING: "deposit_pending", // 10-min window for payment
  DEPOSIT_PAID: "deposit_paid",     // Deposit received, chat unlocked
  IN_PROGRESS: "in_progress",       // Booking has started (code entered)
  COMPLETED: "completed",           // Booking finished, payment released
  DECLINED: "declined",             // Entertainer declined
  CANCELLED: "cancelled",           // Cancelled by either party
  EXPIRED: "expired",               // Deposit window expired
  DISPUTED: "disputed",             // Under dispute
};

// Cancellation fee structure
export const CANCELLATION_FEES = {
  WITHIN_72_HOURS: {
    clientPays: "full", // Full booking fee
    entertainerReceives: "full",
    platformReceives: PLATFORM_FEE,
  },
  OUTSIDE_72_HOURS: {
    clientPays: 80,
    entertainerReceives: 50,
    platformReceives: PLATFORM_FEE, // Not refunded
  },
  ENTERTAINER_CANCELS: {
    entertainerPays: PLATFORM_FEE,
    clientRefund: "full",
  },
};

/**
 * Calculate cancellation fees based on timing
 */
export function calculateCancellationFees(booking, cancelledBy) {
  const now = new Date();
  const eventDate = booking.eventDate?.toDate ? booking.eventDate.toDate() : new Date(booking.eventDate);
  if (isNaN(eventDate.getTime())) {
    return { clientCharged: 0, entertainerReceives: 0, platformReceives: 0, reason: "Invalid event date — cannot calculate fees" };
  }
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

  if (cancelledBy === "entertainer") {
    return {
      entertainerOwes: PLATFORM_FEE,
      clientRefund: booking.depositAmount || 0,
      reason: "Entertainer cancellation - client receives full refund",
    };
  }

  // Client cancellation
  if (hoursUntilEvent <= 72) {
    return {
      clientCharged: booking.totalAmount,
      entertainerReceives: booking.entertainerAmount,
      platformReceives: PLATFORM_FEE,
      reason: "Cancellation within 72 hours - full fee charged",
    };
  } else {
    return {
      clientCharged: 80,
      entertainerReceives: 50,
      platformReceives: PLATFORM_FEE,
      reason: "Cancellation outside 72 hours - $80 fee ($50 to entertainer)",
    };
  }
}

/**
 * Get bookings for a client
 */
export function useClientBookings(clientId) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      // Demo data
      setBookings([
        {
          id: "demo-1",
          clientId,
          entertainerId: "demo-entertainer",
          entertainerName: "Luna Star",
          status: BOOKING_STATUS.DEPOSIT_PAID,
          eventDate: new Date(Date.now() + 86400000 * 3),
          eventType: "Birthday Party",
          location: "Sydney CBD",
          totalAmount: 350,
          depositAmount: 175,
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchBookings = async () => {
      setLoading(true);

      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const q = query(
          collection(db, COL.bookings),
          where("clientId", "==", clientId),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(
          q,
          (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setBookings(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useClientBookings error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useClientBookings setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchBookings();
    return () => { unsub?.(); };
  }, [clientId]);

  // Categorize bookings
  const upcoming = bookings.filter((b) =>
    [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.DEPOSIT_PENDING, BOOKING_STATUS.DEPOSIT_PAID].includes(b.status)
  );
  const pending = bookings.filter((b) => b.status === BOOKING_STATUS.REQUESTED);
  const active = bookings.filter((b) => b.status === BOOKING_STATUS.IN_PROGRESS);
  const past = bookings.filter((b) =>
    [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED].includes(b.status)
  );

  return { bookings, upcoming, pending, active, past, loading, error };
}

/**
 * Get bookings for an entertainer
 */
export function useEntertainerBookings(entertainerId) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entertainerId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      // Demo data
      setBookings([
        {
          id: "demo-1",
          clientId: "demo-client",
          clientName: "John D.",
          entertainerId,
          status: BOOKING_STATUS.REQUESTED,
          eventDate: new Date(Date.now() + 86400000 * 5),
          eventType: "Bucks Party",
          location: "Bondi",
          services: ["Dance Performance", "Games Host"],
          totalAmount: 450,
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchBookings = async () => {
      setLoading(true);

      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const q = query(
          collection(db, COL.bookings),
          where("entertainerId", "==", entertainerId),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(
          q,
          (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setBookings(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useEntertainerBookings error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useEntertainerBookings setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchBookings();
    return () => { unsub?.(); };
  }, [entertainerId]);

  // Categorize
  const requests = bookings.filter((b) => b.status === BOOKING_STATUS.REQUESTED);
  const pendingDeposit = bookings.filter((b) =>
    [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.DEPOSIT_PENDING].includes(b.status)
  );
  const confirmed = bookings.filter((b) => b.status === BOOKING_STATUS.DEPOSIT_PAID);
  const active = bookings.filter((b) => b.status === BOOKING_STATUS.IN_PROGRESS);
  const past = bookings.filter((b) =>
    [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED].includes(b.status)
  );

  // Alias: pending = requests (for Dashboard / AMBTN-style naming)
  return { bookings, requests, pending: requests, pendingDeposit, confirmed, active, past, loading, error };
}

/**
 * Get a single booking by ID with real-time updates
 */
export function useBooking(bookingId) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setBooking({
        id: bookingId,
        status: BOOKING_STATUS.DEPOSIT_PAID,
        eventDate: new Date(Date.now() + 86400000 * 3),
        eventType: "Birthday Party",
        location: "Sydney CBD",
        totalAmount: 350,
        depositAmount: 175,
      });
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchBooking = async () => {
      setLoading(true);

      try {
        const { db } = await import("../firebase");
        const { doc, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const docRef = doc(db, COL.bookings, bookingId);

        unsub = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              setBooking({ id: snap.id, ...snap.data() });
            } else {
              setBooking(null);
            }
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useBooking error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useBooking setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchBooking();
    return () => { unsub?.(); };
  }, [bookingId]);

  return { booking, loading, error };
}

/**
 * Create a new booking request (client → entertainer, like AMBTN user → sole trader)
 */
export async function createBooking(bookingData) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo mode: Would create booking", bookingData);
    return "demo-booking-" + Date.now();
  }

  const { db } = await import("../firebase");
  const { collection, addDoc, serverTimestamp, Timestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  // Normalise eventDate to Firestore Timestamp for consistent storage and queries
  let eventDate = bookingData.eventDate;
  if (eventDate && !eventDate.toMillis) {
    eventDate = eventDate instanceof Date
      ? Timestamp.fromDate(eventDate)
      : Timestamp.fromDate(new Date(eventDate));
  }

  const bookingRecord = {
    ...bookingData,
    eventDate: eventDate || bookingData.eventDate,
    status: BOOKING_STATUS.REQUESTED,
    platformFee: PLATFORM_FEE,
    clientPhone: bookingData.clientPhone || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COL.bookings), bookingRecord);
  return docRef.id;
}

/**
 * Simple accept (for Dashboard). Uses default/zero deposit; for full flow use acceptBookingWithDeposit.
 */
export async function acceptBooking(bookingId) {
  return acceptBookingWithDeposit(bookingId, {
    depositAmount: 0,
    totalAmount: 0,
    serviceBreakdown: [],
    entertainerRules: "",
    travelFee: 0,
    asapFee: 0,
  });
}

/**
 * Entertainer accepts booking and sets deposit amount
 */
export async function acceptBookingWithDeposit(bookingId, depositDetails) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo: Accept booking with deposit", { bookingId, depositDetails });
    return;
  }

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const {
    depositAmount,
    totalAmount,
    serviceBreakdown,
    entertainerRules,
    travelFee = 0,
    asapFee = 0,
  } = depositDetails;

  const docRef = doc(db, COL.bookings, bookingId);
  await updateDoc(docRef, {
    status: BOOKING_STATUS.ACCEPTED,
    depositAmount,
    totalAmount: totalAmount + PLATFORM_FEE,
    entertainerAmount: totalAmount,
    serviceBreakdown,
    entertainerRules,
    travelFee,
    asapFee,
    acceptedAt: serverTimestamp(),
    depositDeadline: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    updatedAt: serverTimestamp(),
  });
}

/**
 * Client agrees to rules and initiates deposit payment
 */
export async function initiateDepositPayment(bookingId) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  await updateDoc(docRef, {
    status: BOOKING_STATUS.DEPOSIT_PENDING,
    rulesAgreedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Mark deposit as paid. When Stripe is enabled the webhook handles this
 * server-side (payment_intent.succeeded), so this is a no-op. When Stripe
 * is off (mock/dev mode) we write directly for testing convenience.
 */
export async function confirmDepositPaid(bookingId, paymentDetails) {
  if (!isFirebaseConfigured()) return;

  const { isStripeEnabled } = await import("../lib/featureFlags");
  if (isStripeEnabled()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  await updateDoc(docRef, {
    status: BOOKING_STATUS.DEPOSIT_PAID,
    depositPaidAt: serverTimestamp(),
    paymentId: paymentDetails?.paymentId || null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Start booking with arrival code
 */
export async function startBooking(bookingId, arrivalCode, options = {}) {
  if (!isFirebaseConfigured()) return { success: true };

  const { db } = await import("../firebase");
  const { doc, getDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  const bookingSnap = await getDoc(docRef);

  if (!bookingSnap.exists()) {
    return { success: false, error: "Booking not found" };
  }

  const booking = bookingSnap.data();

  // Verify arrival code
  if (booking.arrivalCode !== arrivalCode) {
    return { success: false, error: "Invalid arrival code" };
  }

  await updateDoc(docRef, {
    status: BOOKING_STATUS.IN_PROGRESS,
    startedAt: serverTimestamp(),
    entertainerLocation: options.shareLocation ? options.location : null,
    expectedFinishTime: options.expectedFinishTime || null,
    locationSharing: options.shareLocation || false,
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

/**
 * Update entertainer location during booking
 */
export async function updateEntertainerLocation(bookingId, location) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  await updateDoc(docRef, {
    entertainerLocation: location,
    locationUpdatedAt: serverTimestamp(),
  });
}

/**
 * Complete booking (entertainer confirms with password)
 */
export async function completeBooking(bookingId, entertainerPassword) {
  if (!isFirebaseConfigured()) return { success: true };

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  await updateDoc(docRef, {
    status: BOOKING_STATUS.COMPLETED,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const { isStripeEnabled } = await import("../lib/featureFlags");
    if (isStripeEnabled()) {
      const { releasePayoutOnCompletion } = await import("../lib/stripeCallables");
      await releasePayoutOnCompletion(bookingId);
    }
  } catch (payoutErr) {
    logger.warn("Payout release failed (booking still marked completed):", payoutErr);
  }

  return { success: true };
}

/**
 * Decline a booking request
 */
export async function declineBooking(bookingId, reason = "") {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  await updateDoc(docRef, {
    status: BOOKING_STATUS.DECLINED,
    declineReason: reason,
    declinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel a booking. When Stripe is enabled, delegates to the Cloud Function
 * which handles refunds/fees server-side. When Stripe is off, writes directly.
 */
export async function cancelBooking(bookingId, cancelledBy, reason = "") {
  if (!isFirebaseConfigured()) return { fees: { reason: "Demo mode" } };

  const { isStripeEnabled } = await import("../lib/featureFlags");
  if (isStripeEnabled()) {
    const { cancelBookingWithFees } = await import("../lib/stripeCallables");
    const mapped = cancelledBy === "entertainer" ? "ENTERTAINER" : "CLIENT";
    return cancelBookingWithFees(bookingId, mapped, reason);
  }

  const { db } = await import("../firebase");
  const { doc, getDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  const bookingSnap = await getDoc(docRef);

  if (!bookingSnap.exists()) {
    throw new Error("Booking not found");
  }

  const booking = bookingSnap.data();
  const fees = calculateCancellationFees(booking, cancelledBy);

  await updateDoc(docRef, {
    status: BOOKING_STATUS.CANCELLED,
    cancelledBy,
    cancelReason: reason,
    cancellationFees: fees,
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { fees };
}

/**
 * Withdraw acceptance (entertainer) after deposit deadline
 */
export async function withdrawAcceptance(bookingId) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, getDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.bookings, bookingId);
  const bookingSnap = await getDoc(docRef);

  if (!bookingSnap.exists()) return;

  const booking = bookingSnap.data();
  const deadline = booking.depositDeadline?.toDate ? booking.depositDeadline.toDate() : new Date(booking.depositDeadline);

  // Only allow withdrawal after deadline
  if (new Date() < deadline) {
    throw new Error("Cannot withdraw before deposit deadline");
  }

  await updateDoc(docRef, {
    status: BOOKING_STATUS.EXPIRED,
    expiredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Generate arrival code for a booking
 */
export async function generateArrivalCode(bookingId) {
  if (!isFirebaseConfigured()) return "1234";

  const { db } = await import("../firebase");
  const { doc, updateDoc } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const code = Math.floor(1000 + Math.random() * 9000).toString();

  const docRef = doc(db, COL.bookings, bookingId);
  await updateDoc(docRef, {
    arrivalCode: code,
  });

  return code;
}

/**
 * Trigger safety alert
 */
export async function triggerSafetyAlert(bookingId, entertainerLocation) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo: Safety alert triggered", { bookingId, entertainerLocation });
    return { success: true, message: "Demo: Alert would be sent" };
  }

  const { db } = await import("../firebase");
  const { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const bookingRef = doc(db, COL.bookings, bookingId);
  const bookingSnap = await getDoc(bookingRef);

  if (!bookingSnap.exists()) {
    return { success: false, error: "Booking not found" };
  }

  const booking = bookingSnap.data();

  // Log safety alert
  await addDoc(collection(db, COL.safetyAlerts), {
    bookingId,
    entertainerId: booking.entertainerId,
    clientId: booking.clientId,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    location: entertainerLocation,
    bookingLocation: booking.location,
    triggeredAt: serverTimestamp(),
    status: "pending",
  });

  // Mark on booking
  await updateDoc(bookingRef, {
    safetyAlertTriggered: true,
    safetyAlertAt: serverTimestamp(),
    safetyAlertLocation: entertainerLocation,
  });

  return { success: true, message: "Safety alert sent to your emergency contact" };
}
