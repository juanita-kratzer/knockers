// src/hooks/useMessages.js
// Hooks for booking-locked messaging

import { useState, useEffect } from "react";
import { BOOKING_STATUS } from "./useBookings";
import { sanitizeOrReject } from "../lib/contentModeration";
import { ALLOW_CONTACT_INFO_AFTER_DEPOSIT } from "../lib/policies";
import { logger } from "../lib/logger";

// Check if Firebase is configured
const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

/**
 * Get messages for a specific booking
 * Only works if booking is accepted
 */
export function useBookingMessages(bookingId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canMessage, setCanMessage] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setMessages([]);
      setLoading(false);
      setCanMessage(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setMessages([]);
      setLoading(false);
      setCanMessage(false);
      return;
    }

    let unsubBooking = null;
    let unsubMessages = null;

    const fetchMessages = async () => {
      setLoading(true);

      try {
        const { db } = await import("../firebase");
        const { doc, collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL, SUBCOL } = await import("../lib/collections");

        const bookingRef = doc(db, COL.bookings, bookingId);
        
        unsubBooking = onSnapshot(bookingRef, (bookingSnap) => {
          if (!bookingSnap.exists()) {
            unsubMessages?.();
            unsubMessages = null;
            setCanMessage(false);
            setMessages([]);
            setLoading(false);
            return;
          }

          const booking = bookingSnap.data();
          const canMsg = [
            BOOKING_STATUS.DEPOSIT_PAID,
            BOOKING_STATUS.IN_PROGRESS,
            BOOKING_STATUS.COMPLETED,
          ].includes(booking.status);
          setCanMessage(canMsg);

          if (!canMsg) {
            unsubMessages?.();
            unsubMessages = null;
            setMessages([]);
            setLoading(false);
            return;
          }

          if (!unsubMessages) {
            const messagesRef = collection(db, COL.bookings, bookingId, SUBCOL.messages);
            const q = query(messagesRef, orderBy("createdAt", "asc"));

            unsubMessages = onSnapshot(
              q,
              (snapshot) => {
                const docs = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setMessages(docs);
                setLoading(false);
                setError(null);
              },
              (err) => {
                logger.error("useBookingMessages error:", err);
                setError(err);
                setLoading(false);
              }
            );
          }
        });
      } catch (err) {
        logger.error("useBookingMessages setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchMessages();
    return () => {
      unsubBooking?.();
      unsubMessages?.();
    };
  }, [bookingId]);

  return { messages, loading, error, canMessage };
}

/**
 * Get all conversations for a user (client or entertainer)
 * Returns bookings that have accepted status with message preview
 */
export function useConversations(userId, role) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !role) {
      setConversations([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setConversations([]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchConversations = async () => {
      setLoading(true);

      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const field = role === "client" ? "clientId" : "entertainerId";
        const allowedStatuses = [
          BOOKING_STATUS.DEPOSIT_PAID,
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.COMPLETED,
        ];
        const q = query(
          collection(db, COL.bookings),
          where(field, "==", userId),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(
          q,
          (snapshot) => {
            const docs = snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .filter((b) => allowedStatuses.includes(b.status))
              .sort((a, b) => {
                const at = (d) => d.updatedAt?.toDate?.()?.getTime?.() ?? d.createdAt?.toDate?.()?.getTime?.() ?? 0;
                return at(b) - at(a);
              });
            setConversations(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useConversations error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useConversations setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchConversations();
    return () => { unsub?.(); };
  }, [userId, role]);

  return { conversations, loading, error };
}

/**
 * Send a message in a booking conversation (AMBTN-style: update booking with lastMessage for list preview)
 */
export async function sendMessage(bookingId, senderId, senderName, message) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo mode: Would send message", { bookingId, message });
    return;
  }

  const { db } = await import("../firebase");
  const { doc, collection, addDoc, getDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL, SUBCOL } = await import("../lib/collections");

  const bookingRef = doc(db, COL.bookings, bookingId);
  const bookingSnap = await getDoc(bookingRef);

  if (!bookingSnap.exists()) {
    throw new Error("Booking not found");
  }

  const booking = bookingSnap.data();
  const messageableStatuses = [BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED];
  if (!messageableStatuses.includes(booking.status)) {
    throw new Error("Chat unlocks after deposit is paid.");
  }

  const allowContactInMessage = ALLOW_CONTACT_INFO_AFTER_DEPOSIT && messageableStatuses.includes(booking.status);
  if (!allowContactInMessage) {
    const check = sanitizeOrReject(message);
    if (!check.ok) {
      throw new Error(check.reason || "Personal contact details can't be shared here.");
    }
  }

  if (booking.clientId !== senderId && booking.entertainerId !== senderId) {
    throw new Error("Not authorized to send messages in this booking");
  }

  const userRef = doc(db, COL.users, senderId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("User profile not found. Please complete your profile before sending messages.");
  }
  {
    const u = userSnap.data();
    const { isAppleReviewAccount } = await import("../lib/appleReview");
    const isAppleReview = isAppleReviewAccount({ email: u.email });
    if (!isAppleReview) {
      if (u.isBanned) throw new Error("Your account has been banned. You cannot send messages.");
      if (u.isSuspended) throw new Error("Your account is suspended. You cannot send messages.");
      const { canUsePaidFeatures } = await import("../lib/verificationFee");
      if (!canUsePaidFeatures(u)) {
        const { VERIFICATION_REQUIRED_MESSAGE: msg } = await import("../lib/verificationFee");
        throw new Error(msg);
      }
    }
  }

  const messagesRef = collection(db, COL.bookings, bookingId, SUBCOL.messages);
  await addDoc(messagesRef, {
    senderId,
    senderName,
    message,
    createdAt: serverTimestamp(),
  });

  // AMBTN-style: update booking with last message preview for inbox list
  const snippet = message.length > 160 ? message.slice(0, 160) + "…" : message;
  await updateDoc(bookingRef, {
    lastMessage: snippet,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
