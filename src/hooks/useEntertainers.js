// src/hooks/useEntertainers.js
// Hooks for fetching and managing entertainer data

import { useState, useEffect, useMemo } from "react";
import { logger } from "../lib/logger";
import { getPostcodeForSuburb } from "../data/suburbToPostcode";

// Check if Firebase is configured
const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

/**
 * Get all entertainers with optional filters
 */
export function useEntertainers(filters = {}) {
  const [entertainers, setEntertainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Return demo data when Firebase isn't configured
      setEntertainers(getDemoEntertainers());
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchEntertainers = async () => {
      setLoading(true);
      
      try {
        const { db } = await import("../firebase");
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        let q = collection(db, COL.entertainers);
        const constraints = [];

        constraints.push(where("isActive", "==", true));

        if (filters.category) {
          constraints.push(where("categories", "array-contains", filters.category));
        }

        if (filters.suburb) {
          constraints.push(where("suburb", "==", filters.suburb));
        }

        if (filters.hideAdult) {
          constraints.push(where("isAdultContent", "==", false));
        }

        if (constraints.length > 0) {
          q = query(q, ...constraints);
        }

        unsub = onSnapshot(
          q,
          (snapshot) => {
            let docs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            if (filters.searchQuery) {
              const search = filters.searchQuery.toLowerCase();
              docs = docs.filter(
                (e) =>
                  e.displayName?.toLowerCase().includes(search) ||
                  e.bio?.toLowerCase().includes(search) ||
                  e.subCategories?.some((sc) => sc.toLowerCase().includes(search))
              );
            }

            setEntertainers(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useEntertainers error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useEntertainers setup error:", err);
        setError(err);
        if (!isFirebaseConfigured()) setEntertainers(getDemoEntertainers());
        setLoading(false);
      }
    };

    fetchEntertainers();
    return () => { unsub?.(); };
  }, [filters.category, filters.suburb, filters.hideAdult, filters.searchQuery]);

  return { entertainers, loading, error };
}

/**
 * Get a single entertainer by ID
 */
export function useEntertainer(entertainerId) {
  const [entertainer, setEntertainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entertainerId) {
      setEntertainer(null);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      const demo = getDemoEntertainers().find(e => e.id === entertainerId);
      setEntertainer(demo || null);
      setLoading(false);
      return;
    }

    let unsub = null;
    const fetchEntertainer = async () => {
      setLoading(true);
      
      try {
        const { db } = await import("../firebase");
        const { doc, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const docRef = doc(db, COL.entertainers, entertainerId);

        unsub = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              setEntertainer({ id: snap.id, ...snap.data() });
            } else {
              setEntertainer(null);
            }
            setLoading(false);
            setError(null);
          },
          (err) => {
            logger.error("useEntertainer error:", err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error("useEntertainer setup error:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchEntertainer();
    return () => { unsub?.(); };
  }, [entertainerId]);

  return { entertainer, loading, error };
}

/**
 * Get entertainer profile for current user
 */
export function useMyEntertainerProfile(userId) {
  return useEntertainer(userId);
}

/**
 * Get entertainers grouped by suburb for map display (legacy; prefer useEntertainersByPostcode for map)
 */
export function useEntertainersBySuburb() {
  const { entertainers, loading, error } = useEntertainers({ hideAdult: false });

  const suburbData = useMemo(() => {
    const suburbs = {};
    entertainers.forEach((e) => {
      const suburb = e.suburb || "Unknown";
      if (!suburbs[suburb]) {
        suburbs[suburb] = {
          name: suburb,
          count: 0,
          lat: e.location?.lat || 0,
          lng: e.location?.lng || 0,
        };
      }
      suburbs[suburb].count++;
    });
    return Object.values(suburbs).sort((a, b) => b.count - a.count);
  }, [entertainers]);

  return { suburbData, loading, error };
}

/**
 * Get entertainers grouped by postcode for map display.
 * One postcode can cover multiple suburbs (e.g. 4217 = Surfers Paradise, Main Beach, Bundall, Benowa).
 * When suburb has no postcode lookup, we use suburb name as the area key so no data is lost.
 */
export function useEntertainersByPostcode() {
  const { entertainers, loading, error } = useEntertainers({ hideAdult: false });

  const postcodeData = useMemo(() => {
    const areas = {};
    entertainers.forEach((e) => {
      const suburb = e.suburb || "Unknown";
      const postcode = getPostcodeForSuburb(suburb);
      const areaKey = postcode || suburb;
      if (!areas[areaKey]) {
        areas[areaKey] = {
          postcode: postcode || null,
          name: postcode || suburb,
          count: 0,
          sumLat: 0,
          sumLng: 0,
          suburbCount: 0,
          suburbs: [],
        };
      }
      const a = areas[areaKey];
      a.count += 1;
      const lat = e.location?.lat;
      const lng = e.location?.lng;
      if (lat != null && lng != null) {
        a.sumLat += lat;
        a.sumLng += lng;
        a.suburbCount += 1;
      }
      if (!a.suburbs.includes(suburb)) a.suburbs.push(suburb);
    });

    return Object.entries(areas)
      .map(([key, a]) => ({
        postcode: a.postcode,
        name: a.name,
        count: a.count,
        lat: a.suburbCount > 0 ? a.sumLat / a.suburbCount : 0,
        lng: a.suburbCount > 0 ? a.sumLng / a.suburbCount : 0,
        suburbs: a.suburbs.sort(),
      }))
      .filter((x) => x.lat !== 0 || x.lng !== 0)
      .sort((a, b) => b.count - a.count);
  }, [entertainers]);

  return { postcodeData, loading, error };
}

/**
 * Create or update entertainer profile.
 * When location is provided it should be { suburb, state, region, lat, lng } from SuburbAutocomplete;
 * suburb (string) is also stored at top level for Firestore where("suburb", "==") and map clustering uses location.lat/lng.
 */
export async function saveEntertainerProfile(userId, profileData) {
  if (!isFirebaseConfigured()) {
    logger.log("Demo mode: Would save profile", profileData);
    return;
  }

  const { db } = await import("../firebase");
  const { doc, getDoc, updateDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.entertainers, userId);
  const existing = await getDoc(docRef);

  if (existing.exists()) {
    await updateDoc(docRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
  } else {
    const { generateRefCode } = await import("../lib/refCode");
    await setDoc(docRef, {
      ...profileData,
      userId,
      refCode: profileData.refCode ?? generateRefCode(),
      isActive: false,
      isAdultContent: profileData.isAdultContent || false,
      verificationStatus: "pending",
      rating: 0,
      reviewCount: 0,
      bookingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update entertainer availability
 */
export async function updateEntertainerAvailability(userId, availability) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.entertainers, userId);
  await updateDoc(docRef, {
    availability,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggle entertainer active status
 */
export async function toggleEntertainerActive(userId, isActive) {
  if (!isFirebaseConfigured()) return;

  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");

  const docRef = doc(db, COL.entertainers, userId);
  await updateDoc(docRef, {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

// Demo data for when Firebase isn't configured
function getDemoEntertainers() {
  return [
    {
      id: "demo-1",
      displayName: "Luna Fire",
      bio: "Professional fire dancer with 10 years of experience",
      categories: ["Circus, Novelty & Visual"],
      subCategories: ["Fire Dancer", "Fire Spinner"],
      suburb: "Surfers Paradise",
      pricing: { baseRate: 250 },
      photos: [],
      rating: 4.8,
      reviewCount: 24,
      isActive: true,
      isAdultContent: false,
    },
    {
      id: "demo-2",
      displayName: "DJ Pulse",
      bio: "Club and wedding DJ with killer mixing skills",
      categories: ["DJs & Electronic"],
      subCategories: ["Wedding DJ", "Club DJ"],
      suburb: "Broadbeach",
      pricing: { baseRate: 300 },
      photos: [],
      rating: 4.9,
      reviewCount: 56,
      isActive: true,
      isAdultContent: false,
    },
    {
      id: "demo-3",
      displayName: "Magic Mike",
      bio: "Close-up magician specializing in corporate events",
      categories: ["Magic & Illusion"],
      subCategories: ["Close-Up Magician", "Mentalist"],
      suburb: "Southport",
      pricing: { baseRate: 200 },
      photos: [],
      rating: 5.0,
      reviewCount: 18,
      isActive: true,
      isAdultContent: false,
    },
    {
      id: "demo-4",
      displayName: "The Comedy Kings",
      bio: "Stand-up duo for corporate events and private parties",
      categories: ["Comedy & Spoken"],
      subCategories: ["Stand-Up Comedian"],
      suburb: "Robina",
      pricing: { baseRate: 400 },
      photos: [],
      rating: 4.7,
      reviewCount: 32,
      isActive: true,
      isAdultContent: false,
    },
    {
      id: "demo-5",
      displayName: "Princess Party Co",
      bio: "Making dreams come true at kids birthday parties",
      categories: ["Children & Family"],
      subCategories: ["Princess Performer", "Face Painter"],
      suburb: "Burleigh",
      pricing: { baseRate: 180 },
      photos: [],
      rating: 4.9,
      reviewCount: 89,
      isActive: true,
      isAdultContent: false,
    },
  ];
}
