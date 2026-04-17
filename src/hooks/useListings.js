// src/hooks/useListings.js
// Client job listings: clients post what they want, entertainers apply, client accepts → booking

import { useState, useEffect } from "react";
import { createBooking } from "./useBookings";
import { logger } from "../lib/logger";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export const LISTING_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
};

export const APPLICATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
};

/**
 * Fetch all open listings (for entertainers to browse)
 */
export function useOpenListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setListings([]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const setup = async () => {
      setLoading(true);
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const q = query(
          collection(db, COL.listings),
          where("status", "==", LISTING_STATUS.OPEN),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(
          q,
          (snap) => {
            setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    setup();
    return () => { unsub?.(); };
  }, []);

  return { listings, loading, error };
}

/**
 * Fetch a single listing by ID
 */
export function useListing(listingId) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listingId) {
      setListing(null);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setListing(null);
      setLoading(false);
      return;
    }

    let unsub = null;
    const setup = async () => {
      setLoading(true);
      try {
        const { db } = await import("../firebase");
        const { doc, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        unsub = onSnapshot(
          doc(db, COL.listings, listingId),
          (snap) => {
            setListing(snap.exists() ? { id: snap.id, ...snap.data() } : null);
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    setup();
    return () => { unsub?.(); };
  }, [listingId]);

  return { listing, loading, error };
}

/**
 * Fetch listings created by a client
 */
export function useClientListings(clientId) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setListings([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setListings([]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const setup = async () => {
      setLoading(true);
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const q = query(
          collection(db, COL.listings),
          where("clientId", "==", clientId),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(
          q,
          (snap) => {
            setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    setup();
    return () => { unsub?.(); };
  }, [clientId]);

  return { listings, loading, error };
}

/**
 * Fetch applications for a single listing
 */
export function useListingApplications(listingId) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listingId) {
      setApplications([]);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setApplications([]);
      setLoading(false);
      return;
    }

    let unsub = null;
    const setup = async () => {
      setLoading(true);
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const q = query(
          collection(db, COL.listingApplications),
          where("listingId", "==", listingId),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(
          q,
          (snap) => {
            setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    setup();
    return () => { unsub?.(); };
  }, [listingId]);

  return { applications, loading, error };
}

/**
 * Fetch applications made by an entertainer (to show "Applied" on listing cards)
 */
export function useMyApplications(entertainerId) {
  const [applicationIdsByListing, setApplicationIdsByListing] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entertainerId) {
      setApplicationIdsByListing({});
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setApplicationIdsByListing({});
      setLoading(false);
      return;
    }

    let unsub = null;
    const setup = async () => {
      setLoading(true);
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const q = query(
          collection(db, COL.listingApplications),
          where("entertainerId", "==", entertainerId)
        );

        unsub = onSnapshot(
          q,
          (snap) => {
            const map = {};
            snap.docs.forEach((d) => {
              const data = d.data();
              if (data.listingId) map[data.listingId] = { id: d.id, status: data.status };
            });
            setApplicationIdsByListing(map);
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    setup();
    return () => { unsub?.(); };
  }, [entertainerId]);

  return { applicationIdsByListing, loading, error };
}

/**
 * Create a new listing (client)
 */
export async function createListing(data) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo: create listing", data);
    return "demo-listing-" + Date.now();
  }

  const { db } = await import("../firebase");
  const { collection, addDoc, serverTimestamp, Timestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  let eventDate = data.eventDate;
  if (eventDate && !eventDate.toMillis) {
    eventDate = eventDate instanceof Date ? Timestamp.fromDate(eventDate) : Timestamp.fromDate(new Date(eventDate));
  }

  const docRef = await addDoc(collection(db, COL.listings), {
    ...data,
    eventDate: eventDate || null,
    status: LISTING_STATUS.OPEN,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Entertainer applies to a listing
 */
export async function applyToListing(listingId, { entertainerId, entertainerName, entertainerPhoto, message }) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo: apply to listing", listingId, entertainerId);
    return "demo-application-" + Date.now();
  }

  const { db } = await import("../firebase");
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = await addDoc(collection(db, COL.listingApplications), {
    listingId,
    entertainerId,
    entertainerName: entertainerName || "Entertainer",
    entertainerPhoto: entertainerPhoto || null,
    message: message || null,
    status: APPLICATION_STATUS.PENDING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Client accepts an application: create booking, mark application accepted, close listing
 */
export async function acceptApplication(listingId, applicationId, listing, application, clientId, clientName, clientEmail, clientPhone) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo: accept application", listingId, applicationId);
    return "demo-booking-" + Date.now();
  }

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const eventDate = listing.eventDate?.toDate ? listing.eventDate.toDate() : (listing.eventDate ? new Date(listing.eventDate) : null);

  const bookingData = {
    clientId,
    clientName: clientName || "Client",
    clientEmail: clientEmail || "",
    clientPhone: clientPhone || null,
    entertainerId: application.entertainerId,
    entertainerName: application.entertainerName || "Entertainer",
    eventDate: eventDate || new Date(),
    eventTime: listing.eventTime || "",
    location: listing.location || "",
    duration: listing.duration || 2,
    notes: listing.description || listing.notes || "",
    estimatedCost: listing.budget || null,
    fromListingId: listingId,
  };

  const bookingId = await createBooking(bookingData);

  await updateDoc(doc(db, COL.listingApplications, applicationId), {
    status: APPLICATION_STATUS.ACCEPTED,
    bookingId,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, COL.listings, listingId), {
    status: LISTING_STATUS.CLOSED,
    acceptedApplicationId: applicationId,
    acceptedEntertainerId: application.entertainerId,
    bookingId,
    updatedAt: serverTimestamp(),
  });

  return bookingId;
}

/**
 * Client rejects an application
 */
export async function rejectApplication(applicationId) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  await updateDoc(doc(db, COL.listingApplications, applicationId), {
    status: APPLICATION_STATUS.REJECTED,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Client closes a listing without accepting anyone
 */
export async function closeListing(listingId) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  await updateDoc(doc(db, COL.listings, listingId), {
    status: LISTING_STATUS.CLOSED,
    updatedAt: serverTimestamp(),
  });
}
